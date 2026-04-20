import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useStore } from '../../store/useStore';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import { Plus, Layers } from 'lucide-react-native';

export default function Categories() {
  const { categories } = useStore();

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-6 py-4 flex-row items-center justify-between">
          <View>
            <Text className="text-white text-2xl font-bold">Categories</Text>
            <Text className="text-slate-400 text-sm">Organize your spending</Text>
          </View>
          <Pressable
            onPress={() => router.push('/categories/add')}
            className="bg-primary/10 p-2 rounded-xl border border-primary/20"
          >
            <Plus size={24} color="#10B981" />
          </Pressable>
        </View>

        <View className="px-6 py-4 mb-24">
          {categories.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No categories yet"
              description="Add categories to classify your expenses."
              actionLabel="Add Category"
              onAction={() => router.push('/categories/add')}
            />
          ) : (
            <View className="gap-3">
              {categories.map((cat) => (
                <GlassCard key={cat.id} className="p-4 flex-row items-center">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-4"
                    style={{ backgroundColor: cat.color || '#10B981' }}
                  >
                    <Text className="text-lg">{cat.icon || '🏷️'}</Text>
                  </View>
                  <Text className="text-white font-medium flex-1">{cat.name}</Text>
                </GlassCard>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
