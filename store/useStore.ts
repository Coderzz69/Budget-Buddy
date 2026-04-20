import { create } from 'zustand';

export type AccountType = 'cash' | 'bank' | 'card' | 'wallet';
export type TransactionType = 'income' | 'expense';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string; // Changed from category to categoryId to match backend
  accountId: string;
  occurredAt: string; // Changed from date to occurredAt to match backend
  note?: string;
}

export interface Budget {
  id: string; // Added id
  categoryId: string;
  limit: number;
  month: string; // Added month
  spent?: number; // Optional, calculated on the fly
}

export interface DashboardSummary {
  totalBalance: number;
  monthlySpend: number;
  budgetLimit: number;
}

interface AppState {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  dashboardSummary: DashboardSummary | null;
  
  isLoading: boolean;
  error: string | null;
  
  // Setters
  setAccounts: (accounts: Account[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setCategories: (categories: Category[]) => void;
  setBudgets: (budgets: Budget[]) => void;
  setDashboardSummary: (summary: DashboardSummary) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  clearData: () => void;
}

export const useStore = create<AppState>((set) => ({
  accounts: [],
  transactions: [],
  categories: [],
  budgets: [],
  dashboardSummary: null,
  
  isLoading: false,
  error: null,

  setAccounts: (accounts) => set({ accounts }),
  setTransactions: (transactions) => set({ transactions }),
  setCategories: (categories) => set({ categories }),
  setBudgets: (budgets) => set({ budgets }),
  setDashboardSummary: (dashboardSummary) => set({ dashboardSummary }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  clearData: () => set({
    accounts: [],
    transactions: [],
    categories: [],
    budgets: [],
    dashboardSummary: null,
    error: null
  }),
}));

