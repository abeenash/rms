import { loginApi, forgotPassword, resetPassword } from '@/services/authService';
import api from '@/services/api';

jest.mock('@/services/api', () => {
  return {
    __esModule: true,
    default: {
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    },
  };
});

const mockApi = api as jest.Mocked<typeof api>;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loginApi', () => {
    it('should call api.post with correct endpoint and payload', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const mockResponse = {
        data: {
          success: true,
          message: 'Login successful',
          data: {
            accessToken: 'token-123',
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
              permission: ['order:create'],
              tenantCode: 'TENANT1',
              tenantSlug: 'tenant-1',
            },
          },
        },
      };

      mockApi.post.mockResolvedValue(mockResponse as any);

      const result = await loginApi(credentials);

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Invalid credentials'));

      await expect(loginApi({ email: 'x', password: 'y' })).rejects.toThrow('Invalid credentials');
    });
  });

  describe('forgotPassword', () => {
    it('should call api.post with correct endpoint', async () => {
      const mockResponse = {
        data: { success: true, message: 'OTP sent' },
      };
      mockApi.post.mockResolvedValue(mockResponse as any);

      const result = await forgotPassword('test@example.com');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'test@example.com' });
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockApi.post.mockRejectedValue(new Error('User not found'));

      await expect(forgotPassword('unknown@example.com')).rejects.toThrow('User not found');
    });
  });

  describe('resetPassword', () => {
    it('should call api.post with correct payload', async () => {
      const payload = { email: 'test@example.com', otp: '123456', newPassword: 'newpass123' };
      const mockResponse = {
        data: { success: true, message: 'Password reset successful' },
      };
      mockApi.post.mockResolvedValue(mockResponse as any);

      const result = await resetPassword(payload);

      expect(mockApi.post).toHaveBeenCalledWith('/auth/reset-password', payload);
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Invalid OTP'));

      await expect(
        resetPassword({ email: 'x', otp: '000', newPassword: 'y' })
      ).rejects.toThrow('Invalid OTP');
    });
  });
});
