import { ApiProperty } from '@nestjs/swagger';

export class RawTransactionDto {
  @ApiProperty({
    description: 'Unique identifier for the transaction',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the import batch this transaction belongs to',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  importBatchId: string;

  @ApiProperty({
    description: 'Original line number in the imported file',
    example: 2,
  })
  originalLine: number;

  @ApiProperty({
    description: 'Date of the transaction',
    example: '2023-10-27',
  })
  date: string;

  @ApiProperty({
    description: 'Type of operation',
    example: 'Payment',
  })
  operation: string;

  @ApiProperty({
    description: 'Details or description of the transaction',
    example: 'GROCERY STORE XYZ',
  })
  details: string;

  @ApiProperty({
    description: 'Account or card associated with the transaction',
    example: 'Checking Account ****1234',
  })
  account: string;

  @ApiProperty({
    description: 'Status of the accounting/clearing',
    example: 'CLEARED',
  })
  accountingStatus: string;

  @ApiProperty({
    description: 'Category of the transaction (if available)',
    example: 'Groceries',
    required: false,
    nullable: true,
  })
  category: string | null;

  @ApiProperty({
    description: 'Currency code',
    example: 'EUR',
  })
  currency: string;

  @ApiProperty({
    description: 'Amount of the transaction',
    example: '-50.00',
  })
  amount: string;

  @ApiProperty({
    description: 'Timestamp when the record was created',
    example: '2023-10-27T10:00:00.000Z',
  })
  createdAt: Date;
}
