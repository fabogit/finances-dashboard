import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsRepository } from './transactions.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetsRepository } from '../assets/assets.repository';
import { GoalsRepository } from '../goals/goals.repository';
import { Prisma } from '@prisma/client';
import { GetTransactionsFilterDto } from './dto/get-transactions.dto';
import { EnrichedDataInput } from './interfaces/enriched-data-input.interface';

describe('TransactionsRepository', () => {
  let repository: TransactionsRepository;

  const mockPrisma = {
    category: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
    },
    enrichedTransaction: {
      createMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises || [])),
  };

  const mockAssetsRepo = {
    updateBalanceWithDelta: jest.fn(),
  };

  const mockGoalsRepo = {
    updateProgress: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsRepository,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AssetsRepository, useValue: mockAssetsRepo },
        { provide: GoalsRepository, useValue: mockGoalsRepo },
      ],
    }).compile();

    repository = module.get<TransactionsRepository>(TransactionsRepository);
  });

  describe('resolveCategoryId', () => {
    it('should return existing macro category ID', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({
        id: 'cat-1',
      });
      const id = await repository.resolveCategoryId('Food');
      expect(id).toBe('cat-1');
      expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
        where: { name: 'Food', parentId: null },
      });
    });

    it('should create new macro category if not exists', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue({
        id: 'new-cat',
      });

      const id = await repository.resolveCategoryId('NewCategory');
      expect(id).toBe('new-cat');
      expect(mockPrisma.category.create).toHaveBeenCalled();
    });

    it('should resolve subcategory', async () => {
      const findFirstMock = mockPrisma.category.findFirst;
      findFirstMock
        .mockResolvedValueOnce({ id: 'parent-id' }) // Macro
        .mockResolvedValueOnce({ id: 'sub-id' }); // Sub

      const id = await repository.resolveCategoryId('Home', 'Rent');
      expect(id).toBe('sub-id');
    });
  });

  describe('buildWhereClause', () => {
    it('should build simple date range filters', () => {
      const filters = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };
      const where = repository.buildWhereClause(
        filters as GetTransactionsFilterDto,
      );
      expect(where).toEqual({
        AND: [
          { date: { gte: filters.startDate } },
          { date: { lte: filters.endDate } },
        ],
      });
    });
  });

  describe('createManyEnriched', () => {
    it('should pre-process categories and call createMany', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({
        id: 'uncategorized',
      });
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.enrichedTransaction.createMany.mockResolvedValue({ count: 2 });

      const data = [
        {
          importBatchId: 'b1',
          originalLine: 1,
          date: new Date(),
          amount: 10,
          category: 'Food',
          details: 'A',
          account: 'X',
        },
        {
          importBatchId: 'b1',
          originalLine: 2,
          date: new Date(),
          amount: 20,
          category: 'Tech',
          details: 'B',
          account: 'Y',
        },
      ];

      await repository.createManyEnriched(data as EnrichedDataInput[]);
      const createManyMock = mockPrisma.enrichedTransaction.createMany;
      expect(createManyMock.mock.calls.length).toBe(1);
      const callArgs = createManyMock.mock.calls[0] as unknown[];
      const firstArg = callArgs[0] as {
        data: Prisma.EnrichedTransactionCreateManyInput[];
      };
      expect(firstArg.data).toHaveLength(2);
      expect(firstArg.data[0].amount).toBeInstanceOf(Prisma.Decimal);
    });
  });
});
