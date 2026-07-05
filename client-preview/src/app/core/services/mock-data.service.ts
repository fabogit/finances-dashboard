import { Injectable, signal, computed } from '@angular/core';
import { Asset, Transaction, BudgetRule, SavingsGoal, LocalRule, Subscription } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  // Signals for local state management
  assets = signal<Asset[]>([
    { id: '1', name: 'Main Account (Unicredit)', type: 'CASH', balance: 12450.50, currency: 'EUR', balanceEUR: 12450.50 },
    { id: '2', name: 'Trading Portfolio (Degiro)', type: 'INVESTMENT', balance: 8900.00, currency: 'EUR', balanceEUR: 8900.00 },
    { id: '3', name: 'US Stocks (Interactive Brokers)', type: 'INVESTMENT', balance: 6500.00, currency: 'USD', balanceEUR: 6020.10 },
    { id: '4', name: 'Tesla Model 3', type: 'VEHICLE', balance: 32000.00, currency: 'EUR', balanceEUR: 32000.00 },
    { id: '5', name: 'Mortgage (Intesa Sanpaolo)', type: 'DEBT', balance: -85000.00, currency: 'EUR', balanceEUR: -85000.00 }
  ]);

  transactions = signal<Transaction[]>([
    { id: 'tx-1', date: '2026-06-02', details: 'Esselunga Supermarket', amount: -65.40, category: 'Food & Groceries', assetId: '1' },
    { id: 'tx-2', date: '2026-06-01', details: 'Netflix Subscription', amount: -17.99, category: 'Leisure', assetId: '1' },
    { id: 'tx-3', date: '2026-06-01', details: 'Salary Antigravity Inc', amount: 3200.00, category: 'Salary', assetId: '1' },
    { id: 'tx-4', date: '2026-05-28', details: 'Enel Energia Bill', amount: -112.50, category: 'Utilities', assetId: '1' },
    { id: 'tx-5', date: '2026-05-25', details: 'Transfer to Degiro', amount: -1000.00, category: 'Unclassified', assetId: '1' }, // Potential transfer
    { id: 'tx-6', date: '2026-05-25', details: 'Deposit from Main Account', amount: 1000.00, category: 'Unclassified', assetId: '2' }, // Potential transfer counterpart
    { id: 'tx-7', date: '2026-05-20', details: 'Shell Gas Station', amount: -54.00, category: 'Transport', assetId: '1' },
    { id: 'tx-8', date: '2026-05-15', details: 'Rent Payment', amount: -850.00, category: 'Home', assetId: '1' }
  ]);

  budgetRules = signal<BudgetRule[]>([
    { id: 'br-1', categoryId: 'cat-1', categoryName: 'Food & Groceries', type: 'FIXED_AMOUNT', amount: 400.00 },
    { id: 'br-2', categoryId: 'cat-2', categoryName: 'Leisure', type: 'PERCENTAGE_OF_INCOME', amount: 10 }, // 10% of salary
    { id: 'br-3', categoryId: 'cat-3', categoryName: 'Transport', type: 'FIXED_AMOUNT', amount: 150.00 }
  ]);

  goals = signal<SavingsGoal[]>([
    { id: 'g-1', name: 'Emergency Fund', targetAmount: 15000, currentAmount: 12000, monthlyContribution: 500 },
    { id: 'g-2', name: 'Stock Investments Portfolio', targetAmount: 30000, currentAmount: 14920, monthlyContribution: 800 }
  ]);

  localRules = signal<LocalRule[]>([
    { id: 'r-1', keyword: 'Netflix', assignCategory: 'Leisure' },
    { id: 'r-2', keyword: 'Esselunga', assignCategory: 'Food & Groceries' }
  ]);

  subscriptions = signal<Subscription[]>([
    { id: 's-1', name: 'Netflix', amount: 17.99, frequency: 'MONTHLY', nextBillingDate: '2026-07-01', category: 'Leisure' },
    { id: 's-2', name: 'Gym Membership', amount: 49.99, frequency: 'MONTHLY', nextBillingDate: '2026-06-15', category: 'Health & Sport' },
    { id: 's-3', name: 'AWS Cloud Account', amount: 12.50, frequency: 'MONTHLY', nextBillingDate: '2026-06-20', category: 'Technology' }
  ]);

  // Computed totals
  netWorth = computed(() => {
    return this.assets().reduce((sum, asset) => sum + asset.balanceEUR, 0);
  });

  confirmTransfer(tx1Id: string, tx2Id: string) {
    this.transactions.update(txs => txs.map(t => {
      if (t.id === tx1Id) {
        return { ...t, isTransfer: true, destinationAssetId: '2', category: 'Internal Transfer' };
      }
      if (t.id === tx2Id) {
        return { ...t, isTransfer: true, destinationAssetId: '1', category: 'Internal Transfer' };
      }
      return t;
    }));
  }

  addTransaction(tx: Omit<Transaction, 'id'>) {
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}`
    };
    this.transactions.update(txs => [newTx, ...txs]);
  }
}
