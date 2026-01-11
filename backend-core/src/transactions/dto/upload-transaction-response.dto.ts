import { ApiProperty } from '@nestjs/swagger';

// 1. DTO for the single transaction preview inside "science"
export class TransactionPreviewDto {
  @ApiProperty({ example: '19', description: 'Original row ID or index' })
  id: string;

  @ApiProperty({ example: '2025-12-29', description: 'Transaction date' })
  date: string;

  @ApiProperty({ example: 'Pagamento POS', description: 'Operation type' })
  operation: string;

  @ApiProperty({ example: 'Amazon.it', description: 'Transaction details' })
  details: string;

  @ApiProperty({
    example: 'Conto 1000/00067292',
    description: 'Account name/number',
  })
  account: string;

  @ApiProperty({ example: -747.6, description: 'Transaction amount' })
  amount: number;

  @ApiProperty({ example: 'Altre uscite', description: 'Enriched category' })
  category: string;
}

// 2. DTO for the "science" object
export class ScienceResultDto {
  @ApiProperty({
    example: 'success',
    description: 'Status of the science processing',
  })
  status: string;

  @ApiProperty({
    example: 499,
    description: 'Number of rows processed by Python',
  })
  processedCount: number;

  @ApiProperty({
    example: 499,
    description: 'Number of enriched rows saved to DB',
  })
  savedToDb: number;

  @ApiProperty({
    type: TransactionPreviewDto,
    nullable: true,
    description: 'Preview of the first processed transaction',
  })
  preview: TransactionPreviewDto | null;
}

// 3. Main Response DTO
export class UploadTransactionResponseDto {
  @ApiProperty({ example: 'File processed successfully' })
  message: string;

  @ApiProperty({ example: 1337, description: 'Number of raw rows imported' })
  rowsImported: number;

  @ApiProperty({
    example: '9f7fc610-1e8e-4b84-9b4c-3798c1e03d29',
    description: 'Unique upload batch ID',
  })
  batchId: string;

  @ApiProperty({
    type: ScienceResultDto,
    description: 'Result from the Science Service enrichment',
  })
  science: ScienceResultDto;
}
