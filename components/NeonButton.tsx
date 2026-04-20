import React from 'react';
import { Pressable, Text, PressableProps, ActivityIndicator, View } from 'react-native';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as Haptics from 'expo-haptics';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NeonButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'error';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  className?: string;
  textClassName?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function NeonButton({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  textClassName,
  leftIcon,
  rightIcon,
  onPress,
  disabled,
  ...props
}: NeonButtonProps) {
  const handlePress = (e: any) => {
    if (!isLoading && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress?.(e);
    }
  };

  const variants = {
    primary: 'bg-primary shadow-[0_0_15px_rgba(16,185,129,0.4)]',
    secondary: 'bg-secondary shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    outline: 'border border-primary bg-transparent',
    ghost: 'bg-transparent',
    error: 'bg-error shadow-[0_0_15px_rgba(239,68,68,0.3)]',
  };

  const sizes = {
    sm: 'px-4 py-2',
    md: 'px-6 py-3',
    lg: 'px-8 py-4',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || isLoading}
      className={cn(
        'rounded-2xl items-center justify-center flex-row transition-all duration-200',
        variants[variant],
        sizes[size],
        (disabled || isLoading) && 'opacity-50',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? '#000000' : '#FFFFFF'} />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {leftIcon}
          <Text
            className={cn(
              'font-bold text-center',
              variant === 'primary' ? 'text-slate-950 text-lg' : 'text-white text-base',
              textClassName
            )}
          >
            {title}
          </Text>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}
