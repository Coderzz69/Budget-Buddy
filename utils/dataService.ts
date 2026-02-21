import { api } from './api';

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
    clerkId: string;
    email: string;
    name?: string;
    currency?: string;
}

export const dataService = {
    // Transactions
    getTransactions: async (token?: string): Promise<Transaction[]> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
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
    }, token?: string): Promise<Transaction> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
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
    }, token?: string): Promise<Transaction> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const response = await api.put(`/transactions/${id}`, data, options);
        return { ...response, amount: Number(response.amount), description: response.note || response.description };
    },

    deleteTransaction: async (id: string, token?: string): Promise<void> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        return api.delete(`/transactions/${id}`, options);
    },

    // Accounts
    getAccounts: async (token?: string): Promise<Account[]> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        return api.get('/accounts', options);
    },

    createAccount: async (data: { name: string; type: string }, token?: string): Promise<Account> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        return api.post('/accounts', data, options);
    },

    // User Profile
    getUserProfile: async (token?: string): Promise<UserProfile> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        return api.get('/user/profile', options);
    },

    updateUserProfile: async (data: { name?: string; currency?: string }, token?: string): Promise<UserProfile> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        return api.put('/user/profile', data, options);
    },

    // Helpers
    ensureDefaultAccount: async (token?: string): Promise<Account> => {
        const accounts = await dataService.getAccounts(token);
        if (accounts.length > 0) {
            return accounts[0];
        }
        return dataService.createAccount({ name: 'Main Wallet', type: 'cash' }, token);
    },

    getCategories: async (token?: string): Promise<{ id: string, name: string, icon: string, color?: string }[]> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        return api.get('/categories', options);
    },

    updateCategory: async (id: string, data: { name: string, icon: string, color: string }, token?: string): Promise<{ message: string }> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        return api.put(`/categories/${id}`, data, options);
    },

    deleteCategory: async (id: string, token?: string): Promise<{ message: string }> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        return api.delete(`/categories/${id}`, options);
    }
};
