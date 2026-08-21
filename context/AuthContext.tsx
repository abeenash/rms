import { setOnUnauthorizedCallback } from "@/services/api";
import { loginApi, LoginPayload, UserResponse } from "@/services/authService";
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

interface StoredUser {
    id: number;
    name: string;
    phone: string;
    roles: string[];
    tenantSlug: string;
}

const toStoredUser = (u: UserResponse): StoredUser => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    roles: u.roles,
    tenantSlug: u.tenantSlug,
});

const fromStoredUser = (s: StoredUser): UserResponse => ({
    id: s.id,
    name: s.name,
    email: "",
    phone: s.phone,
    uesrType: "",
    accountLocked: false,
    roles: s.roles,
    permission: [],
    tenantCode: "",
    tenantSlug: s.tenantSlug,
});

interface AuthContextType {
    token: string | null;
    user: UserResponse | null;
    tenantSlug: string | null;
    isLoading: boolean;
    login: (credentials: LoginPayload) => Promise<UserResponse>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null)
    const [user, setUser] = useState<UserResponse | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)

    const logout = useCallback(async () => {
        try {
            await SecureStore.deleteItemAsync('access_token')
            await SecureStore.deleteItemAsync('user_data')
        } catch (e) {
            console.error("Error during logout cleanup:", e);
        } finally {
            setToken(null)
            setUser(null)
        }
    }, [])

    useEffect(() => {
        setOnUnauthorizedCallback(logout);
    }, [logout])

    useEffect(() => {
        const restoreSession = async () => {
            try {
                const storedToken = await SecureStore.getItemAsync('access_token')
                const storedUser = await SecureStore.getItemAsync('user_data')
                if (storedToken && storedUser) {
                    const parsed = JSON.parse(storedUser);
                    setToken(storedToken);
                    if (parsed.tenantSlug) {
                        setUser(fromStoredUser(parsed));
                    } else {
                        setUser(parsed);
                    }
                }
            } catch (error) {
                console.error("Failed to restore auth session:", error)
                try {
                    await SecureStore.deleteItemAsync('access_token')
                    await SecureStore.deleteItemAsync('user_data')
                } catch (e) {
                    // Ignore cleanup failure
                }
            } finally {
                setIsLoading(false)
            }
        };
        restoreSession()
    }, []);

    const login = async (credentials: LoginPayload) => {
        try {
            await SecureStore.deleteItemAsync('access_token');
            await SecureStore.deleteItemAsync('user_data');
        } catch (e) {
            // Ignore if key didn't exist
        }

        const res = await loginApi(credentials);

        if (res.success && res.data) {
            const { accessToken, userResponse } = res.data;
            const stored = toStoredUser(userResponse);

            await SecureStore.setItemAsync('access_token', accessToken);
            await SecureStore.setItemAsync('user_data', JSON.stringify(stored))

            setToken(accessToken)
            setUser(fromStoredUser(stored))

            return fromStoredUser(stored)
        } else {
            throw new Error(res.message || 'Login Failed')
        }
    }

    return (
        <AuthContext.Provider
            value={{
                token,
                user,
                tenantSlug: user?.tenantSlug || null,
                isLoading,
                login,
                logout
            }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}