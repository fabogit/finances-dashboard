import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

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
}
