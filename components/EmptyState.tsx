import React from 'react';
import { View, Text } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { NeonButton } from './NeonButton';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <View className="flex-1 items-center justify-center p-8 mt-10">
      <View className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 items-center justify-center mb-6">
        <Icon size={32} color="#94A3B8" />
      </View>
      <Text className="text-white text-xl font-bold mb-2 text-center">{title}</Text>
      <Text className="text-slate-400 text-center mb-8">{description}</Text>
      
      {actionLabel && onAction && (
        <NeonButton 
          title={actionLabel} 
          onPress={onAction} 
          className="w-full max-w-[250px]"
        />
      )}
    </View>
  );
};
