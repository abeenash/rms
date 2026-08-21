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

// --- Forgot Password / Reset Password ---

export interface ForgotPasswordResponse {
    success: boolean;
    message: string;
    errors?: string;
}

export interface ResetPasswordPayload {
    email: string;
    otp: string;
    newPassword: string;
}

export interface ResetPasswordResponse {
    success: boolean;
    message: string;
    errors?: string;
}

export const forgotPassword = async (email: string): Promise<ForgotPasswordResponse> => {
    const response = await api.post<ForgotPasswordResponse>('/auth/forgot-password', { email });
    return response.data;
};

export const resetPassword = async (payload: ResetPasswordPayload): Promise<ResetPasswordResponse> => {
    const response = await api.post<ResetPasswordResponse>('/auth/reset-password', payload);
    return response.data;
};
