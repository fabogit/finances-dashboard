import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

// --- INPUT ---
/**
 * Request query parameters DTO to retrieve budget analysis.
 */
export class GetBudgetAnalysisDto {
  @ApiProperty({ example: '2026-01', description: 'Target month (YYYY-MM)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Month must be in YYYY-MM format' })
  month: string;
}

// --- OUTPUT ---
/**
 * Response DTO representing budget execution and alerts for a single category.
 */
export class CategoryBudgetStatusDto {
  @Expose()
  @ApiProperty({ description: 'Category Name' })
  categoryName: string;

  @Expose()
  @ApiProperty({
    description: 'Total spent (including sub-categories)',
    example: 450.5,
  })
  spent: number;

  @Expose()
  @ApiPropertyOptional({ description: 'Budget Limit (if set)', example: 500 })
  limit: number | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Remaining budget', example: 49.5 })
  remaining: number | null;

  @Expose()
  @ApiProperty({
    enum: ['OK', 'WARNING', 'EXCEEDED', 'NO_BUDGET'],
    example: 'OK',
    description: 'Budget execution warning/alert status',
  })
  status: 'OK' | 'WARNING' | 'EXCEEDED' | 'NO_BUDGET';

  @Expose()
  @ApiPropertyOptional({
    type: [CategoryBudgetStatusDto],
    description: 'Nested budget status for subcategories',
  })
  @Type(() => CategoryBudgetStatusDto)
  children?: CategoryBudgetStatusDto[];

  @Exclude()
  rawSpent?: number;
}

/**
 * Response DTO representing the complete budget analysis for a given month.
 */
export class BudgetAnalysisResponseDto {
  @Expose()
  @ApiProperty({ example: '2026-01', description: 'Analysis month (YYYY-MM)' })
  month: string;

  @Expose()
  @ApiProperty({
    description: 'Total Income used for % calculations',
    example: 2500,
  })
  totalIncome: number;

  @Expose()
  @ApiProperty({
    type: [CategoryBudgetStatusDto],
    description: 'Status items grouped by category',
  })
  @Type(() => CategoryBudgetStatusDto)
  categories: CategoryBudgetStatusDto[];
}
