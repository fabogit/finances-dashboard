import { Test, TestingModule } from '@nestjs/testing';
import { GoalsService } from './goals.service';
import { GoalsRepository } from './goals.repository';
import { ScienceService } from '../science/science.service';
import { NotFoundException } from '@nestjs/common';
import { Prisma, GoalStatus, SavingsGoal } from '@prisma/client';
import { CreateGoalDto } from './dto/create-goal.dto';

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
      repo.create.mockResolvedValue(mockGoal);
      const result = await service.create(dto);
      expect(result).toEqual(mockGoal);
      expect(repo.create.mock.calls[0][0]).toEqual(dto);
    });
  });

  describe('findOne', () => {
    it('should return a goal if found', async () => {
      repo.findById.mockResolvedValue(mockGoal);
      const result = await service.findOne('goal-1');
      expect(result).toEqual(mockGoal);
    });

    it('should throw NotFoundException if not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne('404')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProjection', () => {
    it('should return projection data enriched with goal info', async () => {
      repo.findById.mockResolvedValue(mockGoal);
      science.getGoalProjection.mockResolvedValue({
        estimated_date: '2025-10',
        monthly_avg: 150,
        confidence: 'MEDIUM',
      });

      const result = await service.getProjection('goal-1');

      expect(result.goalName).toBe('Vacation');
      expect(result.estimated_date).toBe('2025-10');
      expect(science.getGoalProjection.mock.calls.length).toBe(1);
    });
  });
});
