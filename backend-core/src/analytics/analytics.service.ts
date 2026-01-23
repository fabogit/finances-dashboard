import { Injectable } from '@nestjs/common';
import { TransactionsRepository } from '../transactions/transactions.repository'; // Per il where clause builder
import { AnalyticsRepository } from './analytics.repository'; // <--- Nuovo Repo
import { ScienceService } from '../science/science.service';
import {
  GetTransactionsFilterDto,
  GroupByOption,
} from '../transactions/dto/get-transactions.dto';
import { ForecastTransactionInputDto } from '../science/dto/forecast-transaction-input.dto';
import { ForecastResponse } from '../science/dto/forecast-response.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly transactionsRepo: TransactionsRepository,
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
  async getForecast(threshold: number = 0.2): Promise<ForecastResponse> {
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
}
