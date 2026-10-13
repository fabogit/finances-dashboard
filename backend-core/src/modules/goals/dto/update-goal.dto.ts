import { PartialType } from '@nestjs/swagger';
import { CreateGoalDto } from './create-goal.dto';

/**
 * Input DTO for updating savings goal properties.
 */
export class UpdateGoalDto extends PartialType(CreateGoalDto) {}
