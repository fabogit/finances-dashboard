import { ApiPropertyOptional } from '@nestjs/swagger';

export class GoalProjectionResponseDto {
  @ApiPropertyOptional({
    example: '2025-08-15T00:00:00Z',
    description: 'Estimated date when the goal will be reached',
  })
  estimated_date?: string;

  @ApiPropertyOptional({
    example: 450.75,
    description: 'Calculated average monthly savings amount',
  })
  monthly_avg?: number;

  @ApiPropertyOptional({
    example: 14.5,
    description: 'Estimated number of months remaining',
  })
  months_remaining?: number;

  @ApiPropertyOptional({
    example: 'HIGH',
    description:
      'Confidence level (HIGH, MEDIUM, LOW) based on history variance',
  })
  confidence?: string;

  @ApiPropertyOptional({
    description: 'Error message if projection could not be calculated',
  })
  error?: string;
}
