import { Prisma } from '@prisma/client';

/**
 * Represents an item in the category distribution analysis.
 */
export interface CategoryDistributionItem {
  amount: Prisma.Decimal;
  category: {
    name: string;
    parent: { name: string } | null;
  } | null;
}

/**
 * Represents a monthly data point for transaction trends.
 */
export interface MonthlyTrendItem {
  date: Date;
  amount: Prisma.Decimal;
}

/**
 * Represents a transaction record format tailored for the science forecast backend.
 */
export interface ForecastItem {
  id: string;
  date: Date;
  amount: Prisma.Decimal;
  details: string | null;
  operation: string;
  account: string;
  category: {
    name: string;
    parent: { name: string } | null;
  } | null;
}

/**
 * Represents grouped monthly expenses for a given category.
 */
export interface MonthlyExpenseByCategoryItem {
  categoryId: string;
  _sum: {
    amount: Prisma.Decimal | null;
  };
}
