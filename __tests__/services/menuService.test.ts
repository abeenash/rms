import { fetchMenusApi, fetchMenuItemsApi } from '@/services/menuService';
import api from '@/services/api';

jest.mock('@/services/api', () => {
  return {
    __esModule: true,
    default: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    },
  };
});

const mockApi = api as jest.Mocked<typeof api>;

describe('menuService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchMenusApi', () => {
    it('should return menus array', async () => {
      const mockMenus = [
        { id: 1, menuName: 'Main Menu', active: true },
        { id: 2, menuName: 'Drinks', active: true },
      ];
      mockApi.get.mockResolvedValue({
        data: { data: { content: mockMenus } },
      } as any);

      const result = await fetchMenusApi('tenant-1');

      expect(mockApi.get).toHaveBeenCalledWith('/public/tenant-1/menu/list');
      expect(result).toEqual(mockMenus);
    });

    it('should propagate error when API call fails', async () => {
      mockApi.get.mockRejectedValue(new Error('Network error'));

      await expect(fetchMenusApi('tenant-1')).rejects.toThrow('Network error');
    });

    it('should return empty array when data is null', async () => {
      mockApi.get.mockResolvedValue({ data: { data: null } } as any);

      const result = await fetchMenusApi('tenant-1');
      expect(result).toEqual([]);
    });
  });

  describe('fetchMenuItemsApi', () => {
    it('should return paginated items', async () => {
      const mockItems = {
        content: [
          { id: 1, name: 'Burger', price: 100, active: true },
          { id: 2, name: 'Pizza', price: 200, active: true },
        ],
        pageNumber: 0,
        pageSize: 10,
        totalElements: 2,
        totalPages: 1,
      };
      mockApi.get.mockResolvedValue({
        data: { data: mockItems },
      } as any);

      const result = await fetchMenuItemsApi('tenant-1', 0, 10);

      expect(mockApi.get).toHaveBeenCalledWith('/public/tenant-1/items/list', {
        params: { page: 0, size: 10 },
      });
      expect(result).toEqual(mockItems);
    });

    it('should include search param when provided', async () => {
      mockApi.get.mockResolvedValue({ data: { data: { content: [] } } } as any);

      await fetchMenuItemsApi('tenant-1', 0, 10, 'burger');

      expect(mockApi.get).toHaveBeenCalledWith('/public/tenant-1/items/list', {
        params: { page: 0, size: 10, search: 'burger' },
      });
    });

    it('should not include search param when empty', async () => {
      mockApi.get.mockResolvedValue({ data: { data: { content: [] } } } as any);

      await fetchMenuItemsApi('tenant-1', 0, 10, '');

      expect(mockApi.get).toHaveBeenCalledWith('/public/tenant-1/items/list', {
        params: { page: 0, size: 10 },
      });
    });

    it('should trim search parameter', async () => {
      mockApi.get.mockResolvedValue({ data: { data: { content: [] } } } as any);

      await fetchMenuItemsApi('tenant-1', 0, 10, '  burger  ');

      expect(mockApi.get).toHaveBeenCalledWith('/public/tenant-1/items/list', {
        params: { page: 0, size: 10, search: 'burger' },
      });
    });

    it('should return default pagination when data is null', async () => {
      mockApi.get.mockResolvedValue({ data: { data: null } } as any);

      const result = await fetchMenuItemsApi('tenant-1');

      expect(result).toEqual({
        content: [],
        pageNumber: 0,
        pageSize: 10,
        totalElements: 0,
        totalPages: 0,
        firstPage: true,
        lastPage: true,
      });
    });

    it('should propagate error when API call fails', async () => {
      mockApi.get.mockRejectedValue(new Error('Network error'));

      await expect(fetchMenuItemsApi('tenant-1')).rejects.toThrow('Network error');
    });
  });
});
