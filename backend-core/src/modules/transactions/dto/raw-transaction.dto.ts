import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/**
 * Response DTO representing an un-enriched raw transaction imported directly from bank records.
 */
export class RawTransactionDto {
  @Expose()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Raw transaction UUID',
  })
  id: string;

  @Expose()
  @ApiProperty({ example: 'BATCH-456', description: 'Batch ID from import' })
  importBatchId: string;

  @Expose()
  @ApiProperty({ example: 12, description: 'Line number in the original file' })
  originalLine: number;

  @Expose()
  @ApiProperty({
    example: '2025-01-01',
    description: 'Original date string from import',
  })
  date: string;

  @Expose()
  @ApiPropertyOptional({
    example: 'POS',
    description: 'Operation type in raw format',
  })
  operation?: string | null;

  @Expose()
  @ApiPropertyOptional({
    example: 'Amazon IT',
    description: 'Raw transaction details',
  })
  details?: string | null;

  @Expose()
  @ApiPropertyOptional({
    example: 'Conto Corrente X',
    description: 'Raw account name',
  })
  account?: string | null;

  @Expose()
  @ApiPropertyOptional({
    example: '-50.50',
    description: 'Raw amount as a string',
  })
  amount?: string | null;

  @Expose()
  @ApiPropertyOptional({ example: 'EUR', description: 'Raw currency' })
  currency?: string | null;

  @Expose()
  @ApiPropertyOptional({
    example: 'CONTABILIZZATO',
    description: 'Banking status',
  })
  accountingStatus?: string | null;

  @Expose()
  @ApiPropertyOptional({
    example: 'Acquisti Online',
    description: 'Raw category from bank',
  })
  category?: string | null;

  @Expose()
  @ApiProperty({
    example: '2025-01-01T12:00:00Z',
    description: 'Creation date',
  })
  createdAt: Date;
}
