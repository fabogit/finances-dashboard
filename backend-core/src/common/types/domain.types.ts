import {
  ASSET_TYPES,
  BUDGET_RULE_TYPES,
  EXPENSE_TYPES,
  GOAL_STATUSES,
} from '../constants/domain.constants';

export type AssetType = (typeof ASSET_TYPES)[keyof typeof ASSET_TYPES];
export type BudgetRuleType =
  (typeof BUDGET_RULE_TYPES)[keyof typeof BUDGET_RULE_TYPES];
export type ExpenseType = (typeof EXPENSE_TYPES)[keyof typeof EXPENSE_TYPES];
export type GoalStatus = (typeof GOAL_STATUSES)[keyof typeof GOAL_STATUSES];
