import {
  fetchOrdersApi,
  fetchOrderByIdApi,
  createOrderApi,
  cancelOrderApi,
  applyPromoApi,
  removePromoApi,
  generateIdempotencyKey,
  ORDER_STATUSES,
} from '@/services/orderService';
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

describe('orderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ORDER_STATUSES', () => {
    it('should contain all expected statuses', () => {
      expect(ORDER_STATUSES).toContain('PENDING');
      expect(ORDER_STATUSES).toContain('CONFIRMED');
      expect(ORDER_STATUSES).toContain('PREPARING');
      expect(ORDER_STATUSES).toContain('OUT_FOR_DELIVERY');
      expect(ORDER_STATUSES).toContain('DELIVERED');
      expect(ORDER_STATUSES).toContain('COMPLETED');
      expect(ORDER_STATUSES).toContain('CANCELLED');
    });
  });

  describe('generateIdempotencyKey', () => {
    it('should return a string', () => {
      const key = generateIdempotencyKey();
      expect(typeof key).toBe('string');
    });

    it('should return unique keys', () => {
      const keys = new Set(Array.from({ length: 100 }, () => generateIdempotencyKey()));
      expect(keys.size).toBe(100);
    });
  });

  describe('fetchOrdersApi', () => {
    it('should return orders array', async () => {
      const mockOrders = [
        { id: 1, orderNumber: 'ORD-1', items: [] },
        { id: 2, orderNumber: 'ORD-2', items: [] },
      ];
      mockApi.get.mockResolvedValue({
        data: { data: { content: mockOrders } },
      } as any);

      const result = await fetchOrdersApi('tenant-1');

      expect(mockApi.get).toHaveBeenCalledWith('public/tenant-1/order');
      expect(result).toEqual(mockOrders);
    });

    it('should propagate error when API call fails', async () => {
      mockApi.get.mockRejectedValue(new Error('Network error'));

      await expect(fetchOrdersApi('tenant-1')).rejects.toThrow('Network error');
    });
  });

  describe('fetchOrderByIdApi', () => {
    it('should return order data', async () => {
      const mockOrder = { id: 1, orderNumber: 'ORD-1', items: [] };
      mockApi.get.mockResolvedValue({
        data: { data: mockOrder },
      } as any);

      const result = await fetchOrderByIdApi('tenant-1', '1');

      expect(mockApi.get).toHaveBeenCalledWith('public/tenant-1/order/1');
      expect(result).toEqual(mockOrder);
    });

    it('should return null when no data', async () => {
      mockApi.get.mockResolvedValue({ data: { data: null } } as any);

      const result = await fetchOrderByIdApi('tenant-1', '999');
      expect(result).toBeNull();
    });
  });

  describe('createOrderApi', () => {
    it('should send order with default values', async () => {
      const mockOrder = { id: 1, orderNumber: 'ORD-1' };
      mockApi.post.mockResolvedValue({ data: { data: mockOrder } } as any);

      const result = await createOrderApi('tenant-1', {
        items: [{ itemId: 1, quantity: 2 }],
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        'public/tenant-1/order',
        expect.objectContaining({
          customerName: 'Walk-in Customer',
          customerPhone: '0000000000',
          customerAddress: 'Counter',
          paymentMethod: 'CASH',
          items: [{ itemId: 1, quantity: 2 }],
        })
      );
      expect(result).toEqual(mockOrder);
    });

    it('should use provided customer details', async () => {
      const mockOrder = { id: 1, orderNumber: 'ORD-1' };
      mockApi.post.mockResolvedValue({ data: { data: mockOrder } } as any);

      await createOrderApi('tenant-1', {
        customerName: 'Jane Doe',
        customerPhone: '5551234',
        customerAddress: 'Home',
        paymentMethod: 'DIGITAL_WALLET',
        items: [{ itemId: 1, quantity: 1 }],
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        'public/tenant-1/order',
        expect.objectContaining({
          customerName: 'Jane Doe',
          customerPhone: '5551234',
          customerAddress: 'Home',
          paymentMethod: 'DIGITAL_WALLET',
        })
      );
    });
  });

  describe('cancelOrderApi', () => {
    it('should send PATCH request', async () => {
      const mockOrder = { id: 1, status: 'CANCELLED' };
      mockApi.patch.mockResolvedValue({ data: { data: mockOrder } } as any);

      const result = await cancelOrderApi('tenant-1', '1');

      expect(mockApi.patch).toHaveBeenCalledWith('/public/tenant-1/order/1/cancel');
      expect(result).toEqual(mockOrder);
    });
  });

  describe('applyPromoApi', () => {
    it('should send PUT with promo code as param', async () => {
      const mockOrder = { id: 1, promoCode: 'SAVE10', promoDiscount: 50 };
      mockApi.put.mockResolvedValue({ data: { data: mockOrder } } as any);

      const result = await applyPromoApi('tenant-1', '1', 'SAVE10');

      expect(mockApi.put).toHaveBeenCalledWith(
        '/public/tenant-1/order/1/apply-promo',
        null,
        { params: { code: 'SAVE10' } }
      );
      expect(result).toEqual(mockOrder);
    });
  });

  describe('removePromoApi', () => {
    it('should send DELETE request', async () => {
      const mockOrder = { id: 1, promoCode: null };
      mockApi.delete.mockResolvedValue({ data: { data: mockOrder } } as any);

      const result = await removePromoApi('tenant-1', '1');

      expect(mockApi.delete).toHaveBeenCalledWith('/public/tenant-1/order/1/promo');
      expect(result).toEqual(mockOrder);
    });
  });
});
