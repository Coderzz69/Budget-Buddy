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
    balance?: number;
}

export interface UserProfile {
    id: string;
    clerkId: string;
    email: string;
    name?: string;
    currency?: string;
}

type BackendTransaction = {
    id: string;
    type: 'income' | 'expense';
    amount: number | string;
    note?: string | null;
    description?: string | null;
    occurredAt?: string;
    date?: string;
    accountId?: string;
    account?: Account;
    accountName?: string;
    category?: string | { id?: string; name?: string } | null;
    categoryId?: string | null;
    categoryName?: string | null;
};

type PaginatedResponse<T> = {
    count: number;
    page: number;
    results: T[];
};

const getResults = <T>(data: T[] | PaginatedResponse<T>): T[] => {
    if (Array.isArray(data)) {
        return data;
    }
    return Array.isArray(data?.results) ? data.results : [];
};

const normalizeTransaction = (transaction: BackendTransaction): Transaction => {
    const category =
        typeof transaction.category === 'string'
            ? transaction.category
            : transaction.category?.name || transaction.categoryName || 'Uncategorized';

    const description = transaction.description ?? transaction.note ?? undefined;
    const date = transaction.date || transaction.occurredAt || new Date().toISOString();
    const accountId = transaction.accountId || transaction.account?.id || '';

    return {
        id: transaction.id,
        type: transaction.type,
        category,
        amount: Number(transaction.amount),
        description: description || undefined,
        date,
        accountId,
        account: transaction.account,
    };
};

const buildTransactionPayload = (data: {
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description?: string;
    date: string;
    accountId: string;
}) => ({
    type: data.type,
    category: data.category,
    amount: data.amount,
    description: data.description,
    date: data.date,
    accountId: data.accountId,
});

export const dataService = {
    // Transactions
    getTransactions: async (token?: string): Promise<Transaction[]> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const data = await api.get('/transactions/', options);
        return getResults<BackendTransaction>(data)
            .map(normalizeTransaction)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
        const response = await api.post('/transactions/', buildTransactionPayload(data), options);
        return normalizeTransaction(response);
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
        const response = await api.put(`/transactions/${id}/`, buildTransactionPayload(data), options);
        return normalizeTransaction(response);
    },

    deleteTransaction: async (id: string, token?: string): Promise<void> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        return api.delete(`/transactions/${id}/`, options);
    },

    // Accounts
    getAccounts: async (token?: string): Promise<Account[]> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        return api.get('/accounts/', options);
    },

    createAccount: async (data: { name: string; type: string }, token?: string): Promise<Account> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        return api.post('/accounts/', data, options);
    },

    // User Profile
    getUserProfile: async (token?: string): Promise<UserProfile> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        return api.get('/user/profile/', options);
    },

    updateUserProfile: async (data: { name?: string; currency?: string }, token?: string): Promise<UserProfile> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        return api.put('/user/profile/', data, options);
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
        return api.get('/categories/', options);
    },

    updateCategory: async (id: string, data: { name: string, icon: string, color: string }, token?: string): Promise<{ message: string }> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        return api.put(`/categories/${id}/`, data, options);
    },

    deleteCategory: async (id: string, token?: string): Promise<{ message: string }> => {
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        return api.delete(`/categories/${id}/`, options);
    }
};
