// components/themed-text.tsx
import { Text, TextProps } from 'react-native';

export function ThemedText(props: TextProps) {
  return <Text {...props} style={[{ color: 'black' }, props.style]} />;
}