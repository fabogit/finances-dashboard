import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

// 1. Income/Expense
/**
 * Response DTO representing predicted income or expense flow details.
 */
export class ForecastFlowDto {
  @Expose()
  @ApiProperty({ example: 1200.5, description: 'Total predicted amount' })
  total: number;

  @Expose()
  @ApiProperty({
    example: 1000.0,
    description: 'Recurring/Fixed portion (e.g. Rent, Salary)',
  })
  fixed: number;

  @Expose()
  @ApiProperty({
    example: 200.5,
    description: 'Variable portion based on trends',
  })
  variable: number;
}

/**
 * Response DTO representing predicted metrics for a single month.
 */
export class MonthlyForecastDto {
  @Expose()
  @ApiProperty({ example: '2026-02', description: 'Target month (YYYY-MM)' })
  date: string;

  @Expose()
  @ApiProperty({
    type: ForecastFlowDto,
    description: 'Predicted income breakdown',
  })
  income: ForecastFlowDto;

  @Expose()
  @ApiProperty({
    type: ForecastFlowDto,
    description: 'Predicted expense breakdown',
  })
  expense: ForecastFlowDto;

  @Expose()
  @ApiProperty({ example: 350.2, description: 'Predicted Net Balance' })
  balance: number;
}

/**
 * Response DTO containing forecast error information.
 */
export class ForecastErrorDto {
  @Expose()
  @ApiProperty({
    example: 'Not enough data in the selected period',
    description: 'Error details message',
  })
  error: string;
}
