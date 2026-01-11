import { Injectable, Logger } from '@nestjs/common';
import { Prisma, RawTransaction } from '@prisma/client';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { TransactionsRepository } from './transactions.repository';
import { BankExportRow } from './interfaces/bank-export-row.interface';
import { ScienceService } from 'src/science/science.service';
import { ProcessedTransaction } from 'src/science/interfaces/processed-transaction.interface';
import { GetTransactionsFilterDto } from './dto/get-transactions.dto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly repository: TransactionsRepository,
    private readonly scienceService: ScienceService,
  ) {}

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
    const batchId = uuidv4();
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
      await this.repository.createManyRaw(transactionsToSave);
    }

    // --- 4. PYTHON INTEGRATION & ENRICHED SAVING ---
    let scienceResult: ProcessedTransaction[] | { error: string } | null = null;
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
          const enrichedToSave: Prisma.EnrichedTransactionCreateManyInput[] =
            scienceResult.map((item) => ({
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
            await this.repository.createManyEnriched(enrichedToSave);
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
          ? (scienceResult as ProcessedTransaction[]).length
          : 0,
        savedToDb: savedEnrichedCount,
        preview: isSuccess
          ? (scienceResult as ProcessedTransaction[])[0]
          : null,
      },
    };
  }
  async getAllTransactionsRaw() {
    return this.repository.findAllRaw();
  }

  async getTransactionsEnriched(filters: GetTransactionsFilterDto) {
    const { total, transactions } =
      await this.repository.findAllEnriched(filters);

    return {
      data: transactions,
      meta: {
        total,
        page: filters.page,
        lastPage: Math.ceil(total / filters.limit),
        count: transactions.length,
      },
    };
  }
}
