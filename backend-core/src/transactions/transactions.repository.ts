import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { GetTransactionsFilterDto } from './dto/get-transactions.dto';

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createManyRaw(data: Prisma.RawTransactionCreateManyInput[]) {
    return this.prisma.rawTransaction.createMany({
      data,
    });
  }

  async findAllRaw() {
    return this.prisma.rawTransaction.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createManyEnriched(data: Prisma.EnrichedTransactionCreateManyInput[]) {
    return this.prisma.enrichedTransaction.createMany({
      data,
    });
  }

  async findAllEnriched(filters: GetTransactionsFilterDto) {
    const {
      page,
      limit,
      startDate,
      endDate,
      search,
      categories,
      minAmount,
      maxAmount,
      sortBy,
      sortOrder,
    } = filters;

    const conditions: Prisma.EnrichedTransactionWhereInput[] = [];

    if (startDate) conditions.push({ date: { gte: startDate } });
    if (endDate) conditions.push({ date: { lte: endDate } });

    if (minAmount !== undefined)
      conditions.push({ amount: { gte: minAmount } });
    if (maxAmount !== undefined)
      conditions.push({ amount: { lte: maxAmount } });

    if (categories && categories.length > 0) {
      conditions.push({ category: { in: categories } });
    }

    if (search) {
      conditions.push({
        OR: [
          // contains is case-insensitive by default in SQLite
          { details: { contains: search } },
          { operation: { contains: search } },
          { subCategory: { contains: search } },
          { category: { contains: search } },
        ],
      });
    }

    const where: Prisma.EnrichedTransactionWhereInput =
      conditions.length > 0 ? { AND: conditions } : {};

    const [total, transactions] = await this.prisma.$transaction([
      this.prisma.enrichedTransaction.count({ where }),
      this.prisma.enrichedTransaction.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
    ]);

    return { total, transactions };
  }
}
