import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { NeonInput } from '../../components/NeonInput';
import { NeonButton } from '../../components/NeonButton';
import { useApi } from '../../hooks/useApi';
import { useStore } from '../../store/useStore';
import * as Haptics from 'expo-haptics';

const ICONS = ['🍔', '🏠', '🛒', '🚗', '🎉', '💊', '📚', '✈️', '💡', '💼', '🎁', '☕'];
const COLORS = ['#10B981', '#38BDF8', '#F59E0B', '#EF4444', '#A855F7', '#F97316', '#14B8A6', '#EAB308'];

export default function AddCategory() {
  const api = useApi();
  const { categories, setCategories } = useStore();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.createCategory({
        name: name.trim(),
        icon,
        color,
      });
      setCategories([...categories, response.data]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError('Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6">
          <View className="flex-row items-center justify-between py-6">
            <Text className="text-white text-xl font-bold">Add Category</Text>
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-slate-900 items-center justify-center"
            >
              <X size={20} color="#94A3B8" />
            </Pressable>
          </View>

          <View className="gap-6 mb-8">
            <NeonInput
              label="Category Name"
              placeholder="e.g. Groceries"
              value={name}
              onChangeText={setName}
              error={error || undefined}
            />

            <View>
              <Text className="text-slate-400 text-sm font-medium ml-1 mb-3">Icon</Text>
              <View className="flex-row flex-wrap gap-3">
                {ICONS.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => { setIcon(item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    className={[
                      'w-12 h-12 rounded-2xl items-center justify-center border',
                      icon === item ? 'bg-primary/20 border-primary' : 'bg-slate-900 border-slate-800'
                    ].join(' ')}
                  >
                    <Text className="text-lg">{item}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-slate-400 text-sm font-medium ml-1 mb-3">Color</Text>
              <View className="flex-row flex-wrap gap-3">
                {COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => { setColor(c); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    className={[
                      'w-10 h-10 rounded-full border-2',
                      color === c ? 'border-white' : 'border-slate-900'
                    ].join(' ')}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </View>
            </View>
          </View>

          <NeonButton
            title="Create Category"
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
