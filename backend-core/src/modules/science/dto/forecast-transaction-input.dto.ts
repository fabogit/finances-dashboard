import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ForecastTransactionInputDto {
  @ApiProperty({ example: 'Main Account', description: 'Account name or ID' })
  @IsString()
  account: string;

  @ApiProperty({ example: -55.2, description: 'Transaction amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'Food', description: 'Macro category' })
  @IsString()
  category: string;

  @ApiProperty({
    example: '2025-02-02',
    description: 'Date in YYYY-MM-DD format',
  })
  @IsString()
  date: string; // YYYY-MM-DD

  @ApiProperty({
    example: 'Supermarket Purchase',
    description: 'Transaction details',
  })
  @IsString()
  details: string;

  @ApiProperty({ example: 'tx_uuid_123', description: 'Unique transaction ID' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'POS Payment', description: 'Operation type' })
  @IsString()
  operation: string;

  @ApiProperty({
    example: 'Groceries',
    description: 'Sub category if available',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  subCategory: string | null;
}
