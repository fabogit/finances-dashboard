import { Test, TestingModule } from '@nestjs/testing';
import { GoalsService } from './goals.service';
import { GoalsRepository } from './goals.repository';
import { ScienceService } from '../science/science.service';
import { NotFoundException } from '@nestjs/common';
import { Prisma, GoalStatus, SavingsGoal } from '@prisma/client';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

describe('GoalsService', () => {
  let service: GoalsService;
  let repo: jest.Mocked<GoalsRepository>;
  let science: jest.Mocked<ScienceService>;

  const mockGoal: SavingsGoal & {
    transactions: {
      id: string;
      date: Date;
      amount: Prisma.Decimal;
      details: string | null;
      currency: string;
    }[];
  } = {
    id: 'goal-1',
    userId: 'user-1',
    name: 'Vacation',
    targetAmount: new Prisma.Decimal(2000),
    currentAmount: new Prisma.Decimal(500),
    status: GoalStatus.ACTIVE,
    deadline: null,
    icon: null,
    color: null,
    assetId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    transactions: [],
  };

  const prismaError = new Prisma.PrismaClientKnownRequestError('Error', {
    code: 'P2025',
    clientVersion: '5.x',
  });

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      updateProgress: jest.fn(),
      delete: jest.fn(),
    };

    const mockScience = {
      getGoalProjection: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        { provide: GoalsRepository, useValue: mockRepo },
        { provide: ScienceService, useValue: mockScience },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
    repo = module.get(GoalsRepository);
    science = module.get(ScienceService);
  });

  describe('create', () => {
    it('should create a goal', async () => {
      const dto: CreateGoalDto = { name: 'Test', targetAmount: 100 };
      (repo.create as jest.Mock).mockResolvedValue(mockGoal);
      const result = await service.create(dto);
      expect(result).toEqual(mockGoal);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all goals', async () => {
      (repo.findAll as jest.Mock).mockResolvedValue([mockGoal]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a goal if found', async () => {
      (repo.findById as jest.Mock).mockResolvedValue(mockGoal);
      const result = await service.findOne('goal-1');
      expect(result).toEqual(mockGoal);
    });

    it('should throw NotFoundException if not found', async () => {
      (repo.findById as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('404')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update goal', async () => {
      (repo.update as jest.Mock).mockResolvedValue(mockGoal);
      const result = await service.update('g1', {
        name: 'New',
      } as UpdateGoalDto);
      expect(result).toEqual(mockGoal);
    });

    it('should throw NotFoundException on P2025', async () => {
      (repo.update as jest.Mock).mockRejectedValue(prismaError);
      await expect(service.update('g1', {} as UpdateGoalDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProgress', () => {
    it('should update progress', async () => {
      (repo.updateProgress as jest.Mock).mockResolvedValue(mockGoal);
      const result = await service.updateProgress('g1', 100);
      expect(result).toEqual(mockGoal);
    });

    it('should throw NotFoundException on P2025', async () => {
      (repo.updateProgress as jest.Mock).mockRejectedValue(prismaError);
      await expect(service.updateProgress('g1', 100)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete goal', async () => {
      (repo.delete as jest.Mock).mockResolvedValue(mockGoal);
      const result = await service.remove('g1');
      expect(result).toEqual(mockGoal);
    });

    it('should throw NotFoundException on P2025', async () => {
      (repo.delete as jest.Mock).mockRejectedValue(prismaError);
      await expect(service.remove('g1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProjection', () => {
    it('should return projection data enriched with goal info', async () => {
      const goalWithTx = {
        ...mockGoal,
        transactions: [
          {
            id: 't1',
            date: new Date(),
            amount: new Prisma.Decimal(10),
            details: 'X',
            currency: 'EUR',
          },
        ],
      };
      (repo.findById as jest.Mock).mockResolvedValue(goalWithTx);
      (science.getGoalProjection as jest.Mock).mockResolvedValue({
        estimated_date: '2025-10',
        monthly_avg: 150,
        confidence: 'MEDIUM',
      });

      const result = await service.getProjection('goal-1');

      expect(result.goalName).toBe('Vacation');
      expect(result.estimated_date).toBe('2025-10');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(science.getGoalProjection).toHaveBeenCalled();
    });
  });
});
