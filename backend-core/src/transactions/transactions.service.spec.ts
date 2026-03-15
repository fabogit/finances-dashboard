import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';
import { ScienceService } from '../science/science.service';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
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
    toString: () => val.toString(),
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

  describe('getErrorMessage', () => {
    it('should return error message for Error objects', () => {
      const err = new Error('Test Error');
      const result = (
        service as unknown as { getErrorMessage(e: unknown): string }
      ).getErrorMessage(err);
      expect(result).toBe('Test Error');
    });

    it('should return stringified error for non-Error objects', () => {
      const result = (
        service as unknown as { getErrorMessage(e: unknown): string }
      ).getErrorMessage('String Error');
      expect(result).toBe('String Error');
    });
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

      expect(scienceService.processTransactions).toHaveBeenCalled();

      expect(transactionsRepo.createManyEnriched).toHaveBeenCalledTimes(1);
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
      expect(result.science.status).toBe('failed');
    });
  });

  describe('getAllRaw', () => {
    it('should return all raw transactions', async () => {
      transactionsRepo.findAllRaw!.mockResolvedValue([]);
      const result = await service.getAllRaw();
      expect(result).toEqual([]);
    });

    it('should throw InternalServerErrorException on error', async () => {
      transactionsRepo.findAllRaw!.mockRejectedValue(new Error('DB Fail'));
      await expect(service.getAllRaw()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

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
    });

    it('should throw InternalServerErrorException on error', async () => {
      transactionsRepo.findAllEnriched!.mockRejectedValue(new Error('DB Fail'));
      await expect(
        service.getAllEnriched({} as GetTransactionsFilterDto),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

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
        expect(result.details).toBe('Cash');
      });

      it('should throw InternalServerErrorException on error', async () => {
        transactionsRepo.create!.mockRejectedValue(new Error('DB Fail'));
        await expect(
          service.create({} as CreateTransactionDto),
        ).rejects.toThrow(InternalServerErrorException);
      });
    });

    describe('update', () => {
      it('Should throw NotFoundException if transaction does not exist', async () => {
        const prismaError = new Prisma.PrismaClientKnownRequestError(
          'Not found',
          {
            code: 'P2025',
            clientVersion: '7.3.0',
          },
        );
        transactionsRepo.update!.mockRejectedValue(prismaError);

        await expect(
          service.update('invalid_id', { details: 'New' }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw InternalServerErrorException on other errors', async () => {
        transactionsRepo.update!.mockRejectedValue(new Error('DB Fail'));
        await expect(
          service.update('a', {} as UpdateTransactionDto),
        ).rejects.toThrow(InternalServerErrorException);
      });

      it('Should update existing transaction', async () => {
        transactionsRepo.update!.mockResolvedValue({
          ...mockExistingTx,
          details: 'Updated',
        });
        const result = await service.update('tx_123', { details: 'Updated' });
        expect(result.details).toBe('Updated');
      });
    });

    describe('delete', () => {
      it('Should throw NotFoundException if transaction does not exist', async () => {
        const prismaError = new Prisma.PrismaClientKnownRequestError(
          'Not found',
          {
            code: 'P2025',
            clientVersion: '7.3.0',
          },
        );
        transactionsRepo.delete!.mockRejectedValue(prismaError);

        await expect(service.delete('invalid_id')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should throw InternalServerErrorException on other errors', async () => {
        transactionsRepo.delete!.mockRejectedValue(new Error('DB Fail'));
        await expect(service.delete('a')).rejects.toThrow(
          InternalServerErrorException,
        );
      });

      it('Should delete existing transaction', async () => {
        transactionsRepo.delete!.mockResolvedValue(mockExistingTx);
        const result = await service.delete('tx_123');
        expect(result.message).toContain('deleted');
      });
    });
  });
});
