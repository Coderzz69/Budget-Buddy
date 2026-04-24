import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { GlassCard } from '../../components/GlassCard';
import { PolarChart, Pie } from 'victory-native';
import { ChevronLeft, ChevronRight, TrendingUp, Sparkles, Search } from 'lucide-react-native';
import { formatCurrency } from '../../utils/formatters';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { EmptyState } from '../../components/EmptyState';
import { cn } from '../../utils/cn';
import { WebCategoryChart } from '../../components/charts/WebCharts';
import { InsightsMonthlyResponse, useApi } from '../../hooks/useApi';

const PALETTE = ['#10B981', '#38BDF8', '#F59E0B', '#EF4444', '#A855F7', '#F97316', '#14B8A6', '#EAB308'];

export default function Insights() {
  const api = useApi();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [insights, setInsights] = useState<InsightsMonthlyResponse | null>(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [error, setError] = useState('');

  const monthString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const loadInsights = useCallback(async () => {
    setIsInsightsLoading(true);
    setError('');
    setInsights(null); // Clear previous insights
    try {
      const response = await api.getMonthlyInsights(monthString);
      setInsights(response.data);
    } catch (err) {
      console.error('Failed to load insights:', err);
      setError('Unable to load insights for this month.');
    } finally {
      setIsInsightsLoading(false);
    }
  }, [api, monthString]);

  useFocusEffect(
    useCallback(() => {
      loadInsights();
    }, [loadInsights])
  );

  const shiftMonth = (delta: number) => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + delta);
      return next;
    });
  };

  const chartData = (insights?.top_categories || []).map((item, index) => ({
    label: item.category,
    value: item.amount,
    color: PALETTE[index % PALETTE.length],
  }));

  const totalSpending = insights?.total_spent || 0;
  const loading = isInsightsLoading;

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Header */}
        <View className="px-6 py-4">
          <Text className="text-white text-2xl font-bold">Insights</Text>
          <Text className="text-slate-400 text-sm">Analyze your spending patterns</Text>
        </View>

        {/* Month Selector */}
        <View className="flex-row items-center justify-between px-6 mb-6">
          <Pressable onPress={() => shiftMonth(-1)} className="p-2 bg-slate-900 rounded-full border border-slate-800">
            <ChevronLeft size={20} color="#94A3B8" />
          </Pressable>
          <Text className="text-white text-lg font-semibold">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <Pressable onPress={() => shiftMonth(1)} className="p-2 bg-slate-900 rounded-full border border-slate-800">
            <ChevronRight size={20} color="#94A3B8" />
          </Pressable>
        </View>

        {error ? (
          <View className="px-6 mb-6">
            <GlassCard className="p-5 border-rose-500/30 bg-rose-500/10" intensity="medium">
               <Text className="text-rose-400">{error}</Text>
            </GlassCard>
          </View>
        ) : null}

        {/* Total Spend Summary Map */}
        <View className="px-6 mb-6">
          <GlassCard className="p-5 border-slate-800/50" intensity="high">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-2">Total Spend</Text>
                {loading ? (
                  <SkeletonLoader width={140} height={28} />
                ) : (
                  <Text className="text-white text-3xl font-bold">{formatCurrency(totalSpending)}</Text>
                )}
              </View>
            </View>
            <View className="flex-row items-center justify-between mt-4">
               {loading ? (
                 <SkeletonLoader width={120} height={24} borderRadius={12} />
               ) : (
                 <View className={cn(
                   'px-3 py-1.5 rounded-full',
                   !insights
                     ? 'bg-slate-800'
                     : (insights.percent_change <= 0 ? 'bg-emerald-500/15' : 'bg-rose-500/15')
                 )}>
                   <Text className={cn(
                     'text-xs font-semibold',
                     !insights
                       ? 'text-slate-300'
                       : (insights.percent_change <= 0 ? 'text-emerald-400' : 'text-rose-400')
                   )}>
                     {!insights 
                       ? 'Loading...' 
                       : `${insights.percent_change <= 0 ? 'Down' : 'Up'} ${Math.abs(insights.percent_change).toFixed(1)}% vs previous`}
                   </Text>
                 </View>
               )}
            </View>
          </GlassCard>
        </View>

        {/* Chart Section */}
        <View className="items-center justify-center mb-8">
          <GlassCard className="w-[90%] p-6 items-center justify-center" intensity="medium">
            <View className="h-64 w-64 items-center justify-center">
              {loading ? (
                <SkeletonLoader width={250} height={250} borderRadius={125} />
              ) : chartData.length > 0 ? (
                Platform.OS === 'web' ? (
                  <View className="w-full">
                    <WebCategoryChart data={chartData} total={totalSpending} />
                  </View>
                ) : (
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
                )
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

        {/* Spikes / Insights */}
        <View className="px-6 mb-8 gap-3">
           {loading ? (
             <GlassCard className="p-5 flex-row border-slate-800/50" intensity="high">
                <SkeletonLoader width={48} height={48} borderRadius={16} className="mr-4" />
                <View className="flex-1">
                   <SkeletonLoader width={100} height={16} className="mb-2" />
                   <SkeletonLoader width={180} height={20} />
                </View>
             </GlassCard>
           ) : insights?.spikes && insights?.spikes.length > 0 ? (
              insights.spikes.map((spike, idx) => (
                <GlassCard key={`spike-${idx}`} className="p-5 flex-row items-center border-slate-800/50" intensity="high">
                  <View className="w-12 h-12 rounded-2xl items-center justify-center mr-4 bg-rose-500/15">
                    <TrendingUp size={22} color="#F43F5E" />
                  </View>
                  <View className="flex-1 mr-4">
                    <Text className="text-rose-400 text-xs font-medium uppercase tracking-widest">Spending Spike</Text>
                    <Text className="text-white text-base font-bold mt-1">{spike.category} grew by {formatCurrency(spike.increase)}</Text>
                    <Text className="text-slate-500 text-xs mt-2">Significantly higher than your previous month.</Text>
                  </View>
                </GlassCard>
              ))
           ) : (!loading && chartData.length > 0) ? (
             <GlassCard className="p-5 flex-row items-center border-slate-800/50" intensity="high">
                <View className="w-12 h-12 rounded-2xl items-center justify-center mr-4 bg-emerald-500/15">
                  <Sparkles size={22} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-emerald-400 text-xs font-medium uppercase tracking-widest">Looking Good</Text>
                  <Text className="text-white text-base font-bold mt-1">No Spending Spikes</Text>
                  <Text className="text-slate-500 text-xs mt-2">Your spending is consistent with last month.</Text>
                </View>
             </GlassCard>
           ) : null}
        </View>

        {/* Category Breakdown */}
        {(!loading && chartData.length > 0) && (
          <View className="px-6 mb-24">
            <Text className="text-white text-lg font-bold mb-4">Breakdown</Text>
            <View className="gap-3">
              {(insights?.top_categories || []).map((cat, index) => (
                <GlassCard key={cat.category} className="flex-row items-center p-4">
                  <View 
                    className="w-3 h-3 rounded-full mr-4" 
                    style={{ backgroundColor: PALETTE[index % PALETTE.length] }} 
                  />
                  <View className="flex-1 mr-4">
                    <Text className="text-white font-medium">{cat.category}</Text>
                  </View>
                  <Text className="text-slate-400 text-sm mr-4">{cat.percentage.toFixed(0)}%</Text>
                  <View className="items-end">
                    <Text className="text-white font-bold">{formatCurrency(cat.amount)}</Text>
                  </View>
                </GlassCard>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
