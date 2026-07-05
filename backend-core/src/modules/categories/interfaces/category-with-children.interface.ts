import { Category, BudgetRule } from '@prisma/client';

/**
 * Represents a Category model enriched with its child subcategories
 * and an optional associated budget rule.
 */
export interface CategoryWithChildren extends Category {
  budgetRule?: BudgetRule | null;
  children?: CategoryWithChildren[];
}
