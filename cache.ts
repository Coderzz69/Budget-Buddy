import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface TokenCache {
    getToken: (key: string) => Promise<string | undefined | null>;
    saveToken: (key: string, token: string) => Promise<void>;
    clearToken?: (key: string) => void;
}

const tokenCache = {
    async getToken(key: string) {
        try {
            if (Platform.OS === 'web') {
                return localStorage.getItem(key);
            }
            const item = await SecureStore.getItemAsync(key);
            if (item) {
                console.log(`${key} was used 🔐 \n`);
            } else {
                console.log('No values stored under key: ' + key);
            }
            return item;
        } catch (error) {
            console.error('SecureStore get item error: ', error);
            if (Platform.OS !== 'web') {
                await SecureStore.deleteItemAsync(key);
            }
            return null;
        }
    },
    async saveToken(key: string, value: string) {
        try {
            if (Platform.OS === 'web') {
                localStorage.setItem(key, value);
                return;
            }
            return SecureStore.setItemAsync(key, value);
        } catch (err) {
            return;
        }
    },
    async clearToken(key: string) {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
            return;
        }
        return SecureStore.deleteItemAsync(key);
    }
};

export default tokenCache;
