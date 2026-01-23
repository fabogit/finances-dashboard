import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseType, BudgetRuleType } from '@prisma/client';

export class BudgetRuleResponseDto {
  @ApiProperty({ description: 'ID of the budget rule' })
  id: string;

  @ApiProperty({ enum: BudgetRuleType, example: 'FIXED_AMOUNT' })
  ruleType: BudgetRuleType;

  @ApiProperty({ example: 500.0, description: 'Budget limit value' })
  limitValue: number;
}

export class CategoryResponseDto {
  @ApiProperty({ description: 'Category UUID' })
  id: string;

  @ApiProperty({ example: 'Food' })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  parentId: string | null;

  @ApiProperty({ enum: ExpenseType })
  type: ExpenseType;

  @ApiPropertyOptional()
  icon: string | null;

  @ApiPropertyOptional()
  color: string | null;

  @ApiProperty()
  isSystem: boolean;

  @ApiProperty()
  isVerified: boolean;

  @ApiPropertyOptional({ type: BudgetRuleResponseDto })
  budgetRule?: BudgetRuleResponseDto;

  @ApiPropertyOptional({ type: [CategoryResponseDto] })
  children?: CategoryResponseDto[];
}
