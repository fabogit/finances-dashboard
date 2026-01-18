import { ApiProperty } from '@nestjs/swagger';

export class AnalyticsSummaryDto {
  @ApiProperty({ example: 2500.5, description: 'Total positive transactions' })
  income: number;

  @ApiProperty({ example: -1200.3, description: 'Total negative transactions' })
  expense: number;

  @ApiProperty({
    example: 1299.2,
    description: 'Net balance (Income + Expense)',
  })
  balance: number;

  @ApiProperty({ example: 51.9, description: 'Percentage of income saved' })
  savingsRate: number;
}

export class CategoryDistributionDto {
  @ApiProperty({ example: 'FOOD', description: 'Macro category name' })
  label: string;

  @ApiProperty({ example: 450.0, description: 'Total absolute amount spent' })
  value: number;

  @ApiProperty({
    example: 45.5,
    description: 'Percentage relative to total filtered expenses',
  })
  percentage: number;
}

export class MonthlyTrendDto {
  @ApiProperty({
    example: '2025-01',
    description: 'Target month in YYYY-MM format',
  })
  month: string;

  @ApiProperty({ example: 2500.0, description: 'Total Income for the month' })
  income: number;

  @ApiProperty({
    example: 1200.5,
    description: 'Total Expense for the month (absolute value)',
  })
  expense: number;
}
