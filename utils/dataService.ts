import { api } from './api';
import { supabase } from '../lib/supabase';

// Helper to get the current token
const getAuthOptions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { headers: { Authorization: `Bearer ${session.access_token}` } } : {};
};

export interface Transaction {
    id: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description?: string;
    date: string;
    accountId: string;
    account?: Account;
}

export interface Account {
    id: string;
    name: string;
    type: string;
    userId: string;
}

export interface UserProfile {
    id: string;
    supabaseId: string;
    email: string;
    name?: string;
    currency?: string;
}

export const dataService = {
    // Transactions
    getTransactions: async (): Promise<Transaction[]> => {
        const options = await getAuthOptions();
        const data = await api.get('/transactions', options);
        return data.map((t: any) => ({
            ...t,
            description: t.note || t.description,
            category: t.category?.name || 'Uncategorized',
            amount: Number(t.amount),
            date: t.occurredAt
        })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    addTransaction: async (data: {
        type: 'income' | 'expense';
        category: string;
        amount: number;
        description?: string;
        date: string; // ISO string
        accountId: string;
    }): Promise<Transaction> => {
        const options = await getAuthOptions();
        const response = await api.post('/transactions', data, options);
        return { ...response, amount: Number(response.amount), description: response.note || response.description };
    },

    updateTransaction: async (id: string, data: {
        type: 'income' | 'expense';
        category: string;
        amount: number;
        description?: string;
        date: string; // ISO string
        accountId: string;
    }): Promise<Transaction> => {
        const options = await getAuthOptions();
        const response = await api.put(`/transactions/${id}`, data, options);
        return { ...response, amount: Number(response.amount), description: response.note || response.description };
    },

    deleteTransaction: async (id: string): Promise<void> => {
        const options = await getAuthOptions();
        return api.delete(`/transactions/${id}`, options);
    },

    // Accounts
    getAccounts: async (): Promise<Account[]> => {
        const options = await getAuthOptions();
        return api.get('/accounts', options);
    },

    createAccount: async (data: { name: string; type: string }): Promise<Account> => {
        const options = await getAuthOptions();
        return api.post('/accounts', data, options);
    },

    // User Profile
    getUserProfile: async (): Promise<UserProfile> => {
        const options = await getAuthOptions();
        return api.get('/user/profile', options);
    },

    updateUserProfile: async (data: { name?: string; currency?: string }): Promise<UserProfile> => {
        const options = await getAuthOptions();
        return api.put('/user/profile', data, options);
    },

    // Helpers
    ensureDefaultAccount: async (): Promise<Account> => {
        const accounts = await dataService.getAccounts();
        if (accounts.length > 0) {
            return accounts[0];
        }
        return dataService.createAccount({ name: 'Main Wallet', type: 'cash' });
    },

    getCategories: async (): Promise<{ id: string, name: string, icon: string, color?: string }[]> => {
        const options = await getAuthOptions();
        return api.get('/categories', options);
    },

    updateCategory: async (id: string, data: { name: string, icon: string, color: string }): Promise<{ message: string }> => {
        const options = await getAuthOptions();
        return api.put(`/categories/${id}`, data, options);
    },

    deleteCategory: async (id: string): Promise<{ message: string }> => {
        const options = await getAuthOptions();
        return api.delete(`/categories/${id}`, options);
    }
};
