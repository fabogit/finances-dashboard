import { ApiProperty } from '@nestjs/swagger';
import { BudgetRuleType } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { ParseDecimal } from '../../../common/decorators/parse-decimal.decorator';

export class SetBudgetDto {
  @ApiProperty({
    enum: BudgetRuleType,
    example: 'FIXED_AMOUNT',
    description: 'Type of budget: Fixed value or Percentage of Income',
  })
  @IsEnum(BudgetRuleType)
  ruleType: BudgetRuleType;

  @ApiProperty({
    example: '500.00',
    description: 'Threshold value. If Percentage, use 30 for 30%',
    type: 'string',
  })
  @ParseDecimal()
  limitValue: string | number;
}
