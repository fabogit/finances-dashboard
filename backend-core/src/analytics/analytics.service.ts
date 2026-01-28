import { Injectable } from '@nestjs/common';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { AnalyticsRepository } from './analytics.repository';
import { ScienceService } from '../science/science.service';
import {
  GetTransactionsFilterDto,
  GroupByOption,
} from '../transactions/dto/get-transactions.dto';
import { ForecastTransactionInputDto } from '../science/dto/forecast-transaction-input.dto';
import {
  BudgetAnalysisResponseDto,
  CategoryBudgetStatusDto,
  GetBudgetAnalysisDto,
} from './dto/budget-analysis.dto';
import { BudgetRule, BudgetRuleType, Category } from '@prisma/client';
import { CategoriesRepository } from '../categories/categories.repository';

interface CategoryWithTree extends Category {
  budgetRule: BudgetRule | null;
  children: CategoryWithTree[];
}

type InternalNodeAnalysis = CategoryBudgetStatusDto & {
  rawSpent: number;
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly transactionsRepo: TransactionsRepository,
    private readonly categoriesRepo: CategoriesRepository,
    private readonly scienceService: ScienceService,
  ) {}

  // 1. KPI SUMMARY
  async getSummary(filters: GetTransactionsFilterDto) {
    const where = this.transactionsRepo.buildWhereClause(filters);

    const [totalDecimal, incomeDecimal, expenseDecimal] = await Promise.all([
      this.analyticsRepo.getSum(where),
      this.analyticsRepo.getIncomeSum(where),
      this.analyticsRepo.getExpenseSum(where),
    ]);

    const totalIncome = incomeDecimal.toNumber();
    const totalExpense = expenseDecimal.toNumber();
    const balance = totalDecimal.toNumber();

    let savingsRate = 0;
    if (totalIncome > 0) {
      savingsRate = (balance / totalIncome) * 100;
    }

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: balance,
      savingsRate: parseFloat(savingsRate.toFixed(2)),
    };
  }

  // 2. CATEGORY PIE CHART
  async getCategoryDistribution(filters: GetTransactionsFilterDto) {
    const where = this.transactionsRepo.buildWhereClause(filters);

    const transactions =
      await this.analyticsRepo.findForCategoryDistribution(where);

    const groupMap = new Map<string, number>();

    for (const tr of transactions) {
      if (!tr.category) continue;

      let key = 'Unspecified';

      if (filters.groupBy === GroupByOption.SUB_CATEGORY) {
        key = tr.category.name;
      } else {
        // Default: Macro logic
        key = tr.category.parent ? tr.category.parent.name : tr.category.name;
      }

      const val = tr.amount.toNumber();
      groupMap.set(key, (groupMap.get(key) || 0) + Math.abs(val));
    }

    let totalValue = 0;
    groupMap.forEach((v) => (totalValue += v));

    const result = Array.from(groupMap.entries()).map(([label, value]) => ({
      label,
      value: parseFloat(value.toFixed(2)),
      percentage:
        totalValue > 0
          ? parseFloat(((value / totalValue) * 100).toFixed(2))
          : 0,
    }));

    return result.sort((a, b) => b.value - a.value);
  }

  // 3. MONTHLY BAR CHART
  async getMonthlyTrends(filters: GetTransactionsFilterDto) {
    const where = this.transactionsRepo.buildWhereClause(filters);

    const transactions = await this.analyticsRepo.findForMonthlyTrends(where);

    const map = new Map<string, { income: number; expense: number }>();

    for (const tr of transactions) {
      const monthKey = tr.date.toISOString().slice(0, 7); // "2025-01"

      let entry = map.get(monthKey);
      if (!entry) {
        entry = { income: 0, expense: 0 };
        map.set(monthKey, entry);
      }

      const val = tr.amount.toNumber();

      if (val > 0) entry.income += val;
      else entry.expense += Math.abs(val);
    }

    return Array.from(map.entries()).map(([monthKey, data]) => ({
      month: monthKey,
      income: parseFloat(data.income.toFixed(2)),
      expense: parseFloat(data.expense.toFixed(2)),
    }));
  }

  // 4. FORECAST (Integration)
  async getForecast(threshold: number = 0.2) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 18);

    const transactions = await this.analyticsRepo.findForForecast(
      startDate,
      endDate,
    );

    if (transactions.length === 0) {
      return { error: 'No data available in DB for forecast' };
    }

    // Mapping per Python (Relational -> Flat)
    const payload: ForecastTransactionInputDto[] = transactions.map((t) => {
      let cat = 'Uncategorized';
      let sub: string | null = null;

      if (t.category) {
        if (t.category.parent) {
          cat = t.category.parent.name;
          sub = t.category.name;
        } else {
          cat = t.category.name;
          sub = null;
        }
      }

      return {
        id: t.id,
        date: t.date.toISOString().split('T')[0],
        amount: t.amount.toNumber(),
        details: t.details || '',
        operation: t.operation || 'System',
        account: t.account || 'Default',
        category: cat,
        subCategory: sub,
      };
    });

    return this.scienceService.getForecast(payload, threshold);
  }

  // --- 5. BUDGET ANALYSIS ---
  async getBudgetAnalysis(
    dto: GetBudgetAnalysisDto,
  ): Promise<BudgetAnalysisResponseDto> {
    const [year, month] = dto.month.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [categoryTree, monthlyIncome, expensesGroups] = await Promise.all([
      this.categoriesRepo.findAllTree() as Promise<CategoryWithTree[]>,
      this.analyticsRepo.getMonthlyIncome(startDate, endDate),
      this.analyticsRepo.getMonthlyExpensesByCategory(startDate, endDate),
    ]);

    const expenseMap = new Map<string, number>();
    expensesGroups.forEach((entry) => {
      if (entry.categoryId && entry._sum.amount) {
        expenseMap.set(
          entry.categoryId,
          Math.abs(entry._sum.amount.toNumber()),
        );
      }
    });

    const processNode = (category: CategoryWithTree): InternalNodeAnalysis => {
      const directSpent = expenseMap.get(category.id) || 0;

      let childrenDtos: InternalNodeAnalysis[] = [];
      let childrenTotalSpent = 0;

      if (category.children && category.children.length > 0) {
        childrenDtos = category.children.map((child) => processNode(child));
        childrenTotalSpent = childrenDtos.reduce(
          (acc, child) => acc + child.rawSpent,
          0,
        );
      }
      const totalSpent = directSpent + childrenTotalSpent;

      let limit: number | null = null;
      if (category.budgetRule) {
        const ruleVal = category.budgetRule.limitValue.toNumber();
        if (category.budgetRule.ruleType === BudgetRuleType.FIXED_AMOUNT) {
          limit = ruleVal;
        } else if (
          category.budgetRule.ruleType === BudgetRuleType.PERCENTAGE_OF_INCOME
        ) {
          limit = (monthlyIncome * ruleVal) / 100;
        }
      }

      let status: 'OK' | 'WARNING' | 'EXCEEDED' | 'NO_BUDGET' = 'NO_BUDGET';
      let remaining: number | null = null;

      if (limit !== null) {
        remaining = limit - totalSpent;

        const ratio = limit > 0 ? totalSpent / limit : totalSpent > 0 ? 999 : 0;

        if (ratio > 1) status = 'EXCEEDED';
        else if (ratio >= 0.8) status = 'WARNING';
        else status = 'OK';
      }

      return {
        categoryName: category.name,
        spent: parseFloat(totalSpent.toFixed(2)),
        limit: limit ? parseFloat(limit.toFixed(2)) : null,
        remaining: remaining ? parseFloat(remaining.toFixed(2)) : null,
        status,
        children: childrenDtos.length > 0 ? childrenDtos : undefined,
        rawSpent: totalSpent,
      };
    };

    const analysisTree = categoryTree.map((macro) => processNode(macro));

    return {
      month: dto.month,
      totalIncome: parseFloat(monthlyIncome.toFixed(2)),
      categories: analysisTree,
    };
  }
}
