import { Test, TestingModule } from '@nestjs/testing';
import { AssetsRepository } from './assets.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetType, Prisma } from '@prisma/client';
import { CreateAssetDto } from './dto/create-asset.dto';

describe('AssetsRepository', () => {
  let repository: AssetsRepository;

  const mockPrisma = {
    asset: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    assetHistory: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    enrichedTransaction: {
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(async (cb: (prisma: unknown) => Promise<unknown>) => {
      if (typeof cb === 'function') {
        const result = await cb(mockPrisma);
        return result;
      }
      return Promise.all(cb as unknown as Promise<unknown>[]);
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<AssetsRepository>(AssetsRepository);
  });

  describe('create', () => {
    it('should create an asset and its first history entry', async () => {
      const dto: CreateAssetDto = {
        name: 'Bank',
        type: AssetType.CASH,
        balance: 1000,
        institution: 'Trust',
        isOnBudget: true,
      };
      const createMock = mockPrisma.asset.create;
      createMock.mockResolvedValue({
        id: 'a1',
        ...dto,
      });
      mockPrisma.assetHistory.findFirst.mockResolvedValue(null);

      const asset = await repository.create(dto);
      expect(asset.id).toBe('a1');
      expect(createMock).toHaveBeenCalled();
      expect(mockPrisma.assetHistory.create).toHaveBeenCalled();
    });
  });

  describe('updateBalance', () => {
    it('should update balance and create history entry if none exists for the day', async () => {
      const mockUpdatedAsset = { id: 'a1', balance: new Prisma.Decimal(1200) };
      mockPrisma.asset.update.mockResolvedValue(mockUpdatedAsset);
      mockPrisma.assetHistory.findFirst.mockResolvedValue(null);

      const asset = await repository.updateBalance('a1', { balance: 1200 });
      expect(asset.balance.toNumber()).toBe(1200);
      expect(mockPrisma.assetHistory.create).toHaveBeenCalled();
      expect(mockPrisma.assetHistory.update).not.toHaveBeenCalled();
    });

    it('should update balance and update history entry if one already exists for the day', async () => {
      const mockUpdatedAsset = { id: 'a1', balance: new Prisma.Decimal(1200) };
      mockPrisma.asset.update.mockResolvedValue(mockUpdatedAsset);
      mockPrisma.assetHistory.findFirst.mockResolvedValue({
        id: 'h1',
        balance: new Prisma.Decimal(1000),
      });

      const asset = await repository.updateBalance('a1', { balance: 1200 });
      expect(asset.balance.toNumber()).toBe(1200);
      expect(mockPrisma.assetHistory.create).not.toHaveBeenCalled();
      expect(mockPrisma.assetHistory.update).toHaveBeenCalledWith({
        where: { id: 'h1' },
        data: { balance: new Prisma.Decimal(1200) },
      });
    });
  });

  describe('updateBalanceWithDelta', () => {
    it('should increment balance and create history entry', async () => {
      const mockUpdatedAsset = { id: 'a1', balance: new Prisma.Decimal(1200) };
      const updateMock = mockPrisma.asset.update;
      updateMock.mockResolvedValue(mockUpdatedAsset);
      mockPrisma.assetHistory.findFirst.mockResolvedValue(null);

      const asset = await repository.updateBalanceWithDelta('a1', 200);
      expect(asset.balance.toNumber()).toBe(1200);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            balance: {
              increment: 200,
            },
          },
        }),
      );
    });
  });

  describe('recalculateBalance', () => {
    it('should aggregate transactions and update asset balance', async () => {
      mockPrisma.asset.findUniqueOrThrow.mockResolvedValue({
        id: 'a1',
      });
      // First call (Anchor Point)
      mockPrisma.assetHistory.findFirst.mockResolvedValueOnce({
        balance: new Prisma.Decimal(1000),
        date: new Date('2025-01-01'),
      });
      // Second call (Upsert check)
      mockPrisma.assetHistory.findFirst.mockResolvedValueOnce(null);

      mockPrisma.enrichedTransaction.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(500) },
      });
      const updateMock = mockPrisma.asset.update;
      updateMock.mockResolvedValue({
        balance: new Prisma.Decimal(1500),
      });

      const result = await repository.recalculateBalance('a1');
      expect(result.newBalance.toNumber()).toBe(1500);
      expect(result.transactionsSum.toNumber()).toBe(500);
      expect(mockPrisma.assetHistory.create).toHaveBeenCalled();
    });
  });
});
