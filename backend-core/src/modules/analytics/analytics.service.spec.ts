import type { Mock, Mocked } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { CategoriesRepository } from '../categories/categories.repository';
import { ScienceService } from '../science/science.service';
import {
  BudgetRuleType,
  ExpenseType,
  Category,
  BudgetRule,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import {
  GetTransactionsFilterDto,
  GroupByOption,
} from '../transactions/dto/get-transactions.dto';

// --- TYPE HELPERS ---

interface CategoryWithTree extends Category {
  budgetRule: BudgetRule | null;
  children: CategoryWithTree[];
}

const mkDecimal = (val: number): Decimal => {
  return {
    toNumber: () => val,
    toFixed: (n?: number) => val.toFixed(n),
    valueOf: () => val,
    toString: () => val.toString(),
  } as unknown as Decimal;
};

const createMockCategory = (
  overrides: Partial<CategoryWithTree> = {},
): CategoryWithTree => {
  return {
    id: 'default_id',
    name: 'Default Category',
    parentId: null,
    type: ExpenseType.NEEDS,
    icon: '📁',
    color: null,
    isSystem: false,
    isVerified: true,
    userId: 'demo_user',
    systemKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    budgetRule: null,
    children: [],
    defaultAssetId: null,
    defaultGoalId: null,
    ...overrides,
  };
};

const createMockRule = (overrides: Partial<BudgetRule> = {}): BudgetRule => {
  return {
    id: 'rule_default',
    categoryId: 'default_cat_id',
    limitValue: mkDecimal(100),
    ruleType: BudgetRuleType.FIXED_AMOUNT,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

describe('AnalyticsService (Unit)', () => {
  let service: AnalyticsService;

  let analyticsRepo: Mocked<AnalyticsRepository>;
  let categoriesRepo: Mocked<CategoriesRepository>;
  let transactionsRepo: Mocked<TransactionsRepository>;
  let scienceService: Mocked<ScienceService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: AnalyticsRepository,
          useFactory: () => ({
            getMonthlyIncome: vi.fn(),
            getMonthlyExpensesByCategory: vi.fn(),
            getSum: vi.fn(),
            getIncomeSum: vi.fn(),
            getExpenseSum: vi.fn(),
            findForCategoryDistribution: vi.fn(),
            findForMonthlyTrends: vi.fn(),
            findForForecast: vi.fn(),
          }),
        },
        {
          provide: CategoriesRepository,
          useFactory: () => ({
            findAllTree: vi.fn(),
          }),
        },
        {
          provide: TransactionsRepository,
          useFactory: () => ({
            buildWhereClause: vi.fn(),
          }),
        },
        {
          provide: ScienceService,
          useFactory: () => ({
            getForecast: vi.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    analyticsRepo = module.get(AnalyticsRepository);
    categoriesRepo = module.get(CategoriesRepository);
    transactionsRepo = module.get(TransactionsRepository);
    scienceService = module.get(ScienceService);
  });

  describe('getBudgetAnalysis', () => {
    it('Should handle REAL decimal numbers correctly (Roll-up & Status)', async () => {
      const monthlyIncome = 2550.5;
      const expectedTotalSpent = 934.27;

      const mockTree: CategoryWithTree[] = [
        createMockCategory({
          id: 'cat_home',
          name: 'Home',
          budgetRule: createMockRule({
            limitValue: mkDecimal(50),
            ruleType: BudgetRuleType.PERCENTAGE_OF_INCOME,
          }),
          children: [
            createMockCategory({
              id: 'cat_groc',
              name: 'Groceries',
              parentId: 'cat_home',
            }),
          ],
        }),
      ];

      (analyticsRepo.getMonthlyIncome as Mock).mockResolvedValue(
        mkDecimal(monthlyIncome),
      );
      (analyticsRepo.getMonthlyExpensesByCategory as Mock).mockResolvedValue([
        { categoryId: 'cat_home', _sum: { amount: mkDecimal(-845.33) } },
        { categoryId: 'cat_groc', _sum: { amount: mkDecimal(-88.94) } },
      ]);
      (categoriesRepo.findAllTree as Mock).mockResolvedValue(mockTree);

      const result = await service.getBudgetAnalysis({
        month: '2025-01',
      });
      expect(result.categories[0].spent).toBe(expectedTotalSpent);
    });

    it('Should return NO_BUDGET when no rule is defined', async () => {
      (categoriesRepo.findAllTree as Mock).mockResolvedValue([
        createMockCategory(),
      ]);
      (analyticsRepo.getMonthlyIncome as Mock).mockResolvedValue(
        mkDecimal(1000),
      );
      (analyticsRepo.getMonthlyExpensesByCategory as Mock).mockResolvedValue(
        [],
      );

      const result = await service.getBudgetAnalysis({
        month: '2025-01',
      });
      expect(result.categories[0].status).toBe('NO_BUDGET');
    });
  });

  describe('getSummary', () => {
    it('Should calculate Savings Rate correctly', async () => {
      (analyticsRepo.getSum as Mock).mockResolvedValue(mkDecimal(1000));
      (analyticsRepo.getIncomeSum as Mock).mockResolvedValue(mkDecimal(4000));
      (analyticsRepo.getExpenseSum as Mock).mockResolvedValue(mkDecimal(-3000));
      (transactionsRepo.buildWhereClause as Mock).mockReturnValue({});

      const result = await service.getSummary({} as GetTransactionsFilterDto);
      expect(result.savingsRate).toBe(25);
    });

    it('should handle zero income', async () => {
      (analyticsRepo.getSum as Mock).mockResolvedValue(mkDecimal(1000));
      (analyticsRepo.getIncomeSum as Mock).mockResolvedValue(mkDecimal(0));
      (analyticsRepo.getExpenseSum as Mock).mockResolvedValue(mkDecimal(0));
      (transactionsRepo.buildWhereClause as Mock).mockReturnValue({});

      const result = await service.getSummary({} as GetTransactionsFilterDto);
      expect(result.savingsRate).toBe(0);
    });
  });

  describe('getCategoryDistribution', () => {
    it('Should group by sub-category if requested', async () => {
      const mockTx = [
        {
          amount: mkDecimal(-10),
          category: { name: 'Sub', parent: { name: 'Macro' } },
        },
      ];
      (analyticsRepo.findForCategoryDistribution as Mock).mockResolvedValue(
        mockTx,
      );
      (transactionsRepo.buildWhereClause as Mock).mockReturnValue({});

      const result = await service.getCategoryDistribution({
        groupBy: GroupByOption.SUB_CATEGORY,
      } as GetTransactionsFilterDto);
      expect(result[0].label).toBe('Sub');
    });

    it('Should group by macro by default', async () => {
      const mockTx = [
        {
          amount: mkDecimal(-10),
          category: { name: 'Sub', parent: { name: 'Macro' } },
        },
      ];
      (analyticsRepo.findForCategoryDistribution as Mock).mockResolvedValue(
        mockTx,
      );
      (transactionsRepo.buildWhereClause as Mock).mockReturnValue({});
      const result = await service.getCategoryDistribution(
        {} as GetTransactionsFilterDto,
      );
      expect(result[0].label).toBe('Macro');
    });
  });

  describe('getMonthlyTrends', () => {
    it('should return trends mapping months correctly', async () => {
      const mockTx = [
        { date: new Date('2025-01-15'), amount: mkDecimal(100) },
        { date: new Date('2025-01-20'), amount: mkDecimal(-50) },
        { date: new Date('2025-02-10'), amount: mkDecimal(-200) },
      ];
      (analyticsRepo.findForMonthlyTrends as Mock).mockResolvedValue(mockTx);
      (transactionsRepo.buildWhereClause as Mock).mockReturnValue({});

      const result = await service.getMonthlyTrends(
        {} as GetTransactionsFilterDto,
      );
      expect(result).toHaveLength(2);
      expect(result.find((r) => r.month === '2025-01')?.income).toBe(100);
      expect(result.find((r) => r.month === '2025-01')?.expense).toBe(50);
    });
  });

  describe('getForecast', () => {
    it('should return error if no transactions', async () => {
      (analyticsRepo.findForForecast as Mock).mockResolvedValue([]);
      const result = await service.getForecast();
      expect(result).toEqual({ error: expect.any(String) as string });
    });

    it('should map payload correctly and call science service', async () => {
      const mockTx = [
        {
          id: '1',
          date: new Date(),
          amount: mkDecimal(100),
          details: 'X',
          operation: 'Y',
          account: 'Z',
          category: { name: 'Cat', parent: { name: 'Parent' } },
        },
        {
          id: '2',
          date: new Date(),
          amount: mkDecimal(50),
          details: 'A',
          operation: 'B',
          account: 'C',
          category: { name: 'Macro', parent: null },
        },
      ];
      (analyticsRepo.findForForecast as Mock).mockResolvedValue(mockTx);
      (scienceService.getForecast as Mock).mockResolvedValue({
        forecast: [],
      });

      await service.getForecast();
      expect(scienceService.getForecast.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
