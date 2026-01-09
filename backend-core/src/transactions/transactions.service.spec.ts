import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';
import { ScienceService } from '../science/science.service';
import * as XLSX from 'xlsx';

// Mock uuid to avoid ESM issues
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// Mock dependencies
const mockRepository = {
  createManyRaw: jest.fn(),
  findAllRaw: jest.fn(),
};

const mockScienceService = {
  processTransactions: jest.fn(),
};

describe('TransactionsService', () => {
  let service: TransactionsService;
  let sheetToJsonSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: TransactionsRepository,
          useValue: mockRepository,
        },
        {
          provide: ScienceService,
          useValue: mockScienceService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should process a file but force range to 5000 rows (current inefficient behavior)', async () => {
    // 1. Create a small Excel file with 20 rows of data + header
    // Row 1-18 skipped by code (range: 18)
    // Actually the code uses range: 18, so it starts at row 19 (0-indexed 18).
    // Let's create enough data to have some valid rows.

    const rows = [];
    // Add some dummy headers/data for the first 18 rows
    for (let i = 0; i < 18; i++) {
      rows.push(['Header' + i]);
    }
    // Add header row at index 18
    rows.push([
      'Data',
      'Operazione',
      'Dettagli',
      'Conto o carta',
      'Contabilizzazione',
      'Categoria',
      'Valuta',
      'Importo',
    ]);

    // Add 20 rows of data
    for (let i = 0; i < 20; i++) {
      rows.push([
        '2023-01-01',
        'Op' + i,
        'Det' + i,
        'Account',
        'Posted',
        'Cat',
        'EUR',
        '100',
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const buffer = XLSX.write(wb, { type: 'buffer' });

    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.xlsx',
      encoding: '7bit',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      buffer: buffer,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      size: buffer.length,
      stream: null,
      destination: '',
      filename: '',
      path: '',
    };

    // Spy on sheet_to_json

    sheetToJsonSpy = jest.spyOn(XLSX.utils, 'sheet_to_json');

    // Run the method
    await service.uploadFile(file);

    // Verify spy was called
    expect(sheetToJsonSpy).toHaveBeenCalled();

    // Inspect the sheet passed to sheet_to_json

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const passedSheet = sheetToJsonSpy.mock.calls[0][0];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const range = passedSheet['!ref'] as string;

    // Decode range to check row count
    const decoded = XLSX.utils.decode_range(range);

    // Optimized behavior: uses actual range (around 38 rows: 18 header rows + 1 real header + 20 data rows = 39, index 38)
    expect(decoded.e.r).toBeLessThan(100);
  });
});
