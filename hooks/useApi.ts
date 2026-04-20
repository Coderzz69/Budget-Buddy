import { useAuth } from '@clerk/expo';
import axios from 'axios';
import { useMemo } from 'react';
import { Account, Budget, Category, Transaction } from '../store/useStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

export const useApi = () => {
  const { getToken } = useAuth();
  
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: API_URL,
    });
    
    instance.interceptors.request.use(async (config) => {
      try {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (e) {
        console.error('Error fetching token for API request', e);
      }
      return config;
    });
    
    return instance;
  }, [getToken]);
  
  return {
    syncUser: async (clerkId: string, email: string, name?: string, profilePic?: string) => {
        return api.post('/auth/sync-user/', { clerkId, email, name, profilePic });
    },
    
    // Accounts
    getAccounts: async () => api.get<Account[]>('/accounts/'),
    createAccount: async (data: Omit<Account, 'id'>) => api.post<Account>('/accounts/', data),
    
    // Categories
    getCategories: async () => api.get<Category[]>('/categories/'),
    createCategory: async (data: Omit<Category, 'id'>) => api.post<Category>('/categories/', data),
    
    // Transactions
    getTransactions: async (params?: any) => api.get<{ count: number, results: Transaction[] }>('/transactions/', { params }),
    createTransaction: async (data: any) => api.post<Transaction>('/transactions/', data),
    
    // Budgets
    getBudgets: async () => api.get<Budget[]>('/budgets/'),
    createBudget: async (data: any) => api.post<Budget>('/budgets/', data),
    
    // Dashboard Summary
    getDashboardSummary: async () => api.get('/dashboard/'),
  };
};
