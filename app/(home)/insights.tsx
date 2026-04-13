import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { GlassCard } from '../../components/GlassCard';
import { Colors } from '../../constants/theme';
import { useColorScheme } from 'react-native';
import { PolarChart, Pie } from 'victory-native';
import { ArrowUpRight, Search } from 'lucide-react-native';
import { formatCurrency } from '../../utils/formatters';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { EmptyState } from '../../components/EmptyState';
import { cn } from '../../utils/cn';

const PERIODS = ['Week', 'Month', 'Year'];

export default function Insights() {
  const [selectedPeriod, setSelectedPeriod] = useState('Month');
  const colorScheme = useColorScheme() ?? 'dark';
  const { categories, transactions, isLoading } = useStore();
  const palette = ['#10B981', '#38BDF8', '#F59E0B', '#EF4444', '#A855F7', '#F97316', '#14B8A6', '#EAB308'];

  const spendingByCategory = categories.map(cat => {
    const amount = transactions
      .filter(tx => tx.categoryId === cat.id && tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { ...cat, amount };
  }).filter(c => c.amount > 0);

  const totalSpending = spendingByCategory.reduce((sum, c) => sum + c.amount, 0);
  const highestExpense = spendingByCategory.length > 0 
    ? [...spendingByCategory].sort((a, b) => b.amount - a.amount)[0]
    : null;

  const chartData = spendingByCategory.map((cat, index) => ({
    label: cat.name,
    value: cat.amount,
    color: cat.color || palette[index % palette.length],
  }));

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Header */}
        <View className="px-6 py-4">
          <Text className="text-white text-2xl font-bold">Insights</Text>
          <Text className="text-slate-400 text-sm">Analyze your spending patterns</Text>
        </View>

        {/* Period Selector */}
        <View className="flex-row px-6 mb-6 gap-2">
          {PERIODS.map((period) => (
            <Pressable
              key={period}
              onPress={() => setSelectedPeriod(period)}
              className={cn(
                'px-4 py-2 rounded-full border',
                selectedPeriod === period 
                  ? 'bg-primary/20 border-primary' 
                  : 'bg-slate-900 border-slate-800'
              )}
            >
              <Text className={cn(
                'text-sm font-medium',
                selectedPeriod === period ? 'text-primary' : 'text-slate-400'
              )}>
                {period}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Chart Section */}
        <View className="items-center justify-center mb-8">
          <GlassCard className="w-[90%] p-6 items-center justify-center" intensity="medium">
            <View className="h-64 w-64 items-center justify-center">
              {isLoading ? (
                <SkeletonLoader width={250} height={250} borderRadius={125} />
              ) : spendingByCategory.length > 0 ? (
                <View className="h-64 w-64 items-center justify-center">
                  <PolarChart
                    data={chartData}
                    labelKey="label"
                    valueKey="value"
                    colorKey="color"
                  >
                    <Pie.Chart innerRadius={80} />
                  </PolarChart>
                  <View className="absolute items-center justify-center">
                    <Text className="text-slate-400 text-xs font-medium uppercase tracking-widest">Spent</Text>
                    <Text className="text-white text-2xl font-bold">{formatCurrency(totalSpending)}</Text>
                  </View>
                </View>
              ) : (
                <View className="h-64 w-64 items-center justify-center">
                  <EmptyState 
                    icon={Search} 
                    title="No Data" 
                    description="No spending data in this period." 
                  />
                </View>
              )}
            </View>
          </GlassCard>
        </View>

        {/* Insights Cards */}
        {isLoading ? (
          <View className="px-6 mb-8">
            <GlassCard className="p-5 flex-row items-center border-slate-800/50" intensity="high">
              <SkeletonLoader width={48} height={48} borderRadius={16} className="mr-4" />
              <View className="flex-1">
                <SkeletonLoader width={100} height={16} className="mb-2" />
                <SkeletonLoader width={140} height={20} />
              </View>
            </GlassCard>
          </View>
        ) : highestExpense ? (
          <View className="px-6 mb-8">
            <GlassCard className="p-5 flex-row items-center border-slate-800/50" intensity="high">
              <View className="w-12 h-12 rounded-2xl bg-emerald-500/20 items-center justify-center mr-4">
                <ArrowUpRight size={24} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-xs font-medium">Highest Expense</Text>
                <Text className="text-white text-lg font-bold">{highestExpense.name}</Text>
              </View>
              <View className="items-end">
                <Text className="text-white font-bold">{formatCurrency(highestExpense.amount)}</Text>
                <Text className="text-emerald-500 text-xs">Top Priority</Text>
              </View>
            </GlassCard>
          </View>
        ) : null}

        {/* Category Legend */}
        <View className="px-6 mb-24">
          <Text className="text-white text-lg font-bold mb-4">Breakdown</Text>
          <View className="gap-3">
            {isLoading ? (
              [1, 2].map((i) => (
                <GlassCard key={i} className="flex-row items-center p-4">
                  <SkeletonLoader width={12} height={12} borderRadius={6} className="mr-4" />
                  <SkeletonLoader width={100} height={16} className="flex-1" />
                  <SkeletonLoader width={80} height={16} />
                </GlassCard>
              ))
            ) : (
              spendingByCategory.map((cat) => (
                <GlassCard key={cat.id} className="flex-row items-center p-4">
                  <View 
                    className="w-3 h-3 rounded-full mr-4" 
                    style={{ backgroundColor: cat.color }} 
                  />
                  <Text className="flex-1 text-white font-medium">{cat.name}</Text>
                  <Text className="text-slate-400 text-sm mr-4">
                    {((cat.amount / totalSpending) * 100).toFixed(0)}%
                  </Text>
                  <Text className="text-white font-bold">{formatCurrency(cat.amount)}</Text>
                </GlassCard>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
