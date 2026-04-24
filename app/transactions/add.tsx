import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { X, Calendar, Check, Info, Mic } from 'lucide-react-native';
import { useStore, TransactionType } from '../../store/useStore';
import { useApi } from '../../hooks/useApi';
import { GlassCard } from '../../components/GlassCard';
import { NeonButton } from '../../components/NeonButton';
import * as Haptics from 'expo-haptics';
import { EmptyState } from '../../components/EmptyState';

export default function AddTransaction() {
  const { accounts, categories, setTransactions, transactions, setAccounts, setDashboardSummary } = useStore();
  const api = useApi();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || '');
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || '');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const canSave = amount && !Number.isNaN(parseFloat(amount)) && selectedCategory && selectedAccount;

  // ML Smart Category Prediction
  useEffect(() => {
    if (!note || note.length < 3) return;

    const timeoutId = setTimeout(async () => {
      try {
        setIsPredicting(true);
        const parsedAmount = parseFloat(amount) || 0;
        const res = await api.predictCategory(note, parsedAmount);
        
        if (res.data?.predicted_category && res.data.confidence && res.data.confidence > 0.3) {
          const catName = res.data.predicted_category.toLowerCase();
          const matchingCat = categories.find(c => c.name.toLowerCase() === catName);
          
          if (matchingCat && matchingCat.id !== selectedCategory) {
            setSelectedCategory(matchingCat.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      } catch (e) {
        console.warn('ML Prediction failed:', e);
      } finally {
        setIsPredicting(false);
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [note, amount, categories]); // Do not include selectedCategory as an exhaust-dependency to prevent infinite loops if they don't match


  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts, selectedAccount]);

  const handleVoiceInput = async () => {
    setIsListening(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Simulate voice recognition delay
    setTimeout(() => {
      setIsListening(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Mock parsed result: "50 dollars for dinner tonight"
      setAmount('50.00');
      setNote('Dinner tonight');
      
      // Select "Food" category (assuming it exists in the store)
      const foodCategory = categories.find(c => c.name.toLowerCase().includes('food') || c.name.toLowerCase().includes('dinner'));
      if (foodCategory) setSelectedCategory(foodCategory.id);
    }, 2000);
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || !selectedAccount || !selectedCategory) return;

    try {
      setIsSubmitting(true);
      const response = await api.createTransaction({
        amount: parsedAmount,
        type,
        accountId: selectedAccount,
        categoryId: selectedCategory,
        occurredAt: date + 'T00:00:00Z',
        note: note || undefined,
      });
      // Prepend to store transactions for fast update
      setTransactions([response.data, ...transactions]);
      const [accountsResponse, summaryResponse] = await Promise.all([
        api.getAccounts(),
        api.getDashboardSummary(),
      ]);
      setAccounts(accountsResponse.data);
      setDashboardSummary(summaryResponse.data);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error('Failed to save transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-950"
    >
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6">
        {/* Header */}
        <View className="flex-row items-center justify-between py-6">
          <Text className="text-white text-xl font-bold">New Transaction</Text>
          <Pressable 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-slate-900 items-center justify-center"
          >
            <X size={20} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Type Toggle */}
        <View className="flex-row bg-slate-900 p-1.5 rounded-2xl mb-8">
          <Pressable 
            onPress={() => { setType('expense'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            className={cn(
              'flex-1 py-3 rounded-xl items-center',
              type === 'expense' ? 'bg-slate-800 shadow-sm' : ''
            )}
          >
            <Text className={cn(
              'font-bold',
              type === 'expense' ? 'text-white' : 'text-slate-500'
            )}>Expense</Text>
          </Pressable>
          <Pressable 
            onPress={() => { setType('income'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            className={cn(
              'flex-1 py-3 rounded-xl items-center',
              type === 'income' ? 'bg-slate-800 shadow-sm' : ''
            )}
          >
            <Text className={cn(
              'font-bold',
              type === 'income' ? 'text-white' : 'text-slate-500'
            )}>Income</Text>
          </Pressable>
        </View>

        {/* Amount Input */}
        <View className="items-center mb-10">
          <Text className="text-slate-500 text-sm font-medium mb-2 uppercase tracking-widest">Amount</Text>
          <View className="relative">
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#1E293B"
              keyboardType="decimal-pad"
              className={cn(
                'text-6xl font-bold text-center h-20 min-w-[200px]',
                type === 'income' ? 'text-primary' : 'text-white'
              )}
              style={{
                textShadowColor: type === 'income' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 20
              }}
            />
            {/* Voice Input Button */}
            <Pressable 
              onPress={handleVoiceInput}
              disabled={isListening}
              className={cn(
                'absolute -right-16 top-4 w-12 h-12 rounded-full items-center justify-center',
                isListening ? 'bg-primary' : 'bg-slate-900 border border-slate-800'
              )}
              style={isListening ? {
                shadowColor: '#10B981',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 15,
                elevation: 10
              } : {}}
            >
              <Mic size={20} color={isListening ? '#000' : '#94A3B8'} />
            </Pressable>
          </View>
        </View>

        {/* Form Fields */}
        <View className="gap-6 mb-10">
          {/* Category Selector */}
          <View>
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 ml-1">Category</Text>
            {categories.length === 0 ? (
              <EmptyState
                icon={Info}
                title="No categories"
                description="Create a category to tag your transactions."
                actionLabel="Add Category"
                onAction={() => router.push('/categories/add')}
              />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
                <View className="flex-row gap-3 pr-12">
                  {categories.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => { setSelectedCategory(cat.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      className={cn(
                        'px-4 py-3 rounded-2xl border items-center justify-center flex-row min-w-[100px]',
                        selectedCategory === cat.id 
                          ? 'bg-primary/20 border-primary' 
                          : 'bg-slate-900 border-slate-900'
                      )}
                    >
                      <Text className="text-lg mr-2">{cat.icon || '🏷️'}</Text>
                      <Text className={cn(
                        'font-medium text-sm',
                        selectedCategory === cat.id ? 'text-white' : 'text-slate-400'
                      )}>{cat.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Account Selector */}
          <View>
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 ml-1">Source Account</Text>
            {accounts.length === 0 ? (
              <EmptyState
                icon={Info}
                title="No accounts"
                description="Add an account to track where money comes from."
                actionLabel="Add Account"
                onAction={() => router.push('/accounts/add')}
              />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
                <View className="flex-row gap-3 pr-12">
                  {accounts.map((account) => (
                    <Pressable
                      key={account.id}
                      onPress={() => { setSelectedAccount(account.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      className={cn(
                        'px-4 py-3 rounded-2xl border items-center justify-center flex-row min-w-[120px]',
                        selectedAccount === account.id 
                          ? 'bg-primary/20 border-primary' 
                          : 'bg-slate-900 border-slate-900'
                      )}
                    >
                      <Check size={16} color={selectedAccount === account.id ? '#10B981' : '#64748B'} />
                      <Text className={cn(
                        'font-medium text-sm ml-2',
                        selectedAccount === account.id ? 'text-white' : 'text-slate-400'
                      )}>{account.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Date & Note */}
          <View className="flex-row gap-4">
            <View className="flex-1">
               <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 ml-1">Date</Text>
               <GlassCard className="px-4 h-14 justify-center border-slate-900">
                  <View className="flex-row items-center">
                    <Calendar size={16} color="#475569" className="mr-2" />
                    <Text className="text-white font-medium">{date}</Text>
                  </View>
               </GlassCard>
            </View>
            <View className="flex-[1.5]">
               <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 ml-1">Note</Text>
               <GlassCard className="px-4 h-14 justify-center border-slate-900">
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="Lunch with friends..."
                    placeholderTextColor="#475569"
                    className="text-white font-medium"
                  />
               </GlassCard>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <NeonButton 
          title="Save Transaction" 
          onPress={handleSave}
          className="mb-10 h-16"
          variant={type === 'income' ? 'primary' : 'primary'} // Emerald for both but could be primary/secondary
          disabled={!canSave || isSubmitting}
          isLoading={isSubmitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
