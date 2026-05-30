import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

// --- INPUT ---
export class GetBudgetAnalysisDto {
  @ApiProperty({ example: '2026-01', description: 'Target month (YYYY-MM)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Month must be in YYYY-MM format' })
  month: string;
}

// --- OUTPUT ---
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
  })
  status: 'OK' | 'WARNING' | 'EXCEEDED' | 'NO_BUDGET';

  @Expose()
  @ApiPropertyOptional({ type: [CategoryBudgetStatusDto] })
  @Type(() => CategoryBudgetStatusDto)
  children?: CategoryBudgetStatusDto[];

  @Exclude()
  rawSpent?: number;
}

export class BudgetAnalysisResponseDto {
  @Expose()
  @ApiProperty({ example: '2026-01' })
  month: string;

  @Expose()
  @ApiProperty({
    description: 'Total Income used for % calculations',
    example: 2500,
  })
  totalIncome: number;

  @Expose()
  @ApiProperty({ type: [CategoryBudgetStatusDto] })
  @Type(() => CategoryBudgetStatusDto)
  categories: CategoryBudgetStatusDto[];
}
