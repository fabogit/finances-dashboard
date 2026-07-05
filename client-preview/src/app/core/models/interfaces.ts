export interface Asset {
  id: string;
  name: string;
  type: 'CASH' | 'INVESTMENT' | 'REAL_ESTATE' | 'VEHICLE' | 'DEBT' | 'OTHER';
  balance: number;
  currency: string;
  balanceEUR: number;
}

export interface Transaction {
  id: string;
  date: string;
  details: string;
  amount: number;
  category: string;
  assetId: string;
  isTransfer?: boolean;
  destinationAssetId?: string;
}

export interface BudgetRule {
  id: string;
  categoryId: string;
  categoryName: string;
  type: 'FIXED_AMOUNT' | 'PERCENTAGE_OF_INCOME';
  amount: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
}

export interface LocalRule {
  id: string;
  keyword: string;
  assignCategory: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: 'MONTHLY' | 'ANNUALLY';
  nextBillingDate: string;
  category: string;
}
