import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsRepository } from './analytics.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('AnalyticsRepository', () => {
  let repository: AnalyticsRepository;

  const mockPrisma = {
    enrichedTransaction: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<AnalyticsRepository>(AnalyticsRepository);
  });

  describe('getIncomeSum', () => {
    it('should call aggregate with gt 0 condition', async () => {
      const aggregateMock = mockPrisma.enrichedTransaction.aggregate;
      aggregateMock.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(1000) },
      });

      const sum = await repository.getIncomeSum({});
      expect(sum.toNumber()).toBe(1000);
      expect(aggregateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            amount: { gt: 0 },
          }) as Prisma.EnrichedTransactionWhereInput,
        }),
      );
    });
  });

  describe('getMonthlyExpensesByCategory', () => {
    it('should call groupBy with monthly filters', async () => {
      const mockResult = [
        { categoryId: 'c1', _sum: { amount: new Prisma.Decimal(-500) } },
      ];
      const groupByMock = mockPrisma.enrichedTransaction.groupBy;
      groupByMock.mockResolvedValue(mockResult);

      const start = new Date('2025-01-01');
      const end = new Date('2025-01-31');
      const result = await repository.getMonthlyExpensesByCategory(start, end);

      expect(result).toEqual(mockResult);
      expect(groupByMock).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['categoryId'],
          where: expect.objectContaining({
            date: { gte: start, lte: end },
          }) as Prisma.EnrichedTransactionWhereInput,
        }),
      );
    });
  });

  describe('findForForecast', () => {
    it('should return transactions sorted by date', async () => {
      mockPrisma.enrichedTransaction.findMany.mockResolvedValue([]);

      const start = new Date();
      const end = new Date();
      await repository.findForForecast(start, end);

      expect(mockPrisma.enrichedTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { date: 'asc' },
        }),
      );
    });
  });
});
