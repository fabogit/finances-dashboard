import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Asset, Prisma } from '@prisma/client';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateAssetBalanceDto } from './dto/update-asset-balance.dto';
import {
  AssetWithHistory,
  RecalculateBalanceResult,
} from './interfaces/asset-repository.interfaces';

@Injectable()
export class AssetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- CREATE ---
  async create(dto: CreateAssetDto): Promise<Asset> {
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          name: dto.name,
          institution: dto.institution,
          type: dto.type,
          balance: new Prisma.Decimal(dto.balance),
          currency: dto.currency || 'EUR',
          isOnBudget: dto.isOnBudget,
        },
      });
      await this.upsertHistorySnapshot(tx, asset.id, asset.balance);
      return asset;
    });
  }

  // --- READ ---
  async findAll(): Promise<Asset[]> {
    return this.prisma.asset.findMany({
      orderBy: { balance: 'desc' },
    });
  }

  async findById(
    id: string,
    historyLimit: number = 20,
  ): Promise<AssetWithHistory | null> {
    return this.prisma.asset.findUnique({
      where: { id },
      include: {
        history: {
          orderBy: { date: 'desc' },
          take: historyLimit,
        },
      },
    });
  }

  // --- UPDATE DETAILS (No Balance) ---
  async update(id: string, partialAsset: UpdateAssetDto): Promise<Asset> {
    return this.prisma.asset.update({
      where: { id },
      data: partialAsset,
    });
  }

  // --- UPDATE BALANCE (With History) ---
  async updateBalance(
    id: string,
    dto: UpdateAssetBalanceDto,
    tx?: Prisma.TransactionClient,
  ): Promise<Asset> {
    const logic = async (
      transactionClient: Prisma.TransactionClient,
    ): Promise<Asset> => {
      const updatedAsset = await transactionClient.asset.update({
        where: { id },
        data: {
          balance: new Prisma.Decimal(dto.balance),
        },
      });

      await this.upsertHistorySnapshot(
        transactionClient,
        id,
        new Prisma.Decimal(dto.balance),
        dto.date,
      );

      return updatedAsset;
    };

    if (tx) {
      return logic(tx);
    } else {
      return this.prisma.$transaction(logic);
    }
  }

  // --- UPDATE BALANCE WITH DELTA (For Transactions) ---
  async updateBalanceWithDelta(
    id: string,
    delta: Prisma.Decimal | number,
    tx?: Prisma.TransactionClient,
  ): Promise<Asset> {
    const logic = async (
      transactionClient: Prisma.TransactionClient,
    ): Promise<Asset> => {
      const updatedAsset = await transactionClient.asset.update({
        where: { id },
        data: {
          balance: { increment: delta },
        },
      });

      // Snapshot
      await this.upsertHistorySnapshot(
        transactionClient,
        id,
        updatedAsset.balance,
      );

      return updatedAsset;
    };

    if (tx) {
      return logic(tx);
    } else {
      return this.prisma.$transaction(logic);
    }
  }

  async recalculateBalance(id: string): Promise<RecalculateBalanceResult> {
    return this.prisma.$transaction(async (tx) => {
      // 0. Verify existence (throws P2025 if not found)
      await tx.asset.findUniqueOrThrow({ where: { id } });

      // 1. Find the first absolute snapshot (Anchor Point)
      const firstSnapshot = await tx.assetHistory.findFirst({
        where: { assetId: id },
        orderBy: { date: 'asc' }, // From oldest
      });

      const baseBalance = firstSnapshot
        ? firstSnapshot.balance
        : new Prisma.Decimal(0);
      const startDate = firstSnapshot ? firstSnapshot.date : new Date(0);

      // 2. Sum all transactions (delta) occurring after the Anchor Point
      const aggregations = await tx.enrichedTransaction.aggregate({
        where: {
          assetId: id,
          date: { gt: startDate },
        },
        _sum: { amount: true },
      });

      const transactionsSum = aggregations._sum.amount || new Prisma.Decimal(0);
      const newBalance = baseBalance.add(transactionsSum);

      // 3. Overwrite the Asset balance with the calculated value
      const updatedAsset = await tx.asset.update({
        where: { id },
        data: { balance: newBalance },
      });

      // 4. Record reconciliation history snapshot to maintain graph consistency
      await this.upsertHistorySnapshot(tx, id, newBalance);

      return {
        asset: updatedAsset,
        baseBalance: baseBalance,
        transactionsSum: transactionsSum,
        newBalance: newBalance,
        basedOnSnapshotDate: startDate,
      };
    });
  }

  // --- DELETE ---
  async delete(id: string): Promise<Asset> {
    // The DB handles Cascade for history and SetNull for transactions.
    // Here we let Prisma throw an error if the ID doesn't exist.
    return this.prisma.asset.delete({
      where: { id },
    });
  }

  // --- PRIVATE HELPERS ---
  private async upsertHistorySnapshot(
    tx: Prisma.TransactionClient,
    assetId: string,
    balance: Prisma.Decimal,
    dateInput?: Date | string | null,
  ): Promise<void> {
    const targetDate = dateInput ? new Date(dateInput) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0); // Truncate to UTC 00:00:00.000

    const existing = await tx.assetHistory.findFirst({
      where: {
        assetId,
        date: targetDate,
      },
    });

    if (existing) {
      await tx.assetHistory.update({
        where: { id: existing.id },
        data: { balance },
      });
    } else {
      await tx.assetHistory.create({
        data: {
          assetId,
          balance,
          date: targetDate,
        },
      });
    }
  }
}
