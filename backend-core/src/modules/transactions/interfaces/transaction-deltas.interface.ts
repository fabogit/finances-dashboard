import { Prisma } from '@prisma/client';

/**
 * Represents the sum of transactions delta associated with an Asset.
 */
export interface AssetDelta {
  assetId: string | null;
  _sum: {
    amount: Prisma.Decimal | null;
  };
}

/**
 * Represents the sum of transactions delta associated with a SavingsGoal.
 */
export interface GoalDelta {
  savingsGoalId: string | null;
  _sum: {
    amount: Prisma.Decimal | null;
  };
}
