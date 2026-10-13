import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

/**
 * Query parameters DTO to retrieve detailed asset information.
 */
export class GetAssetQueryDto {
  @ApiProperty({
    required: false,
    description: 'Number of history snapshots to retrieve (default: 20)',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number) // "20" -> 20
  @IsInt()
  @Min(1)
  @Max(1000)
  historyLimit?: number = 20;
}
