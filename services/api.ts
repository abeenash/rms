import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://api.zylobrains.com/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers:{
        'Content-Type':'application/json',
    },
})

api.interceptors.request.use(async (config) => {
    // Skip sending Authorization header for auth endpoints (login, register, etc.)
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
        if (error.response?.status === 401) {
            // Clear invalid stored token so future requests are clean
            try {
                await SecureStore.deleteItemAsync('access_token');
                await SecureStore.deleteItemAsync('user_data');
            } catch (e) {
                console.error("Failed to clear expired credentials:", e);
            }
        }
        return Promise.reject(error);
    }
);

export default api;