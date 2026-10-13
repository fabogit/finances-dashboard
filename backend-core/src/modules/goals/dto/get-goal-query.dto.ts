import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query parameters DTO to retrieve detailed savings goal information.
 */
export class GetGoalQueryDto {
  @ApiProperty({
    required: false,
    description: 'Number of transactions to retrieve (default: 10)',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  transactionLimit?: number = 10;
}
