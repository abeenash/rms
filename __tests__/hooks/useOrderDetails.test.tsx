import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrderDetails } from '@/hooks/useOrderDetails';
import * as orderService from '@/services/orderService';
import * as menuService from '@/services/menuService';
import * as promoService from '@/services/promoService';
import { useLocalSearchParams } from 'expo-router';

jest.mock('@/services/orderService');
jest.mock('@/services/menuService');
jest.mock('@/services/promoService');
jest.mock('@/utils/billTemplates', () => ({
  generatePOSHtml: jest.fn(() => '<html>POS</html>'),
  generateInvoiceHtml: jest.fn(() => '<html>Invoice</html>'),
  generateKOTHtml: jest.fn(() => '<html>KOT</html>'),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    tenantSlug: 'tenant-1',
    token: 'test-token',
    user: { id: 1, name: 'Staff' },
  }),
}));

jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, theme: 'light', toggleTheme: jest.fn() }),
}));

jest.mock('@/context/AlertContext', () => ({
  useCustomAlert: () => ({
    showAlert: (globalThis as any).__mockShowAlert || ((globalThis as any).__mockShowAlert = jest.fn()),
    hideAlert: jest.fn(),
  }),
}));

jest.mock('@/utils/networkError', () => ({
  isNetworkError: jest.fn(() => true),
  NETWORK_OFFLINE_MESSAGE: 'Network error message',
}));

jest.mock('@/hooks/usePrintHandler', () => ({
  usePrintHandler: () => ({
    printDocument: jest.fn(),
    shareDocument: jest.fn(),
    showToast: jest.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useOrderDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ orderId: '1' });
  });

  it('should initialize with loading state', async () => {
    (orderService.fetchOrderByIdApi as jest.Mock).mockImplementation(() => new Promise(() => {}));
    (menuService.fetchMenuItemsApi as jest.Mock).mockImplementation(() => new Promise(() => {}));
    (promoService.fetchPromoCodesApi as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { result } = await renderHook(() => useOrderDetails(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should load order data', async () => {
    const mockOrder = {
      id: 1,
      orderNumber: 'ORD-001',
      status: 'CONFIRMED',
      paymentStatus: 'PENDING',
      items: [
        { id: 1, itemName: 'Burger', quantity: 2, price: 100, totalPrice: 200 },
      ],
      orderedAt: '2026-08-15T14:30:00Z',
    };

    (orderService.fetchOrderByIdApi as jest.Mock).mockResolvedValue(mockOrder);
    (menuService.fetchMenuItemsApi as jest.Mock).mockResolvedValue({
      content: [], pageNumber: 0, pageSize: 100, totalElements: 0, totalPages: 0,
    });
    (promoService.fetchPromoCodesApi as jest.Mock).mockResolvedValue([]);

    const { result } = await renderHook(() => useOrderDetails(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.orderData).toEqual(mockOrder);
    expect(result.current.orderStatus).toBe('CONFIRMED');
    expect(result.current.paymentStatus).toBe('PENDING');
  });

  it('should compute itemsTotalSum correctly', async () => {
    const mockOrder = {
      id: 1,
      orderNumber: 'ORD-001',
      status: 'PENDING',
      items: [
        { id: 1, itemName: 'Burger', quantity: 2, price: 100, totalPrice: 200 },
        { id: 2, itemName: 'Pizza', quantity: 1, price: 300, totalPrice: 300 },
      ],
    };

    (orderService.fetchOrderByIdApi as jest.Mock).mockResolvedValue(mockOrder);
    (menuService.fetchMenuItemsApi as jest.Mock).mockResolvedValue({
      content: [], pageNumber: 0, pageSize: 100, totalElements: 0, totalPages: 0,
    });
    (promoService.fetchPromoCodesApi as jest.Mock).mockResolvedValue([]);

    const { result } = await renderHook(() => useOrderDetails(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.itemsTotalSum).toBe(500);
  });

  it('should compute isCancelled correctly', async () => {
    const mockOrder = {
      id: 1,
      status: 'CANCELLED',
      paymentStatus: 'PENDING',
      items: [],
    };

    (orderService.fetchOrderByIdApi as jest.Mock).mockResolvedValue(mockOrder);
    (menuService.fetchMenuItemsApi as jest.Mock).mockResolvedValue({
      content: [], pageNumber: 0, pageSize: 100, totalElements: 0, totalPages: 0,
    });
    (promoService.fetchPromoCodesApi as jest.Mock).mockResolvedValue([]);

    const { result } = await renderHook(() => useOrderDetails(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isCancelled).toBe(true);
    expect(result.current.isOrderFinalized).toBe(true);
  });

  it('should compute isPaid correctly', async () => {
    const mockOrder = {
      id: 1,
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      items: [],
    };

    (orderService.fetchOrderByIdApi as jest.Mock).mockResolvedValue(mockOrder);
    (menuService.fetchMenuItemsApi as jest.Mock).mockResolvedValue({
      content: [], pageNumber: 0, pageSize: 100, totalElements: 0, totalPages: 0,
    });
    (promoService.fetchPromoCodesApi as jest.Mock).mockResolvedValue([]);

    const { result } = await renderHook(() => useOrderDetails(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isPaid).toBe(true);
    expect(result.current.isOrderFinalized).toBe(true);
  });

  it('should return empty array for orderItems when order has no items', async () => {
    const mockOrder = { id: 1, status: 'PENDING', items: [] };

    (orderService.fetchOrderByIdApi as jest.Mock).mockResolvedValue(mockOrder);
    (menuService.fetchMenuItemsApi as jest.Mock).mockResolvedValue({
      content: [], pageNumber: 0, pageSize: 100, totalElements: 0, totalPages: 0,
    });
    (promoService.fetchPromoCodesApi as jest.Mock).mockResolvedValue([]);

    const { result } = await renderHook(() => useOrderDetails(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.orderItems).toEqual([]);
  });

  it('should handle network error gracefully', async () => {
    (orderService.fetchOrderByIdApi as jest.Mock).mockRejectedValue({ request: {} });
    (menuService.fetchMenuItemsApi as jest.Mock).mockResolvedValue({
      content: [], pageNumber: 0, pageSize: 100, totalElements: 0, totalPages: 0,
    });
    (promoService.fetchPromoCodesApi as jest.Mock).mockResolvedValue([]);

    const { result } = await renderHook(() => useOrderDetails(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.networkError).toBe(true);
  });
});
