import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';
import { ScienceService } from '../science/science.service';
import { NotFoundException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
} from './dto/create-update-transaction.dto';
import { ProcessedTransactionDto } from '../science/dto/processed-transaction.dto';
import {
  GetTransactionsFilterDto,
  GroupByOption,
  SortOrder,
} from './dto/get-transactions.dto';

type MockRepository<T> = {
  [P in keyof T]?: jest.Mock;
};

type ActualEnrichedInput = Prisma.EnrichedTransactionCreateManyInput & {
  category?: string;
  subCategory?: string;
};

const createTransactionsMock = (): MockRepository<TransactionsRepository> => ({
  createManyRaw: jest.fn(),
  createManyEnriched: jest.fn(),
  findAllRaw: jest.fn(),
  findAllEnriched: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

const createScienceMock = (): MockRepository<ScienceService> => ({
  processTransactions: jest.fn(),
});

const mkDecimal = (val: number): Prisma.Decimal =>
  ({
    toNumber: () => val,
    toFixed: (d?: number) => val.toFixed(d),
    equals: (other: Prisma.Decimal) => val === other.toNumber(),
  }) as unknown as Prisma.Decimal;

const createMockExcelBuffer = (rows: Record<string, unknown>[]): Buffer => {
  const worksheet = XLSX.utils.json_to_sheet([]);
  XLSX.utils.sheet_add_json(worksheet, rows, { origin: 'A19' });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
};

const mockExistingTx = {
  id: 'tx_123',
  importBatchId: 'batch_1',
  date: new Date('2025-01-01'),
  amount: mkDecimal(-50.5),
  operation: 'POS',
  details: 'Supermarket',
  account: 'Main Account',
  category: 'Groceries',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionsRepo: MockRepository<TransactionsRepository>;
  let scienceService: MockRepository<ScienceService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: TransactionsRepository, useFactory: createTransactionsMock },
        { provide: ScienceService, useFactory: createScienceMock },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionsRepo = module.get(TransactionsRepository);
    scienceService = module.get(ScienceService);
  });

  describe('uploadFile', () => {
    const rawExcelRow = {
      Data: '2025-01-01',
      Importo: -50.5,
      Operazione: 'POS',
      Dettagli: 'Test Store',
      'Conto o carta': 'MyBank',
    };

    it('Should PROCESS valid Excel file and SAVE enriched data when Science is UP', async () => {
      const buffer = createMockExcelBuffer([rawExcelRow]);
      const mockFile = { buffer, size: buffer.length } as Express.Multer.File;

      transactionsRepo.createManyRaw!.mockResolvedValue({ count: 1 });
      transactionsRepo.createManyEnriched!.mockResolvedValue({ count: 1 });

      const scienceResponse: ProcessedTransactionDto[] = [
        {
          id: '19',
          date: '2025-01-01',
          amount: -50.5,
          operation: 'POS',
          details: 'Test Store',
          account: 'MyBank',
          category: 'Shopping',
          subCategory: 'Groceries',
        },
      ];
      scienceService.processTransactions!.mockResolvedValue(scienceResponse);

      const result = await service.uploadFile(mockFile);

      expect(transactionsRepo.createManyRaw).toHaveBeenCalledTimes(1);

      const rawCalls = transactionsRepo.createManyRaw!.mock.calls as [
        Prisma.RawTransactionCreateManyInput[],
      ][];
      const rawArgs = rawCalls[0][0];

      expect(rawArgs).toHaveLength(1);
      expect(rawArgs[0].details).toBe('Test Store');

      expect(scienceService.processTransactions).toHaveBeenCalled();
      expect(transactionsRepo.createManyEnriched).toHaveBeenCalledTimes(1);

      const enrichedCalls = transactionsRepo.createManyEnriched!.mock.calls as [
        ActualEnrichedInput[],
      ][];
      const enrichedArgs = enrichedCalls[0][0];

      expect(enrichedArgs).toHaveLength(1);
      expect(enrichedArgs[0].category).toBe('Shopping');
      expect(enrichedArgs[0].subCategory).toBe('Groceries');

      expect(result.science.status).toBe('success');
    });

    it('Should HANDLE Science failure (save RAW only)', async () => {
      const buffer = createMockExcelBuffer([rawExcelRow]);
      const mockFile = { buffer, size: buffer.length } as Express.Multer.File;

      transactionsRepo.createManyRaw!.mockResolvedValue({ count: 1 });
      scienceService.processTransactions!.mockRejectedValue(
        new Error('Service Unavailable'),
      );

      const result = await service.uploadFile(mockFile);

      expect(transactionsRepo.createManyRaw).toHaveBeenCalled();
      expect(transactionsRepo.createManyEnriched).not.toHaveBeenCalled();

      expect(result.science.status).toBe('failed');
      expect(result.rowsImported).toBe(1);
    });
  });

  // --- READ OPERATIONS ---
  describe('getAllEnriched', () => {
    it('should return paginated metadata', async () => {
      const filters: GetTransactionsFilterDto = {
        page: 1,
        limit: 10,
        sortBy: 'date',
        sortOrder: SortOrder.DESC,
        groupBy: GroupByOption.CATEGORY,
      };

      transactionsRepo.findAllEnriched!.mockResolvedValue({
        transactions: [mockExistingTx],
        total: 50,
      });

      const result = await service.getAllEnriched(filters);

      expect(result.meta.total).toBe(50);
      expect(result.data).toHaveLength(1);
      expect(transactionsRepo.findAllEnriched).toHaveBeenCalledWith(filters);
    });
  });

  // --- CRUD OPERATIONS ---
  describe('CRUD', () => {
    describe('create', () => {
      it('Should create a transaction successfully', async () => {
        const dto: CreateTransactionDto = {
          date: new Date(),
          amount: -20,
          operation: 'Manual',
          details: 'Cash',
          category: 'Food',
          account: 'Wallet',
        };

        transactionsRepo.create!.mockResolvedValue({
          ...mockExistingTx,
          amount: mkDecimal(-20),
          details: 'Cash',
        });

        const result = await service.create(dto);

        expect(transactionsRepo.create).toHaveBeenCalledWith(dto);
        expect(result.details).toBe('Cash');
      });
    });

    describe('update', () => {
      it('Should throw NotFoundException if transaction does not exist', async () => {
        transactionsRepo.findById!.mockResolvedValue(null);

        await expect(
          service.update('invalid_id', { details: 'New' }),
        ).rejects.toThrow(NotFoundException);
      });

      it('Should update existing transaction', async () => {
        const updateDto: UpdateTransactionDto = { details: 'Updated' };

        transactionsRepo.findById!.mockResolvedValue(mockExistingTx);
        transactionsRepo.update!.mockResolvedValue({
          ...mockExistingTx,
          details: 'Updated',
        });

        const result = await service.update('tx_123', updateDto);

        expect(transactionsRepo.update).toHaveBeenCalledWith(
          'tx_123',
          updateDto,
        );
        expect(result.details).toBe('Updated');
      });
    });

    describe('delete', () => {
      it('Should throw NotFoundException if transaction does not exist', async () => {
        transactionsRepo.findById!.mockResolvedValue(null);

        await expect(service.delete('invalid_id')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('Should delete existing transaction', async () => {
        transactionsRepo.findById!.mockResolvedValue(mockExistingTx);
        transactionsRepo.delete!.mockResolvedValue(mockExistingTx);

        await service.delete('tx_123');

        expect(transactionsRepo.delete).toHaveBeenCalledWith('tx_123');
      });
    });
  });
});
