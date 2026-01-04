import { ApiProperty } from '@nestjs/swagger';

export class UploadTransactionResponseDto {
  @ApiProperty({ example: 'File processed successfully' })
  message: string;

  @ApiProperty({ example: 1337, description: 'Number of rows saved in the DB' })
  rowsImported: number;

  @ApiProperty({
    example: 'uuid-v4-string',
    description: 'Unique upload ID',
  })
  batchId: string;
}
