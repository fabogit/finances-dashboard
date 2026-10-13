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
      upsert: jest.fn(),
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
    it('should create an asset and upsert its first history entry', async () => {
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

      const asset = await repository.create(dto);
      expect(asset.id).toBe('a1');
      expect(createMock).toHaveBeenCalled();
      expect(mockPrisma.assetHistory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            assetId_date: expect.objectContaining({ assetId: 'a1' }),
          }),
        }),
      );
    });
  });

  describe('updateBalance', () => {
    it('should update balance and upsert history entry', async () => {
      const mockUpdatedAsset = { id: 'a1', balance: new Prisma.Decimal(1200) };
      mockPrisma.asset.update.mockResolvedValue(mockUpdatedAsset);

      const asset = await repository.updateBalance('a1', { balance: 1200 });
      expect(asset.balance.toNumber()).toBe(1200);
      expect(mockPrisma.assetHistory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            assetId_date: expect.objectContaining({ assetId: 'a1' }),
          }),
          update: { balance: new Prisma.Decimal(1200) },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          create: expect.objectContaining({
            assetId: 'a1',
            balance: new Prisma.Decimal(1200),
          }),
        }),
      );
    });
  });

  describe('updateBalanceWithDelta', () => {
    it('should increment balance and upsert history entry', async () => {
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
      expect(mockPrisma.assetHistory.upsert).toHaveBeenCalled();
    });
  });

  describe('recalculateBalance', () => {
    it('should aggregate transactions and update asset balance', async () => {
      mockPrisma.asset.findUniqueOrThrow.mockResolvedValue({
        id: 'a1',
      });
      // Anchor Point lookup
      mockPrisma.assetHistory.findFirst.mockResolvedValueOnce({
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
      expect(mockPrisma.assetHistory.upsert).toHaveBeenCalled();
    });
  });
});
