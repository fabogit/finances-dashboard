/**
 * Classification types for financial assets.
 */
export const ASSET_TYPES = {
  CASH: 'CASH',
  INVESTMENT: 'INVESTMENT',
  REAL_ESTATE: 'REAL_ESTATE',
  VEHICLE: 'VEHICLE',
  DEBT: 'DEBT',
  OTHER: 'OTHER',
} as const;

/**
 * Types of budget limits that can be enforced on a category.
 */
export const BUDGET_RULE_TYPES = {
  FIXED_AMOUNT: 'FIXED_AMOUNT',
  PERCENTAGE_OF_INCOME: 'PERCENTAGE_OF_INCOME',
} as const;

/**
 * High-level expense category classifications for budget categorization (50/30/20 rule).
 */
export const EXPENSE_TYPES = {
  NEEDS: 'NEEDS',
  WANTS: 'WANTS',
  SAVINGS: 'SAVINGS',
  UNCLASSIFIED: 'UNCLASSIFIED',
} as const;

/**
 * States that a savings goal can transition through.
 */
export const GOAL_STATUSES = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

/**
 * Special identifiers and constants for default system categories.
 */
export const SYSTEM_CATEGORIES = {
  UNCATEGORIZED: 'UNCATEGORIZED',
  DEFAULT_ICON: '❓',
} as const;

/**
 * System fallback values applied during manual transaction creation.
 */
export const TRANSACTION_FALLBACKS = {
  ACCOUNT: 'MANUAL',
  OPERATION: 'Manual Entry',
  IMPORT_BATCH_ID: 'MANUAL',
} as const;

/**
 * Default fallback attributes used by the forecasting engine.
 */
export const FORECAST_FALLBACKS = {
  ACCOUNT: 'Default',
  OPERATION: 'System',
  CATEGORY: 'Uncategorized',
} as const;
