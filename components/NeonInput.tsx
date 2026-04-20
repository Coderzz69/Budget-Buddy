import React from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NeonInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function NeonInput({
  label,
  error,
  containerClassName,
  className,
  leftIcon,
  rightIcon,
  ...props
}: NeonInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View className={cn('gap-1.5 w-full', containerClassName)}>
      {label && (
        <Text className="text-slate-400 text-sm font-medium ml-1">
          {label}
        </Text>
      )}
      <View
        className={cn(
          'flex-row items-center rounded-2xl border bg-slate-900/50 px-4 h-14 transition-all duration-200',
          isFocused ? 'border-primary shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'border-slate-800',
          error && 'border-error',
          className
        )}
      >
        {leftIcon && <View className="mr-3">{leftIcon}</View>}
        <TextInput
          className="flex-1 text-white text-base py-3"
          placeholderTextColor="#64748B"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          {...props}
        />
        {rightIcon && <View className="ml-3">{rightIcon}</View>}
      </View>
      {error && (
        <Text className="text-error text-xs mt-0.5 ml-1 font-medium">
          {error}
        </Text>
      )}
    </View>
  );
}
