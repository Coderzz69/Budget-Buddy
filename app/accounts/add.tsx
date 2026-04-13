import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Banknote, Landmark, CreditCard, Wallet, X } from 'lucide-react-native';
import { NeonInput } from '../../components/NeonInput';
import { NeonButton } from '../../components/NeonButton';
import { useApi } from '../../hooks/useApi';
import { useStore, AccountType } from '../../store/useStore';
import * as Haptics from 'expo-haptics';

const ACCOUNT_TYPES: { key: AccountType; label: string; icon: React.ReactNode }[] = [
  { key: 'cash', label: 'Cash', icon: <Banknote size={18} color="#94A3B8" /> },
  { key: 'bank', label: 'Bank', icon: <Landmark size={18} color="#38BDF8" /> },
  { key: 'card', label: 'Card', icon: <CreditCard size={18} color="#F59E0B" /> },
  { key: 'wallet', label: 'Wallet', icon: <Wallet size={18} color="#10B981" /> },
];

export default function AddAccount() {
  const api = useApi();
  const { accounts, setAccounts, setDashboardSummary } = useStore();

  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    const parsedBalance = balance ? parseFloat(balance) : 0;
    if (Number.isNaN(parsedBalance)) {
      setError('Enter a valid balance');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.createAccount({
        name: name.trim(),
        type,
        balance: parsedBalance,
      });
      setAccounts([...accounts, response.data]);
      const summaryResponse = await api.getDashboardSummary();
      setDashboardSummary(summaryResponse.data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError('Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6">
          <View className="flex-row items-center justify-between py-6">
            <Text className="text-white text-xl font-bold">Add Account</Text>
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-slate-900 items-center justify-center"
            >
              <X size={20} color="#94A3B8" />
            </Pressable>
          </View>

          <View className="gap-6 mb-8">
            <NeonInput
              label="Account Name"
              placeholder="e.g. Main Bank"
              value={name}
              onChangeText={setName}
            />

            <View>
              <Text className="text-slate-400 text-sm font-medium ml-1 mb-3">Account Type</Text>
              <View className="flex-row flex-wrap gap-3">
                {ACCOUNT_TYPES.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => { setType(item.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    className={[
                      'px-4 py-3 rounded-2xl border flex-row items-center',
                      type === item.key ? 'bg-primary/20 border-primary' : 'bg-slate-900 border-slate-800'
                    ].join(' ')}
                  >
                    {item.icon}
                    <Text className={type === item.key ? 'text-white ml-2 font-medium' : 'text-slate-400 ml-2 font-medium'}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <NeonInput
              label="Starting Balance"
              placeholder="0"
              keyboardType="decimal-pad"
              value={balance}
              onChangeText={setBalance}
              error={error || undefined}
            />
          </View>

          <NeonButton
            title="Create Account"
            onPress={handleSave}
            isLoading={isSubmitting}
            disabled={!canSave || isSubmitting}
            className="h-16 mb-10"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
