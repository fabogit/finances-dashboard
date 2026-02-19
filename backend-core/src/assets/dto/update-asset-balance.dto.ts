import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional } from 'class-validator';

export class UpdateAssetBalanceDto {
  @ApiProperty({ example: 5200.5, description: 'New current value' })
  @IsNumber()
  balance: number;

  @ApiProperty({
    example: '2025-02-03T12:00:00Z',
    required: false,
    description: 'Date of the snapshot. If empty, uses current server time.',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
