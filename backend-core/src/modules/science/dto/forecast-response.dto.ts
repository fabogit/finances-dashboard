import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { SerializeDecimal } from '../../../common/decorators/serialize-decimal.decorator';

/**
 * Sub-DTO representing forecast components (fixed, variable, total) returned by the Science service.
 */
export class ForecastFlowDto {
  @Expose()
  @ApiProperty({ example: 1200.0, description: 'Fixed/Recurring portion' })
  @SerializeDecimal({ to: 'string' })
  fixed: number;

  @Expose()
  @ApiProperty({ example: 1500.0, description: 'Total predicted amount' })
  @SerializeDecimal({ to: 'string' })
  total: number;

  @Expose()
  @ApiProperty({ example: 300.0, description: 'Variable/Trend portion' })
  @SerializeDecimal({ to: 'string' })
  variable: number;
}

/**
 * Response DTO representing the forecast outputs for a single target month.
 */
export class MonthlyForecastDto {
  @Expose()
  @ApiProperty({ example: 500.5, description: 'Projected balance' })
  @SerializeDecimal({ to: 'string' })
  balance: number;

  @Expose()
  @ApiProperty({ example: '2026-02', description: 'Forecast month (YYYY-MM)' })
  date: string;

  @Expose()
  @ApiProperty({
    type: ForecastFlowDto,
    description: 'Predicted expense breakdown details',
  })
  @Type(() => ForecastFlowDto)
  expense: ForecastFlowDto;

  @Expose()
  @ApiProperty({
    type: ForecastFlowDto,
    description: 'Predicted income breakdown details',
  })
  @Type(() => ForecastFlowDto)
  income: ForecastFlowDto;
}

export type ForecastResponse = MonthlyForecastDto[] | { error: string };
