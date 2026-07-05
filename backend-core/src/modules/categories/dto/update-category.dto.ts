import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Input DTO for updating a category's properties.
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional({ description: 'Mark category as verified/reviewed' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
