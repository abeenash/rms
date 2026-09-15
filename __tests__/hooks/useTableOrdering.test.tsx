import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTableOrdering } from '@/hooks/useTableOrdering';
import * as orderService from '@/services/orderService';
import * as menuService from '@/services/menuService';

jest.mock('@/services/orderService');
jest.mock('@/services/menuService');

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    tenantSlug: 'tenant-1',
    user: { id: 1, name: 'Staff', phone: '1234567890' },
  }),
}));

jest.mock('@/context/AlertContext', () => ({
  useCustomAlert: () => ({
    showAlert: jest.fn(),
    hideAlert: jest.fn(),
  }),
}));

jest.mock('@/hooks/useMenuCatalog', () => ({
  useCatalogItems: () => ({
    catalogItems: [
      { id: '1', name: 'Burger', price: 100, category: 'Main', description: '', image: '' },
      { id: '2', name: 'Pizza', price: 200, category: 'Main', description: '', image: '' },
    ],
    isLoading: false,
  }),
  useMenuCategories: () => ({
    data: [
      { id: 1, menuName: 'Main', active: true },
      { id: 2, menuName: 'Drinks', active: true },
    ],
  }),
  useMenuSearch: () => ({
    searchItems: [],
    isLoading: false,
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

describe('useTableOrdering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({
      tableId: '5',
      tableNumber: '5',
      capacity: '4',
      isDirectOrder: 'false',
      status: 'available',
    });
  });

  it('should initialize with correct defaults', async () => {
    (orderService.fetchActiveOrderByTableIdApi as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
    });

    const { result } = await renderHook(() => useTableOrdering(), {
      wrapper: createWrapper(),
    });

    expect(result.current.displayTableNumber).toBe('5');
    expect(result.current.isDirect).toBe(false);
    expect(result.current.isOccupied).toBe(false);
    expect(result.current.cart).toEqual({});
    expect(result.current.cartItemsArray).toEqual([]);
    expect(result.current.totalCartCount).toBe(0);
    expect(result.current.grandTotal).toBe(0);
  });

  it('should add item to cart', async () => {
    (orderService.fetchActiveOrderByTableIdApi as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
    });

    const { result } = await renderHook(() => useTableOrdering(), {
      wrapper: createWrapper(),
    });

    const burgerItem = { id: '1', name: 'Burger', price: 100, category: 'Main', description: '', image: '' };

    await act(() => {
      result.current.addToCart(burgerItem);
    });

    expect(result.current.cartItemsArray).toHaveLength(1);
    expect(result.current.cartItemsArray[0].quantity).toBe(1);
    expect(result.current.totalCartCount).toBe(1);
    expect(result.current.newItemsSubtotal).toBe(100);
  });

  it('should increment quantity when adding same item', async () => {
    (orderService.fetchActiveOrderByTableIdApi as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
    });

    const { result } = await renderHook(() => useTableOrdering(), {
      wrapper: createWrapper(),
    });

    const burgerItem = { id: '1', name: 'Burger', price: 100, category: 'Main', description: '', image: '' };

    await act(() => {
      result.current.addToCart(burgerItem);
      result.current.addToCart(burgerItem);
    });

    expect(result.current.cartItemsArray[0].quantity).toBe(2);
    expect(result.current.totalCartCount).toBe(2);
    expect(result.current.newItemsSubtotal).toBe(200);
  });

  it('should remove item from cart (decrement)', async () => {
    (orderService.fetchActiveOrderByTableIdApi as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
    });

    const { result } = await renderHook(() => useTableOrdering(), {
      wrapper: createWrapper(),
    });

    const burgerItem = { id: '1', name: 'Burger', price: 100, category: 'Main', description: '', image: '' };

    await act(() => {
      result.current.addToCart(burgerItem);
      result.current.addToCart(burgerItem);
      result.current.removeFromCart('1');
    });

    expect(result.current.cartItemsArray[0].quantity).toBe(1);
  });

  it('should delete item when quantity is 1 and remove is called', async () => {
    (orderService.fetchActiveOrderByTableIdApi as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
    });

    const { result } = await renderHook(() => useTableOrdering(), {
      wrapper: createWrapper(),
    });

    const burgerItem = { id: '1', name: 'Burger', price: 100, category: 'Main', description: '', image: '' };

    await act(() => {
      result.current.addToCart(burgerItem);
      result.current.removeFromCart('1');
    });

    expect(result.current.cartItemsArray).toHaveLength(0);
    expect(result.current.totalCartCount).toBe(0);
  });

  it('should compute categories correctly', async () => {
    (orderService.fetchActiveOrderByTableIdApi as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
    });

    const { result } = await renderHook(() => useTableOrdering(), {
      wrapper: createWrapper(),
    });

    expect(result.current.categories).toContain('All');
    expect(result.current.categories).toContain('Main');
    expect(result.current.categories).toContain('Drinks');
  });

  it('should identify direct orders', async () => {
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({
      tableId: 'direct',
      isDirectOrder: 'true',
    });

    (orderService.fetchActiveOrderByTableIdApi as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
    });

    const { result } = await renderHook(() => useTableOrdering(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isDirect).toBe(true);
  });

  it('should identify occupied tables', async () => {
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({
      tableId: '5',
      isDirectOrder: 'false',
      status: 'OCCUPIED',
    });

    (orderService.fetchActiveOrderByTableIdApi as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
    });

    const { result } = await renderHook(() => useTableOrdering(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isOccupied).toBe(true);
  });
});
