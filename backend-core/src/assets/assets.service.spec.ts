import { Test, TestingModule } from '@nestjs/testing';
import { AssetsService } from './assets.service';
import { AssetsRepository } from './assets.repository';
import { AssetType, Prisma } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('AssetsService', () => {
  let service: AssetsService;
  let repo: jest.Mocked<AssetsRepository>;

  const mockAsset = {
    id: 'asset-1',
    userId: 'user-1',
    name: 'Cash Account',
    institution: 'Bank',
    type: AssetType.CASH,
    balance: new Prisma.Decimal(5000),
    currency: 'EUR',
    createdAt: new Date(),
    updatedAt: new Date(),
    history: [],
  };

  beforeEach(async () => {
    const mockRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateBalance: jest.fn(),
      recalculateBalance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: AssetsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
    repo = module.get(AssetsRepository);
  });

  describe('findAll', () => {
    it('should return all assets', async () => {
      repo.findAll.mockResolvedValue([mockAsset]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Cash Account');
    });
  });

  describe('findOne', () => {
    it('should return an asset if found', async () => {
      repo.findById.mockResolvedValue(mockAsset);
      const result = await service.findOne('asset-1');
      expect(result.id).toBe('asset-1');
    });

    it('should throw NotFoundException if not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne('404')).rejects.toThrow(NotFoundException);
    });
  });

  describe('recalculateBalance', () => {
    it('should call repository recalculateBalance', async () => {
      repo.findById.mockResolvedValue(mockAsset);
      repo.recalculateBalance.mockResolvedValue({
        asset: mockAsset,
        baseBalance: 5000,
        transactionsSum: 0,
        newBalance: 5000,
        basedOnSnapshotDate: new Date(),
      });

      await service.recalculateBalance('asset-1');

      expect(repo.recalculateBalance.mock.calls[0][0]).toBe('asset-1');
    });
  });
});
