import { Account, Transaction, Category, Budget, DashboardSummary } from '../store/useStore';

export const MOCK_ACCOUNTS: Account[] = [
  { id: 'acc1', name: 'Main Savings', type: 'bank', balance: 5240.50 },
  { id: 'acc2', name: 'Daily Cash', type: 'cash', balance: 450.00 },
  { id: 'acc3', name: 'Credit Card', type: 'card', balance: -1200.75 },
  { id: 'acc4', name: 'Crypto Wallet', type: 'wallet', balance: 28500.20 },
];

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat1', name: 'Food & Dining', icon: '🍔', color: '#10B981' },
  { id: 'cat2', name: 'Transportation', icon: '🚗', color: '#3B82F6' },
  { id: 'cat3', name: 'Housing', icon: '🏠', color: '#F59E0B' },
  { id: 'cat4', name: 'Entertainment', icon: '🎉', color: '#8B5CF6' },
  { id: 'cat5', name: 'Shopping', icon: '🛍️', color: '#EC4899' },
  { id: 'cat6', name: 'Health', icon: '💊', color: '#EF4444' },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', amount: 45.50, type: 'expense', categoryId: 'cat1', accountId: 'acc1', occurredAt: new Date().toISOString(), note: 'Lunch with team' },
  { id: 't2', amount: 120.00, type: 'expense', categoryId: 'cat2', accountId: 'acc2', occurredAt: new Date().toISOString(), note: 'Gas refill' },
  { id: 't3', amount: 1500.00, type: 'income', categoryId: 'cat3', accountId: 'acc1', occurredAt: new Date().toISOString(), note: 'Monthly Salary' },
  { id: 't4', amount: 80.00, type: 'expense', categoryId: 'cat4', accountId: 'acc3', occurredAt: new Date().toISOString(), note: 'Movie night' },
  { id: 't5', amount: 250.00, type: 'expense', categoryId: 'cat5', accountId: 'acc1', occurredAt: new Date().toISOString(), note: 'New headphones' },
];

export const MOCK_BUDGETS: Budget[] = [
  { id: 'b1', categoryId: 'cat1', limit: 500, spent: 345.50, month: new Date().toISOString() },
  { id: 'b2', categoryId: 'cat2', limit: 200, spent: 120.00, month: new Date().toISOString() },
  { id: 'b3', categoryId: 'cat4', limit: 300, spent: 280.00, month: new Date().toISOString() },
];

export const MOCK_DASHBOARD_SUMMARY: DashboardSummary = {
  totalBalance: MOCK_ACCOUNTS.reduce((sum, a) => sum + a.balance, 0),
  monthlySpend: MOCK_TRANSACTIONS.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
  budgetLimit: MOCK_BUDGETS.reduce((sum, b) => sum + b.limit, 0),
};
