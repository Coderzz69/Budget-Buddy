import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { GlassCard } from '../../components/GlassCard';
import { NeonButton } from '../../components/NeonButton';
import { Colors } from '../../constants/theme';
import { useColorScheme } from 'react-native';
import { Plus, Target, AlertCircle, CheckCircle2, Layers } from 'lucide-react-native';
import { formatCurrency } from '../../utils/formatters';
import { router } from 'expo-router';
import { EmptyState } from '../../components/EmptyState';

export default function Budget() {
  const colorScheme = useColorScheme() ?? 'dark';
  const { budgets, categories, isLoading } = useStore();

  const totalLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const overallProgress = totalLimit > 0 ? (totalSpent / totalLimit) : 0;

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Category';

  const getProgressColor = (progress: number) => {
    if (progress >= 1) return '#EF4444'; // Red
    if (progress >= 0.8) return '#F59E0B'; // Amber
    return '#10B981'; // Neon Green
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between">
          <View>
            <Text className="text-white text-2xl font-bold">Budgets</Text>
            <Text className="text-slate-400 text-sm">Monthly spending limits</Text>
          </View>
          <Pressable
            onPress={() => router.push('/budgets/add')}
            className="bg-primary/10 p-2 rounded-xl border border-primary/20"
          >
             <Plus size={24} color="#10B981" />
          </Pressable>
        </View>

        {/* Global Progress Hero */}
        <View className="px-6 py-4">
          <GlassCard className="p-6 overflow-hidden" intensity="high">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-slate-400 text-sm font-medium">Total Monthly Limit</Text>
                <Text className="text-white text-2xl font-bold">{formatCurrency(totalLimit)}</Text>
              </View>
              <View className="items-end">
                <Text className="text-slate-400 text-sm font-medium">Spent so far</Text>
                <Text className="text-white text-lg font-semibold">{formatCurrency(totalSpent)}</Text>
              </View>
            </View>
            
            {/* Main Progress Bar */}
            <View className="h-3 w-full bg-slate-900 rounded-full overflow-hidden mb-4">
              <View 
                className="h-full rounded-full" 
                style={{ 
                  width: `${Math.min(overallProgress * 100, 100)}%`,
                  backgroundColor: getProgressColor(overallProgress)
                }} 
              />
            </View>
            
            <View className="flex-row items-center">
              {overallProgress >= 1 ? (
                <AlertCircle size={16} color="#EF4444" />
              ) : (
                <CheckCircle2 size={16} color="#10B981" />
              )}
              <Text className={cn(
                'text-xs font-medium ml-2',
                overallProgress >= 1 ? 'text-red-400' : 'text-emerald-400'
              )}>
                {overallProgress >= 1 
                  ? 'You have exceeded your overall budget' 
                  : `${formatCurrency(totalLimit - totalSpent)} remaining for this month`}
              </Text>
            </View>
          </GlassCard>
        </View>

        {/* Individual Budgets List */}
        <View className="px-6 py-4 mb-24">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-lg font-bold">Category Limits</Text>
            <NeonButton title="Adjust" variant="ghost" size="sm" textClassName="text-primary" />
          </View>
          
          <View className="gap-4">
            {budgets.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="No budgets yet"
                description="Set monthly limits for your categories to track spending."
                actionLabel="Create Budget"
                onAction={() => router.push('/budgets/add')}
              />
            ) : (
              budgets.map((budget) => {
                const spent = budget.spent || 0;
                const progress = spent / budget.limit;
                return (
                  <GlassCard key={budget.id} className="p-5">
                    <View className="flex-row justify-between items-center mb-3">
                      <View className="flex-row items-center">
                        <View className="w-10 h-10 rounded-xl bg-slate-900 items-center justify-center mr-3">
                          <Target size={20} color={getProgressColor(progress)} />
                        </View>
                        <View>
                          <Text className="text-white font-bold">{getCategoryName(budget.categoryId)}</Text>
                          <Text className="text-slate-400 text-xs">{formatCurrency(budget.limit)} limit</Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-white font-bold">{formatCurrency(spent)}</Text>
                        <Text className="text-slate-400 text-xs">spent</Text>
                      </View>
                    </View>
                    
                    {/* Category Progress Bar */}
                    <View className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                      <View 
                        className="h-full rounded-full" 
                        style={{ 
                          width: `${Math.min(progress * 100, 100)}%`,
                          backgroundColor: getProgressColor(progress)
                        }} 
                      />
                    </View>
                  </GlassCard>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
