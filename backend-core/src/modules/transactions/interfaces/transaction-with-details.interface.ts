import { Prisma } from '@prisma/client';

export const transactionWithDetailsInclude =
  Prisma.validator<Prisma.EnrichedTransactionInclude>()({
    category: { include: { parent: true } },
    asset: true,
    savingsGoal: true,
  });

export type TransactionWithDetails = Prisma.EnrichedTransactionGetPayload<{
  include: typeof transactionWithDetailsInclude;
}>;
