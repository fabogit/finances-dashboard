// data from Python
/**
 * Input format for saving transactions that have been categorized and enriched by the Science service.
 */
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
