import { ApiProperty } from '@nestjs/swagger';
import { BudgetRuleType } from '@prisma/client';
import { IsEnum, IsNumber, Min } from 'class-validator';

export class SetBudgetDto {
  @ApiProperty({
    enum: BudgetRuleType,
    example: 'FIXED_AMOUNT',
    description: 'Type of budget: Fixed value or Percentage of Income',
  })
  @IsEnum(BudgetRuleType)
  ruleType: BudgetRuleType;

  @ApiProperty({
    example: 500.0,
    description: 'Threshold value. If Percentage, use 30 for 30%',
  })
  @IsNumber()
  @Min(0)
  limitValue: number;
}
