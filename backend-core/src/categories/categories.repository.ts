import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SetBudgetDto } from './dto/set-budget.dto';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllTree() {
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

  async findById(id: string) {
    return this.prisma.category.findUnique({
      where: { id },
    });
  }

  async create(dto: CreateCategoryDto) {
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

  async update(id: string, dto: UpdateCategoryDto) {
    return this.prisma.category.update({
      where: { id },
      data: { ...dto },
    });
  }

  async delete(id: string) {
    return this.prisma.category.delete({
      where: { id },
    });
  }

  async upsertBudget(categoryId: string, dto: SetBudgetDto) {
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
}
