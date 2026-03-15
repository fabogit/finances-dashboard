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
});

const createPrismaError = (
  code: string,
  message = 'Simulated Prisma Error',
) => {
  return new Prisma.PrismaClientKnownRequestError(message, {
    code,
    clientVersion: 'test-version',
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
};

const mockSystemCategory: Category = {
  ...mockCategory,
  id: 'cat_sys',
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
    it('Should delete non-system category', async () => {
      categoriesRepo.findById!.mockResolvedValue(mockCategory); // isSystem: false
      categoriesRepo.delete!.mockResolvedValue(mockCategory);

      await service.remove('cat_123');

      expect(categoriesRepo.delete).toHaveBeenCalledWith('cat_123');
    });

    it('Should throw ForbiddenException if deleting SYSTEM category', async () => {
      categoriesRepo.findById!.mockResolvedValue(mockSystemCategory); // isSystem: true

      await expect(service.remove('cat_sys')).rejects.toThrow(
        ForbiddenException,
      );
      expect(categoriesRepo.delete).not.toHaveBeenCalled();
    });

    it('Should throw NotFoundException if category does not exist', async () => {
      categoriesRepo.findById!.mockResolvedValue(null);

      await expect(service.remove('invalid_id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Should throw ConflictException if category has CHILDREN/TRANSACTIONS (P2003)', async () => {
      categoriesRepo.findById!.mockResolvedValue(mockCategory);
      categoriesRepo.delete!.mockRejectedValue(createPrismaError('P2003'));

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
