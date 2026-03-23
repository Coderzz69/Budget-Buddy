import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { syncUser } from '@/utils/api';

function InitialLayout() {
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const colorScheme = useColorScheme();

  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const handleSession = async (session: Session | null) => {
      setSession(session);
      setIsReady(true);
      if (session) {
        // Sync user to backend — fire-and-forget, never block navigation
        syncUser(session.access_token, {
          email: session.user.email,
          firstName: session.user.user_metadata?.first_name || session.user.user_metadata?.full_name?.split(' ')[0],
          lastName: session.user.user_metadata?.last_name || session.user.user_metadata?.full_name?.split(' ').slice(1).join(' '),
        }).catch((e) => {
          console.warn("[Auth] Backend sync failed (non-fatal):", e?.message);
        });
        setIsRedirecting(false);
      } else {
        setIsRedirecting(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    // Helper to safely mark redirecting state with a timeout to prevent deadlocks
    const handlePotentialDeepLink = (url: string | null) => {
      if (url && (url.includes('access_token') || url.includes('code='))) {
        setIsRedirecting(true);
        // Failsafe: if session isn't established within 5 seconds, unlock navigation
        setTimeout(() => setIsRedirecting(false), 5000);
      }
    };

    // Check if the app was opened with a deep link containing an auth token
    Linking.getInitialURL().then(handlePotentialDeepLink);

    // Catch-all link listener to detect incoming OAuth redirects while app is in memory
    const sub = Linking.addEventListener('url', (event) => {
      handlePotentialDeepLink(event.url);
    });

    return () => {
      subscription.unsubscribe();
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!isReady || isRedirecting) return; // Wait if we are actively processing a deep link
    if (!rootNavigationState?.key) return;

    const inTabsGroup = segments[0] === '(tabs)';

    // If authenticated and trying to access login/signup screen, route to dashboard
    if (session && !inTabsGroup) {
      router.replace('/(tabs)/dashboard');
    } else if (!session && inTabsGroup) {
      // If NOT signed in but trying to access a protected route
      router.replace('/login');
    }
  }, [session, isReady, isRedirecting, segments, rootNavigationState?.key]);

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
          // Handle incoming deep links globally so the router doesn't crash on OAuth return
          screenLayout={({ children }) => <>{children}</>}
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
    <InitialLayout />
  );
}
