import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import React from 'react';
import { OpaqueColorValue, StyleProp, ViewStyle } from 'react-native';

const MAPPING: Record<string, { icon: string, lib: 'material' | 'fa' }> = {
  'dollarsign.circle.fill': { icon: 'circle-dollar-to-slot', lib: 'fa' },
  'cart.fill': { icon: 'cart-shopping', lib: 'fa' },
  'car.fill': { icon: 'car', lib: 'fa' },
  'gamecontroller.fill': { icon: 'gamepad', lib: 'fa' },
  'bolt.fill': { icon: 'bolt', lib: 'fa' },
  'heart.fill': { icon: 'heart', lib: 'fa' },
  'book.fill': { icon: 'book', lib: 'fa' },
  'chart.pie.fill': { icon: 'chart-pie', lib: 'fa' },
  'creditcard': { icon: 'credit-card', lib: 'fa' },
  'pencil': { icon: 'pen', lib: 'fa' },
  'trash': { icon: 'trash', lib: 'fa' },
  'magnifyingglass': { icon: 'magnifying-glass', lib: 'fa' },
  'person.circle': { icon: 'circle-user', lib: 'fa' },
  'plus': { icon: 'plus', lib: 'fa' },
  'arrow.down': { icon: 'arrow-down', lib: 'fa' },
  'arrow.up': { icon: 'arrow-up', lib: 'fa' },
  'list.bullet.rectangle.fill': { icon: 'list-check', lib: 'fa' },
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
}) {
  const mapped = MAPPING[name];
  
  if (mapped?.lib === 'fa') {
    return <FontAwesome6 color={color} name={mapped.icon as any} size={size} style={style as any} />;
  }
  
  // Default to MaterialIcons if not found or mapped to material
  return <MaterialIcons color={color} name={(mapped?.icon || 'help-outline') as any} size={size} style={style as any} />;
}
