import { PartialType } from '@nestjs/swagger';
import { CreateGoalDto } from './create-goal.dto.js';

/**
 * Input DTO for updating savings goal properties.
 */
export class UpdateGoalDto extends PartialType(CreateGoalDto) {}
