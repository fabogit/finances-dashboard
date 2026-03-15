import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GoalsRepository } from './goals.repository';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ScienceService } from '../science/science.service';

@Injectable()
export class GoalsService {
  constructor(
    private readonly goalsRepo: GoalsRepository,
    private readonly scienceService: ScienceService,
  ) {}

  create(createGoalDto: CreateGoalDto) {
    return this.goalsRepo.create(createGoalDto);
  }

  findAll() {
    return this.goalsRepo.findAll();
  }

  async findOne(id: string, transactionLimit: number = 10) {
    const goal = await this.goalsRepo.findById(id, transactionLimit);
    if (!goal) {
      throw new NotFoundException(`Savings Goal #${id} not found`);
    }
    return goal;
  }

  async update(id: string, updateGoalDto: UpdateGoalDto) {
    try {
      return await this.goalsRepo.update(id, updateGoalDto);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Savings Goal #${id} not found`);
      }
      throw error;
    }
  }

  /**
   * Updates the Goal's progress.
   * Accepts an optional transactional context (tx).
   * If passed, the update will be part of the caller's transaction (e.g., TransactionsService).
   */
  async updateProgress(
    id: string,
    amount: number,
    tx?: Prisma.TransactionClient,
  ) {
    try {
      return await this.goalsRepo.updateProgress(id, amount, tx);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Savings Goal #${id} not found or not in a mutable status (ACTIVE/PAUSED).`,
        );
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.goalsRepo.delete(id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Savings Goal #${id} not found`);
      }
      throw error;
    }
  }

  async getProjection(id: string) {
    const goal = await this.findOne(id, 100); // Fetch more history for better projection

    const projection = await this.scienceService.getGoalProjection({
      transactions: goal.transactions.map((t) => ({
        id: t.id,
        date: t.date.toISOString(),
        amount: t.amount.toNumber(),
        details: t.details || '',
        category: 'SAVINGS', // Context of the goal
        subCategory: null, // Keep it null if not a real sub-category
        operation: 'CONTRIBUTION',
        account: 'N/A',
      })),
      target_amount: goal.targetAmount.toNumber(),
      current_amount: goal.currentAmount.toNumber(),
    });

    return {
      ...projection,
      goalName: goal.name,
      currentProgress: goal.currentAmount,
      targetAmount: goal.targetAmount,
    };
  }
}
