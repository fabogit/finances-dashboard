import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { GetTransactionsFilterDto } from './dto/get-transactions.dto';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
} from './dto/create-update-transaction.dto';

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  public buildWhereClause(
    filters: GetTransactionsFilterDto,
  ): Prisma.EnrichedTransactionWhereInput {
    const { startDate, endDate, search, categories, minAmount, maxAmount } =
      filters;
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
          { details: { contains: search } },
          { operation: { contains: search } },
          { subCategory: { contains: search } },
          { category: { contains: search } },
        ],
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }
  // --- BULK OPERATIONS ---
  async createManyEnriched(data: Prisma.EnrichedTransactionCreateManyInput[]) {
    return this.prisma.enrichedTransaction.createMany({ data });
  }

  async createManyRaw(data: Prisma.RawTransactionCreateManyInput[]) {
    return this.prisma.rawTransaction.createMany({ data });
  }

  // --- READ OPERATIONS ---
  async findAllEnriched(filters: GetTransactionsFilterDto) {
    const where = this.buildWhereClause(filters);

    const [total, transactions] = await this.prisma.$transaction([
      this.prisma.enrichedTransaction.count({ where }),
      this.prisma.enrichedTransaction.findMany({
        where,
        take: filters.limit,
        skip: (filters.page - 1) * filters.limit,
        orderBy: { [filters.sortBy]: filters.sortOrder },
      }),
    ]);

    return { total, transactions };
  }

  async findAllRaw() {
    return this.prisma.rawTransaction.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.enrichedTransaction.findUnique({
      where: { id },
    });
  }

  // --- SINGLE CRUD OPERATIONS ---
  async create(dto: CreateTransactionDto) {
    return this.prisma.enrichedTransaction.create({
      data: {
        ...dto,
        importBatchId: 'MANUAL',
        originalLine: -1,
      },
    });
  }

  async update(id: string, dto: UpdateTransactionDto) {
    return this.prisma.enrichedTransaction.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    return this.prisma.enrichedTransaction.delete({
      where: { id },
    });
  }
}
