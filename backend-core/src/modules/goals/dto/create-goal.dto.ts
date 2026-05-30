import { ApiProperty } from '@nestjs/swagger';
import { GoalStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
} from 'class-validator';
import { ParseDecimal } from '../../../common/decorators/parse-decimal.decorator';

export class CreateGoalDto {
  @ApiProperty({
    example: 'Japan trip 🇯🇵',
    description: 'A descriptive name for the savings goal',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: '3500.00',
    description: 'Total target amount to be saved for this goal',
    type: 'string',
  })
  @ParseDecimal()
  targetAmount: string | number;

  @ApiProperty({
    example: '0.00',
    description: 'Initial saved amount (usually 0)',
    required: false,
    default: '0.00',
    type: 'string',
  })
  @IsOptional()
  @ParseDecimal()
  currentAmount?: string | number;

  @ApiProperty({
    example: '2025-08-01T00:00:00Z',
    description: 'Target deadline',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiProperty({
    enum: GoalStatus,
    example: GoalStatus.ACTIVE,
    description: 'Goal status',
    required: false,
    default: GoalStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;

  @ApiProperty({ example: '✈️', description: 'Emoji icon', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({
    example: '#FF5733',
    description: 'Color hex code',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsHexColor()
  color?: string;
}
