import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ojrhotaxanegfonsqieu.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'sb_publishable_VuMc1KqFXMMp_2GVGF-PSA_Z-adBNdn';

const ExpoStorage = {
    getItem: (key: string) => {
        if (Platform.OS === 'web') {
            if (typeof window === 'undefined') {
                return null;
            }
            return window.localStorage.getItem(key);
        }
        return AsyncStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
        if (Platform.OS === 'web') {
            if (typeof window === 'undefined') {
                return;
            }
            window.localStorage.setItem(key, value);
            return;
        }
        return AsyncStorage.setItem(key, value);
    },
    removeItem: (key: string) => {
        if (Platform.OS === 'web') {
            if (typeof window === 'undefined') {
                return;
            }
            window.localStorage.removeItem(key);
            return;
        }
        return AsyncStorage.removeItem(key);
    },
};

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    console.log('\x1b[36m[Supabase Fetch Request]\x1b[0m', input, init?.method);
    try {
        const response = await fetch(input, init);
        console.log(`\x1b[32m[Supabase Fetch Response]\x1b[0m ${response.status} ${response.url}`);
        if (!response.ok) {
            const cloned = response.clone();
            const text = await cloned.text();
            console.error('\x1b[31m[Supabase Fetch Error Body]\x1b[0m', text);
        }
        return response;
    } catch (error) {
        console.error('\x1b[31m[Supabase Fetch Exception]\x1b[0m', error);
        throw error;
    }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        debug: __DEV__,
    },
    global: {
        fetch: customFetch,
    },
});
