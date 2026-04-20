import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';

interface GlassViewProps extends ViewProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
}

export function GlassView({ intensity = 50, tint = 'default', style, children, ...props }: GlassViewProps) {
  const getBackgroundColor = () => {
    const opacity = intensity / 100;
    if (tint === 'dark') return `rgba(15, 23, 42, ${opacity})`;
    if (tint === 'light') return `rgba(255, 255, 255, ${opacity})`;
    return `rgba(255, 255, 255, ${opacity * 0.2})`; // default subtle glass
  };

  return (
    <View 
      style={[
        { backgroundColor: getBackgroundColor() },
        style
      ]} 
      {...props}
    >
      {children}
    </View>
  );
}
