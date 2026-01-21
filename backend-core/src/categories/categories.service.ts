import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SetBudgetDto } from './dto/set-budget.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- 1. GET TREE (Macro -> Subs) ---
  async findAll() {
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

  // --- 2. CREATE ---
  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: Unique constraint failed
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Category with this name already exists in this level.',
          );
        }
      }
      throw error;
    }
  }

  // --- 3. UPDATE ---
  async update(id: string, dto: UpdateCategoryDto) {
    await this.checkExistence(id);

    return this.prisma.category.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  // --- 4. DELETE ---
  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    if (category.isSystem) {
      throw new ForbiddenException(
        'System categories cannot be deleted. You can only hide or edit them.',
      );
    }

    try {
      return await this.prisma.category.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete category: it has sub-categories or linked transactions.',
        );
      }
      throw error;
    }
  }

  // --- 5. SET BUDGET (Upsert) ---
  async setBudget(categoryId: string, dto: SetBudgetDto) {
    await this.checkExistence(categoryId);

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

  // Helper
  private async checkExistence(id: string) {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Category ${id} not found`);
  }
}
