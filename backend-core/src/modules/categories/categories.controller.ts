import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  HttpStatus,
  ParseUUIDPipe,
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
import { Serialize } from '../../common/interceptors/serialize.interceptor';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // --- GET TREE ---
  @Get()
  @Serialize(CategoryResponseDto)
  @ApiOperation({ summary: 'Get full category tree' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Hierarchical list of categories (Macro -> Sub) with active budgets.',
    type: [CategoryResponseDto],
  })
  async findAll() {
    return this.categoriesService.findAll();
  }

  // --- CREATE ---
  @Post()
  @Serialize(CategoryResponseDto)
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
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  // --- UPDATE ---
  @Patch(':id')
  @Serialize(CategoryResponseDto)
  @ApiOperation({ summary: 'Update category details' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: CategoryResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  // --- DELETE ---
  @Delete(':id')
  @Serialize(CategoryResponseDto)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({ status: HttpStatus.OK, type: CategoryResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'System categories cannot be deleted',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Cannot delete: Category has sub-categories or transactions',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(id);
  }

  // --- SET BUDGET ---
  @Put(':id/budget')
  @Serialize(BudgetRuleResponseDto)
  @ApiOperation({ summary: 'Set/Update budget rule for a category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The updated or created budget rule',
    type: BudgetRuleResponseDto,
  })
  async setBudget(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetBudgetDto,
  ) {
    return this.categoriesService.setBudget(id, dto);
  }
}
