import 'react-native-reanimated';
import 'react-native-gesture-handler';
import { ClerkProvider } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import { Stack } from 'expo-router'
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { useColorScheme, View, Text } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import '../global.css'

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

export default function RootLayout() {
  const colorScheme = useColorScheme()

  if (!publishableKey) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' }}>
        <Text style={{ color: '#F1F5F9', fontSize: 16, fontWeight: '600' }}>
          Missing Clerk publishable key
        </Text>
        <Text style={{ color: '#94A3B8', marginTop: 8 }}>
          Set `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env` and restart Expo.
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(home)" />
            <Stack.Screen name="transactions/add" options={{ presentation: 'modal' }} />
            <Stack.Screen name="accounts/index" />
            <Stack.Screen name="accounts/add" options={{ presentation: 'modal' }} />
            <Stack.Screen name="categories/index" />
            <Stack.Screen name="categories/add" options={{ presentation: 'modal' }} />
            <Stack.Screen name="budgets/add" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  )
}
