import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- CREATE ---
  async create(dto: CreateGoalDto) {
    return this.prisma.savingsGoal.create({
      data: {
        name: dto.name,
        targetAmount: new Prisma.Decimal(dto.targetAmount),
        currentAmount: new Prisma.Decimal(dto.currentAmount ?? 0),
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        status: dto.status,
        icon: dto.icon,
        color: dto.color,
      },
    });
  }

  // --- READ ALL ---
  async findAll() {
    return this.prisma.savingsGoal.findMany({
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
    });
  }

  // --- FIND ONE (Dynamic Limit) ---
  async findById(id: string, transactionLimit: number = 10) {
    return this.prisma.savingsGoal.findUnique({
      where: { id },
      include: {
        transactions: {
          take: transactionLimit,
          orderBy: { date: 'desc' },
          select: {
            id: true,
            date: true,
            amount: true,
            details: true,
            currency: true,
          },
        },
      },
    });
  }

  // --- UPDATE (Standard) ---
  async update(id: string, dto: UpdateGoalDto) {
    return this.prisma.savingsGoal.update({
      where: { id },
      data: {
        ...dto,
        targetAmount: dto.targetAmount
          ? new Prisma.Decimal(dto.targetAmount)
          : undefined,
        currentAmount: dto.currentAmount
          ? new Prisma.Decimal(dto.currentAmount)
          : undefined,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
    });
  }

  // --- ATOMIC PROGRESS UPDATE (Transactional Support) ---
  /**
   * Updates the current progress.
   * Supports an optional transactional context (tx) to be called
   * within a larger Prisma transaction (e.g., EnrichedTransaction creation).
   */
  async updateProgress(
    id: string,
    deltaAmount: number,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;

    return client.savingsGoal.update({
      where: {
        id,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
      data: {
        currentAmount: {
          increment: new Prisma.Decimal(deltaAmount),
        },
      },
    });
  }

  // --- DELETE ---
  async delete(id: string) {
    return this.prisma.savingsGoal.delete({
      where: { id },
    });
  }
}
