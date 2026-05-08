import { ApiProperty } from '@nestjs/swagger';
import { SerializeDecimal } from '../../../common/decorators/serialize-decimal.decorator';

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

  @ApiProperty({ example: 'Food' })
  category: string;

  @ApiProperty({
    example: '2025-02-02',
    description: 'Transaction date (ISO format)',
  })
  date: string;

  @ApiProperty({ example: 'Supermarket Purchase' })
  details: string;

  @ApiProperty({ example: 'tx_uuid_123' })
  id: string;

  @ApiProperty({ example: 'POS Payment' })
  operation: string;

  @ApiProperty({ example: 'Groceries', nullable: true })
  subCategory: string;
}
