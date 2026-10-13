import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesRepository } from './categories.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpenseType, Prisma } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SetBudgetDto } from './dto/set-budget.dto';
import { BudgetRuleType } from '@prisma/client';
import { SYSTEM_CATEGORIES } from '../../common/constants/domain.constants';

describe('CategoriesRepository', () => {
  let repository: CategoriesRepository;

  const mockPrisma = {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    budgetRule: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    enrichedTransaction: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (cb: (prisma: unknown) => Promise<unknown>) => {
        if (typeof cb === 'function') {
          return cb(mockPrisma);
        }
        return Promise.all(cb as unknown as Promise<unknown>[]);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<CategoriesRepository>(CategoriesRepository);
  });

  describe('findAllTree', () => {
    it('should call findMany with correct arguments', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);
      await repository.findAllTree();
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { parentId: null },
          include: expect.anything() as Record<string, unknown>,
        }),
      );
    });
  });

  describe('findById', () => {
    it('should call findUnique', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      const result = await repository.findById('cat-1');
      expect(result?.id).toBe('cat-1');
      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
    });
  });

  describe('create', () => {
    it('should call create with mapped data', async () => {
      const dto: CreateCategoryDto = {
        name: 'Food',
        type: ExpenseType.NEEDS,
        icon: '🍔',
        color: '#FF0000',
      };
      mockPrisma.category.create.mockResolvedValue({ id: 'new-cat', ...dto });
      const result = await repository.create(dto);
      expect(result.id).toBe('new-cat');
      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Food',
          isSystem: false,
          isVerified: true,
        }) as Record<string, unknown>,
      });
    });
  });

  describe('update', () => {
    it('should call update', async () => {
      const dto: UpdateCategoryDto = { name: 'Updated' };
      mockPrisma.category.update.mockResolvedValue({
        id: 'cat-1',
        name: 'Updated',
      });
      const result = await repository.update('cat-1', dto);
      expect(result.name).toBe('Updated');
      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: dto,
      });
    });
  });

  describe('delete', () => {
    it('should call delete', async () => {
      mockPrisma.category.delete.mockResolvedValue({ id: 'cat-1' });
      await repository.delete('cat-1');
      expect(mockPrisma.category.delete).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
    });
  });

  describe('upsertBudget', () => {
    it('should call budgetRule.upsert with decimals', async () => {
      const dto: SetBudgetDto = {
        limitValue: 500,
        ruleType: BudgetRuleType.FIXED_AMOUNT,
      };
      mockPrisma.budgetRule.upsert.mockResolvedValue({ id: 'rule-1' });
      await repository.upsertBudget('cat-1', dto);
      expect(mockPrisma.budgetRule.upsert).toHaveBeenCalledWith({
        where: { categoryId: 'cat-1' },
        create: expect.objectContaining({
          limitValue: expect.any(Prisma.Decimal) as Prisma.Decimal,
        }) as Record<string, unknown>,
        update: expect.objectContaining({
          limitValue: expect.any(Prisma.Decimal) as Prisma.Decimal,
        }) as Record<string, unknown>,
      });
    });
  });

  describe('findFallbackCategory', () => {
    it('should call findFirst with systemKey UNCATEGORIZED and userId', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({ id: 'cat-fallback' });
      const result = await repository.findFallbackCategory('demo_user');
      expect(result?.id).toBe('cat-fallback');
      expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
        where: {
          systemKey: SYSTEM_CATEGORIES.UNCATEGORIZED,
          userId: 'demo_user',
        },
      });
    });
  });

  describe('deleteWithReRouting', () => {
    it('should perform delete operations within a transaction', async () => {
      mockPrisma.category.delete.mockResolvedValue({ id: 'cat-to-delete' });
      const result = await repository.deleteWithReRouting(
        'cat-to-delete',
        'cat-target',
      );
      expect(result.id).toBe('cat-to-delete');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.enrichedTransaction.updateMany).toHaveBeenCalledWith({
        where: { categoryId: 'cat-to-delete' },
        data: { categoryId: 'cat-target' },
      });
      expect(mockPrisma.category.updateMany).toHaveBeenCalledWith({
        where: { parentId: 'cat-to-delete' },
        data: { parentId: null },
      });
      expect(mockPrisma.budgetRule.deleteMany).toHaveBeenCalledWith({
        where: { categoryId: 'cat-to-delete' },
      });
      expect(mockPrisma.category.delete).toHaveBeenCalledWith({
        where: { id: 'cat-to-delete' },
      });
    });
  });
});
