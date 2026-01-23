export class ForecastTransactionInputDto {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  details: string;
  category: string;
  subCategory: string | null;
  operation: string;
  account: string;
}
