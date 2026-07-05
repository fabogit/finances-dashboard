import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseType, BudgetRuleType } from '@prisma/client';
import { Expose, Type } from 'class-transformer';
import { SerializeDecimal } from '../../../common/decorators/serialize-decimal.decorator';

/**
 * Response DTO representing a budget rule.
 */
export class BudgetRuleResponseDto {
  @Expose()
  @ApiProperty({ description: 'ID of the budget rule' })
  id: string;

  @Expose()
  @ApiProperty({
    enum: BudgetRuleType,
    example: 'FIXED_AMOUNT',
    description: 'Type of the budget rule (e.g. FIXED_AMOUNT)',
  })
  ruleType: BudgetRuleType;

  @Expose()
  @ApiProperty({
    example: 500.0,
    description: 'Budget limit value',
    type: 'number',
  })
  @SerializeDecimal()
  limitValue: number;
}

/**
 * Response DTO representing a financial category and its children.
 */
export class CategoryResponseDto {
  @Expose()
  @ApiProperty({ description: 'Category UUID' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'Food', description: 'Name of the category' })
  name: string;

  @Expose()
  @ApiPropertyOptional({
    nullable: true,
    description: 'Parent category UUID if this is a subcategory',
  })
  parentId: string | null;

  @Expose()
  @ApiProperty({
    enum: ExpenseType,
    description: 'Expense type classification (e.g. INCOME, EXPENSE)',
  })
  type: ExpenseType;

  @Expose()
  @ApiPropertyOptional({ description: 'Visual icon identifier' })
  icon: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Hex color value for visual mapping' })
  color: string | null;

  @Expose()
  @ApiProperty({
    description: 'Whether the category is pre-seeded by the system',
  })
  isSystem: boolean;

  @Expose()
  @ApiProperty({ description: 'Whether the category is verified and locked' })
  isVerified: boolean;

  @Expose()
  @ApiPropertyOptional({
    example: 'UNCATEGORIZED',
    description: 'System identifier key for fallbacks (e.g. UNCATEGORIZED)',
  })
  systemKey: string | null;

  @Expose()
  @ApiProperty({
    example: 'demo_user',
    description: 'User owner UUID/Identifier',
  })
  userId: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Default Asset for automation' })
  defaultAssetId?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Default Goal for automation' })
  defaultGoalId?: string | null;

  @Expose()
  @ApiPropertyOptional({
    type: BudgetRuleResponseDto,
    description: 'Associated budget rule for this category',
  })
  @Type(() => BudgetRuleResponseDto)
  budgetRule?: BudgetRuleResponseDto;

  @Expose()
  @ApiPropertyOptional({
    type: [CategoryResponseDto],
    description: 'Nested child subcategories',
  })
  @Type(() => CategoryResponseDto)
  children?: CategoryResponseDto[];
}
