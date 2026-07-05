import { ForecastTransactionInputDto } from './forecast-transaction-input.dto';

/**
 * Request DTO sent to the Science service for projecting a savings goal's target achievement date.
 */
export class GoalProjectionRequestDto {
  transactions: ForecastTransactionInputDto[];
  target_amount: number;
  current_amount: number;
}
