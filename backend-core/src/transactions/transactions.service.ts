import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { TransactionsRepository } from './transactions.repository';
import { BankExportRow } from './interfaces/bank-export-row.interface';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(private readonly repository: TransactionsRepository) {}

  async uploadFile(file: Express.Multer.File) {
    this.logger.log(`Inizio elaborazione file. Dimensione: ${file.size} bytes`);

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rangeRef = sheet['!ref'] || 'A1:Z1';
    const maxRangeOverride = XLSX.utils.decode_range(rangeRef);

    this.logger.warn(`File metadata range: ${rangeRef}.`);

    maxRangeOverride.e.r = 5000;
    sheet['!ref'] = XLSX.utils.encode_range(maxRangeOverride);

    this.logger.debug(`Range overidden to: ${sheet['!ref']}`);

    const rawData = XLSX.utils.sheet_to_json<BankExportRow>(sheet, {
      range: 18,
      defval: null,
    });

    this.logger.log(`Total XLSX (post-fix): ${rawData.length}`);

    const batchId = uuidv4();
    const transactionsToSave: Prisma.RawTransactionCreateManyInput[] = [];

    for (const [index, row] of rawData.entries()) {
      if (!row.Data && !row.Importo) {
        this.logger.warn(
          `Row ${index + 19} skipped: NO data. Row dump: ${JSON.stringify(row)}`,
        );
        continue;
      }

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

    if (transactionsToSave.length > 0) {
      await this.repository.createManyRaw(transactionsToSave);
    }

    return {
      message: 'File processed successfully',
      rowsImported: transactionsToSave.length,
      batchId: batchId,
      // debugInfo: {
      //   totalRowsRead: rawData.length,
      //   firstRow: rawData[0],
      //   lastRow: rawData[rawData.length - 1],
      // },
    };
  }

  async getAllTransactions() {
    return this.repository.findAllRaw();
  }
}
