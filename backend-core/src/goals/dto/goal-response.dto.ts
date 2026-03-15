import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoalStatus } from '@prisma/client';

export class GoalResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Goal UUID',
  })
  id: string;

  @ApiProperty({ example: 'Japan trip 🇯🇵', description: 'Goal name' })
  name: string;

  @ApiProperty({
    example: 3500.0,
    description: 'Target amount to reach',
    type: 'number',
  })
  targetAmount: number;

  @ApiProperty({
    example: 1000.0,
    description: 'Current saved amount',
    type: 'number',
  })
  currentAmount: number;

  @ApiPropertyOptional({
    example: '2025-08-01T00:00:00Z',
    description: 'Target deadline',
  })
  deadline?: Date | null;

  @ApiProperty({
    enum: GoalStatus,
    example: GoalStatus.ACTIVE,
    description: 'Goal status',
  })
  status: GoalStatus;

  @ApiPropertyOptional({ example: '✈️', description: 'Emoji icon' })
  icon?: string | null;

  @ApiPropertyOptional({
    example: '#FF5733',
    description: 'Color hex code',
  })
  color?: string | null;

  @ApiProperty({
    example: '2025-01-01T12:00:00Z',
    description: 'Creation date',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-01-01T12:00:00Z',
    description: 'Last update date',
  })
  updatedAt: Date;
}
