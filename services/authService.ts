import api from "./api";

export interface LoginPayload {
    email: string;
    password: string;
}

export interface UserResponse {
    id: number;
    name: string;
    email: string;
    phone: string;
    uesrType: string;
    accountLocked: boolean;
    roles: string[];
    permission: string[];
    tenantCode: string;
    tenantSlug: string;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        accessToken: string;
        tokenType: string;
        expiresIn: number;
        userResponse: UserResponse;
    }
}

export const loginApi = async (credentials: LoginPayload): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials)
    return response.data
}