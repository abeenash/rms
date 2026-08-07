import axios from 'axios';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
    console.warn("⚠️ EXPO_PUBLIC_API_BASE_URL is not defined in .env file!")
}

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
})

let onUnauthorizedCallback: (() => Promise<void> | void) | null = null;

export const setOnUnauthorizedCallback = (callback: () => Promise<void> | void) => {
    onUnauthorizedCallback = callback;
}

let isHandlingUnauthorized = false;

api.interceptors.request.use(async (config) => {
    const isAuthEndpoint = config.url?.includes('/auth/');
    if (!isAuthEndpoint) {
        const token = await SecureStore.getItemAsync('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const isAuthEndpoint = error.config?.url?.includes('/auth/');
        if (error.response?.status === 401 && !isAuthEndpoint && !isHandlingUnauthorized) {
            isHandlingUnauthorized = true;
            try {
                if (onUnauthorizedCallback) {
                    await onUnauthorizedCallback();
                } else {
                    await SecureStore.deleteItemAsync('access_token');
                    await SecureStore.deleteItemAsync('user_data');
                }

                router.replace('/')
            } catch (e) {
                console.error("Failed to handle 401 session cleanup:", e);
            } finally {
                isHandlingUnauthorized = false;
            }
            return new Promise(() => { })
        }
        return Promise.reject(error);
    }
);

export default api;