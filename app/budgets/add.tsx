import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { X, Calendar, Layers } from 'lucide-react-native';
import { NeonInput } from '../../components/NeonInput';
import { NeonButton } from '../../components/NeonButton';
import { useApi } from '../../hooks/useApi';
import { useStore } from '../../store/useStore';
import { EmptyState } from '../../components/EmptyState';
import * as Haptics from 'expo-haptics';

export default function AddBudget() {
  const api = useApi();
  const { budgets, categories, setBudgets } = useStore();

  const [selectedCategory, setSelectedCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  const canSave = limit && !Number.isNaN(parseFloat(limit)) && selectedCategory;

  const handleSave = async () => {
    const parsedLimit = parseFloat(limit);
    if (!canSave || Number.isNaN(parsedLimit)) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.createBudget({
        categoryId: selectedCategory,
        month: monthDate.toISOString(),
        limit: parsedLimit,
      });
      setBudgets([...budgets, response.data]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError('Failed to create budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6">
          <View className="flex-row items-center justify-between py-6">
            <Text className="text-white text-xl font-bold">Add Budget</Text>
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-slate-900 items-center justify-center"
            >
              <X size={20} color="#94A3B8" />
            </Pressable>
          </View>

          <View className="gap-6 mb-8">
            <View>
              <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 ml-1">Category</Text>
              {categories.length === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="No categories"
                  description="Add a category first to set a budget."
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
                        className={[
                          'px-4 py-3 rounded-2xl border items-center justify-center flex-row min-w-[100px]',
                          selectedCategory === cat.id ? 'bg-primary/20 border-primary' : 'bg-slate-900 border-slate-900'
                        ].join(' ')}
                      >
                        <Text className="text-lg mr-2">{cat.icon || '🏷️'}</Text>
                        <Text className={selectedCategory === cat.id ? 'text-white font-medium text-sm' : 'text-slate-400 font-medium text-sm'}>
                          {cat.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>

            <NeonInput
              label="Monthly Limit"
              placeholder="0"
              keyboardType="decimal-pad"
              value={limit}
              onChangeText={setLimit}
              error={error || undefined}
            />

            <View>
              <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 ml-1">Month</Text>
              <View className="flex-row items-center bg-slate-900/50 border border-slate-800 rounded-2xl px-4 h-14">
                <Calendar size={16} color="#64748B" />
                <Text className="text-white font-medium ml-3">{monthLabel}</Text>
              </View>
            </View>
          </View>

          <NeonButton
            title="Create Budget"
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
