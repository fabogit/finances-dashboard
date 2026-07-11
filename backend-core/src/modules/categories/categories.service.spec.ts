import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './categories.repository';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, ExpenseType, BudgetRuleType, Category } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SetBudgetDto } from './dto/set-budget.dto';
import { SYSTEM_CATEGORIES } from '../../common/constants/domain.constants';

type MockRepository<T> = {
  [P in keyof T]?: jest.Mock;
};

const createCategoriesMock = (): MockRepository<CategoriesRepository> => ({
  findAllTree: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn(),
  upsertBudget: jest.fn(),
  findFallbackCategory: jest.fn(),
  deleteWithReRouting: jest.fn(),
});

const createPrismaError = (
  code: string,
  message = 'Simulated Prisma Error',
) => {
  return new Prisma.PrismaClientKnownRequestError(message, {
    code,
    clientVersion: '7.x',
  });
};

const mockCategory: Category = {
  id: 'cat_123',
  name: 'Test Category',
  isSystem: false,
  isVerified: true,
  parentId: null,
  icon: 'test-icon',
  color: null,
  type: ExpenseType.NEEDS,
  createdAt: new Date(),
  updatedAt: new Date(),
  defaultAssetId: null,
  defaultGoalId: null,
  userId: 'demo_user',
  systemKey: null,
};

const mockSystemCategory: Category = {
  ...mockCategory,
  id: 'cat_sys',
  isSystem: true,
};

const mockFallbackCategory: Category = {
  ...mockCategory,
  id: 'cat_fallback',
  name: SYSTEM_CATEGORIES.UNCATEGORIZED,
  systemKey: SYSTEM_CATEGORIES.UNCATEGORIZED,
  isSystem: true,
};

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoriesRepo: MockRepository<CategoriesRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: CategoriesRepository,
          useFactory: createCategoriesMock,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    categoriesRepo = module.get(CategoriesRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('Should return the tree from repo', async () => {
      const mockTree = [mockCategory];
      categoriesRepo.findAllTree!.mockResolvedValue(mockTree);

      const result = await service.findAll();

      expect(result).toEqual(mockTree);
      expect(categoriesRepo.findAllTree).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createDto: CreateCategoryDto = {
      name: 'New Cat',
      type: ExpenseType.WANTS,
      icon: 'star',
    };

    it('Should create category successfully', async () => {
      categoriesRepo.create!.mockResolvedValue(mockCategory);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCategory);
      expect(categoriesRepo.create).toHaveBeenCalledWith(createDto);
    });

    it('Should throw ConflictException on DUPLICATE name (P2002)', async () => {
      categoriesRepo.create!.mockRejectedValue(createPrismaError('P2002'));

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('Should re-throw generic errors', async () => {
      const genericError = new Error('Generic Error');
      categoriesRepo.create!.mockRejectedValue(genericError);

      await expect(service.create(createDto)).rejects.toThrow(genericError);
    });
  });

  describe('update', () => {
    const updateDto: UpdateCategoryDto = { name: 'Updated Name' };

    it('Should update existing category', async () => {
      categoriesRepo.findById!.mockResolvedValue(mockCategory);

      const updatedMock: Category = { ...mockCategory, name: 'Updated Name' };
      categoriesRepo.update!.mockResolvedValue(updatedMock);

      const result = await service.update('cat_123', updateDto);

      expect(categoriesRepo.findById).toHaveBeenCalledWith('cat_123');
      expect(categoriesRepo.update).toHaveBeenCalledWith('cat_123', updateDto);
      expect(result.name).toBe('Updated Name');
    });

    it('Should throw NotFoundException if category does not exist', async () => {
      categoriesRepo.findById!.mockResolvedValue(null);

      await expect(service.update('invalid_id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(categoriesRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('Should delete category and re-route to specified target category', async () => {
      categoriesRepo.findById!.mockResolvedValueOnce(mockCategory); // deleted category
      categoriesRepo.findById!.mockResolvedValueOnce({
        ...mockCategory,
        id: 'cat_target',
      }); // target category
      categoriesRepo.deleteWithReRouting!.mockResolvedValue(mockCategory);

      await service.remove('cat_123', 'cat_target');

      expect(categoriesRepo.deleteWithReRouting).toHaveBeenCalledWith(
        'cat_123',
        'cat_target',
      );
    });

    it('Should delete category and re-route to system fallback UNCATEGORIZED if no target specified', async () => {
      categoriesRepo.findById!.mockResolvedValueOnce(mockCategory);
      categoriesRepo.findFallbackCategory!.mockResolvedValue(
        mockFallbackCategory,
      );
      categoriesRepo.deleteWithReRouting!.mockResolvedValue(mockCategory);

      await service.remove('cat_123');

      expect(categoriesRepo.findFallbackCategory).toHaveBeenCalledWith(
        mockCategory.userId,
      );
      expect(categoriesRepo.deleteWithReRouting).toHaveBeenCalledWith(
        'cat_123',
        'cat_fallback',
      );
    });

    it('Should throw ForbiddenException if deleting SYSTEM category', async () => {
      categoriesRepo.findById!.mockResolvedValue(mockSystemCategory);

      await expect(service.remove('cat_sys')).rejects.toThrow(
        ForbiddenException,
      );
      expect(categoriesRepo.deleteWithReRouting).not.toHaveBeenCalled();
    });

    it('Should throw NotFoundException if category does not exist', async () => {
      categoriesRepo.findById!.mockResolvedValue(null);

      await expect(service.remove('invalid_id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Should throw NotFoundException if target reassignment category does not exist', async () => {
      categoriesRepo.findById!.mockResolvedValueOnce(mockCategory);
      categoriesRepo.findById!.mockResolvedValueOnce(null); // target doesn't exist

      await expect(service.remove('cat_123', 'invalid_target')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Should throw ConflictException if fallback UNCATEGORIZED category is not found', async () => {
      categoriesRepo.findById!.mockResolvedValueOnce(mockCategory);
      categoriesRepo.findFallbackCategory!.mockResolvedValue(null); // fallback doesn't exist

      await expect(service.remove('cat_123')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('setBudget', () => {
    const budgetDto: SetBudgetDto = {
      limitValue: 500.0,
      ruleType: BudgetRuleType.FIXED_AMOUNT,
    };

    it('Should upsert budget if category exists', async () => {
      categoriesRepo.findById!.mockResolvedValue(mockCategory);
      categoriesRepo.upsertBudget!.mockResolvedValue({
        id: 'rule_1',
        ...budgetDto,
      });

      await service.setBudget('cat_123', budgetDto);

      expect(categoriesRepo.upsertBudget).toHaveBeenCalledWith(
        'cat_123',
        budgetDto,
      );
    });

    it('Should throw NotFoundException if category does not exist', async () => {
      categoriesRepo.findById!.mockResolvedValue(null);

      await expect(service.setBudget('invalid_id', budgetDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(categoriesRepo.upsertBudget).not.toHaveBeenCalled();
    });
  });
});
