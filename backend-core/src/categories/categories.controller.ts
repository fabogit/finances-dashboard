import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  UsePipes,
  ValidationPipe,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SetBudgetDto } from './dto/set-budget.dto';
import {
  CategoryResponseDto,
  BudgetRuleResponseDto,
} from './dto/category-response.dto';
import { Category, BudgetRule } from '@prisma/client';

type CategoryWithRelations = Category & {
  budgetRule?: BudgetRule | null;
  children?: (Category & { budgetRule?: BudgetRule | null })[];
};

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  private mapToDto(category: CategoryWithRelations): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      type: category.type,
      icon: category.icon,
      color: category.color,
      isSystem: category.isSystem,
      isVerified: category.isVerified,

      budgetRule: category.budgetRule
        ? {
            id: category.budgetRule.id,
            ruleType: category.budgetRule.ruleType,
            limitValue: Number(category.budgetRule.limitValue as unknown),
          }
        : undefined,

      children: category.children
        ? category.children.map((child) => this.mapToDto(child))
        : undefined,
    };
  }

  // --- GET TREE ---
  @Get()
  @ApiOperation({ summary: 'Get full category tree' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Hierarchical list of categories (Macro -> Sub) with active budgets.',
    type: [CategoryResponseDto],
  })
  async findAll() {
    const rawData = await this.categoriesService.findAll();
    return rawData.map((cat) => this.mapToDto(cat));
  }

  // --- CREATE ---
  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The created category',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Category name already exists',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() dto: CreateCategoryDto) {
    const rawData = await this.categoriesService.create(dto);
    return this.mapToDto(rawData);
  }

  // --- UPDATE ---
  @Patch(':id')
  @ApiOperation({ summary: 'Update category details' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: CategoryResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const rawData = await this.categoriesService.update(id, dto);
    return this.mapToDto(rawData);
  }

  // --- DELETE ---
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({ status: HttpStatus.OK, type: CategoryResponseDto })
  async remove(@Param('id') id: string) {
    const rawData = await this.categoriesService.remove(id);
    return this.mapToDto(rawData);
  }

  // --- SET BUDGET ---
  @Put(':id/budget')
  @ApiOperation({ summary: 'Set/Update budget rule for a category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The updated or created budget rule',
    type: BudgetRuleResponseDto,
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async setBudget(@Param('id') id: string, @Body() dto: SetBudgetDto) {
    const rawData = await this.categoriesService.setBudget(id, dto);

    return {
      id: rawData.id,
      ruleType: rawData.ruleType,
      limitValue: Number(rawData.limitValue),
    };
  }
}
