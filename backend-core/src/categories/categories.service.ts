import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SetBudgetDto } from './dto/set-budget.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  // --- 1. GET TREE (Macro -> Subs) ---
  async findAll() {
    return this.categoriesRepository.findAllTree();
  }

  // --- 2. CREATE ---
  async create(dto: CreateCategoryDto) {
    try {
      return await this.categoriesRepository.create(dto);
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
    return this.categoriesRepository.update(id, dto);
  }

  // --- 4. DELETE ---
  async remove(id: string) {
    const category = await this.categoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    if (category.isSystem) {
      throw new ForbiddenException(
        'System categories cannot be deleted. You can only hide or edit them.',
      );
    }

    try {
      return await this.categoriesRepository.delete(id);
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
    return this.categoriesRepository.upsertBudget(categoryId, dto);
  }

  // Helper
  private async checkExistence(id: string) {
    const exists = await this.categoriesRepository.findById(id);
    if (!exists) throw new NotFoundException(`Category ${id} not found`);
    return exists;
  }
}
