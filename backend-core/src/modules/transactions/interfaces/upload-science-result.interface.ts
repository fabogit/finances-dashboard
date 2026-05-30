import { ProcessedTransactionDto } from '../../science/dto/processed-transaction.dto';

export type UploadScienceResult =
  | { status: 'success'; data: ProcessedTransactionDto[] }
  | { status: 'failed'; error: string }
  | { status: 'skipped' };
