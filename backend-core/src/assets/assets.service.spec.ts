import { Test, TestingModule } from '@nestjs/testing';
import { AssetsService } from './assets.service';
import { AssetsRepository } from './assets.repository';
import { AssetType, Prisma } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetBalanceDto } from './dto/update-asset-balance.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

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

  const prismaError = new Prisma.PrismaClientKnownRequestError('Error', {
    code: 'P2025',
    clientVersion: '5.x',
  });

  beforeEach(async () => {
    const mockRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateBalance: jest.fn(),
      updateBalanceWithDelta: jest.fn(),
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

  describe('create', () => {
    it('should call repository create', async () => {
      const dto = {
        name: 'New',
        type: AssetType.CASH,
        balance: 100,
      } as CreateAssetDto;
      (repo.create as jest.Mock).mockResolvedValue(mockAsset);
      const result = await service.create(dto);
      expect(result).toEqual(mockAsset);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all assets', async () => {
      (repo.findAll as jest.Mock).mockResolvedValue([mockAsset]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Cash Account');
    });
  });

  describe('findOne', () => {
    it('should return an asset if found', async () => {
      (repo.findById as jest.Mock).mockResolvedValue(mockAsset);
      const result = await service.findOne('asset-1');
      expect(result.id).toBe('asset-1');
    });

    it('should throw NotFoundException if not found', async () => {
      (repo.findById as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('404')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update asset', async () => {
      (repo.update as jest.Mock).mockResolvedValue(mockAsset);
      const result = await service.update('a1', {
        name: 'Updated',
      } as UpdateAssetDto);
      expect(result).toEqual(mockAsset);
    });

    it('should throw NotFoundException on P2025', async () => {
      (repo.update as jest.Mock).mockRejectedValue(prismaError);
      await expect(service.update('a1', {} as UpdateAssetDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should rethrow unknown errors', async () => {
      const error = new Error('Random');
      (repo.update as jest.Mock).mockRejectedValue(error);
      await expect(service.update('a1', {} as UpdateAssetDto)).rejects.toThrow(
        'Random',
      );
    });
  });

  describe('updateBalance', () => {
    it('should update balance', async () => {
      (repo.updateBalance as jest.Mock).mockResolvedValue(mockAsset);
      const result = await service.updateBalance('a1', {
        balance: 100,
      } as UpdateAssetBalanceDto);
      expect(result).toEqual(mockAsset);
    });

    it('should throw NotFoundException on P2025', async () => {
      (repo.updateBalance as jest.Mock).mockRejectedValue(prismaError);
      await expect(
        service.updateBalance('a1', { balance: 100 } as UpdateAssetBalanceDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBalanceWithDelta', () => {
    it('should update delta', async () => {
      (repo.updateBalanceWithDelta as jest.Mock).mockResolvedValue(mockAsset);
      const result = await service.updateBalanceWithDelta('a1', 10);
      expect(result).toEqual(mockAsset);
    });

    it('should throw NotFoundException on P2025', async () => {
      (repo.updateBalanceWithDelta as jest.Mock).mockRejectedValue(prismaError);
      await expect(service.updateBalanceWithDelta('a1', 10)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('recalculateBalance', () => {
    it('should call repository recalculateBalance', async () => {
      const mockResult = {
        asset: mockAsset,
        baseBalance: 5000,
        transactionsSum: 0,
        newBalance: 5000,
        basedOnSnapshotDate: new Date(),
      };
      (repo.recalculateBalance as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.recalculateBalance('asset-1');
      expect(result).toEqual(mockResult);
    });

    it('should throw NotFoundException on P2025', async () => {
      (repo.recalculateBalance as jest.Mock).mockRejectedValue(prismaError);
      await expect(service.recalculateBalance('a1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete asset', async () => {
      (repo.delete as jest.Mock).mockResolvedValue(mockAsset);
      const result = await service.remove('a1');
      expect(result).toEqual(mockAsset);
    });

    it('should throw NotFoundException on P2025', async () => {
      (repo.delete as jest.Mock).mockRejectedValue(prismaError);
      await expect(service.remove('a1')).rejects.toThrow(NotFoundException);
    });
  });
});
