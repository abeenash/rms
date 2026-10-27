import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import * as SecureStore from 'expo-secure-store';
import { loginApi } from '@/services/authService';

jest.mock('@/services/authService', () => ({
  loginApi: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
  setOnUnauthorizedCallback: jest.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
  });

  it('should start with isLoading true and null token/user', async () => {
    let resolveSession: (value: any) => void;
    const pendingSession = new Promise((resolve) => { resolveSession = resolve; });
    (SecureStore.getItemAsync as jest.Mock).mockReturnValue(pendingSession);

    const { result } = await renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();

    resolveSession!(null);
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should restore session from SecureStore', async () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      phone: '1234567890',
      roles: ['WAITER'],
      tenantSlug: 'tenant-1',
    };

    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce('saved-token')
      .mockResolvedValueOnce(JSON.stringify(mockUser));

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.token).toBe('saved-token');
    expect(result.current.user).toEqual(expect.objectContaining({
      id: 1,
      name: 'Test User',
      tenantSlug: 'tenant-1',
    }));
    expect(result.current.tenantSlug).toBe('tenant-1');
  });

  it('should login successfully', async () => {
    const mockLoginResponse = {
      success: true,
      message: 'Login successful',
      data: {
        accessToken: 'new-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        userResponse: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          userType: 'WAITER',
          accountLocked: false,
          roles: ['WAITER'],
          permission: [],
          tenantCode: 'T1',
          tenantSlug: 'tenant-1',
        },
      },
    };

    (loginApi as jest.Mock).mockResolvedValue(mockLoginResponse);

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.login({ email: 'test@example.com', password: 'pass' });
    });

    expect(result.current.token).toBe('new-token');
    expect(result.current.user?.name).toBe('Test User');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'new-token');
  });

  it('should throw error on failed login', async () => {
    (loginApi as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Invalid credentials',
    });

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.login({ email: 'x', password: 'y' });
      })
    ).rejects.toThrow('Invalid credentials');
  });

  it('should logout successfully', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_data');
  });

  it('should provide tenantSlug from user', async () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      phone: '1234567890',
      roles: ['WAITER'],
      tenantSlug: 'my-restaurant',
    };

    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce('token')
      .mockResolvedValueOnce(JSON.stringify(mockUser));

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tenantSlug).toBe('my-restaurant');
  });

  it('should return null tenantSlug when no user', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tenantSlug).toBeNull();
  });
});
