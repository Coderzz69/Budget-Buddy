import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClient {
    private baseURL: string;

    constructor() {
        this.baseURL = API_URL;
    }

    async getToken() {
        return await SecureStore.getItemAsync('clerk_token');
    }

    async setToken(token: string) {
        await SecureStore.setItemAsync('clerk_token', token);
    }

    async clearToken() {
        await SecureStore.deleteItemAsync('clerk_token');
    }

    async request(endpoint: string, options: RequestInit = {}) {
        const token = await this.getToken();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    }

    async post(endpoint: string, body: any) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }
}

export const api = new ApiClient();

// Sync user to database after authentication
export const syncUser = async (token: string, userData: { email?: string; firstName?: string; lastName?: string } = {}) => {
    await api.setToken(token);
    return api.post('/auth/sync', userData);
};
