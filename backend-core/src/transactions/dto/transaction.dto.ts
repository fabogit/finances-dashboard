import { ApiProperty } from '@nestjs/swagger';

export class TransactionDto {
  @ApiProperty({ example: 'Conto Corrente X' })
  account: string;

  @ApiProperty({ example: -50.5 })
  amount: number;

  @ApiProperty({ example: 'SHOPPING', description: 'Macro category' })
  category: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ example: 'Amazon IT' })
  details: string;

  @ApiProperty({ example: 'uuid-1234-...' })
  id: string;

  @ApiProperty({ example: '2025-01-01T12:00:00Z' })
  date: Date;

  @ApiProperty({ example: 'Pagamento POS' })
  operation: string;

  @ApiProperty({
    example: 'Electronics',
    description: 'Translated sub-category',
    required: false,
  })
  subCategory?: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the linked asset',
    required: false,
    nullable: true,
  })
  assetId?: string | null;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the linked savings goal',
    required: false,
    nullable: true,
  })
  savingsGoalId?: string | null;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 10, description: 'Number of items in this response' })
  count: number;

  @ApiProperty({ example: 10, description: 'Total pages available' })
  lastPage: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;
  @ApiProperty({ example: 100, description: 'Total number of items found' })
  total: number;
}

export class PaginatedTransactionsResponseDto {
  @ApiProperty({
    type: [TransactionDto],
    description: 'List of transactions',
  })
  data: TransactionDto[];

  @ApiProperty({ type: PaginationMetaDto, description: 'Pagination metadata' })
  meta: PaginationMetaDto;
}
