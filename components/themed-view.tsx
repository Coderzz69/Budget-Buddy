// components/themed-view.tsx
import { View, ViewProps } from 'react-native';

export function ThemedView(props: ViewProps) {
  return <View {...props} style={[{ flex: 1 }, props.style]} />;
}