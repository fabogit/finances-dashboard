import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { GetTransactionsFilterDto } from './dto/get-transactions.dto';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
} from './dto/create-update-transaction.dto';
import { EnrichedDataInput } from './interfaces/enriched-data-input.interface';

@Injectable()
export class TransactionsRepository {
  private readonly logger = new Logger(TransactionsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // --- HELPER: Resolve Category (Find or Create) ---
  async resolveCategoryId(
    categoryName: string,
    subCategoryName?: string | null,
  ): Promise<string> {
    let macro = await this.prisma.category.findFirst({
      where: { name: categoryName, parentId: null },
    });

    if (!macro) {
      this.logger.debug(`Creating new Macro Category: ${categoryName}`);
      macro = await this.prisma.category.create({
        data: { name: categoryName, isSystem: false, isVerified: false },
      });
    }

    if (!subCategoryName) return macro.id;

    let sub = await this.prisma.category.findFirst({
      where: { name: subCategoryName, parentId: macro.id },
    });

    if (!sub) {
      this.logger.debug(
        `Creating new Sub Category: ${subCategoryName} under ${categoryName}`,
      );
      sub = await this.prisma.category.create({
        data: {
          name: subCategoryName,
          parentId: macro.id,
          isSystem: false,
          isVerified: false,
        },
      });
    }

    return sub.id;
  }

  // --- QUERY BUILDER ---
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
      conditions.push({
        category: {
          OR: [
            { name: { in: categories, mode: 'insensitive' } },
            { parent: { name: { in: categories, mode: 'insensitive' } } },
          ],
        },
      });
    }

    if (search) {
      conditions.push({
        OR: [
          { details: { contains: search, mode: 'insensitive' } },
          { operation: { contains: search, mode: 'insensitive' } },
          { category: { name: { contains: search, mode: 'insensitive' } } },
          {
            category: {
              parent: { name: { contains: search, mode: 'insensitive' } },
            },
          },
        ],
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  // --- BULK CREATE (Enriched) ---
  async createManyEnriched(data: EnrichedDataInput[]) {
    const transactionsToInsert: Prisma.EnrichedTransactionCreateManyInput[] =
      [];

    for (const item of data) {
      const categoryId = await this.resolveCategoryId(
        item.category,
        item.subCategory,
      );

      transactionsToInsert.push({
        importBatchId: item.importBatchId,
        originalLine: item.originalLine,
        date: item.date,
        amount: new Prisma.Decimal(item.amount), // number -> Decimal (Postgres)
        operation: item.operation,
        details: item.details,
        account: item.account,
        categoryId: categoryId,
      });
    }

    return this.prisma.enrichedTransaction.createMany({
      data: transactionsToInsert,
    });
  }

  async createManyRaw(data: Prisma.RawTransactionCreateManyInput[]) {
    return this.prisma.rawTransaction.createMany({
      data,
    });
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
        include: {
          category: {
            include: { parent: true },
          },
        },
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
      include: { category: { include: { parent: true } } },
    });
  }

  // --- CRUD SINGLE ---
  async create(dto: CreateTransactionDto) {
    const categoryId = await this.resolveCategoryId(
      dto.category,
      dto.subCategory,
    );

    return this.prisma.enrichedTransaction.create({
      data: {
        date: dto.date,
        amount: dto.amount,
        details: dto.details,
        account: dto.account || 'MANUAL',
        operation: dto.operation || 'Manual Entry',
        importBatchId: 'MANUAL',
        originalLine: -1,
        category: { connect: { id: categoryId } },
      },
      include: { category: true },
    });
  }

  async update(id: string, dto: UpdateTransactionDto) {
    const { category, subCategory, ...scalarFields } = dto;

    const updateData: Prisma.EnrichedTransactionUpdateInput = {
      ...scalarFields,
    };

    if (category) {
      const categoryId = await this.resolveCategoryId(category, subCategory);
      updateData.category = { connect: { id: categoryId } };
    }

    return this.prisma.enrichedTransaction.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });
  }

  async delete(id: string) {
    return this.prisma.enrichedTransaction.delete({
      where: { id },
    });
  }
}
