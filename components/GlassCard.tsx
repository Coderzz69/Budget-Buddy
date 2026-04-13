import React from 'react';
import { View, ViewProps } from 'react-native';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps extends ViewProps {
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export function GlassCard({ className, intensity = 'medium', children, ...props }: GlassCardProps) {
  const intensityStyles = {
    low: 'bg-white/5 border-white/10',
    medium: 'bg-white/10 border-white/20',
    high: 'bg-white/20 border-white/30',
  };

  return (
    <View
      className={cn(
        'rounded-2xl border backdrop-blur-md overflow-hidden',
        intensityStyles[intensity],
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}
