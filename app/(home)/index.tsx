import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { GlassCard } from '../../components/GlassCard';
import { Colors } from '../../constants/theme';
import { useColorScheme } from 'react-native';
import { Bell, CreditCard, Landmark, Wallet, Banknote, TrendingUp, ChevronRight } from 'lucide-react-native';
import { CartesianChart, Line } from 'victory-native';
import { useUser } from '@clerk/expo';
import { formatCurrency } from '../../utils/formatters'; // I'll create this
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { cn } from '../../utils/cn';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const { user } = useUser();
  const colorScheme = useColorScheme() ?? 'dark';
  const themeColors = Colors[colorScheme];
  const { accounts, transactions, dashboardSummary, isLoading } = useStore();

  const totalBalance = dashboardSummary?.totalBalance || 0;
  const recentTransactions = transactions.slice(0, 5);

  const chartData = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      const label = date.toLocaleDateString('en-US', { weekday: 'short' });
      const key = date.toISOString().slice(0, 10);
      return { date, label, key };
    });

    const totals = new Map<string, number>();
    transactions.forEach((tx) => {
      if (tx.type !== 'expense') return;
      const txDate = new Date(tx.occurredAt);
      if (Number.isNaN(txDate.getTime())) return;
      txDate.setHours(0, 0, 0, 0);
      const key = txDate.toISOString().slice(0, 10);
      if (!days.find((d) => d.key === key)) return;
      totals.set(key, (totals.get(key) || 0) + tx.amount);
    });

    return days.map((d) => ({
      x: d.label,
      y: totals.get(d.key) || 0,
    }));
  }, [transactions]);

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
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <View>
            <Text className="text-slate-400 text-sm font-medium">Welcome back,</Text>
            <Text className="text-white text-xl font-bold">{user?.firstName || 'Adrian'}</Text>
          </View>
          <Pressable className="w-10 h-10 rounded-full bg-slate-900 items-center justify-center border border-slate-800">
            <Bell size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Total Balance Hero */}
        <View className="px-6 py-4">
          <GlassCard className="p-6 relative overflow-hidden" intensity="high">
            {/* Glow Effect */}
            <View className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full" />
            
            <Text className="text-slate-400 text-sm font-medium mb-1">Total Net Worth</Text>
            {isLoading ? (
              <SkeletonLoader width={180} height={40} className="my-1" />
            ) : (
              <Text className="text-white text-4xl font-bold tracking-tight">
                {formatCurrency(totalBalance)}
              </Text>
            )}
            
            <View className="flex-row items-center mt-4 bg-emerald-500/10 self-start px-2 py-1 rounded-lg">
              <TrendingUp size={14} color="#10B981" />
              <Text className="text-primary text-xs font-bold ml-1">+2.4% this month</Text>
            </View>
          </GlassCard>
        </View>

        {/* Account Cards */}
        <View className="py-4">
          <View className="flex-row items-center justify-between px-6 mb-4">
            <Text className="text-white text-lg font-bold">Your Accounts</Text>
            <Pressable onPress={() => router.push('/accounts')}>
              <Text className="text-primary text-sm font-medium">See All</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}
            snapToInterval={width * 0.45 + 16}
            decelerationRate="fast"
          >
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <GlassCard key={i} className="w-[170px] p-4 mr-4 border-slate-800/50">
                  <SkeletonLoader width={40} height={40} borderRadius={12} className="mb-3" />
                  <SkeletonLoader width={80} height={14} className="mb-2" />
                  <SkeletonLoader width={110} height={20} />
                </GlassCard>
              ))
            ) : accounts.length === 0 ? (
              <View className="flex-1 items-center justify-center p-4">
                <Text className="text-slate-400">No accounts found.</Text>
              </View>
            ) : (
              accounts.map((account) => (
                <GlassCard key={account.id} className="w-[170px] p-4 mr-4 border-slate-800/50">
                  <View className="w-10 h-10 rounded-xl bg-slate-900 items-center justify-center mb-3">
                    {getAccountIcon(account.type)}
                  </View>
                  <Text className="text-slate-400 text-xs font-medium mb-1">{account.name}</Text>
                  <Text className="text-white text-lg font-bold">
                    {formatCurrency(account.balance)}
                  </Text>
                </GlassCard>
              ))
            )}
          </ScrollView>
        </View>

      <View className="px-6 py-4">
        <Text className="text-white text-lg font-bold mb-4">Weekly Spending</Text>
        <GlassCard className="p-4 items-center justify-center h-56 border-slate-900/50">
          <CartesianChart
            data={chartData}
            xKey="x"
            yKeys={['y']}
            axisOptions={{
              labelColor: '#64748B',
              lineColor: 'rgba(255, 255, 255, 0.08)',
              tickCount: 5,
            }}
          >
            {({ points }) => (
              <Line
                points={points.y}
                color="#10B981"
                strokeWidth={3}
                animate={{ type: 'timing', duration: 500 }}
              />
            )}
          </CartesianChart>
        </GlassCard>
      </View>

        {/* Recent Transactions */}
        <View className="px-6 py-4 mb-20">
          <View className="flex-row items-center justify-between mb-4 mt-6">
            <Text className="text-white text-lg font-bold">Recent Activity</Text>
            <Pressable>
              <Text className="text-primary font-medium">See All</Text>
            </Pressable>
          </View>

          <View className="gap-3">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <GlassCard key={i} className="p-4 flex-row items-center border-slate-800/50">
                  <SkeletonLoader width={48} height={48} borderRadius={12} className="mr-4" />
                  <View className="flex-1 mr-4">
                    <SkeletonLoader width={100} height={16} className="mb-2" />
                    <SkeletonLoader width={60} height={12} />
                  </View>
                  <SkeletonLoader width={60} height={16} />
                </GlassCard>
              ))
            ) : recentTransactions.length === 0 ? (
              <View className="flex-1 items-center justify-center p-8">
                <Text className="text-slate-400">No activities yet.</Text>
              </View>
            ) : (
              recentTransactions.map((transaction) => (
                <GlassCard key={transaction.id} className="p-4 border-slate-800/50">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 items-center justify-center mr-4">
                        <CreditCard size={24} color="#94A3B8" />
                      </View>
                      <View className="flex-1 mr-4">
                        <Text className="text-white font-bold text-base" numberOfLines={1}>
                          {transaction.note || 'No description'}
                        </Text>
                        <Text className="text-slate-400 text-xs">
                          {new Date(transaction.occurredAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <Text className={`font-bold text-base ${transaction.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                </GlassCard>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
