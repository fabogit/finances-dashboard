import { IsOptional, IsPositive, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @IsPositive()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsPositive()
  @IsInt()
  @Type(() => Number)
  page?: number;
}
