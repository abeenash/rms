import { loginApi, LoginPayload, UserResponse } from "@/services/authService";
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
    token: string | null;
    user: UserResponse | null;
    tenantSlug: string | null;
    isLoading: boolean;
    login: (credentials: LoginPayload) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null)
    const [user, setUser] = useState<UserResponse | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)

    useEffect(() => {
        const restoreSession = async () => {
            try {
                const storedToken = await SecureStore.getItemAsync('access_token')
                const storedUser = await SecureStore.getItemAsync('user_data')
                if (storedToken && storedUser) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser))
                }
            } catch (error) {
                console.error("Failed to restore auth session:", error)
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

            await SecureStore.setItemAsync('access_token', accessToken);
            await SecureStore.setItemAsync('user_data', JSON.stringify(userResponse))

            setToken(accessToken)
            setUser(userResponse)
        } else {
            throw new Error(res.message || 'Login Failed')
        }
    }

    const logout = async() =>{
        await SecureStore.deleteItemAsync('access_token')
        await SecureStore.deleteItemAsync('user_data')
        setToken(null)
        setUser(null)
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

export const useAuth = () =>{
    const context = useContext(AuthContext)
    if(!context){
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}