import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { randomUUID, createHash } from 'crypto';
import { TransactionsRepository } from './transactions.repository';
import { ScienceService } from '../science/science.service';
import { BankExportRow } from './interfaces/bank-export-row.interface';
import { UploadScienceResult } from './interfaces/upload-science-result.interface';
import { GetTransactionsFilterDto } from './dto/get-transactions.dto';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
} from './dto/create-update-transaction.dto';
import { AssetsService } from '../assets/assets.service';
import { GoalsService } from '../goals/goals.service';
import { PrismaService } from '../../prisma/prisma.service';

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

  private generateTransactionHash(tx: {
    date: Date;
    amount: number | string | Prisma.Decimal;
    details?: string | null;
    account?: string | null;
    operation?: string | null;
  }): string {
    const details = tx.details || '';
    const account = tx.account || '';
    const operation = tx.operation || '';
    const dateStr = tx.date.toISOString().split('T')[0];
    const amountStr = String(tx.amount);

    const input = `${dateStr}|${amountStr}|${details}|${account}|${operation}`;
    return createHash('sha256').update(input).digest('hex');
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
    let scienceResult: UploadScienceResult = { status: 'skipped' };
    let savedEnrichedCount = 0;

    if (transactionsToSave.length > 0) {
      try {
        this.logger.log('Sending data to Science Service for processing...');

        const resultData =
          await this.scienceService.processTransactions(transactionsToSave);

        scienceResult = { status: 'success', data: resultData };
        this.logger.log(
          `Science Service returned ${resultData.length} records. Saving in progress...`,
        );

        // MAPPING: JSON (Python) -> DB Object (Prisma)
        const enrichedToSave = resultData.map((item) => {
          const dateObj = new Date(item.date);
          const hash = this.generateTransactionHash({
            date: dateObj,
            amount: item.amount,
            details: item.details,
            account: item.account,
            operation: item.operation,
          });

          return {
            importBatchId: batchId, // Use the ID generated at the start
            originalLine: parseInt(item.id), // Python returns the row as a string ID
            date: dateObj, // "2024-12-29" -> Date Object
            amount: item.amount,
            operation: item.operation,
            details: item.details,
            account: item.account,
            category: item.category,
            subCategory: item.subCategory,
            transactionHash: hash,
          };
        });

        // FILTER DUPLICATES
        const hashes = enrichedToSave.map((tx) => tx.transactionHash);
        const existingTransactions =
          (await this.prisma.enrichedTransaction.findMany({
            where: { transactionHash: { in: hashes } },
            select: { transactionHash: true },
          })) as { transactionHash: string | null }[];
        const existingHashes = new Set(
          existingTransactions
            .map((tx) => tx.transactionHash)
            .filter((h): h is string => h !== null),
        );

        const nonDuplicateEnriched = enrichedToSave.filter(
          (tx) => !existingHashes.has(tx.transactionHash),
        );

        // WRITING TO DB (with ACID transaction)
        await this.prisma.$transaction(async (tx) => {
          let result = { count: 0 };
          if (nonDuplicateEnriched.length > 0) {
            result = await this.transactionsRepo.createManyEnriched(
              nonDuplicateEnriched,
              tx,
            );

            if (result.count > 0) {
              // 1. Group deltas by asset in the database
              const assetDeltas =
                await this.transactionsRepo.getAssetDeltasByBatchId(
                  batchId,
                  tx,
                );

              // 2. Group deltas by goal in the database
              const goalDeltas =
                await this.transactionsRepo.getGoalDeltasByBatchId(batchId, tx);

              // Apply asset balance updates
              for (const group of assetDeltas) {
                if (group.assetId && group._sum.amount) {
                  await this.assetsService.updateBalanceWithDelta(
                    group.assetId,
                    group._sum.amount,
                    tx,
                  );
                }
              }

              // Apply goal progress updates
              for (const group of goalDeltas) {
                if (group.savingsGoalId && group._sum.amount) {
                  await this.goalsService.updateProgress(
                    group.savingsGoalId,
                    group._sum.amount,
                    tx,
                  );
                }
              }
            }
          }
          savedEnrichedCount = result.count;
        });

        this.logger.log(
          `✅ Saved ${savedEnrichedCount} enriched transactions to DB.`,
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Science Service Error: ${errorMessage}`);
        scienceResult = { status: 'failed', error: errorMessage };
      }
    }

    return {
      message: 'File processed successfully',
      rowsImported: transactionsToSave.length,
      batchId: batchId,
      science: {
        status: scienceResult.status,
        processedCount:
          scienceResult.status === 'success' ? scienceResult.data.length : 0,
        savedToDb: savedEnrichedCount,
        preview:
          scienceResult.status === 'success' ? scienceResult.data[0] : null,
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
  async create(dto: CreateTransactionDto) {
    try {
      this.logger.log(`Creating manual transaction: ${dto.details}`);

      return await this.prisma.$transaction(async (tx) => {
        // 1. Create the Transaction
        const transaction = await this.transactionsRepo.create(dto, tx);

        // 2. Update Balances
        if (transaction.assetId) {
          await this.assetsService.updateBalanceWithDelta(
            transaction.assetId,
            transaction.amount,
            tx,
          );
        }

        if (transaction.savingsGoalId) {
          await this.goalsService.updateProgress(
            transaction.savingsGoalId,
            transaction.amount,
            tx,
          );
        }

        return transaction;
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Create failed: ${msg}`);
      throw new InternalServerErrorException('Could not create transaction');
    }
  }

  async update(id: string, dto: UpdateTransactionDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Retrieve old state for comparison
        const oldTx = await this.transactionsRepo.findById(id);
        if (!oldTx) {
          throw new NotFoundException(`Transaction with ID ${id} not found`);
        }

        // 2. Perform Update (within transaction)
        const updatedTx = await this.transactionsRepo.update(id, dto, tx);

        // 3. Optimized Asset Balance Update
        const oldAssetId = oldTx.assetId;
        const newAssetId = updatedTx.assetId;
        const oldAmount = oldTx.amount;
        const newAmount = updatedTx.amount;

        if (oldAssetId === newAssetId) {
          // If asset is the same, only update if the amount changed
          if (oldAssetId && !oldAmount.equals(newAmount)) {
            const assetDelta = newAmount.minus(oldAmount);
            await this.assetsService.updateBalanceWithDelta(
              oldAssetId,
              assetDelta,
              tx,
            );
          }
        } else {
          // If asset changed, revert old asset and apply to new asset
          if (oldAssetId) {
            await this.assetsService.updateBalanceWithDelta(
              oldAssetId,
              oldAmount.negated(),
              tx,
            );
          }
          if (newAssetId) {
            await this.assetsService.updateBalanceWithDelta(
              newAssetId,
              newAmount,
              tx,
            );
          }
        }

        // 4. Optimized Savings Goal Progress Update
        const oldGoalId = oldTx.savingsGoalId;
        const newGoalId = updatedTx.savingsGoalId;

        if (oldGoalId === newGoalId) {
          // If goal is the same, only update if the amount changed
          if (oldGoalId && !oldAmount.equals(newAmount)) {
            const goalDelta = newAmount.minus(oldAmount);
            await this.goalsService.updateProgress(oldGoalId, goalDelta, tx);
          }
        } else {
          // If goal changed, revert old goal and apply to new goal
          if (oldGoalId) {
            await this.goalsService.updateProgress(
              oldGoalId,
              oldAmount.negated(),
              tx,
            );
          }
          if (newGoalId) {
            await this.goalsService.updateProgress(newGoalId, newAmount, tx);
          }
        }

        return updatedTx;
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
            existing.amount.negated(),
            tx,
          );
        }

        if (existing.savingsGoalId) {
          await this.goalsService.updateProgress(
            existing.savingsGoalId,
            existing.amount.negated(),
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
