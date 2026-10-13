import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BudgetRule, Category, Prisma } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SetBudgetDto } from './dto/set-budget.dto';
import { CategoryWithChildren } from './interfaces/category-with-children.interface';
import { SYSTEM_CATEGORIES } from '../../common/constants/domain.constants';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllTree(): Promise<CategoryWithChildren[]> {
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        budgetRule: true,
        children: {
          include: {
            budgetRule: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { id },
    });
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        parentId: dto.parentId || null,
        type: dto.type,
        icon: dto.icon,
        color: dto.color,
        isSystem: false,
        isVerified: true,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: { ...dto },
    });
  }

  async delete(id: string): Promise<Category> {
    return this.prisma.category.delete({
      where: { id },
    });
  }

  async upsertBudget(
    categoryId: string,
    dto: SetBudgetDto,
  ): Promise<BudgetRule> {
    return this.prisma.budgetRule.upsert({
      where: { categoryId },
      create: {
        categoryId,
        ruleType: dto.ruleType,
        limitValue: new Prisma.Decimal(dto.limitValue),
      },
      update: {
        ruleType: dto.ruleType,
        limitValue: new Prisma.Decimal(dto.limitValue),
      },
    });
  }

  async findFallbackCategory(userId: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: {
        systemKey: SYSTEM_CATEGORIES.UNCATEGORIZED,
        userId,
      },
    });
  }

  async deleteWithReRouting(id: string, targetId: string): Promise<Category> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Reassign transactions
      await tx.enrichedTransaction.updateMany({
        where: { categoryId: id },
        data: { categoryId: targetId },
      });

      // 2. Remove parent hierarchy reference for children (move children to macro-level parentId = null)
      await tx.category.updateMany({
        where: { parentId: id },
        data: { parentId: null },
      });

      // 3. Delete BudgetRule associated with deleted category
      await tx.budgetRule.deleteMany({
        where: { categoryId: id },
      });

      // 4. Finally, physically delete the category
      return tx.category.delete({
        where: { id },
      });
    });
  }
}
