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

  async findAllRaw(skip?: number, take?: number) {
    return this.prisma.rawTransaction.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    });
  }
}
