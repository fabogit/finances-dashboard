import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetType } from '@prisma/client';

export class AssetResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Asset UUID',
  })
  id: string;

  @ApiProperty({
    example: 'Main Bank Account',
    description: 'Name of the asset',
  })
  name: string;

  @ApiPropertyOptional({ example: 'Intesa Sanpaolo' })
  institution?: string | null;

  @ApiProperty({
    enum: AssetType,
    example: AssetType.CASH,
    description: 'Type of asset',
  })
  type: AssetType;

  @ApiProperty({
    example: 5000.0,
    description: 'Current balance',
    type: 'number',
  })
  balance: number;

  @ApiProperty({
    example: 'EUR',
    description: 'Currency code',
  })
  currency: string;

  @ApiProperty({
    example: '2025-01-01T12:00:00Z',
    description: 'Creation date',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-01-01T12:00:00Z',
    description: 'Last update date',
  })
  updatedAt: Date;
}
