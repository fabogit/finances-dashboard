import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsRepository } from '../assets/assets.repository';
import { GoalsRepository } from '../goals/goals.repository';
import { GetTransactionsFilterDto } from './dto/get-transactions.dto';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
} from './dto/create-update-transaction.dto';
import { EnrichedDataInput } from './interfaces/enriched-data-input.interface';

type CategoryMapData = {
  id: string;
  defaultAssetId: string | null;
};

@Injectable()
export class TransactionsRepository {
  private readonly logger = new Logger(TransactionsRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assetsRepo: AssetsRepository,
    private readonly goalsRepo: GoalsRepository,
  ) {}

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
    const uniqueMacros = new Set<string>();
    const uniqueSubs = new Set<string>();

    for (const item of data) {
      if (item.category) uniqueMacros.add(item.category);
      if (item.category && item.subCategory) {
        uniqueSubs.add(`${item.category}:${item.subCategory}`);
      }
    }

    // 2. Fallback Category
    let fallbackCat = await this.prisma.category.findFirst({
      where: { name: 'UNCATEGORIZED', parentId: null },
    });
    if (!fallbackCat) {
      fallbackCat = await this.prisma.category.create({
        data: {
          name: 'UNCATEGORIZED',
          isSystem: true,
          isVerified: true,
          type: 'UNCLASSIFIED',
          icon: '❓',
        },
      });
    }
    const fallbackId = fallbackCat.id;

    // 3. Create missing Macro (Bulk)
    const existingMacros = await this.prisma.category.findMany({
      where: { name: { in: Array.from(uniqueMacros) }, parentId: null },
      select: { id: true, name: true },
    });
    const existingMacroNames = new Set(existingMacros.map((c) => c.name));
    const missingMacros = Array.from(uniqueMacros).filter(
      (name) => !existingMacroNames.has(name),
    );

    if (missingMacros.length > 0) {
      await this.prisma.category.createMany({
        data: missingMacros.map((name) => ({
          name,
          isSystem: false,
          isVerified: false,
          parentId: null,
          type: 'UNCLASSIFIED',
        })),
        skipDuplicates: true,
      });
    }

    const allMacros = await this.prisma.category.findMany({
      where: { name: { in: Array.from(uniqueMacros) }, parentId: null },
      select: { id: true, name: true, defaultAssetId: true },
    });

    // Map: Name -> { id, defaultAssetId }
    const macroMap = new Map<string, CategoryMapData>();
    allMacros.forEach((c) =>
      macroMap.set(c.name, { id: c.id, defaultAssetId: c.defaultAssetId }),
    );

