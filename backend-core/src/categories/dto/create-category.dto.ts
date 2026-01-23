import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Entertainment',
    description: 'Name of the category',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'uuid-of-macro-category',
    description: 'Parent ID. Leave empty if this is a Macro Category',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ enum: ExpenseType, default: ExpenseType.UNCLASSIFIED })
  @IsOptional()
  @IsEnum(ExpenseType)
  type?: ExpenseType;

  @ApiPropertyOptional({ example: '🍔', description: 'Emoji or Icon class' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: '#FF5733', description: 'Hex color code' })
  @IsOptional()
  @IsString()
  color?: string;
}
