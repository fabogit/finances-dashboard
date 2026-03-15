import { Test, TestingModule } from '@nestjs/testing';
import { GoalsRepository } from './goals.repository';
import { PrismaService } from '../prisma/prisma.service';
import { GoalStatus, Prisma } from '@prisma/client';
import { CreateGoalDto } from './dto/create-goal.dto';

describe('GoalsRepository', () => {
  let repository: GoalsRepository;

  const mockPrisma = {
    savingsGoal: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<GoalsRepository>(GoalsRepository);
  });

  describe('create', () => {
    it('should create a goal with mapped data', async () => {
      const dto: CreateGoalDto = {
        name: 'New Goal',
        targetAmount: 1000,
        currentAmount: 100,
        status: GoalStatus.ACTIVE,
      };
      mockPrisma.savingsGoal.create.mockResolvedValue({ id: 'g1', ...dto });

      const result = await repository.create(dto);
      expect(result.id).toBe('g1');
      expect(mockPrisma.savingsGoal.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          targetAmount: expect.any(Prisma.Decimal) as Prisma.Decimal,
          currentAmount: expect.any(Prisma.Decimal) as Prisma.Decimal,
          deadline: null,
          status: GoalStatus.ACTIVE,
          icon: undefined,
          color: undefined,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should call findMany with orderBy', async () => {
      mockPrisma.savingsGoal.findMany.mockResolvedValue([]);
      await repository.findAll();
      expect(mockPrisma.savingsGoal.findMany).toHaveBeenCalledWith({
        orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
      });
    });
  });

  describe('findById', () => {
    it('should call findUnique with complex include', async () => {
      mockPrisma.savingsGoal.findUnique.mockResolvedValue({ id: 'g1' });
      await repository.findById('g1', 5);
      expect(mockPrisma.savingsGoal.findUnique).toHaveBeenCalledWith({
        where: { id: 'g1' },
        include: {
          transactions: {
            take: 5,
            orderBy: { date: 'desc' },
            select: expect.any(Object) as Record<string, unknown>,
          },
        },
      });
    });
  });

  describe('updateProgress', () => {
    it('should update currentAmount with increment and status check', async () => {
      mockPrisma.savingsGoal.update.mockResolvedValue({ id: 'g1' });
      await repository.updateProgress('g1', 500);
      expect(mockPrisma.savingsGoal.update).toHaveBeenCalledWith({
        where: {
          id: 'g1',
          status: { in: ['ACTIVE', 'PAUSED'] },
        },
        data: {
          currentAmount: {
            increment: expect.any(Prisma.Decimal) as Prisma.Decimal,
          },
        },
      });
    });

    it('should use provided transaction client', async () => {
      const mockTxUpdate = jest.fn().mockResolvedValue({ id: 'g1' });
      const mockTx = {
        savingsGoal: {
          update: mockTxUpdate,
        },
      } as unknown as Prisma.TransactionClient;

      await repository.updateProgress('g1', 500, mockTx);
      expect(mockTxUpdate).toHaveBeenCalled();
      expect(mockPrisma.savingsGoal.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should call delete', async () => {
      mockPrisma.savingsGoal.delete.mockResolvedValue({ id: 'g1' });
      await repository.delete('g1');
      expect(mockPrisma.savingsGoal.delete).toHaveBeenCalledWith({
        where: { id: 'g1' },
      });
    });
  });
});
