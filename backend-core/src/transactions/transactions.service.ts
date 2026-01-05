import { Injectable, Logger } from '@nestjs/common';
import { Prisma, RawTransaction } from '@prisma/client';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { TransactionsRepository } from './transactions.repository';
import { BankExportRow } from './interfaces/bank-export-row.interface';
import { ScienceService } from 'src/science/science.service';
import { ProcessedTransaction } from 'src/science/interfaces/processed-transaction.interface';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly repository: TransactionsRepository,
    private readonly scienceService: ScienceService,
  ) {}

  async uploadFile(file: Express.Multer.File) {
    this.logger.log(`Inizio elaborazione file. Dimensione: ${file.size} bytes`);

    // --- 1. PARSING EXCEL ---
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

    // --- 2. PREPARAZIONE DATI ---
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

    // --- 3. SALVATAGGIO RAW ---
    if (transactionsToSave.length > 0) {
      await this.repository.createManyRaw(transactionsToSave);
    }

    // --- 4. INTEGRAZIONE PYTHON ---
    // Definiamo esplicitamente il tipo: può essere Array, Oggetto Errore o Null
    let scienceResult: ProcessedTransaction[] | { error: string } | null = null;
    let scienceStatus = 'skipped';

    if (transactionsToSave.length > 0) {
      try {
        this.logger.log('Invio dati al Science Service per il processing...');

        scienceResult = await this.scienceService.processTransactions(
          transactionsToSave as unknown as RawTransaction[],
        );

        scienceStatus = 'success';
        this.logger.log(
          `Science Service ha restituito ${scienceResult.length} record puliti.`,
        );
      } catch (error: unknown) {
        // Gestione sicura dell'errore (evitiamo unsafe access a .message)
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        this.logger.error(`Errore Science Service: ${errorMessage}`);
        scienceStatus = 'failed';
        scienceResult = { error: errorMessage };
      }
    }

    // Helper per verificare se il risultato è un array valido (Type Guard)
    const isSuccess = Array.isArray(scienceResult);

    return {
      message: 'File processed successfully',
      rowsImported: transactionsToSave.length,
      batchId: batchId,
      science: {
        status: scienceStatus,
        // Ora TypeScript sa che se isSuccess è true, scienceResult è un array e ha .length
        processedCount: isSuccess
          ? (scienceResult as ProcessedTransaction[]).length
          : 0,
        preview: isSuccess
          ? (scienceResult as ProcessedTransaction[])[0]
          : null,
      },
    };
  }

  async getAllTransactions() {
    return this.repository.findAllRaw();
  }
}
