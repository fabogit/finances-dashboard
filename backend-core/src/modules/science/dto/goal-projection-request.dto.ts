import { ForecastTransactionInputDto } from './forecast-transaction-input.dto';

export class GoalProjectionRequestDto {
  transactions: ForecastTransactionInputDto[];
  target_amount: number;
  current_amount: number;
}
