import { Prisma } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetsRepository } from './assets.repository';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateAssetBalanceDto } from './dto/update-asset-balance.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly assetsRepo: AssetsRepository) {}

  async create(createAssetDto: CreateAssetDto) {
    return this.assetsRepo.create(createAssetDto);
  }

  async findAll() {
    return this.assetsRepo.findAll();
  }

  async findOne(id: string, historyLimit?: number) {
    const asset = await this.assetsRepo.findById(id, historyLimit);
    if (!asset) {
      throw new NotFoundException(`Asset #${id} not found`);
    }
    return asset;
  }

  async update(id: string, updateAssetDto: UpdateAssetDto) {
    try {
      return await this.assetsRepo.update(id, updateAssetDto);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Asset #${id} not found`);
      }
      throw error;
    }
  }

  async updateBalance(id: string, dto: UpdateAssetBalanceDto) {
    try {
      return await this.assetsRepo.updateBalance(id, dto);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Asset #${id} not found`);
      }
      throw error;
    }
  }

  async updateBalanceWithDelta(
    id: string,
    delta: Prisma.Decimal | number,
    tx?: Prisma.TransactionClient,
  ) {
    try {
      return await this.assetsRepo.updateBalanceWithDelta(id, delta, tx);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Asset #${id} not found`);
      }
      throw error;
    }
  }

  async recalculateBalance(id: string) {
    try {
      return await this.assetsRepo.recalculateBalance(id);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Asset #${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.assetsRepo.delete(id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Asset #${id} not found`);
      }
      throw error;
    }
  }
}
