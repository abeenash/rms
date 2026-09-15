import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMenuCategories, useMenuItems, useCatalogItems, menuKeys } from '@/hooks/useMenuCatalog';
import * as menuService from '@/services/menuService';

jest.mock('@/services/menuService', () => ({
  fetchMenusApi: jest.fn(),
  fetchMenuItemsApi: jest.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('menuKeys', () => {
  it('should generate correct query keys', () => {
    expect(menuKeys.all).toEqual(['menuCatalog']);
    expect(menuKeys.categories('tenant-1')).toEqual(['menuCatalog', 'categories', 'tenant-1']);
    expect(menuKeys.items('tenant-1')).toEqual(['menuCatalog', 'items', 'tenant-1']);
    expect(menuKeys.search('tenant-1', 'burger')).toEqual(['menuCatalog', 'search', 'tenant-1', 'burger']);
  });
});

describe('useMenuCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch menus when tenantSlug is provided', async () => {
    const mockMenus = [
      { id: 1, menuName: 'Main', active: true },
      { id: 2, menuName: 'Drinks', active: true },
    ];
    (menuService.fetchMenusApi as jest.Mock).mockResolvedValue(mockMenus);

    const { result } = await renderHook(() => useMenuCategories('tenant-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockMenus);
  });

  it('should not fetch when tenantSlug is null', async () => {
    const { result } = await renderHook(() => useMenuCategories(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(menuService.fetchMenusApi).not.toHaveBeenCalled();
  });
});

describe('useMenuItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch menu items when tenantSlug is provided', async () => {
    const mockItems = {
      content: [{ id: 1, name: 'Burger', price: 100, active: true }],
      pageNumber: 0,
      pageSize: 200,
      totalElements: 1,
      totalPages: 1,
    };
    (menuService.fetchMenuItemsApi as jest.Mock).mockResolvedValue(mockItems);

    const { result } = await renderHook(() => useMenuItems('tenant-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockItems);
  });

  it('should not fetch when tenantSlug is null', async () => {
    const { result } = await renderHook(() => useMenuItems(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCatalogItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should flatten and filter active items', async () => {
    const mockItems = {
      content: [
        { id: 1, name: 'Burger', price: 100, active: true, menuName: 'Main', description: 'Tasty', imageUrl: 'img.jpg' },
        { id: 2, name: 'Old Item', price: 50, active: false, menuName: 'Main', description: '', imageUrl: '' },
      ],
      pageNumber: 0,
      pageSize: 200,
      totalElements: 2,
      totalPages: 1,
    };
    (menuService.fetchMenuItemsApi as jest.Mock).mockResolvedValue(mockItems);

    const { result } = await renderHook(() => useCatalogItems('tenant-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.catalogItems).toHaveLength(1);
    expect(result.current.catalogItems[0]).toEqual({
      id: '1',
      name: 'Burger',
      price: 100,
      category: 'Main',
      description: 'Tasty',
      image: 'img.jpg',
    });
  });

  it('should return empty array when no data', async () => {
    const { result } = await renderHook(() => useCatalogItems('tenant-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.catalogItems).toEqual([]);
  });
});
