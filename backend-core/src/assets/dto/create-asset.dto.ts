import { ApiProperty } from '@nestjs/swagger';
import { AssetType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAssetDto {
  @ApiProperty({
    example: 'Main Bank Account',
    description: 'Name of the asset',
  })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Intesa Sanpaolo', required: false })
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

  @ApiProperty({ example: 5000.0, description: 'Initial balance' })
  @IsNumber()
  balance: number;

  @ApiProperty({ example: 'EUR', default: 'EUR', required: false })
  @IsOptional()
  @IsString()
  currency?: string;
}
