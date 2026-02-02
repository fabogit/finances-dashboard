import { ApiProperty } from '@nestjs/swagger';

export class ProcessedTransactionDto {
  @ApiProperty({ example: 'Main Account' })
  account: string;

  @ApiProperty({ example: -55.2 })
  amount: number;

  @ApiProperty({ example: 'Food' })
  category: string;

  @ApiProperty({ example: '2025-02-02' })
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
