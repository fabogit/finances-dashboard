import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- KPI QUERIES ---

  async getSum(where: Prisma.EnrichedTransactionWhereInput) {
    const agg = await this.prisma.enrichedTransaction.aggregate({
      _sum: { amount: true },
      where,
    });
    return agg._sum.amount || new Prisma.Decimal(0);
  }

  // (amount > 0)
  async getIncomeSum(baseWhere: Prisma.EnrichedTransactionWhereInput) {
    const agg = await this.prisma.enrichedTransaction.aggregate({
      _sum: { amount: true },
      where: { ...baseWhere, amount: { gt: 0 } },
    });
    return agg._sum.amount || new Prisma.Decimal(0);
  }

  // (amount < 0)
  async getExpenseSum(baseWhere: Prisma.EnrichedTransactionWhereInput) {
    const agg = await this.prisma.enrichedTransaction.aggregate({
      _sum: { amount: true },
      where: { ...baseWhere, amount: { lt: 0 } },
    });
    return agg._sum.amount || new Prisma.Decimal(0);
  }

  // --- CHART QUERIES ---

  async findForCategoryDistribution(
    baseWhere: Prisma.EnrichedTransactionWhereInput,
  ) {
    return this.prisma.enrichedTransaction.findMany({
      where: { ...baseWhere, amount: { lt: 0 } },
      select: {
        amount: true,
        category: {
          select: { name: true, parent: { select: { name: true } } },
        },
      },
    });
  }

  async findForMonthlyTrends(where: Prisma.EnrichedTransactionWhereInput) {
    return this.prisma.enrichedTransaction.findMany({
      where,
      select: { date: true, amount: true },
      orderBy: { date: 'asc' },
    });
  }

  // --- FORECAST QUERY ---

  async findForForecast(startDate: Date, endDate: Date) {
    return this.prisma.enrichedTransaction.findMany({
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
  }
}
