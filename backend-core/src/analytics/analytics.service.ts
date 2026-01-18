import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { ScienceService } from '../science/science.service';
import {
  GetTransactionsFilterDto,
  GroupByOption,
} from '../transactions/dto/get-transactions.dto';
import { ForecastTransactionInputDto } from '../science/dto/forecast-transaction-input.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionsRepo: TransactionsRepository,
    private readonly scienceService: ScienceService,
  ) {}

  // 1. KPI SUMMARY
  async getSummary(filters: GetTransactionsFilterDto) {
    const where = this.transactionsRepo.buildWhereClause(filters);

    const aggregations = await this.prisma.enrichedTransaction.aggregate({
      _sum: { amount: true },
      where: where,
    });

    const incomeAgg = await this.prisma.enrichedTransaction.aggregate({
      _sum: { amount: true },
      where: { ...where, amount: { gt: 0 } },
    });

    const expenseAgg = await this.prisma.enrichedTransaction.aggregate({
      _sum: { amount: true },
      where: { ...where, amount: { lt: 0 } },
    });

    const totalIncome = incomeAgg._sum.amount
      ? incomeAgg._sum.amount.toNumber()
      : 0;
    const totalExpense = expenseAgg._sum.amount
      ? expenseAgg._sum.amount.toNumber()
      : 0;
    const balance = aggregations._sum.amount
      ? aggregations._sum.amount.toNumber()
      : 0;

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

    const transactions = await this.prisma.enrichedTransaction.findMany({
      where: { ...where, amount: { lt: 0 } },
      select: {
        amount: true,
        category: {
          select: { name: true, parent: { select: { name: true } } },
        },
      },
    });

    const groupMap = new Map<string, number>();

    for (const t of transactions) {
      if (!t.category) continue;

      let key = 'Unspecified';

      if (filters.groupBy === GroupByOption.SUB_CATEGORY) {
        key = t.category.name;
      } else {
        // Default: Macro
        key = t.category.parent ? t.category.parent.name : t.category.name;
      }

      const val = t.amount.toNumber(); // Convert Decimal -> Number
      groupMap.set(key, (groupMap.get(key) || 0) + Math.abs(val));
    }

    let totalValue = 0;
    groupMap.forEach((v) => (totalValue += v));

    // Map -> Array (DTO)
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

    const transactions = await this.prisma.enrichedTransaction.findMany({
      where,
      select: { date: true, amount: true },
      orderBy: { date: 'asc' },
    });

    const map = new Map<string, { income: number; expense: number }>();

    for (const t of transactions) {
      const monthKey = t.date.toISOString().slice(0, 7); // "2025-01"

      let entry = map.get(monthKey);
      if (!entry) {
        entry = { income: 0, expense: 0 };
        map.set(monthKey, entry);
      }

      const val = t.amount.toNumber();

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
  async getForecast() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 18);

    const transactions = await this.prisma.enrichedTransaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        amount: true,
        details: true,
        operation: true,
        account: true,
        category: {
          select: {
            name: true,
            parent: { select: { name: true } },
          },
        },
      },
    });

    if (transactions.length === 0) {
      return { error: 'No data available in DB for forecast' };
    }

    const payload: ForecastTransactionInputDto[] = transactions.map((t) => {
      let cat = 'Uncategorized';
      let sub: string | null = null;

      if (t.category) {
        if (t.category.parent) {
          // its sub
          cat = t.category.parent.name;
          sub = t.category.name;
        } else {
          // its macro
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

    return this.scienceService.getForecast(payload);
  }
}
