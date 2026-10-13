import {
  ASSET_TYPES,
  BUDGET_RULE_TYPES,
  EXPENSE_TYPES,
  GOAL_STATUSES,
} from '../constants/domain.constants';

/**
 * Union type representing the allowed asset classifications (e.g., CASH, INVESTMENT).
 */
export type AssetType = (typeof ASSET_TYPES)[keyof typeof ASSET_TYPES];

/**
 * Union type representing the type of budget limitation rule (e.g., FIXED_AMOUNT, PERCENTAGE_OF_INCOME).
 */
export type BudgetRuleType =
  (typeof BUDGET_RULE_TYPES)[keyof typeof BUDGET_RULE_TYPES];

/**
 * Union type representing the financial category types (e.g., NEEDS, WANTS, SAVINGS, UNCLASSIFIED).
 */
export type ExpenseType = (typeof EXPENSE_TYPES)[keyof typeof EXPENSE_TYPES];

/**
 * Union type representing the possible states of a savings goal (e.g., ACTIVE, PAUSED).
 */
export type GoalStatus = (typeof GOAL_STATUSES)[keyof typeof GOAL_STATUSES];
