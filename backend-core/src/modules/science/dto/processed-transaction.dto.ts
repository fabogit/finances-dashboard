import { ApiProperty } from '@nestjs/swagger';
import { SerializeDecimal } from '../../../common/decorators/serialize-decimal.decorator';

/**
 * Response DTO representing a transaction processed by the Science categorization engine.
 */
export class ProcessedTransactionDto {
  @ApiProperty({ example: 'Main Account', description: 'Account name' })
  account: string;

  @ApiProperty({
    example: -55.2,
    description: 'Amount of the transaction',
    type: 'number',
  })
  @SerializeDecimal()
  amount: number;

  @ApiProperty({ example: 'Food', description: 'Macro category name' })
  category: string;

  @ApiProperty({
    example: '2025-02-02',
    description: 'Transaction date (ISO format)',
  })
  date: string;

  @ApiProperty({
    example: 'Supermarket Purchase',
    description: 'Detailed description/narrative',
  })
  details: string;

  @ApiProperty({
    example: 'tx_uuid_123',
    description: 'Unique transaction identifier',
  })
  id: string;

  @ApiProperty({
    example: 'POS Payment',
    description: 'Operation/Transaction type',
  })
  operation: string;

  @ApiProperty({
    example: 'Groceries',
    nullable: true,
    description: 'Sub-category name',
  })
  subCategory: string | null;
}
