import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoalStatus } from '@prisma/client';
import { Expose } from 'class-transformer';
import { SerializeDecimal } from '../../../common/decorators/serialize-decimal.decorator';

export class GoalResponseDto {
  @Expose()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Goal UUID',
  })
  id: string;

  @Expose()
  @ApiProperty({ example: 'Japan trip 🇯🇵', description: 'Goal name' })
  name: string;

  @Expose()
  @ApiProperty({
    example: 3500.0,
    description: 'Target amount to reach',
    type: 'number',
  })
  @SerializeDecimal()
  targetAmount: number;

  @Expose()
  @ApiProperty({
    example: 1000.0,
    description: 'Current saved amount',
    type: 'number',
  })
  @SerializeDecimal()
  currentAmount: number;

  @Expose()
  @ApiPropertyOptional({
    example: '2025-08-01T00:00:00Z',
    description: 'Target deadline',
  })
  deadline?: Date | null;

  @Expose()
  @ApiProperty({
    enum: GoalStatus,
    example: GoalStatus.ACTIVE,
    description: 'Goal status',
  })
  status: GoalStatus;

  @Expose()
  @ApiPropertyOptional({ example: '✈️', description: 'Emoji icon' })
  icon?: string | null;

  @Expose()
  @ApiPropertyOptional({
    example: '#FF5733',
    description: 'Color hex code',
  })
  color?: string | null;

  @Expose()
  @ApiProperty({
    example: '2025-01-01T12:00:00Z',
    description: 'Creation date',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    example: '2025-01-01T12:00:00Z',
    description: 'Last update date',
  })
  updatedAt: Date;
}
