import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AssetResponseDto } from './asset-response.dto';
import { SerializeDecimal } from '../../../common/decorators/serialize-decimal.decorator';

export class RecalculateBalanceResponseDto {
  @Expose()
  @ApiProperty({ type: AssetResponseDto, description: 'The updated asset' })
  @Type(() => AssetResponseDto)
  asset: AssetResponseDto;

  @Expose()
  @ApiProperty({
    example: 1000.0,
    description: 'Starting balance from the anchor snapshot',
  })
  @SerializeDecimal()
  baseBalance: number;

  @Expose()
  @ApiProperty({
    example: 150.0,
    description: 'Sum of all transactions since the anchor date',
  })
  @SerializeDecimal()
  transactionsSum: number;

  @Expose()
  @ApiProperty({ example: 1150.0, description: 'The newly calculated balance' })
  @SerializeDecimal()
  newBalance: number;

  @Expose()
  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Date of the anchor snapshot',
  })
  basedOnSnapshotDate: Date;
}
