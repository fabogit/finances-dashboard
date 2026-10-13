import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { ForecastTransactionInputDto } from './forecast-transaction-input.dto';

/**
 * Payload DTO sent to the Python FastAPI Science service for forecast calculation.
 */
export class ForecastRequestPayload {
  @ApiProperty({
    type: [ForecastTransactionInputDto],
    description: 'List of historical transactions to analyze',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ForecastTransactionInputDto)
  transactions: ForecastTransactionInputDto[];

  @ApiProperty({
    example: 0.2,
    description:
      'Standard deviation threshold for anomaly detection (default: 0.2)',
    default: 0.2,
  })
  @IsNumber()
  std_deviation_threshold: number;
}
