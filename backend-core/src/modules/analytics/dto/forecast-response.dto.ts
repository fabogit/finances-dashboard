import { ApiProperty } from '@nestjs/swagger';

// 1. Income/Expense
export class ForecastFlowDto {
  @ApiProperty({ example: 1200.5, description: 'Total predicted amount' })
  total: number;

  @ApiProperty({
    example: 1000.0,
    description: 'Recurring/Fixed portion (e.g. Rent, Salary)',
  })
  fixed: number;

  @ApiProperty({
    example: 200.5,
    description: 'Variable portion based on trends',
  })
  variable: number;
}

export class MonthlyForecastDto {
  @ApiProperty({ example: '2026-02', description: 'Target month (YYYY-MM)' })
  date: string;

  @ApiProperty({
    type: ForecastFlowDto,
    description: 'Predicted income breakdown',
  })
  income: ForecastFlowDto;

  @ApiProperty({
    type: ForecastFlowDto,
    description: 'Predicted expense breakdown',
  })
  expense: ForecastFlowDto;

  @ApiProperty({ example: 350.2, description: 'Predicted Net Balance' })
  balance: number;
}

export class ForecastErrorDto {
  @ApiProperty({ example: 'Not enough data in the selected period' })
  error: string;
}
