import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { ParseDecimal } from '../../../common/decorators/parse-decimal.decorator';

/**
 * Input DTO for updating an asset's balance and creating a history snapshot.
 */
export class UpdateAssetBalanceDto {
  @ApiProperty({
    example: '5200.50',
    description: 'New current value',
    type: 'string',
  })
  @ParseDecimal()
  balance: string | number;

  @ApiProperty({
    example: '2025-02-03T12:00:00Z',
    required: false,
    description: 'Date of the snapshot. If empty, uses current server time.',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
