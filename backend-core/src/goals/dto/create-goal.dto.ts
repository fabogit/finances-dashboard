import { ApiProperty } from '@nestjs/swagger';
import { GoalStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsHexColor,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateGoalDto {
  @ApiProperty({ example: 'Japan trip 🇯🇵', description: 'Goal name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 3500.0, description: 'Target amount to reach' })
  @IsNumber()
  @Min(1)
  targetAmount: number;

  @ApiProperty({
    example: 0,
    description: 'Initial saved amount (usually 0)',
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentAmount?: number;

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
