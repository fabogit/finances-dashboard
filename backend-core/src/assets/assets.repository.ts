import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
  async updateBalance(id: string, asset: UpdateAssetBalanceDto) {
    return this.prisma.$transaction(async (tx) => {
      const updatedAsset = await tx.asset.update({
        where: { id },
        data: {
          balance: new Prisma.Decimal(asset.balance),
        },
      });

      await tx.assetHistory.create({
        data: {
          assetId: id,
          balance: new Prisma.Decimal(asset.balance),
          date: asset.date ? new Date(asset.date) : new Date(),
        },
      });

      return updatedAsset;
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
