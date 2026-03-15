import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RawTransactionDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Raw transaction UUID',
  })
  id: string;

  @ApiProperty({ example: 'BATCH-456', description: 'Batch ID from import' })
  importBatchId: string;

  @ApiProperty({ example: 12, description: 'Line number in the original file' })
  originalLine: number;

  @ApiProperty({
    example: '2025-01-01',
    description: 'Original date string from import',
  })
  date: string;

  @ApiPropertyOptional({
    example: 'POS',
    description: 'Operation type in raw format',
  })
  operation?: string | null;

  @ApiPropertyOptional({
    example: 'Amazon IT',
    description: 'Raw transaction details',
  })
  details?: string | null;

  @ApiPropertyOptional({
    example: 'Conto Corrente X',
    description: 'Raw account name',
  })
  account?: string | null;

  @ApiPropertyOptional({
    example: '-50.50',
    description: 'Raw amount as a string',
  })
  amount?: string | null;

  @ApiPropertyOptional({ example: 'EUR', description: 'Raw currency' })
  currency?: string | null;

  @ApiPropertyOptional({
    example: 'CONTABILIZZATO',
    description: 'Banking status',
  })
  accountingStatus?: string | null;

  @ApiPropertyOptional({
    example: 'Acquisti Online',
    description: 'Raw category from bank',
  })
  category?: string | null;

  @ApiProperty({
    example: '2025-01-01T12:00:00Z',
    description: 'Creation date',
  })
  createdAt: Date;
}
