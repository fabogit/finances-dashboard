import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class GetForecastDto {
  @ApiPropertyOptional({
    description:
      'Threshold (0.0-1.0) for identifying fixed expenses. Default 0.2',
    example: 0.2,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;
}
