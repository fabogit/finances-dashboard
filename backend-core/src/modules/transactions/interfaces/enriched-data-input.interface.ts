// data from Python
export interface EnrichedDataInput {
  importBatchId: string;
  originalLine: number;
  date: Date;
  amount: number; // Decimal
  operation: string;
  details: string;
  account: string;
  category: string;
  subCategory?: string | null;
  transactionHash?: string | null;
}
