import { Redirect, usePathname } from 'expo-router';
import { View, Text, StyleSheet, Platform, Linking } from 'react-native';
import { useEffect } from 'react';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '@/lib/supabase';

export default function NotFoundScreen() {
    const pathname = usePathname();

    useEffect(() => {
        // 1. Check if this 'not found' route is actually just a Supabase OAuth Redirect
        const checkDeepLink = async () => {
            try {
                const initialUrl = await Linking.getInitialURL();
                if (!initialUrl) return;

                // Extract the hash manually since Expo Router strips it
                if (initialUrl.includes('access_token')) {
                    console.log('NotFound caught OAuth token in URL! Processing...');

                    const { params, errorCode } = QueryParams.getQueryParams(initialUrl);

                    if (errorCode) throw new Error(errorCode);

                    const { access_token, refresh_token } = params;
                    if (!access_token || !refresh_token) return;

                    const { error } = await supabase.auth.setSession({
                        access_token,
                        refresh_token,
                    });

                    if (error) throw error;
                }
            } catch (err) {
                console.error('Error recovering session from NotFound route:', err);
            }
        };

        checkDeepLink();
    }, [pathname]);

    return null; // The layout listener will handle the actual redirection once the session is set
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#0f0c29', // Fallback background
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white'
    },
    link: {
        marginTop: 15,
        paddingVertical: 15,
    },
    linkText: {
        fontSize: 14,
        color: '#3498db',
    },
});
