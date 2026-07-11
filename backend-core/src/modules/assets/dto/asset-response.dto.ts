import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetType } from '@prisma/client';
import { Expose, Type } from 'class-transformer';
import { SerializeDecimal } from '../../../common/decorators/serialize-decimal.decorator';

/**
 * Response DTO representing an asset profile details.
 */
export class AssetResponseDto {
  @Expose()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Asset UUID',
  })
  id: string;

  @Expose()
  @ApiProperty({
    example: 'Main Bank Account',
    description: 'Name of the asset',
  })
  name: string;

  @Expose()
  @ApiPropertyOptional({
    example: 'Intesa Sanpaolo',
    description: 'Financial institution associated with the asset',
  })
  institution?: string | null;

  @Expose()
  @ApiProperty({
    enum: AssetType,
    example: AssetType.CASH,
    description: 'Type of asset',
  })
  type: AssetType;

  @Expose()
  @ApiProperty({
    example: 5000.0,
    description: 'Current balance',
    type: 'number',
  })
  @SerializeDecimal()
  balance: number;

  @Expose()
  @ApiProperty({
    example: 'EUR',
    description: 'Currency code (ISO 4217)',
  })
  currency: string;

  @Expose()
  @ApiProperty({
    example: true,
    description:
      'Flag indicating whether this asset is included in budget calculations',
  })
  isOnBudget: boolean;

  @Expose()
  @ApiProperty({
    example: '2025-01-01T12:00:00Z',
    description: 'Creation date',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    example: '2025-01-01T12:00:00Z',
    description: 'Last update date',
  })
  updatedAt: Date;

  @Expose()
  @ApiPropertyOptional({
    type: () => [AssetHistoryResponseDto],
    description: 'List of historical balance snapshots for this asset',
  })
  @Type(() => AssetHistoryResponseDto)
  history?: AssetHistoryResponseDto[];
}

/**
 * Response DTO representing a historical balance snapshot for an asset.
 */
export class AssetHistoryResponseDto {
  @Expose()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Snapshot UUID',
  })
  id: string;

  @Expose()
  @ApiProperty({
    example: '2025-01-01T12:00:00Z',
    description: 'Snapshot date',
  })
  date: Date;

  @Expose()
  @ApiProperty({
    example: 5000.0,
    description: 'Balance at snapshot date',
    type: 'number',
  })
  @SerializeDecimal()
  balance: number;
}
