import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { ForecastTransactionInputDto } from './forecast-transaction-input.dto';

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
    example: 2.0,
    description:
      'Standard deviation threshold for anomaly detection (default: 2.0)',
    default: 2.0,
  })
  @IsNumber()
  std_deviation_threshold: number;
}
