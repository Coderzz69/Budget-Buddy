import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from './supabase';
import { Platform } from 'react-native';

// Ensures the browser can be dismissed on Android
if (Platform.OS !== 'web') {
    WebBrowser.maybeCompleteAuthSession();
}

/**
 * A robust Auth SDK to handle Google OAuth flows safely on all platforms,
 * especially bypassing the Expo Go Android WebBrowser intent routing bugs.
 */
export class AuthSDK {
    /**
     * Extracts Supabase session tokens from a redirect URL
     * Handles both PKCE (?code=) and implicit (#access_token=) flows.
     */
    public static async createSessionFromUrl(url: string) {
        console.log('[AuthSDK] Parsing URL for tokens:', url.substring(0, 100));

        // 1. PKCE flow: look for ?code= in query params (Android-safe)
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        if (code) {
            console.log('[AuthSDK] Found PKCE code, exchanging for session...');
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
            console.log('[AuthSDK] PKCE session established for:', data.session?.user.id);
            return data.session;
        }

        // 2. Implicit flow fallback: tokens in URL fragment (#)
        let access_token: string | null = null;
        let refresh_token: string | null = null;

        const fragment = url.split('#')[1];
        if (fragment) {
            const fragmentParams = new URLSearchParams(fragment);
            access_token = fragmentParams.get('access_token');
            refresh_token = fragmentParams.get('refresh_token');
        }

        // 3. Further fallback: tokens as query params
        if (!access_token) {
            const urlParams = new URLSearchParams(urlObj.search);
            access_token = urlParams.get('access_token');
            refresh_token = urlParams.get('refresh_token');
        }

        if (!access_token || !refresh_token) {
            console.log('[AuthSDK] No tokens or code found in URL — skipping');
            return null;
        }

        console.log('[AuthSDK] Setting session from tokens...');
        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) throw error;
        console.log('[AuthSDK] Session set for:', data.session?.user.id);

        return data.session;
    }

    /**
     * Executes the Google Sign-In Flow
     */
    public static async signInWithGoogle() {
        console.log('--- START GOOGLE OAUTH ---');
        try {
            if (Platform.OS === 'web') {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin,
                        skipBrowserRedirect: false,
                    },
                });
                if (error) throw error;
                return;
            }

            // --- NATIVE (iOS/Android) FLOW ---
            console.log('[AuthSDK] Executing Native OAuth flow...');

            // Generate the default redirect URI that expo-auth-session knows how to handle natively
            // Add a path so the URL looks like exp://10.5.1.19:8081/--/auth instead of just an IP
            const redirectUrl = makeRedirectUri({
                scheme: 'budgetbuddy',
                path: 'auth/callback',
            });

            console.log('[AuthSDK] Generated native redirectUrl:', redirectUrl);

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                    queryParams: {
                        prompt: 'select_account'
                    }
                },
            });

            if (error) throw error;
            console.log('[AuthSDK] Supabase returned Auth URL:', data?.url);

            if (!data?.url) {
                throw new Error("No authorization URL returned from Supabase.");
            }

            console.log('[AuthSDK] Opening WebBrowser with redirect:', redirectUrl);

            // Let WebBrowser handle the lifecycle cleanly. It automatically listens for
            // the redirectUrl intent and resolves the promise when it catches it.
            const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

            console.log('[AuthSDK] WebBrowser promise returned:', res.type);

            if (res.type === 'success' && res.url) {
                const session = await this.createSessionFromUrl(res.url);
                return session;
            } else if (res.type === 'cancel' || res.type === 'dismiss') {
                console.log('[AuthSDK] Browser dismissed or cancelled by user.');
                return null;
            } else {
                console.warn('[AuthSDK] Unknown WebBrowser result:', res);
                return null;
            }

        } catch (err: any) {
            console.error('[Error] Google Login error:', err.message);
            throw err;
        } finally {
            console.log('--- END GOOGLE OAUTH ---');
        }
    }
}
