import { SavingsGoal, Prisma } from '@prisma/client';

/**
 * Minimal representation of a transaction linked to a savings goal.
 */
export interface SavingsGoalTransactionMinimal {
  id: string;
  date: Date;
  amount: Prisma.Decimal;
  details: string | null;
  currency: string;
}

/**
 * Represents a SavingsGoal model enriched with its linked transactions.
 */
export interface SavingsGoalWithTransactions extends SavingsGoal {
  transactions: SavingsGoalTransactionMinimal[];
}
