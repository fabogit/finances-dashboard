import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { SerializeDecimal } from '../../../common/decorators/serialize-decimal.decorator';

export class TransactionDto {
  @Expose()
  @ApiProperty({
    example: 'Conto Corrente X',
    description: 'Name of the account/asset',
  })
  account: string;

  @Expose()
  @ApiProperty({
    example: -50.5,
    description: 'Transaction amount (negative for expense)',
    type: 'number',
  })
  @SerializeDecimal()
  amount: number;

  @Expose()
  @ApiProperty({ example: 'SHOPPING', description: 'Macro category' })
  category: string;

  @Expose()
  @ApiProperty({
    example: '2025-01-01T12:00:00Z',
    description: 'Record creation timestamp',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    example: 'Amazon IT',
    description: 'Transaction details/description',
  })
  details: string;

  @Expose()
  @ApiProperty({ example: 'uuid-1234-...', description: 'Transaction UUID' })
  id: string;

  @Expose()
  @ApiProperty({
    example: '2025-01-01T12:00:00Z',
    description: 'Actual transaction date',
  })
  date: Date;

  @Expose()
  @ApiProperty({
    example: 'Pagamento POS',
    description: 'Bank operation type',
  })
  operation: string;

  @Expose()
  @ApiProperty({
    example: 'Electronics',
    description: 'Translated sub-category',
    required: false,
  })
  subCategory?: string;

  @Expose()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the linked asset',
    required: false,
    nullable: true,
  })
  assetId?: string | null;

  @Expose()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the linked savings goal',
    required: false,
    nullable: true,
  })
  savingsGoalId?: string | null;

  @Expose()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the mapped category',
    required: false,
    nullable: true,
  })
  categoryId?: string | null;

  @Expose()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the mapped sub-category',
    required: false,
    nullable: true,
  })
  subCategoryId?: string | null;

  @Expose()
  @ApiProperty({
    example: '2025-01-01T12:00:00Z',
    description: 'Last update timestamp',
  })
  updatedAt: Date;
}

export class PaginationMetaDto {
  @Expose()
  @ApiProperty({ example: 10, description: 'Number of items in this response' })
  count: number;

  @Expose()
  @ApiProperty({ example: 10, description: 'Total pages available' })
  lastPage: number;

  @Expose()
  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @Expose()
  @ApiProperty({ example: 100, description: 'Total number of items found' })
  total: number;
}

export class PaginatedTransactionsResponseDto {
  @Expose()
  @ApiProperty({
    type: [TransactionDto],
    description: 'List of transactions',
  })
  @Type(() => TransactionDto)
  data: TransactionDto[];

  @Expose()
  @ApiProperty({ type: PaginationMetaDto, description: 'Pagination metadata' })
  @Type(() => PaginationMetaDto)
  meta: PaginationMetaDto;
}
