import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsDate,
  IsArray,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// export const SortOrder = {
//   ASC: 'asc',
//   DESC: 'desc',
// } as const;

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetTransactionsFilterDto {
  // --- Filters ---
  @ApiPropertyOptional({
    description: 'Search text in details, operation, or category',
    example: 'Amazon',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by start date (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter by end date (ISO 8601)',
    example: '2025-12-31T23:59:59.999Z',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Minimum amount', example: -100.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum amount', example: 987 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxAmount?: number;

  @ApiPropertyOptional({
    description: 'Filter by categories (comma separated, case insensitive)',
    example: 'food,HOME',
    type: String, // Swagger -> string, Transform -> array
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim().toUpperCase());
    }

    if (Array.isArray(value)) {
      return value.map((v: unknown) =>
        typeof v === 'string' ? v.trim().toUpperCase() : v,
      ) as string[];
    }

    return value;
  })
  categories?: string[];

  // --- Pagination ---
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;

  // --- Sorting ---
  @ApiPropertyOptional({
    description: 'Field to sort by',
    default: 'date',
    example: 'amount',
  })
  @IsOptional()
  @IsString()
  sortBy: string = 'date';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;
}
