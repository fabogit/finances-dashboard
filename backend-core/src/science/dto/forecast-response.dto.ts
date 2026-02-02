import { ApiProperty } from '@nestjs/swagger';

export class ForecastFlowDto {
  @ApiProperty({ example: 1200.0, description: 'Fixed/Recurring portion' })
  fixed: number;

  @ApiProperty({ example: 1500.0, description: 'Total predicted amount' })
  total: number;

  @ApiProperty({ example: 300.0, description: 'Variable/Trend portion' })
  variable: number;
}

export class MonthlyForecastDto {
  @ApiProperty({ example: 500.5, description: 'Projected balance' })
  balance: number;

  @ApiProperty({ example: '2026-02', description: 'Forecast month (YYYY-MM)' })
  date: string;

  @ApiProperty({ type: ForecastFlowDto })
  expense: ForecastFlowDto;

  @ApiProperty({ type: ForecastFlowDto })
  income: ForecastFlowDto;
}

export type ForecastResponse = MonthlyForecastDto[] | { error: string };
