import { ForecastTransactionInputDto } from './forecast-transaction-input.dto';

export class ForecastRequestPayload {
  transactions: ForecastTransactionInputDto[];
  std_deviation_threshold: number;
}
