import { useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useApi } from './useApi';
import { useUser, useAuth } from '@clerk/expo';
import { 
  MOCK_ACCOUNTS, 
  MOCK_CATEGORIES, 
  MOCK_TRANSACTIONS, 
  MOCK_BUDGETS, 
  MOCK_DASHBOARD_SUMMARY 
} from '../mock-data/mockData';

export const useData = () => {
  const api = useApi();
  const { user } = useUser();
  const { isSignedIn } = useAuth();
  
  const { 
    setAccounts, setTransactions, setCategories, setBudgets, setDashboardSummary,
    setIsLoading, setError, clearData
  } = useStore();

  const fetchAllData = useCallback(async () => {
    if (!isSignedIn) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // Sync user first
      if (user) {
        await api.syncUser(
          user.id, 
          user.primaryEmailAddress?.emailAddress || '',
          user.fullName || '',
          user.imageUrl
        );
      }
      
      const [
        { data: accounts }, 
        { data: categories },
        { data: txResponse },
        { data: budgets },
        { data: summary }
      ] = await Promise.all([
        api.getAccounts(),
        api.getCategories(),
        api.getTransactions(),
        api.getBudgets(),
        api.getDashboardSummary()
      ]);
      
      setAccounts(accounts);
      setCategories(categories);
      setTransactions(txResponse.results);
      setBudgets(budgets);
      setDashboardSummary(summary);
      
    } catch (e: any) {
      const message = e?.response?.data || e?.message;
      const isNetworkError = !e?.response;
      if (isNetworkError) {
        console.warn('API unreachable, using mock data:', message);
        // Fallback to mock data so the UI isn't empty when the API is unreachable.
        setAccounts(MOCK_ACCOUNTS);
        setCategories(MOCK_CATEGORIES);
        setTransactions(MOCK_TRANSACTIONS);
        setBudgets(MOCK_BUDGETS);
        setDashboardSummary(MOCK_DASHBOARD_SUMMARY);
      } else {
        console.warn('Error fetching data:', message);
      }
      setError('Failed to sync data with server');
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, user]);
  
  // Re-fetch everything if user signs out/in
  useEffect(() => {
    if (isSignedIn) {
      fetchAllData();
    } else {
      clearData();
    }
  }, [isSignedIn, fetchAllData]);

  return { fetchAllData };
};
