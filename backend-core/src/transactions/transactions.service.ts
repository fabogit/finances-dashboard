import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EnrichedTransaction, Prisma, RawTransaction } from '@prisma/client';
import * as XLSX from 'xlsx';
import { randomUUID } from 'crypto';
import { TransactionsRepository } from './transactions.repository';
import { ScienceService } from '../science/science.service';
import { BankExportRow } from './interfaces/bank-export-row.interface';
import { ProcessedTransactionDto } from '../science/dto/processed-transaction.dto';
import { GetTransactionsFilterDto } from './dto/get-transactions.dto';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
} from './dto/create-update-transaction.dto';
import { AssetsService } from '../assets/assets.service';
import { GoalsService } from '../goals/goals.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly transactionsRepo: TransactionsRepository,
    private readonly scienceService: ScienceService,
    private readonly assetsService: AssetsService,
    private readonly goalsService: GoalsService,
    private readonly prisma: PrismaService,
  ) {}

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  // --- UPLOAD FLOW ---
  async uploadFile(file: Express.Multer.File) {
    this.logger.log(`Starting file processing. Size: ${file.size} bytes`);

    // --- 1. EXCEL PARSING ---
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rangeRef = sheet['!ref'] || 'A1:Z1';
    const maxRangeOverride = XLSX.utils.decode_range(rangeRef);
    maxRangeOverride.e.r = 5000;
    sheet['!ref'] = XLSX.utils.encode_range(maxRangeOverride);

    const rawData = XLSX.utils.sheet_to_json<BankExportRow>(sheet, {
      range: 18,
      defval: null,
    });
    this.logger.log(`Total XLSX rows: ${rawData.length}`);

    // --- 2. DATA PREPARATION ---
    const batchId = randomUUID();
    const transactionsToSave: Prisma.RawTransactionCreateManyInput[] = [];

    for (const [index, row] of rawData.entries()) {
      if (!row.Data && !row.Importo) continue;

      transactionsToSave.push({
        importBatchId: batchId,
        originalLine: index + 19,
        date: String(row.Data || ''),
        operation: String(row.Operazione || ''),
        details: String(row.Dettagli || ''),
        account: String(row['Conto o carta'] || ''),
        accountingStatus: String(row.Contabilizzazione || ''),
        category: String(row.Categoria || row['Categoria '] || ''),
        currency: String(row.Valuta || ''),
        amount: String(row.Importo || ''),
      });
    }

    this.logger.log(`Valid transactions to save: ${transactionsToSave.length}`);

    // --- 3. RAW SAVING ---
    if (transactionsToSave.length > 0) {
      await this.transactionsRepo.createManyRaw(transactionsToSave);
    }

    // --- 4. PYTHON INTEGRATION & ENRICHED SAVING ---
    let scienceResult: ProcessedTransactionDto[] | { error: string } | null =
      null;
    let scienceStatus = 'skipped';
    let savedEnrichedCount = 0;

    if (transactionsToSave.length > 0) {
      try {
        this.logger.log('Sending data to Science Service for processing...');

        scienceResult = await this.scienceService.processTransactions(
          transactionsToSave as unknown as RawTransaction[],
        );

        if (Array.isArray(scienceResult)) {
          scienceStatus = 'success';
          this.logger.log(
            `Science Service returned ${scienceResult.length} records. Saving in progress...`,
          );

          // MAPPING: JSON (Python) -> DB Object (Prisma)
          const enrichedToSave = scienceResult.map((item) => ({
            importBatchId: batchId, // Use the ID generated at the start
            originalLine: parseInt(item.id), // Python returns the row as a string ID
            date: new Date(item.date), // "2024-12-29" -> Date Object
            amount: item.amount,
            operation: item.operation,
            details: item.details,
            account: item.account,
            category: item.category,
            subCategory: item.subCategory,
          }));

          // WRITING TO DB
          const result =
            await this.transactionsRepo.createManyEnriched(enrichedToSave);
          savedEnrichedCount = result.count;

          this.logger.log(
            `✅ Saved ${savedEnrichedCount} enriched transactions to DB.`,
          );
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Science Service Error: ${errorMessage}`);
        scienceStatus = 'failed';
        scienceResult = { error: errorMessage };
      }
    }

    const isSuccess = Array.isArray(scienceResult);

    return {
      message: 'File processed successfully',
      rowsImported: transactionsToSave.length,
      batchId: batchId,
      science: {
        status: scienceStatus,
        processedCount: isSuccess
          ? (scienceResult as ProcessedTransactionDto[]).length
          : 0,
        savedToDb: savedEnrichedCount,
        preview: isSuccess
          ? (scienceResult as ProcessedTransactionDto[])[0]
          : null,
      },
    };
  }

  // --- READ OPERATIONS ---
  async getAllRaw() {
    try {
      return await this.transactionsRepo.findAllRaw();
    } catch (error) {
      const msg = this.getErrorMessage(error);
      this.logger.error(`Failed to fetch raw transactions: ${msg}`);
      throw new InternalServerErrorException();
    }
  }

  async getAllEnriched(filters: GetTransactionsFilterDto) {
    try {
      const { total, transactions } =
        await this.transactionsRepo.findAllEnriched(filters);
      return {
        data: transactions,
        meta: {
          total,
          page: filters.page,
          lastPage: Math.ceil(total / filters.limit),
          count: transactions.length,
        },
      };
    } catch (error) {
      const msg = this.getErrorMessage(error);
      this.logger.error(`Failed to fetch transactions: ${msg}`);
      throw new InternalServerErrorException();
    }
  }

  // --- CRUD OPERATIONS ---
  async create(dto: CreateTransactionDto): Promise<EnrichedTransaction> {
    try {
      this.logger.log(`Creating manual transaction: ${dto.details}`);

      return await this.prisma.$transaction(async (tx) => {
        // 1. Create the Transaction
        const transaction = await this.transactionsRepo.create(dto, tx);

        // 2. Update Balances
        if (transaction.assetId) {
          await this.assetsService.updateBalanceWithDelta(
            transaction.assetId,
            transaction.amount.toNumber(),
            tx,
          );
        }

        if (transaction.savingsGoalId) {
          await this.goalsService.updateProgress(
            transaction.savingsGoalId,
            transaction.amount.toNumber(),
            tx,
          );
        }

        return transaction as unknown as EnrichedTransaction;
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Create failed: ${msg}`);
      throw new InternalServerErrorException('Could not create transaction');
    }
  }

  async update(
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<EnrichedTransaction> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Retrieve old state for reversion
        const oldTx = await this.transactionsRepo.findById(id);
        if (!oldTx) {
          throw new NotFoundException(`Transaction with ID ${id} not found`);
        }

        // 2. REVERSION PHASE (Undo old balances)
        if (oldTx.assetId) {
          await this.assetsService.updateBalanceWithDelta(
            oldTx.assetId,
            oldTx.amount.toNumber() * -1,
            tx,
          );
        }

        if (oldTx.savingsGoalId) {
          await this.goalsService.updateProgress(
            oldTx.savingsGoalId,
            oldTx.amount.toNumber() * -1,
            tx,
          );
        }

        // 3. Update Transaction
        const updatedTx = await this.transactionsRepo.update(id, dto, tx);

        // 4. APPLICATION PHASE (Apply new balances)
        if (updatedTx.assetId) {
          await this.assetsService.updateBalanceWithDelta(
            updatedTx.assetId,
            updatedTx.amount.toNumber(),
            tx,
          );
        }

        if (updatedTx.savingsGoalId) {
          await this.goalsService.updateProgress(
            updatedTx.savingsGoalId,
            updatedTx.amount.toNumber(),
            tx,
          );
        }

        return updatedTx as unknown as EnrichedTransaction;
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Transaction with ID ${id} not found`);
      }

      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Update failed for ${id}: ${msg}`);
      throw new InternalServerErrorException('Could not update transaction');
    }
  }

  async delete(id: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Retrieve for reversion
        const existing = await this.transactionsRepo.findById(id);
        if (!existing) {
          throw new NotFoundException(`Transaction with ID ${id} not found`);
        }

        // 2. REVERSION PHASE
        if (existing.assetId) {
          await this.assetsService.updateBalanceWithDelta(
            existing.assetId,
            existing.amount.toNumber() * -1,
            tx,
          );
        }

        if (existing.savingsGoalId) {
          await this.goalsService.updateProgress(
            existing.savingsGoalId,
            existing.amount.toNumber() * -1,
            tx,
          );
        }

        // 3. Delete
        await this.transactionsRepo.delete(id, tx);
      });

      return {
        message: 'Transaction deleted and balances reverted successfully',
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Transaction with ID ${id} not found`);
      }

      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Delete failed for ${id}: ${msg}`);
      throw new InternalServerErrorException('Could not delete transaction');
    }
  }
}
