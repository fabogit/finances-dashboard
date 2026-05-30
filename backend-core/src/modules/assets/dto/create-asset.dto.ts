import { ApiProperty } from '@nestjs/swagger';
import { AssetType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ParseDecimal } from '../../../common/decorators/parse-decimal.decorator';

export class CreateAssetDto {
  @ApiProperty({
    example: 'Main Bank Account',
    description: 'Name of the asset',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Intesa Sanpaolo',
    description:
      'Financial institution holding the asset (bank, exchange, etc.)',
    required: false,
  })
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiProperty({
    enum: AssetType,
    example: AssetType.CASH,
    description: 'Type of asset',
  })
  @IsEnum(AssetType)
  type: AssetType;

  @ApiProperty({
    example: '5000.00',
    description: 'Initial current value or balance of the asset',
    type: 'string',
  })
  @ParseDecimal()
  balance: string | number;

  @ApiProperty({ example: 'EUR', default: 'EUR', required: false })
  @IsOptional()
  @IsString()
  currency?: string;
}