    // 4. Create missing Sub (Bulk)
    const subNamesOnly = Array.from(uniqueSubs).map((s) => s.split(':')[1]);
    const existingSubs = await this.prisma.category.findMany({
      where: { name: { in: subNamesOnly }, parentId: { not: null } },
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
            type: 'UNCLASSIFIED',
          });
        }
      }
    }
    if (transactionsToCreateSubs.length > 0) {
      await this.prisma.category.createMany({
        data: transactionsToCreateSubs,
        skipDuplicates: true,
      });
    }

    // Ricarica Sub aggiornate
    const allSubs = await this.prisma.category.findMany({
      where: {
        name: { in: subNamesOnly },
        parentId: { in: Array.from(macroMap.values()).map((v) => v.id) },
      },
      select: {
        id: true,
        name: true,
        defaultAssetId: true,
        parent: { select: { name: true } },
      },
    });

    const subMap = new Map<string, CategoryMapData>();
    allSubs.forEach((s) => {
      if (s.parent) {
        subMap.set(`${s.parent.name}:${s.name}`, {
          id: s.id,
          defaultAssetId: s.defaultAssetId,
        });
      }
    });

    // 5. Preparazione Transazioni con Mapping Asset Automatico
    const transactionsToInsert: Prisma.EnrichedTransactionCreateManyInput[] =
      [];

    for (const item of data) {
      let categoryId: string | undefined;
      let assetId: string | null = null; // Default null

      // Tentativo 1: Sub Category
      if (item.subCategory) {
        const subData = subMap.get(`${item.category}:${item.subCategory}`);
        if (subData) {
          categoryId = subData.id;
          // Automazione: Se la sub ha un asset, usalo
          if (subData.defaultAssetId) assetId = subData.defaultAssetId;
        }
      }

      // Tentativo 2: Macro Category (se sub fallisce o non esiste)
      if (!categoryId) {
        const macroData = macroMap.get(item.category);
        if (macroData) {
          categoryId = macroData.id;
          // Automazione: Se non abbiamo ancora un asset (dalla sub), prova con la macro
          if (!assetId && macroData.defaultAssetId) {
            assetId = macroData.defaultAssetId;
          }
        }
      }

      // Tentativo 3: Fallback
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
      });
    }

    return this.prisma.enrichedTransaction.createMany({
      data: transactionsToInsert,
    });
  }

  // --- CRUD SINGLE ---
  async create(dto: CreateTransactionDto) {
    const categoryId = await this.resolveCategoryId(
      dto.category,
      dto.subCategory,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Risolvi Asset di default (all'interno della tx per coerenza)
      let finalAssetId = dto.assetId;
      if (!finalAssetId) {
        const category = await tx.category.findUnique({
          where: { id: categoryId },
          select: { defaultAssetId: true },
        });
        if (category?.defaultAssetId) finalAssetId = category.defaultAssetId;
      }

      // 2. Crea la Transazione
      const transaction = await tx.enrichedTransaction.create({
        data: {
          date: dto.date,
          amount: new Prisma.Decimal(dto.amount),
          details: dto.details,
          account: dto.account || 'MANUAL',
          operation: dto.operation || 'Manual Entry',
          importBatchId: 'MANUAL',
          originalLine: -1,
          category: { connect: { id: categoryId } },
          asset: finalAssetId ? { connect: { id: finalAssetId } } : undefined,
          savingsGoal: dto.savingsGoalId
            ? { connect: { id: dto.savingsGoalId } }
            : undefined,
        },
        include: { category: true, asset: true, savingsGoal: true },
      });

      // 3. Aggiorna Saldi usando i repository esterni (passando tx)
      if (transaction.assetId) {
        await this.assetsRepo.updateBalanceWithDelta(
          transaction.assetId,
          transaction.amount.toNumber(),
          tx,
        );
      }
      if (transaction.savingsGoalId) {
        await this.goalsRepo.updateProgress(
          transaction.savingsGoalId,
          transaction.amount.toNumber(),
          tx,
        );
      }

      return transaction;
    });
  }

  async update(id: string, dto: UpdateTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Leggi il vecchio stato
      const oldTx = await tx.enrichedTransaction.findUniqueOrThrow({
        where: { id },
      });

      // 2. FASE DI STORNO (Revert dei vecchi saldi)
      if (oldTx.assetId) {
        await this.assetsRepo.updateBalanceWithDelta(
          oldTx.assetId,
          oldTx.amount.toNumber() * -1,
          tx,
        );
      }
      if (oldTx.savingsGoalId) {
        await this.goalsRepo.updateProgress(
          oldTx.savingsGoalId,
          oldTx.amount.toNumber() * -1,
          tx,
        );
      }

      // 3. Risolvi la nuova Categoria (se cambiata)
      const { category, subCategory, assetId, savingsGoalId, ...scalarFields } =
        dto;
      const updateData: Prisma.EnrichedTransactionUpdateInput = {
        ...scalarFields,
        amount: scalarFields.amount
          ? new Prisma.Decimal(scalarFields.amount)
          : undefined,
      };

      if (category) {
        const categoryId = await this.resolveCategoryId(category, subCategory); // Nota: usa this.prisma interno, accettabile qui.
        updateData.category = { connect: { id: categoryId } };
      }

      if (assetId !== undefined)
        updateData.asset = assetId
          ? { connect: { id: assetId } }
          : { disconnect: true };
      if (savingsGoalId !== undefined)
        updateData.savingsGoal = savingsGoalId
          ? { connect: { id: savingsGoalId } }
          : { disconnect: true };

      // 4. Aggiorna Transazione
      const updatedTx = await tx.enrichedTransaction.update({
        where: { id },
        data: updateData,
        include: { category: true, asset: true, savingsGoal: true },
      });

      // 5. FASE DI APPLICAZIONE (Applica i nuovi saldi)
      if (updatedTx.assetId) {
        await this.assetsRepo.updateBalanceWithDelta(
          updatedTx.assetId,
          updatedTx.amount.toNumber(),
          tx,
        );
      }
      if (updatedTx.savingsGoalId) {
        await this.goalsRepo.updateProgress(
          updatedTx.savingsGoalId,
          updatedTx.amount.toNumber(),
          tx,
        );
      }

      return updatedTx;
    });
  }

  async delete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.enrichedTransaction.findUniqueOrThrow({
        where: { id },
      });

      // Storna saldi prima di cancellare
      if (existing.assetId) {
        await this.assetsRepo.updateBalanceWithDelta(
          existing.assetId,
          existing.amount.toNumber() * -1,
          tx,
        );
      }
      if (existing.savingsGoalId) {
        await this.goalsRepo.updateProgress(
          existing.savingsGoalId,
          existing.amount.toNumber() * -1,
          tx,
        );
      }

      // Elimina
      return tx.enrichedTransaction.delete({ where: { id } });
    });
  }

  async findById(id: string) {
    return this.prisma.enrichedTransaction.findUnique({
      where: { id },
      include: {
        category: { include: { parent: true } },
        asset: true,
        savingsGoal: true,
      },
    });
  }

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
          category: { include: { parent: true } },
          asset: true,
          savingsGoal: true,
        },
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
}
