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
import { GetTransactionsFilterDto } from '../transactions/dto/get-transactions.dto';

// --- TYPE HELPERS ---

interface CategoryWithTree extends Category {
  budgetRule: BudgetRule | null;
  children: CategoryWithTree[];
}

interface GroupedExpense {
  categoryId: string | null;
  _sum: { amount: Decimal | null };
}

const mkDecimal = (val: number): Decimal => {
  return {
    toNumber: () => val,
    toFixed: (n?: number) => val.toFixed(n),
    valueOf: () => val,
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
    createdAt: new Date(),
    updatedAt: new Date(),
    budgetRule: null,
    children: [],
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

  let analyticsRepo: jest.Mocked<AnalyticsRepository>;
  let categoriesRepo: jest.Mocked<CategoriesRepository>;
  let transactionsRepo: jest.Mocked<TransactionsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: AnalyticsRepository,
          useFactory: () => ({
            getMonthlyIncome: jest.fn(),
            getMonthlyExpensesByCategory: jest.fn(),
            getSum: jest.fn(),
            getIncomeSum: jest.fn(),
            getExpenseSum: jest.fn(),
            findForCategoryDistribution: jest.fn(),
            findForMonthlyTrends: jest.fn(),
            findForForecast: jest.fn(),
          }),
        },
        {
          provide: CategoriesRepository,
          useFactory: () => ({
            findAllTree: jest.fn(),
          }),
        },
        {
          provide: TransactionsRepository,
          useFactory: () => ({
            buildWhereClause: jest.fn(),
          }),
        },
        {
          provide: ScienceService,
          useFactory: () => ({
            getForecast: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    analyticsRepo = module.get(AnalyticsRepository);
    categoriesRepo = module.get(CategoriesRepository);
    transactionsRepo = module.get(TransactionsRepository);
  });

  describe('getBudgetAnalysis', () => {
    it('Should handle REAL decimal numbers correctly (Roll-up & Status)', async () => {
      const monthlyIncome = 2550.5;

      // Rule: 50% 2550.50 = 1275.25
      const expectedLimit = 1275.25;
      const expenseRent = 800.0;
      const expenseGroceries = 88.94;
      const expenseUtils = 45.33;
      // Tot: 934.27
      const expectedTotalSpent = 934.27;
      // Left: 1275.25 - 934.27 = 340.98
      const expectedRemaining = 340.98;

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
            createMockCategory({
              id: 'cat_util',
              name: 'Utilities',
              parentId: 'cat_home',
            }),
          ],
        }),
      ];

      const mockExpenses: GroupedExpense[] = [
        { categoryId: 'cat_home', _sum: { amount: mkDecimal(-expenseRent) } },
        {
          categoryId: 'cat_groc',
          _sum: { amount: mkDecimal(-expenseGroceries) },
        },
        { categoryId: 'cat_util', _sum: { amount: mkDecimal(-expenseUtils) } },
      ];

      analyticsRepo.getMonthlyIncome.mockResolvedValue(monthlyIncome);
      analyticsRepo.getMonthlyExpensesByCategory.mockResolvedValue(
        mockExpenses,
      );
      categoriesRepo.findAllTree.mockResolvedValue(mockTree);

      const result = await service.getBudgetAnalysis({ month: '2025-01' });
      const homeNode = result.categories[0];

      expect(homeNode.spent).toBe(expectedTotalSpent);
      expect(homeNode.rawSpent).toBeCloseTo(expectedTotalSpent, 4);
      expect(homeNode.limit).toBe(expectedLimit);
      expect(homeNode.remaining).toBe(expectedRemaining);
      expect(homeNode.status).toBe('OK');
    });

    it('Should return WARNING when spent is between 80% and 100%', async () => {
      const mockTree: CategoryWithTree[] = [
        createMockCategory({
          id: 'cat_leisure',
          name: 'Leisure',
          budgetRule: createMockRule({
            limitValue: mkDecimal(150.0),
            ruleType: BudgetRuleType.FIXED_AMOUNT,
          }),
        }),
      ];

      const mockExpenses: GroupedExpense[] = [
        { categoryId: 'cat_leisure', _sum: { amount: mkDecimal(-120.05) } },
      ];

      analyticsRepo.getMonthlyIncome.mockResolvedValue(0);
      analyticsRepo.getMonthlyExpensesByCategory.mockResolvedValue(
        mockExpenses,
      );
      categoriesRepo.findAllTree.mockResolvedValue(mockTree);

      const result = await service.getBudgetAnalysis({ month: '2025-01' });
      const node = result.categories[0];

      expect(node.spent).toBe(120.05);
      expect(node.remaining).toBe(29.95);
      expect(node.status).toBe('WARNING');
    });
  });

  describe('getSummary', () => {
    it('Should calculate Savings Rate correctly with REAL numbers', async () => {
      // Income: 3450.50
      // Expense: -2100.25
      // Balance: 1350.25
      // Savings Rate: (1350.25 / 3450.50) * 100 = 39.1319... -> 39.13

      analyticsRepo.getSum.mockResolvedValue(mkDecimal(1350.25)); // Balance
      analyticsRepo.getIncomeSum.mockResolvedValue(mkDecimal(3450.5)); // Income
      analyticsRepo.getExpenseSum.mockResolvedValue(mkDecimal(-2100.25)); // Expense

      const emptyFilters = {} as GetTransactionsFilterDto;
      const result = await service.getSummary(emptyFilters);

      expect(result.income).toBe(3450.5);
      expect(result.balance).toBe(1350.25);
      expect(result.savingsRate).toBe(39.13);
    });

    it('Should handle ZERO income without crashing', async () => {
      analyticsRepo.getSum.mockResolvedValue(mkDecimal(-500));
      analyticsRepo.getIncomeSum.mockResolvedValue(mkDecimal(0));
      analyticsRepo.getExpenseSum.mockResolvedValue(mkDecimal(-500));

      const result = await service.getSummary({} as GetTransactionsFilterDto);

      expect(result.income).toBe(0);
      expect(result.savingsRate).toBe(0);
    });
  });

  describe('getCategoryDistribution', () => {
    it('Should GROUP expenses by Macro Category with REAL numbers', async () => {
      // Mock Transactions
      // Food (Macro) -> 25.50
      // Groceries (Sub of Food) -> 15.75
      // Transport (Macro) -> 12.33

      // Totale Food: 25.50 + 15.75 = 41.25

      const mockTx = [
        {
          amount: mkDecimal(-25.5),
          category: { name: 'Food', parent: null },
        },
        {
          amount: mkDecimal(-15.75),
          category: { name: 'Groceries', parent: { name: 'Food' } },
        },
        {
          amount: mkDecimal(-12.33),
          category: { name: 'Transport', parent: null },
        },
      ];

      analyticsRepo.findForCategoryDistribution.mockResolvedValue(mockTx);
      transactionsRepo.buildWhereClause.mockReturnValue({});

      const result = await service.getCategoryDistribution(
        {} as GetTransactionsFilterDto,
      );

      expect(result).toHaveLength(2); // Food e Transport

      const food = result.find((r) => r.label === 'Food');
      expect(food?.value).toBe(41.25);

      const transport = result.find((r) => r.label === 'Transport');
      expect(transport?.value).toBe(12.33);
    });
  });

  describe('getMonthlyTrends', () => {
    it('Should group transactions by Month and Type', async () => {
      // 01: +1000 Income, -500 Expense
      // 02: -200 Expense
      const mockTx = [
        { date: new Date('2025-01-15'), amount: mkDecimal(1000.5) },
        { date: new Date('2025-01-20'), amount: mkDecimal(-500.25) },
        { date: new Date('2025-02-10'), amount: mkDecimal(-200.0) },
      ];

      analyticsRepo.findForMonthlyTrends.mockResolvedValue(mockTx);
      transactionsRepo.buildWhereClause.mockReturnValue({});

      const result = await service.getMonthlyTrends(
        {} as GetTransactionsFilterDto,
      );

      expect(result).toHaveLength(2); // 2 months

      const jan = result.find((r) => r.month === '2025-01');
      expect(jan).toBeDefined();
      expect(jan?.income).toBe(1000.5);
      expect(jan?.expense).toBe(500.25);

      const feb = result.find((r) => r.month === '2025-02');
      expect(feb?.expense).toBe(200.0);
      expect(feb?.income).toBe(0);
    });
  });
});
