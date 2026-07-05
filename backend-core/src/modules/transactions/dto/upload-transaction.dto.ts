import { ApiProperty } from '@nestjs/swagger';

// 1. DTO for the single transaction preview inside "science"
/**
 * Response DTO representing a preview item of an uploaded transaction.
 */
export class TransactionPreviewDto {
  @ApiProperty({
    example: 'Conto 1000/00067758',
    description: 'Account name/number or source',
  })
  account: string;

  @ApiProperty({ example: -747.6, description: 'Transaction amount' })
  amount: number;

  @ApiProperty({ example: 'Altre uscite', description: 'Enriched category' })
  category: string;

  @ApiProperty({ example: '2025-12-29', description: 'Transaction date' })
  date: string;

  @ApiProperty({ example: 'Amazon.it', description: 'Transaction details' })
  details: string;

  @ApiProperty({ example: '19', description: 'Original row ID or index' })
  id: string;

  @ApiProperty({ example: 'Pagamento POS', description: 'Operation type' })
  operation: string;
}

// 2. DTO for the "science" object
/**
 * Response DTO representing the enrichment metrics from the Science service.
 */
export class ScienceResultDto {
  @ApiProperty({
    type: TransactionPreviewDto,
    nullable: true,
    description: 'Preview of the first processed transaction',
  })
  preview: TransactionPreviewDto | null;

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
    example: 'success',
    description: 'Status of the science processing',
  })
  status: string;
}

// 3. Main Response DTO
/**
 * Response DTO returning the results of a transaction batch import and science processing.
 */
export class UploadTransactionResponseDto {
  @ApiProperty({
    example: '9f7fc610-1e8e-4b84-9b4c-3798c1e03d29',
    description: 'Unique upload batch ID',
  })
  batchId: string;

  @ApiProperty({
    example: 'File processed successfully',
    description: 'Status message describing the result of the upload operation',
  })
  message: string;

  @ApiProperty({ example: 1337, description: 'Number of raw rows imported' })
  rowsImported: number;

  @ApiProperty({
    type: ScienceResultDto,
    description: 'Result from the Science Service enrichment',
  })
  science: ScienceResultDto;
}
