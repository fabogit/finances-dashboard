import { ProcessedTransactionDto } from '../../science/dto/processed-transaction.dto';

/**
 * Type representing the outcome of transaction enrichment processing in the Science module.
 */
export type UploadScienceResult =
  | { status: 'success'; data: ProcessedTransactionDto[] }
  | { status: 'failed'; error: string }
  | { status: 'skipped' };
