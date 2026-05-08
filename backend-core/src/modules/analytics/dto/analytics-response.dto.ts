import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class AnalyticsSummaryDto {
  @Expose()
  @ApiProperty({ example: 2500.5, description: 'Total positive transactions' })
  income: number;

  @Expose()
  @ApiProperty({ example: -1200.3, description: 'Total negative transactions' })
  expense: number;

  @Expose()
  @ApiProperty({
    example: 1299.2,
    description: 'Net balance (Income + Expense)',
  })
  balance: number;

  @Expose()
  @ApiProperty({ example: 51.9, description: 'Percentage of income saved' })
  savingsRate: number;
}

export class CategoryDistributionDto {
  @Expose()
  @ApiProperty({ example: 'FOOD', description: 'Macro category name' })
  label: string;

  @Expose()
  @ApiProperty({ example: 450.0, description: 'Total absolute amount spent' })
  value: number;

  @Expose()
  @ApiProperty({
    example: 45.5,
    description: 'Percentage relative to total filtered expenses',
  })
  percentage: number;
}

export class MonthlyTrendDto {
  @Expose()
  @ApiProperty({
    example: '2025-01',
    description: 'Target month in YYYY-MM format',
  })
  month: string;

  @Expose()
  @ApiProperty({ example: 2500.0, description: 'Total Income for the month' })
  income: number;

  @Expose()
  @ApiProperty({
    example: 1200.5,
    description: 'Total Expense for the month (absolute value)',
  })
  expense: number;
}
