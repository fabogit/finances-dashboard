import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CategoryDistributionItem,
  MonthlyTrendItem,
  ForecastItem,
  MonthlyExpenseByCategoryItem,
} from './interfaces/analytics-repository.interfaces';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- KPI QUERIES ---

  async getSum(
    where: Prisma.EnrichedTransactionWhereInput,
  ): Promise<Prisma.Decimal> {
    const agg = await this.prisma.enrichedTransaction.aggregate({
      _sum: { amount: true },
      where,
    });
    return agg._sum.amount || new Prisma.Decimal(0);
  }

  // (amount > 0)
  async getIncomeSum(
    baseWhere: Prisma.EnrichedTransactionWhereInput,
  ): Promise<Prisma.Decimal> {
    const agg = await this.prisma.enrichedTransaction.aggregate({
      _sum: { amount: true },
      where: { ...baseWhere, amount: { gt: 0 } },
    });
    return agg._sum.amount || new Prisma.Decimal(0);
  }

  // (amount < 0)
  async getExpenseSum(
    baseWhere: Prisma.EnrichedTransactionWhereInput,
  ): Promise<Prisma.Decimal> {
    const agg = await this.prisma.enrichedTransaction.aggregate({
      _sum: { amount: true },
      where: { ...baseWhere, amount: { lt: 0 } },
    });
    return agg._sum.amount || new Prisma.Decimal(0);
  }

  // --- CHART QUERIES ---

  async findForCategoryDistribution(
    baseWhere: Prisma.EnrichedTransactionWhereInput,
  ): Promise<CategoryDistributionItem[]> {
    const results = await this.prisma.enrichedTransaction.findMany({
      where: { ...baseWhere, amount: { lt: 0 } },
      select: {
        amount: true,
        category: {
          select: { name: true, parent: { select: { name: true } } },
        },
      },
    });
    return results;
  }

  async findForMonthlyTrends(
    where: Prisma.EnrichedTransactionWhereInput,
  ): Promise<MonthlyTrendItem[]> {
    const results = await this.prisma.enrichedTransaction.findMany({
      where,
      select: { date: true, amount: true },
      orderBy: { date: 'asc' },
    });
    return results;
  }

  // --- FORECAST QUERY ---

  async findForForecast(
    startDate: Date,
    endDate: Date,
  ): Promise<ForecastItem[]> {
    const results = await this.prisma.enrichedTransaction.findMany({
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
    return results;
  }

  // --- BUDGET ANALYSIS QUERIES ---

  async getMonthlyIncome(start: Date, end: Date): Promise<Prisma.Decimal> {
    const agg = await this.prisma.enrichedTransaction.aggregate({
      _sum: { amount: true },
      where: {
        date: { gte: start, lte: end },
        amount: { gt: 0 },
      },
    });
    return agg._sum.amount || new Prisma.Decimal(0);
  }

  async getMonthlyExpensesByCategory(
    start: Date,
    end: Date,
  ): Promise<MonthlyExpenseByCategoryItem[]> {
    const results = await this.prisma.enrichedTransaction.groupBy({
      by: ['categoryId'],
      _sum: { amount: true },
      where: {
        date: { gte: start, lte: end },
        amount: { lt: 0 },
        categoryId: { not: null },
      },
    });
    return results;
  }
}
