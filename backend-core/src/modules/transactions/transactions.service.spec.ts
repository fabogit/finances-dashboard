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
import { AssetsService } from '../assets/assets.service';
import { GoalsService } from '../goals/goals.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-update-transaction.dto';
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
  getAssetDeltasByBatchId: jest.fn().mockResolvedValue([]),
  getGoalDeltasByBatchId: jest.fn().mockResolvedValue([]),
});

const createScienceMock = (): MockRepository<ScienceService> => ({
  processTransactions: jest.fn(),
});

const mkDecimal = (val: number): Prisma.Decimal => new Prisma.Decimal(val);

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
  let assetsService: AssetsService;
  let goalsService: GoalsService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: TransactionsRepository, useFactory: createTransactionsMock },
        { provide: ScienceService, useFactory: createScienceMock },
        {
          provide: AssetsService,
          useValue: { updateBalanceWithDelta: jest.fn() },
        },
        { provide: GoalsService, useValue: { updateProgress: jest.fn() } },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(
              (
                cb: (tx: {
                  enrichedTransaction: { groupBy: jest.Mock };
                }) => Promise<unknown>,
              ) => {
                const mockTx = {
                  enrichedTransaction: {
                    groupBy: jest.fn().mockResolvedValue([]),
                  },
                };
                return cb(mockTx);
              },
            ),
            enrichedTransaction: {
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionsRepo = module.get(TransactionsRepository);
    scienceService = module.get(ScienceService);
    assetsService = module.get<AssetsService>(AssetsService);
    goalsService = module.get<GoalsService>(GoalsService);
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

    it('Should FILTER OUT duplicate transactions and not save them', async () => {
      const buffer = createMockExcelBuffer([rawExcelRow]);
      const mockFile = { buffer, size: buffer.length } as Express.Multer.File;

      const prismaMock = service['prisma'] as unknown as {
        enrichedTransaction: {
          findMany: jest.Mock;
        };
      };

      const expectedHash = (
        service as unknown as {
          generateTransactionHash(tx: {
            date: Date;
            amount: number;
            details: string;
            account: string;
            operation: string;
          }): string;
        }
      ).generateTransactionHash({
        date: new Date('2025-01-01'),
        amount: -50.5,
        details: 'Test Store',
        account: 'MyBank',
        operation: 'POS',
      });

      prismaMock.enrichedTransaction.findMany.mockResolvedValue([
        { transactionHash: expectedHash },
      ]);

      transactionsRepo.createManyRaw!.mockResolvedValue({ count: 1 });

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
      expect(transactionsRepo.createManyEnriched).not.toHaveBeenCalled();
      expect(result.science.savedToDb).toBe(0);
    });

    it('Should trigger asset and goal balance updates during import when enriched transactions are saved', async () => {
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

      const prismaService = module.get(PrismaService);
      jest.spyOn(prismaService, '$transaction').mockImplementation((cb) => {
        const mockTx = {} as unknown as Prisma.TransactionClient;
        return cb(mockTx);
      });

      transactionsRepo.getAssetDeltasByBatchId!.mockResolvedValue([
        {
          assetId: 'asset_1',
          _sum: { amount: new Prisma.Decimal(-50.5) },
        },
      ]);
      transactionsRepo.getGoalDeltasByBatchId!.mockResolvedValue([
        {
          savingsGoalId: 'goal_1',
          _sum: { amount: new Prisma.Decimal(-50.5) },
        },
      ]);

      const result = await service.uploadFile(mockFile);

      expect(result.science.savedToDb).toBe(1);
      expect(assetsService['updateBalanceWithDelta']).toHaveBeenCalledWith(
        'asset_1',
        new Prisma.Decimal(-50.5),
        expect.any(Object),
      );
      expect(goalsService['updateProgress']).toHaveBeenCalledWith(
        'goal_1',
        new Prisma.Decimal(-50.5),
        expect.any(Object),
      );
    });

    it('Should NOT trigger balance updates if no new enriched transactions are saved', async () => {
      const buffer = createMockExcelBuffer([rawExcelRow]);
      const mockFile = { buffer, size: buffer.length } as Express.Multer.File;

      transactionsRepo.createManyRaw!.mockResolvedValue({ count: 1 });
      transactionsRepo.createManyEnriched!.mockResolvedValue({ count: 0 });

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

      const prismaService = module.get(PrismaService);
      const transactionSpy = jest.spyOn(prismaService, '$transaction');

      const result = await service.uploadFile(mockFile);

      expect(result.science.savedToDb).toBe(0);
      expect(transactionSpy).toHaveBeenCalled();
      expect(assetsService['updateBalanceWithDelta']).not.toHaveBeenCalled();
      expect(goalsService['updateProgress']).not.toHaveBeenCalled();
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

      it('should call updateBalanceWithDelta and updateProgress on creation if assetId and savingsGoalId are present', async () => {
        const dto: CreateTransactionDto = {
          date: new Date(),
          amount: -25,
          operation: 'Manual',
          details: 'Test manual creation',
          category: 'Food',
          account: 'Wallet',
          assetId: 'asset_1',
          savingsGoalId: 'goal_1',
        };

        transactionsRepo.create!.mockResolvedValue({
          ...mockExistingTx,
          assetId: 'asset_1',
          savingsGoalId: 'goal_1',
          amount: mkDecimal(-25),
        });

        await service.create(dto);

        expect(assetsService['updateBalanceWithDelta']).toHaveBeenCalledWith(
          'asset_1',
          mkDecimal(-25),
          expect.any(Object),
        );
        expect(goalsService['updateProgress']).toHaveBeenCalledWith(
          'goal_1',
          mkDecimal(-25),
          expect.any(Object),
        );
      });

      it('should throw InternalServerErrorException and abort if asset balance update fails', async () => {
        const dto: CreateTransactionDto = {
          date: new Date(),
          amount: -25,
          operation: 'Manual',
          details: 'Test manual creation',
          category: 'Food',
          account: 'Wallet',
          assetId: 'asset_1',
        };

        transactionsRepo.create!.mockResolvedValue({
          ...mockExistingTx,
          assetId: 'asset_1',
          amount: mkDecimal(-25),
        });

        (assetsService.updateBalanceWithDelta as jest.Mock).mockRejectedValue(
          new Error('Asset balance update failed'),
        );

        await expect(service.create(dto)).rejects.toThrow(
          InternalServerErrorException,
        );
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
            clientVersion: '7.x',
          },
        );
        transactionsRepo.update!.mockRejectedValue(prismaError);

        await expect(
          service.update('invalid_id', { details: 'New' }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw InternalServerErrorException on other errors', async () => {
        transactionsRepo.findById!.mockResolvedValue(mockExistingTx);
        transactionsRepo.update!.mockRejectedValue(new Error('DB Fail'));
        await expect(service.update('a', {})).rejects.toThrow(
          InternalServerErrorException,
        );
      });

      it('Should update existing transaction', async () => {
        transactionsRepo.findById!.mockResolvedValue(mockExistingTx);
        transactionsRepo.update!.mockResolvedValue({
          ...mockExistingTx,
          details: 'Updated',
        });
        const result = await service.update('tx_123', { details: 'Updated' });
        expect(result.details).toBe('Updated');
      });

      it('should update balance with delta once if assetId and savingsGoalId remain the same but amount changes', async () => {
        transactionsRepo.findById!.mockResolvedValue({
          ...mockExistingTx,
          assetId: 'asset_1',
          savingsGoalId: 'goal_1',
          amount: mkDecimal(-50),
        });

        transactionsRepo.update!.mockResolvedValue({
          ...mockExistingTx,
          assetId: 'asset_1',
          savingsGoalId: 'goal_1',
          amount: mkDecimal(-30),
        });

        await service.update('tx_123', {
          amount: -30,
        });

        // Verify it calls updateBalanceWithDelta only ONCE with delta of +20
        expect(assetsService['updateBalanceWithDelta']).toHaveBeenCalledTimes(
          1,
        );
        expect(assetsService['updateBalanceWithDelta']).toHaveBeenCalledWith(
          'asset_1',
          mkDecimal(20), // -30 - (-50)
          expect.any(Object),
        );

        expect(goalsService['updateProgress']).toHaveBeenCalledTimes(1);
        expect(goalsService['updateProgress']).toHaveBeenCalledWith(
          'goal_1',
          mkDecimal(20),
          expect.any(Object),
        );
      });

      it('should not call updateBalanceWithDelta or updateProgress if asset, goal and amount are unchanged', async () => {
        transactionsRepo.findById!.mockResolvedValue({
          ...mockExistingTx,
          assetId: 'asset_1',
          savingsGoalId: 'goal_1',
          amount: mkDecimal(-50),
        });

        transactionsRepo.update!.mockResolvedValue({
          ...mockExistingTx,
          assetId: 'asset_1',
          savingsGoalId: 'goal_1',
          amount: mkDecimal(-50),
          details: 'Updated details only',
        });

        await service.update('tx_123', {
          details: 'Updated details only',
        });

        expect(assetsService['updateBalanceWithDelta']).not.toHaveBeenCalled();
        expect(goalsService['updateProgress']).not.toHaveBeenCalled();
      });

      it('should revert old balances and apply new ones, even if assetId and savingsGoalId change', async () => {
        transactionsRepo.findById!.mockResolvedValue({
          ...mockExistingTx,
          assetId: 'asset_old',
          savingsGoalId: 'goal_old',
          amount: mkDecimal(-50),
        });

        transactionsRepo.update!.mockResolvedValue({
          ...mockExistingTx,
          assetId: 'asset_new',
          savingsGoalId: 'goal_new',
          amount: mkDecimal(-30),
        });

        await service.update('tx_123', {
          amount: -30,
          assetId: 'asset_new',
          savingsGoalId: 'goal_new',
        });

        // 1. Revert Old Balance
        expect(assetsService['updateBalanceWithDelta']).toHaveBeenNthCalledWith(
          1,
          'asset_old',
          mkDecimal(50), // -(-50)
          expect.any(Object),
        );
        expect(goalsService['updateProgress']).toHaveBeenNthCalledWith(
          1,
          'goal_old',
          mkDecimal(50), // -(-50)
          expect.any(Object),
        );

        // 2. Apply New Balance
        expect(assetsService['updateBalanceWithDelta']).toHaveBeenNthCalledWith(
          2,
          'asset_new',
          mkDecimal(-30),
          expect.any(Object),
        );
        expect(goalsService['updateProgress']).toHaveBeenNthCalledWith(
          2,
          'goal_new',
          mkDecimal(-30),
          expect.any(Object),
        );
      });
    });

    describe('delete', () => {
      it('Should throw NotFoundException if transaction does not exist', async () => {
        const prismaError = new Prisma.PrismaClientKnownRequestError(
          'Not found',
          {
            code: 'P2025',
            clientVersion: '7.x',
          },
        );
        transactionsRepo.delete!.mockRejectedValue(prismaError);

        await expect(service.delete('invalid_id')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should throw InternalServerErrorException on other errors', async () => {
        transactionsRepo.findById!.mockResolvedValue(mockExistingTx);
        transactionsRepo.delete!.mockRejectedValue(new Error('DB Fail'));
        await expect(service.delete('a')).rejects.toThrow(
          InternalServerErrorException,
        );
      });

      it('Should delete existing transaction', async () => {
        transactionsRepo.findById!.mockResolvedValue(mockExistingTx);
        transactionsRepo.delete!.mockResolvedValue(mockExistingTx);
        const result = await service.delete('tx_123');
        expect(result.message).toContain('deleted');
      });

      it('should revert asset balance and goal progress on deletion', async () => {
        transactionsRepo.findById!.mockResolvedValue({
          ...mockExistingTx,
          assetId: 'asset_1',
          savingsGoalId: 'goal_1',
          amount: mkDecimal(-50),
        });

        await service.delete('tx_123');

        expect(assetsService['updateBalanceWithDelta']).toHaveBeenCalledWith(
          'asset_1',
          mkDecimal(50),
          expect.any(Object),
        );
        expect(goalsService['updateProgress']).toHaveBeenCalledWith(
          'goal_1',
          mkDecimal(50),
          expect.any(Object),
        );
      });
    });
  });
});
