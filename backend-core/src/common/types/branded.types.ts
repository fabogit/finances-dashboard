declare const brand: unique symbol;

export type Branded<T, Brand extends string> = T & {
  readonly [brand]: Brand;
};

export type AssetId = Branded<string, 'AssetId'>;
export type CategoryId = Branded<string, 'CategoryId'>;
export type TransactionId = Branded<string, 'TransactionId'>;
export type SavingsGoalId = Branded<string, 'SavingsGoalId'>;
export type BudgetRuleId = Branded<string, 'BudgetRuleId'>;
export type ImportBatchId = Branded<string, 'ImportBatchId'>;
