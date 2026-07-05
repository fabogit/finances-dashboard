import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Query parameters DTO for deleting a financial category.
 */
export class DeleteCategoryQueryDto {
  @ApiPropertyOptional({
    description: 'The UUID of the category to reassign transactions to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  reassignToId?: string;
}
