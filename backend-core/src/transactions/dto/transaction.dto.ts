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
