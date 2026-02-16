// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.down': 'keyboard-arrow-down',
  'list.bullet.rectangle.fill': 'list',
  'plus': 'add',
  'plus.circle.fill': 'add-circle',
  'chart.pie.fill': 'pie-chart',
  'chart.bar.fill': 'bar-chart',
  'person.crop.circle.fill': 'account-circle',
  'magnifyingglass': 'search',
  'arrow.up.circle.fill': 'arrow-circle-up',
  'arrow.down.circle.fill': 'arrow-circle-down',
  'cart.fill': 'shopping-cart',
  'car.fill': 'directions-car',
  'gamecontroller.fill': 'gamepad',
  'bolt.fill': 'flash-on',
  'gear': 'settings',
  'creditcard': 'credit-card',
  'bell': 'notifications',
  'lock': 'lock',
  'questionmark.circle': 'help-outline',
  'person.circle': 'person',
  'arrow.down': 'arrow-downward',
  'arrow.up': 'arrow-upward',
  'heart.fill': 'favorite',
  'book.fill': 'menu-book',
  'dollarsign.circle.fill': 'attach-money',
  'pencil': 'edit',
  'trash': 'delete',
  'bag.fill': 'local-mall',
  'fork.knife': 'restaurant',
  'circle.grid.2x2.fill': 'dashboard',
  'wineglass.fill': 'local-bar',
  'tag': 'local-offer',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
