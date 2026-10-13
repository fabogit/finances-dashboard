import { Prisma } from '@prisma/client';

/**
 * Prisma select validator configuration for fetching EnrichedTransaction with nested category, asset, and savings goal details.
 */
export const transactionWithDetailsInclude =
  Prisma.validator<Prisma.EnrichedTransactionInclude>()({
    category: { include: { parent: true } },
    asset: true,
    savingsGoal: true,
  });

/**
 * Type representing an EnrichedTransaction complete with its nested Category (and parent category), Asset, and SavingsGoal relations.
 */
export type TransactionWithDetails = Prisma.EnrichedTransactionGetPayload<{
  include: typeof transactionWithDetailsInclude;
}>;
