import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseType, BudgetRuleType } from '@prisma/client';
import { Expose, Type } from 'class-transformer';
import { SerializeDecimal } from '../../../common/decorators/serialize-decimal.decorator';

export class BudgetRuleResponseDto {
  @Expose()
  @ApiProperty({ description: 'ID of the budget rule' })
  id: string;

  @Expose()
  @ApiProperty({ enum: BudgetRuleType, example: 'FIXED_AMOUNT' })
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

export class CategoryResponseDto {
  @Expose()
  @ApiProperty({ description: 'Category UUID' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'Food' })
  name: string;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  parentId: string | null;

  @Expose()
  @ApiProperty({ enum: ExpenseType })
  type: ExpenseType;

  @Expose()
  @ApiPropertyOptional()
  icon: string | null;

  @Expose()
  @ApiPropertyOptional()
  color: string | null;

  @Expose()
  @ApiProperty()
  isSystem: boolean;

  @Expose()
  @ApiProperty()
  isVerified: boolean;

  @Expose()
  @ApiPropertyOptional({ description: 'Default Asset for automation' })
  defaultAssetId?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Default Goal for automation' })
  defaultGoalId?: string | null;

  @Expose()
  @ApiPropertyOptional({ type: BudgetRuleResponseDto })
  @Type(() => BudgetRuleResponseDto)
  budgetRule?: BudgetRuleResponseDto;

  @Expose()
  @ApiPropertyOptional({ type: [CategoryResponseDto] })
  @Type(() => CategoryResponseDto)
  children?: CategoryResponseDto[];
}
