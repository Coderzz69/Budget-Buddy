import tokenCache from '@/cache';
import { ClerkLoaded, ClerkProvider } from '@clerk/clerk-expo';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { syncUser } from '@/utils/api';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env',
  )
}

function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (!isLoaded) return;
    if (!rootNavigationState?.key) return;

    const inTabsGroup = segments[0] === '(tabs)';

    // If we're authenticated and not in the (tabs) group, we should be redirected there
    // This handles the case where a user logs in (or signs up) and needs to be moved to the dashboard
    if (isSignedIn && !inTabsGroup) {
      router.replace('/dashboard');
    }
    // REMOVED: strict redirect to login if !isSignedIn. 
    // This allows the Mock Auth bypass to work for users encountering 2FA blocks.
    // if (!isSignedIn && inTabsGroup) {
    //   router.replace('/login');
    // }
  }, [isSignedIn, isLoaded, segments, rootNavigationState?.key]);

  const { user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (isSignedIn && user) {
      const sync = async () => {
        try {
          const token = await getToken();
          if (token) {
            await syncUser(token, {
              email: user.primaryEmailAddress?.emailAddress,
              firstName: user.firstName || undefined,
              lastName: user.lastName || undefined,
              username: user.username || undefined,
            });
            console.log('User synced on app launch/auth change');
          }
        } catch (error) {
          console.error('Failed to sync user on launch:', error);
        }
      };
      sync();
    }
  }, [isSignedIn, user]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={styles.container}>
        <LinearGradient
          colors={colorScheme === 'dark'
            ? ['#0f0c29', '#302b63', '#24243e'] // Deep Space: Midnight -> Royal Purple -> Dark Slate
            : ['#E0F2FE', '#F0F9FF', '#FFF7ED'] // Sky Blue -> Cloud White -> Warm Glow
          }
          locations={[0, 0.4, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.background}
        />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </View>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>
        <InitialLayout />
      </ClerkLoaded>
    </ClerkProvider>
  );
}
