import {
  IsString,
  IsNumber,
  IsDate,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';

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
    example: -849.99,
    description: 'Amount (negative for expense, positive for income)',
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

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

  @ApiProperty({ example: 'Leisure Misc', required: false })
  @IsOptional()
  @IsString()
  subCategory?: string;
}

// PartialType makes fields optional for the update
export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}
