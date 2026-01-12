import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsRepository } from '../transactions/transactions.repository';
import {
  GetTransactionsFilterDto,
  GroupByOption,
} from '../transactions/dto/get-transactions.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionsRepo: TransactionsRepository,
  ) {}

  // 1. KPI SUMMARY
  async getSummary(filters: GetTransactionsFilterDto) {
    const where = this.transactionsRepo.buildWhereClause(filters);

    const [incomeAgg, expenseAgg] = await Promise.all([
      // In (Amount > 0)
      this.prisma.enrichedTransaction.aggregate({
        _sum: { amount: true },
        where: { ...where, amount: { gt: 0 } },
      }),
      // Out (Amount < 0)
      this.prisma.enrichedTransaction.aggregate({
        _sum: { amount: true },
        where: { ...where, amount: { lt: 0 } },
      }),
    ]);

    const totalIncome = incomeAgg._sum.amount || 0;
    const totalExpense = expenseAgg._sum.amount || 0;

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome + totalExpense,
      savingsRate:
        totalIncome > 0
          ? ((totalIncome + totalExpense) / totalIncome) * 100
          : 0,
    };
  }

  // 2. CATEGORY PIE CHART
  async getCategoryDistribution(filters: GetTransactionsFilterDto) {
    const where = this.transactionsRepo.buildWhereClause(filters);
    const groupField = filters.groupBy || GroupByOption.CATEGORY;
    const result = await this.prisma.enrichedTransaction.groupBy({
      by: [groupField],
      _sum: { amount: true },
      where: { ...where, amount: { lt: 0 } },
      orderBy: {
        _sum: { amount: 'asc' },
      },
    });

    const totalValue = result.reduce(
      (acc, item) => acc + Math.abs(item._sum.amount || 0),
      0,
    );

    return result.map((item) => {
      const value = Math.abs(item._sum.amount || 0);
      const rawLabel = item[groupField];
      const label = rawLabel ? String(rawLabel) : 'Unspecified';

      let percentage = 0;
      if (totalValue > 0) {
        percentage = parseFloat(((value / totalValue) * 100).toFixed(2));
      }

      return {
        label: label,
        value: value,
        percentage: percentage,
      };
    });
  }

  // 3. TREND BAR CHART (Daily)
  async getDailyTrend(filters: GetTransactionsFilterDto) {
    const where = this.transactionsRepo.buildWhereClause(filters);

    const transactions = await this.prisma.enrichedTransaction.findMany({
      where,
      select: { date: true, amount: true },
      orderBy: { date: 'asc' },
    });

    const trendMap = new Map<string, { income: number; expense: number }>();

    for (const t of transactions) {
      const dayKey = t.date.toISOString().split('T')[0]; // "2025-01-01"
      if (!trendMap.has(dayKey)) {
        trendMap.set(dayKey, { income: 0, expense: 0 });
      }
      const entry = trendMap.get(dayKey)!;
      if (t.amount > 0) entry.income += t.amount;
      else entry.expense += Math.abs(t.amount);
    }

    return Array.from(trendMap.entries()).map(([date, values]) => ({
      date,
      income: parseFloat(values.income.toFixed(2)),
      expense: parseFloat(values.expense.toFixed(2)),
    }));
  }
}
