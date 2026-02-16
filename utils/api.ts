import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
    throw new Error('Missing API URL. Please set EXPO_PUBLIC_API_URL in your .env or EAS secrets.');
}

class ApiClient {
    private baseURL: string;

    constructor() {
        this.baseURL = API_URL as string;
    }

    async getToken() {
        if (Platform.OS === 'web') {
            return localStorage.getItem('clerk_token');
        }
        return await SecureStore.getItemAsync('clerk_token');
    }

    async setToken(token: string) {
        if (Platform.OS === 'web') {
            localStorage.setItem('clerk_token', token);
            return;
        }
        await SecureStore.setItemAsync('clerk_token', token);
    }

    async clearToken() {
        if (Platform.OS === 'web') {
            localStorage.removeItem('clerk_token');
            return;
        }
        await SecureStore.deleteItemAsync('clerk_token');
    }

    async request(endpoint: string, options: RequestInit = {}) {
        const token = await this.getToken();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (!headers['Authorization'] && token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const url = `${this.baseURL}${endpoint}`;
        console.log(`[API] Requesting: ${url}`);
        console.log(`[API] Headers:`, JSON.stringify(headers, null, 2));

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            console.log(`[API] Response Status: ${response.status}`);
            const text = await response.text();
            console.log(`[API] Response Text: ${text.substring(0, 200)}...`);

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                // Not JSON
            }

            if (!response.ok) {
                throw new Error(data?.error || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (err) {
            console.error(`[API] Network/Fetch Error:`, err);
            throw err;
        }
    }

    async get(endpoint: string, options: RequestInit = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'GET',
        });
    }

    async post(endpoint: string, body: any, options: RequestInit = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async put(endpoint: string, body: any, options: RequestInit = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async delete(endpoint: string, options: RequestInit = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'DELETE',
        });
    }
}

export const api = new ApiClient();

// Sync user to database after authentication
export const syncUser = async (token: string, userData: { email?: string; firstName?: string; lastName?: string; username?: string; currency?: string } = {}) => {
    await api.setToken(token);
    return api.post('/auth/sync', userData);
};
