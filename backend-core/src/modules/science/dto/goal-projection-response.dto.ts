import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { SerializeDecimal } from '../../../common/decorators/serialize-decimal.decorator';

/**
 * Response DTO returning the savings goal projection metrics calculated by the Science engine.
 */
export class GoalProjectionResponseDto {
  @Expose()
  @ApiPropertyOptional({
    example: '2025-08-15T00:00:00Z',
    description: 'Estimated date when the goal will be reached',
  })
  estimated_date?: string;

  @Expose()
  @ApiPropertyOptional({
    example: 450.75,
    description: 'Calculated average monthly savings amount',
  })
  @SerializeDecimal({ to: 'string' })
  monthly_avg?: number;

  @Expose()
  @ApiPropertyOptional({
    example: 14.5,
    description: 'Estimated number of months remaining',
  })
  months_remaining?: number;

  @Expose()
  @ApiPropertyOptional({
    example: 'HIGH',
    description:
      'Confidence level (HIGH, MEDIUM, LOW) based on history variance',
  })
  confidence?: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'Error message if projection could not be calculated',
  })
  error?: string;

  @Expose()
  @ApiPropertyOptional({
    example: 'Japan trip 🇯🇵',
    description: 'Name of the goal',
  })
  goalName?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Current progress balance amount' })
  @SerializeDecimal()
  currentProgress?: number;

  @Expose()
  @ApiPropertyOptional({ description: 'Target goal amount' })
  @SerializeDecimal()
  targetAmount?: number;
}
