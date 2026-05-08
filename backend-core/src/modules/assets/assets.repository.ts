import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateAssetBalanceDto } from './dto/update-asset-balance.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AssetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- CREATE ---
  async create(dto: CreateAssetDto) {
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          name: dto.name,
          institution: dto.institution,
          type: dto.type,
          balance: new Prisma.Decimal(dto.balance),
          currency: dto.currency || 'EUR',
        },
      });
      await tx.assetHistory.create({
        data: {
          assetId: asset.id,
          balance: new Prisma.Decimal(dto.balance),
          date: new Date(),
        },
      });
      return asset;
    });
  }

  // --- READ ---
  async findAll() {
    return this.prisma.asset.findMany({
      orderBy: { balance: 'desc' },
    });
  }

  async findById(id: string, historyLimit: number = 20) {
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
  async update(id: string, partialAsset: UpdateAssetDto) {
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
  ) {
    const logic = async (transactionClient: Prisma.TransactionClient) => {
      const updatedAsset = await transactionClient.asset.update({
        where: { id },
        data: {
          balance: new Prisma.Decimal(dto.balance),
        },
      });

      await transactionClient.assetHistory.create({
        data: {
          assetId: id,
          balance: new Prisma.Decimal(dto.balance),
          date: dto.date ? new Date(dto.date) : new Date(),
        },
      });

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
  ) {
    const logic = async (transactionClient: Prisma.TransactionClient) => {
      const updatedAsset = await transactionClient.asset.update({
        where: { id },
        data: {
          balance: { increment: delta },
        },
      });

      // Snapshot
      await transactionClient.assetHistory.create({
        data: {
          assetId: id,
          balance: updatedAsset.balance,
          date: new Date(),
        },
      });

      return updatedAsset;
    };

    if (tx) {
      return logic(tx);
    } else {
      return this.prisma.$transaction(logic);
    }
  }

  async recalculateBalance(id: string) {
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
      await tx.assetHistory.create({
        data: {
          assetId: id,
          balance: newBalance,
          date: new Date(),
        },
      });

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
  async delete(id: string) {
    // The DB handles Cascade for history and SetNull for transactions.
    // Here we let Prisma throw an error if the ID doesn't exist,
    return this.prisma.asset.delete({
      where: { id },
    });
  }
}
