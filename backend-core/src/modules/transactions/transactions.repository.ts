import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SYSTEM_CATEGORIES,
  TRANSACTION_FALLBACKS,
  EXPENSE_TYPES,
} from '../../common/constants/domain.constants';
import { GetTransactionsFilterDto } from './dto/get-transactions.dto';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
} from './dto/create-update-transaction.dto';
import { EnrichedDataInput } from './interfaces/enriched-data-input.interface';
import {
  transactionWithDetailsInclude,
  TransactionWithDetails,
} from './interfaces/transaction-with-details.interface';

type CategoryMapData = {
  id: string;
  defaultAssetId: string | null;
};

@Injectable()
export class TransactionsRepository {
  private readonly logger = new Logger(TransactionsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // --- HELPER: Resolve Category (Find or Create) ---
  /**
   * Resolves a category ID by name, creating it if it doesn't exist.
   * If a sub-category name is provided, it resolves the sub-category under the macro category.
   */
  async resolveCategoryId(
    categoryName: string,
    subCategoryName?: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx || this.prisma;

    let macro = await client.category.findFirst({
      where: { name: categoryName, parentId: null },
    });

    if (!macro) {
      this.logger.debug(`Creating new Macro Category: ${categoryName}`);
      macro = await client.category.create({
        data: { name: categoryName, isSystem: false, isVerified: false },
      });
    }

    if (!subCategoryName) return macro.id;

    let sub = await client.category.findFirst({
      where: { name: subCategoryName, parentId: macro.id },
    });

    if (!sub) {
      this.logger.debug(
        `Creating new Sub Category: ${subCategoryName} under ${categoryName}`,
      );
      sub = await client.category.create({
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
  async createManyEnriched(
    data: EnrichedDataInput[],
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    const uniqueMacros = new Set<string>();
    const uniqueSubs = new Set<string>();

    for (const item of data) {
      if (item.category) uniqueMacros.add(item.category);
      if (item.category && item.subCategory) {
        uniqueSubs.add(`${item.category}:${item.subCategory}`);
      }
    }

    // 1. Resolve fallback category
    const fallbackId = await this.resolveFallbackCategory(client);

    // 2. Resolve / Create macro categories
    const macroMap = await this.resolveOrCreateMacros(uniqueMacros, client);

    // 3. Resolve / Create subcategories
    const subMap = await this.resolveOrCreateSubs(uniqueSubs, macroMap, client);

    // 4. Map transactions with automatic asset associations
    const transactionsToInsert = this.buildEnrichedInsertData(
      data,
      fallbackId,
      macroMap,
      subMap,
    );

    return client.enrichedTransaction.createMany({
      data: transactionsToInsert,
    });
  }

  private async resolveFallbackCategory(
    client: Prisma.TransactionClient,
  ): Promise<string> {
    let fallbackCat = await client.category.findFirst({
      where: { name: SYSTEM_CATEGORIES.UNCATEGORIZED, parentId: null },
    });
    if (!fallbackCat) {
      fallbackCat = await client.category.create({
        data: {
          name: SYSTEM_CATEGORIES.UNCATEGORIZED,
          isSystem: true,
          isVerified: true,
          type: EXPENSE_TYPES.UNCLASSIFIED,
          icon: SYSTEM_CATEGORIES.DEFAULT_ICON,
        },
      });
    }
    return fallbackCat.id;
  }

  private async resolveOrCreateMacros(
    uniqueMacros: Set<string>,
    client: Prisma.TransactionClient,
  ): Promise<Map<string, CategoryMapData>> {
    if (uniqueMacros.size === 0) {
      return new Map();
    }

    const existingMacros = await client.category.findMany({
      where: { name: { in: Array.from(uniqueMacros) }, parentId: null },
      select: { id: true, name: true },
    });
    const existingMacroNames = new Set(existingMacros.map((c) => c.name));
    const missingMacros = Array.from(uniqueMacros).filter(
      (name) => !existingMacroNames.has(name),
    );

    if (missingMacros.length > 0) {
      await client.category.createMany({
        data: missingMacros.map((name) => ({
          name,
          isSystem: false,
          isVerified: false,
          parentId: null,
          type: EXPENSE_TYPES.UNCLASSIFIED,
        })),
        skipDuplicates: true,
      });
    }

    const allMacros = await client.category.findMany({
      where: { name: { in: Array.from(uniqueMacros) }, parentId: null },
      select: { id: true, name: true, defaultAssetId: true },
    });

    // Map: Name -> { id, defaultAssetId }
    const macroMap = new Map<string, CategoryMapData>();
    allMacros.forEach((c) =>
      macroMap.set(c.name, { id: c.id, defaultAssetId: c.defaultAssetId }),
    );
    return macroMap;
  }

  private async resolveOrCreateSubs(
    uniqueSubs: Set<string>,
    macroMap: Map<string, CategoryMapData>,
    client: Prisma.TransactionClient,
  ): Promise<Map<string, CategoryMapData>> {
    const subMap = new Map<string, CategoryMapData>();
    if (uniqueSubs.size === 0) {
      return subMap;
    }

    let existingSubs: Array<{
      id: string;
      name: string;
      parent: { name: string } | null;
    }> = [];

    const orConditions = Array.from(uniqueSubs).map((s) => {
      const [parentName, subName] = s.split(':');
      return {
        name: subName,
        parent: { name: parentName, parentId: null },
      };
    });

    existingSubs = await client.category.findMany({
      where: { OR: orConditions },
      select: { id: true, name: true, parent: { select: { name: true } } },
    });

    const existingSubKeys = new Set(
      existingSubs.map((s) => `${s.parent?.name}:${s.name}`),
    );

    const transactionsToCreateSubs: Prisma.CategoryCreateManyInput[] = [];
    for (const key of uniqueSubs) {
      if (!existingSubKeys.has(key)) {
        const [macroName, subName] = key.split(':');
        const macroData = macroMap.get(macroName);
        if (macroData) {
          transactionsToCreateSubs.push({
            name: subName,
            parentId: macroData.id,
            isSystem: false,
            isVerified: false,
            type: EXPENSE_TYPES.UNCLASSIFIED,
          });
        }
      }
    }

    if (transactionsToCreateSubs.length > 0) {
      await client.category.createMany({
        data: transactionsToCreateSubs,
        skipDuplicates: true,
      });
    }

    const allSubs = await client.category.findMany({
      where: { OR: orConditions },
      select: {
        id: true,
        name: true,
        defaultAssetId: true,
        parent: { select: { name: true } },
      },
    });

    allSubs.forEach((s) => {
      if (s.parent) {
        subMap.set(`${s.parent.name}:${s.name}`, {
          id: s.id,
          defaultAssetId: s.defaultAssetId,
        });
      }
    });

    return subMap;
  }

  private buildEnrichedInsertData(
    data: EnrichedDataInput[],
    fallbackId: string,
    macroMap: Map<string, CategoryMapData>,
    subMap: Map<string, CategoryMapData>,
  ): Prisma.EnrichedTransactionCreateManyInput[] {
    const transactionsToInsert: Prisma.EnrichedTransactionCreateManyInput[] =
      [];

    for (const item of data) {
      let categoryId: string | undefined;
      let assetId: string | null = null; // Default null

      // Attempt 1: Sub Category
      if (item.subCategory) {
        const subData = subMap.get(`${item.category}:${item.subCategory}`);
        if (subData) {
          categoryId = subData.id;
          // Automation: If sub has an asset, use it
          if (subData.defaultAssetId) assetId = subData.defaultAssetId;
        }
      }

      // Attempt 2: Macro Category (if sub fails or doesn't exist)
      if (!categoryId) {
        const macroData = macroMap.get(item.category);
        if (macroData) {
          categoryId = macroData.id;
          // Automation: If we don't have an asset yet (from sub), try with macro
          if (!assetId && macroData.defaultAssetId) {
            assetId = macroData.defaultAssetId;
          }
        }
      }

      // Attempt 3: Fallback
      if (!categoryId) {
        this.logger.warn(
          `Mapping failed for ${item.category} -> ${item.subCategory}. Using fallback.`,
        );
        categoryId = fallbackId;
      }

      transactionsToInsert.push({
        importBatchId: item.importBatchId,
        originalLine: item.originalLine,
        date: item.date,
        amount: new Prisma.Decimal(item.amount),
        operation: item.operation,
        details: item.details,
        account: item.account,
        categoryId: categoryId,
        assetId: assetId,
        transactionHash: item.transactionHash ?? null,
      });
    }

    return transactionsToInsert;
  }

  // --- CRUD SINGLE ---
  async create(
    dto: CreateTransactionDto,
    tx?: Prisma.TransactionClient,
  ): Promise<TransactionWithDetails> {
    const client = tx || this.prisma;
    const categoryId = await this.resolveCategoryId(
      dto.category,
      dto.subCategory,
      tx,
    );

    // 1. Resolve default Asset and Goal
    const category = await client.category.findUnique({
      where: { id: categoryId },
      select: { defaultAssetId: true, defaultGoalId: true },
    });

    let finalAssetId = dto.assetId;
    if (!finalAssetId && category?.defaultAssetId) {
      finalAssetId = category.defaultAssetId;
    }

    let finalGoalId = dto.savingsGoalId;
    if (!finalGoalId && category?.defaultGoalId) {
      finalGoalId = category.defaultGoalId;
    }

    // 2. Create the Transaction
    return client.enrichedTransaction.create({
      data: {
        date: dto.date,
        amount: new Prisma.Decimal(dto.amount),
        details: dto.details,
        account: dto.account || TRANSACTION_FALLBACKS.ACCOUNT,
        operation: dto.operation || TRANSACTION_FALLBACKS.OPERATION,
        importBatchId: TRANSACTION_FALLBACKS.IMPORT_BATCH_ID,
        originalLine: -1,
        category: { connect: { id: categoryId } },
        asset: finalAssetId ? { connect: { id: finalAssetId } } : undefined,
        savingsGoal: finalGoalId ? { connect: { id: finalGoalId } } : undefined,
      },
      include: transactionWithDetailsInclude,
    });
  }

  async update(
    id: string,
    dto: UpdateTransactionDto,
    tx?: Prisma.TransactionClient,
  ): Promise<TransactionWithDetails> {
    const client = tx || this.prisma;

    // 1. Resolve the new Category (if changed)
    const { category, subCategory, assetId, savingsGoalId, ...scalarFields } =
      dto;
    const updateData: Prisma.EnrichedTransactionUpdateInput = {
      ...scalarFields,
      amount: scalarFields.amount
        ? new Prisma.Decimal(scalarFields.amount)
        : undefined,
    };

    if (category) {
      const categoryId = await this.resolveCategoryId(
        category,
        subCategory,
        tx,
      );
      updateData.category = { connect: { id: categoryId } };

      // Automation: If category changed and no explicit IDs provided, use defaults
      const catData = await client.category.findUnique({
        where: { id: categoryId },
        select: { defaultAssetId: true, defaultGoalId: true },
      });

      if (assetId === undefined && catData?.defaultAssetId) {
        updateData.asset = { connect: { id: catData.defaultAssetId } };
      }
      if (savingsGoalId === undefined && catData?.defaultGoalId) {
        updateData.savingsGoal = { connect: { id: catData.defaultGoalId } };
      }
    }

    if (assetId !== undefined)
      updateData.asset = assetId
        ? { connect: { id: assetId } }
        : { disconnect: true };
    if (savingsGoalId !== undefined)
      updateData.savingsGoal = savingsGoalId
        ? { connect: { id: savingsGoalId } }
        : { disconnect: true };

    // 2. Update Transaction
    return client.enrichedTransaction.update({
      where: { id },
      data: updateData,
      include: transactionWithDetailsInclude,
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.enrichedTransaction.delete({ where: { id } });
  }

  async findById(id: string): Promise<TransactionWithDetails | null> {
    return this.prisma.enrichedTransaction.findUnique({
      where: { id },
      include: transactionWithDetailsInclude,
    });
  }

  async findAllEnriched(
    filters: GetTransactionsFilterDto,
  ): Promise<{ total: number; transactions: TransactionWithDetails[] }> {
    const where = this.buildWhereClause(filters);
    const [total, transactions] = await this.prisma.$transaction([
      this.prisma.enrichedTransaction.count({ where }),
      this.prisma.enrichedTransaction.findMany({
        where,
        take: filters.limit,
        skip: (filters.page - 1) * filters.limit,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        include: transactionWithDetailsInclude,
      }),
    ]);
    return { total, transactions };
  }

  async createManyRaw(data: Prisma.RawTransactionCreateManyInput[]) {
    return this.prisma.rawTransaction.createMany({
      data,
    });
  }

  async findAllRaw() {
    return this.prisma.rawTransaction.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAssetDeltasByBatchId(
    batchId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.enrichedTransaction.groupBy({
      by: ['assetId'],
      where: {
        importBatchId: batchId,
        assetId: { not: null },
      },
      _sum: {
        amount: true,
      },
    });
  }

  async getGoalDeltasByBatchId(batchId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.enrichedTransaction.groupBy({
      by: ['savingsGoalId'],
      where: {
        importBatchId: batchId,
        savingsGoalId: { not: null },
      },
      _sum: {
        amount: true,
      },
    });
  }
}
