
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export async function getItem(key: string): Promise<string | null> {
    if (isWeb) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.error('Local storage get error:', e);
            return null;
        }
    } else {
        return await SecureStore.getItemAsync(key);
    }
}

export async function setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.error('Local storage set error:', e);
        }
    } else {
        await SecureStore.setItemAsync(key, value);
    }
}

export async function removeItem(key: string): Promise<void> {
    if (isWeb) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Local storage remove error:', e);
        }
    } else {
        await SecureStore.deleteItemAsync(key);
    }
}
