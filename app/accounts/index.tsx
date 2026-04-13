import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useStore } from '../../store/useStore';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import { CreditCard, Landmark, Wallet, Banknote, Plus } from 'lucide-react-native';
import { formatCurrency } from '../../utils/formatters';

export default function Accounts() {
  const { accounts } = useStore();

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank': return <Landmark size={20} color="#38BDF8" />;
      case 'card': return <CreditCard size={20} color="#F59E0B" />;
      case 'wallet': return <Wallet size={20} color="#10B981" />;
      default: return <Banknote size={20} color="#94A3B8" />;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-6 py-4 flex-row items-center justify-between">
          <View>
            <Text className="text-white text-2xl font-bold">Accounts</Text>
            <Text className="text-slate-400 text-sm">Manage your balances</Text>
          </View>
          <Pressable
            onPress={() => router.push('/accounts/add')}
            className="bg-primary/10 p-2 rounded-xl border border-primary/20"
          >
            <Plus size={24} color="#10B981" />
          </Pressable>
        </View>

        <View className="px-6 py-4 mb-24">
          {accounts.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No accounts yet"
              description="Add a bank, card, wallet, or cash account."
              actionLabel="Add Account"
              onAction={() => router.push('/accounts/add')}
            />
          ) : (
            <View className="gap-4">
              {accounts.map((account) => (
                <GlassCard key={account.id} className="p-5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 rounded-2xl bg-slate-900 items-center justify-center mr-4">
                        {getAccountIcon(account.type)}
                      </View>
                      <View>
                        <Text className="text-white font-bold">{account.name}</Text>
                        <Text className="text-slate-400 text-xs uppercase tracking-widest">{account.type}</Text>
                      </View>
                    </View>
                    <Text className="text-white font-bold">{formatCurrency(account.balance)}</Text>
                  </View>
                </GlassCard>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
