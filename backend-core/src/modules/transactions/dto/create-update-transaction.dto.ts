import {
  IsString,
  IsDate,
  IsOptional,
  IsNotEmpty,
  Length,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { ParseDecimal } from '../../../common/decorators/parse-decimal.decorator';

export class CreateTransactionDto {
  @ApiProperty({
    example: 'MANUAL_ENTRY',
    description: 'Account name/number',
    default: 'MANUAL_ENTRY',
  })
  @IsOptional()
  @IsString()
  account: string = 'MANUAL_ENTRY';

  @ApiProperty({
    example: '-849.99',
    description: 'Amount (negative for expense, positive for income)',
    type: 'string',
  })
  @IsNotEmpty()
  @ParseDecimal()
  amount: string | number;

  @ApiProperty({
    description:
      'UUID of the Asset linked to this transaction (e.g., Bank Account)',
    required: false,
    nullable: true,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  assetId?: string | null;

  @ApiProperty({ example: 'USD', description: 'Currency code', default: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiProperty({ example: 'LEISURE', description: 'Macro Category' })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiProperty({
    example: '2025-12-19T20:00:00Z',
    description: 'Transaction date',
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  date: Date;

  @ApiProperty({
    example: 'LEGO STAR WARS: Millennium Falcon',
    description: 'Transaction details',
  })
  @IsNotEmpty()
  @IsString()
  details: string;

  @ApiProperty({
    example: 'Amazon.it LUXEMBOURG',
    default: 'MANUAL_ENTRY',
    description: 'Operation type',
    required: false,
  })
  @IsOptional()
  @IsString()
  operation: string = 'MANUAL_ENTRY';

  @ApiProperty({
    description: 'UUID of the Savings Goal linked to this transaction',
    required: false,
    nullable: true,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  savingsGoalId?: string | null;

  @ApiProperty({ example: 'Leisure Misc', required: false })
  @IsOptional()
  @IsString()
  subCategory?: string;
}

// PartialType makes fields optional for the update
export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}
