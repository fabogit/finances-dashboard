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
      };
      const createMock = mockPrisma.asset.create;
      createMock.mockResolvedValue({
        id: 'a1',
        ...dto,
      });

      const asset = await repository.create(dto);
      expect(asset.id).toBe('a1');
      expect(createMock).toHaveBeenCalled();
      expect(mockPrisma.assetHistory.create).toHaveBeenCalled();
    });
  });

  describe('updateBalanceWithDelta', () => {
    it('should increment balance and create history entry', async () => {
      const mockUpdatedAsset = { id: 'a1', balance: new Prisma.Decimal(1200) };
      const updateMock = mockPrisma.asset.update;
      updateMock.mockResolvedValue(mockUpdatedAsset);

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
      mockPrisma.assetHistory.findFirst.mockResolvedValue({
        balance: new Prisma.Decimal(1000),
        date: new Date('2025-01-01'),
      });
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
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            balance: expect.any(Prisma.Decimal) as Prisma.Decimal,
          },
        }),
      );
    });
  });
});
