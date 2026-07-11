declare const brand: unique symbol;

/**
 * Generic Branded type helper for compiling-time type-safety of raw primitive types.
 */
export type Branded<T, Brand extends string> = T & {
  readonly [brand]: Brand;
};

/**
 * Branded identifier representing an Asset UUID.
 */
export type AssetId = Branded<string, 'AssetId'>;

/**
 * Branded identifier representing a Category UUID.
 */
export type CategoryId = Branded<string, 'CategoryId'>;

/**
 * Branded identifier representing a Transaction UUID.
 */
export type TransactionId = Branded<string, 'TransactionId'>;

/**
 * Branded identifier representing a SavingsGoal UUID.
 */
export type SavingsGoalId = Branded<string, 'SavingsGoalId'>;

/**
 * Branded identifier representing a BudgetRule UUID.
 */
export type BudgetRuleId = Branded<string, 'BudgetRuleId'>;

/**
 * Branded identifier representing an AssetHistory UUID.
 */
export type AssetHistoryId = Branded<string, 'AssetHistoryId'>;

/**
 * Branded identifier representing a RawTransaction UUID.
 */
export type RawTransactionId = Branded<string, 'RawTransactionId'>;

/**
 * Branded identifier representing an ImportBatch UUID or string.
 */
export type ImportBatchId = Branded<string, 'ImportBatchId'>;
