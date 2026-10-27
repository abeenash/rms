import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTableOrdering } from '@/hooks/useTableOrdering';
import * as orderService from '@/services/orderService';
import * as tableService from '@/services/tableService';

jest.mock('@/services/orderService', () => ({
  ...jest.requireActual('@/services/orderService'),
  fetchActiveOrderByTableIdApi: jest.fn(),
  createTableOrderApi: jest.fn(),
  createOrderApi: jest.fn(),
  addItemsToOrderApi: jest.fn(),
  updateOrderItemQtyApi: jest.fn(),
  deleteOrderItemApi: jest.fn(),
}));
jest.mock('@/services/tableService');
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

const mockShowAlert = jest.fn();
jest.mock('@/context/AlertContext', () => ({
  useCustomAlert: () => ({
    showAlert: mockShowAlert,
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

const burgerItem = { id: '1', name: 'Burger', price: 100, category: 'Main', description: '', image: '' };
const pizzaItem = { id: '2', name: 'Pizza', price: 200, category: 'Main', description: '', image: '' };

const makeOrder = (overrides: Partial<orderService.ActiveTableOrderData> = {}): orderService.ActiveTableOrderData => ({
  id: 77,
  orderNumber: 'ORD-248CF7A3',
  status: 'CONFIRMED',
  totalAmount: 440,
  paymentStatus: 'PENDING',
  tableNumber: 1,
  items: [
    { id: 901, itemName: 'Fish Fry', quantity: 1, price: 120, totalPrice: 120 },
    { id: 902, itemName: 'Fish Curry', quantity: 2, price: 120, totalPrice: 240 },
  ],
  ...overrides,
});

const mockTable = (status: string) =>
  (tableService.fetchDiningTableByIdApi as jest.Mock).mockResolvedValue({ id: 5, tableNumber: 5, capacity: 4, status });

const mockTableOrder = (order: orderService.ActiveTableOrderData | null) =>
  (orderService.fetchActiveOrderByTableIdApi as jest.Mock).mockResolvedValue({ success: !!order, data: order });

const httpError = (status: number, message = 'Invalid operation') =>
  Object.assign(new Error(message), { response: { status, data: { message } } });

const renderTableHook = async () => {
  const hook = await renderHook(() => useTableOrdering(), { wrapper: createWrapper() });
  await waitFor(() => expect(hook.result.current.isLoadingExistingOrder).toBe(false));
  return hook;
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
    mockTable('AVAILABLE');
    mockTableOrder(null);
  });

  it('should initialize with correct defaults', async () => {
    const { result } = await renderTableHook();

    expect(result.current.displayTableNumber).toBe('5');
    expect(result.current.isDirect).toBe(false);
    expect(result.current.isOccupied).toBe(false);
    expect(result.current.tableBlock).toBeNull();
    expect(result.current.cart).toEqual({});
    expect(result.current.cartItemsArray).toEqual([]);
    expect(result.current.totalCartCount).toBe(0);
    expect(result.current.grandTotal).toBe(0);
  });

  it('should add item to cart', async () => {
    const { result } = await renderTableHook();

    await act(() => {
      result.current.addToCart(burgerItem);
    });

    expect(result.current.cartItemsArray).toHaveLength(1);
    expect(result.current.cartItemsArray[0].quantity).toBe(1);
    expect(result.current.totalCartCount).toBe(1);
    expect(result.current.newItemsSubtotal).toBe(100);
  });

  it('should increment quantity when adding same item', async () => {
    const { result } = await renderTableHook();

    await act(() => {
      result.current.addToCart(burgerItem);
      result.current.addToCart(burgerItem);
    });

    expect(result.current.cartItemsArray[0].quantity).toBe(2);
    expect(result.current.totalCartCount).toBe(2);
    expect(result.current.newItemsSubtotal).toBe(200);
  });

  it('should remove item from cart (decrement)', async () => {
    const { result } = await renderTableHook();

    await act(() => {
      result.current.addToCart(burgerItem);
      result.current.addToCart(burgerItem);
      result.current.removeFromCart('1');
    });

    expect(result.current.cartItemsArray[0].quantity).toBe(1);
  });

  it('should delete item when quantity is 1 and remove is called', async () => {
    const { result } = await renderTableHook();

    await act(() => {
      result.current.addToCart(burgerItem);
      result.current.removeFromCart('1');
    });

    expect(result.current.cartItemsArray).toHaveLength(0);
    expect(result.current.totalCartCount).toBe(0);
  });

  it('should compute categories correctly', async () => {
    const { result } = await renderTableHook();

    expect(result.current.categories).toContain('All');
    expect(result.current.categories).toContain('Main');
    expect(result.current.categories).toContain('Drinks');
  });

  it('should identify direct orders without looking up a table', async () => {
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({
      tableId: 'direct',
      isDirectOrder: 'true',
    });

    const { result } = await renderTableHook();

    expect(result.current.isDirect).toBe(true);
    expect(result.current.isOccupied).toBe(false);
    expect(orderService.fetchActiveOrderByTableIdApi).not.toHaveBeenCalled();
  });

  it('should identify occupied tables', async () => {
    mockTable('OCCUPIED');
    mockTableOrder(makeOrder());

    const { result } = await renderTableHook();

    expect(result.current.isOccupied).toBe(true);
  });

  describe('open order resolution', () => {
    it.each(['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'])(
      'treats a %s order as the table\'s running order',
      async (status) => {
        mockTable('OCCUPIED');
        mockTableOrder(makeOrder({ status }));

        const { result } = await renderTableHook();

        expect(result.current.isOccupied).toBe(true);
        expect(result.current.tableBlock).toBeNull();
        expect(result.current.activeOrderStatus).toBe(status);
        expect(result.current.displayOrderNumber).toBe('ORD-248CF7A3');
        expect(result.current.existingOrderItems).toHaveLength(2);
        expect(result.current.existingOrderSubtotal).toBe(360);
      }
    );

    it('adds items to the running OUT_FOR_DELIVERY order instead of creating a new one', async () => {
      mockTable('OCCUPIED');
      mockTableOrder(makeOrder({ status: 'OUT_FOR_DELIVERY' }));
      (orderService.addItemsToOrderApi as jest.Mock).mockResolvedValue({ success: true });

      const { result } = await renderTableHook();

      await act(() => {
        result.current.addToCart(burgerItem);
      });
      await act(async () => {
        await result.current.handleConfirmOrder();
      });

      expect(orderService.createTableOrderApi).not.toHaveBeenCalled();
      expect(orderService.addItemsToOrderApi).toHaveBeenCalledWith(
        'tenant-1',
        77,
        expect.objectContaining({ items: [{ itemId: 1, quantity: 1 }] })
      );
    });

    it('uses the live table status over the stale dashboard param', async () => {
      const { useLocalSearchParams } = require('expo-router');
      useLocalSearchParams.mockReturnValue({ tableId: '5', isDirectOrder: 'false', status: 'Occupied' });
      mockTable('AVAILABLE');
      mockTableOrder(null);

      const { result } = await renderTableHook();

      expect(result.current.isOccupied).toBe(false);
      expect(result.current.tableBlock).toBeNull();
    });

    it('lets a RESERVED table without an order take a new table order', async () => {
      mockTable('RESERVED');
      mockTableOrder(null);
      (orderService.createTableOrderApi as jest.Mock).mockResolvedValue({ data: { orderNumber: 'ORD-NEW' } });

      const { result } = await renderTableHook();

      await act(() => {
        result.current.addToCart(burgerItem);
      });
      await act(async () => {
        await result.current.handleConfirmOrder();
      });

      expect(result.current.tableBlock).toBeNull();
      expect(orderService.createTableOrderApi).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({ tableId: 5, items: [{ itemId: 1, quantity: 1 }] })
      );
    });
  });

  describe('blocked tables', () => {
    it('looks the table up once and alerts once, even across re-renders', async () => {
      mockTable('OCCUPIED');
      mockTableOrder(makeOrder({ status: 'DELIVERED', paymentStatus: 'PENDING' }));

      const { rerender } = await renderTableHook();
      await rerender({});
      await rerender({});

      expect(orderService.fetchActiveOrderByTableIdApi).toHaveBeenCalledTimes(1);
      expect(mockShowAlert).toHaveBeenCalledTimes(1);
    });

    it('blocks an occupied table whose last order is delivered but unpaid', async () => {
      mockTable('OCCUPIED');
      mockTableOrder(makeOrder({ status: 'DELIVERED', paymentStatus: 'PENDING' }));

      const { result } = await renderTableHook();

      expect(result.current.tableBlock).toEqual(expect.objectContaining({
        reason: 'no-open-order',
        lastOrderId: 77,
      }));
      expect(result.current.tableBlock?.message).toContain('Settle that order');
      expect(result.current.existingOrderItems).toHaveLength(0);
      expect(mockShowAlert).toHaveBeenCalledWith('Table Occupied', expect.any(String), expect.any(Array));

      await act(() => {
        result.current.addToCart(burgerItem);
      });
      await act(async () => {
        await result.current.handleConfirmOrder();
      });

      expect(orderService.createTableOrderApi).not.toHaveBeenCalled();
      expect(orderService.addItemsToOrderApi).not.toHaveBeenCalled();
    });

    it('tells the waiter to free the table when the last order is already closed', async () => {
      mockTable('OCCUPIED');
      mockTableOrder(makeOrder({ status: 'DELIVERED', paymentStatus: 'PAID' }));

      const { result } = await renderTableHook();

      expect(result.current.tableBlock?.message).toContain('Ask an admin to free the table');
    });

    it('blocks submission when the order lookup fails for an occupied table', async () => {
      mockTable('OCCUPIED');
      (orderService.fetchActiveOrderByTableIdApi as jest.Mock).mockRejectedValue(httpError(500, 'boom'));

      const { result } = await renderTableHook();

      expect(result.current.tableBlock?.reason).toBe('lookup-failed');

      await act(() => {
        result.current.addToCart(burgerItem);
      });
      await act(async () => {
        await result.current.handleConfirmOrder();
      });

      expect(orderService.createTableOrderApi).not.toHaveBeenCalled();
    });

    it('retries a failed lookup on submit and only places the order once the table is known to be free', async () => {
      (orderService.fetchActiveOrderByTableIdApi as jest.Mock).mockRejectedValue(new Error('Network Error'));
      (orderService.createTableOrderApi as jest.Mock).mockResolvedValue({ data: { orderNumber: 'ORD-NEW' } });

      const { result } = await renderTableHook();
      expect(result.current.tableBlock?.reason).toBe('lookup-failed');

      await act(() => {
        result.current.addToCart(burgerItem);
      });

      mockTableOrder(null);
      await act(async () => {
        await result.current.handleConfirmOrder();
      });

      expect(result.current.tableBlock).toBeNull();
      expect(orderService.createTableOrderApi).toHaveBeenCalledTimes(1);
    });

    it('does not place a new order when the retried lookup finds a running order', async () => {
      (orderService.fetchActiveOrderByTableIdApi as jest.Mock).mockRejectedValue(new Error('Network Error'));

      const { result } = await renderTableHook();

      await act(() => {
        result.current.addToCart(burgerItem);
      });

      mockTable('OCCUPIED');
      mockTableOrder(makeOrder({ status: 'PREPARING' }));
      await act(async () => {
        await result.current.handleConfirmOrder();
      });

      expect(orderService.createTableOrderApi).not.toHaveBeenCalled();
      expect(result.current.displayOrderNumber).toBe('ORD-248CF7A3');
      expect(mockShowAlert).toHaveBeenCalledWith('Running Order Found', expect.any(String));
    });

    it('treats a 4xx lookup on an available table as "no order"', async () => {
      mockTable('AVAILABLE');
      (orderService.fetchActiveOrderByTableIdApi as jest.Mock).mockRejectedValue(httpError(404, 'Order not found'));

      const { result } = await renderTableHook();

      expect(result.current.tableBlock).toBeNull();
    });
  });

  describe('409 recovery', () => {
    it('attaches to the order found after a 409 and keeps the cart', async () => {
      (orderService.createTableOrderApi as jest.Mock).mockRejectedValue(httpError(409));
      (orderService.addItemsToOrderApi as jest.Mock).mockResolvedValue({ success: true });

      const { result } = await renderTableHook();

      await act(() => {
        result.current.addToCart(burgerItem);
      });

      mockTable('OCCUPIED');
      mockTableOrder(makeOrder({ status: 'PREPARING' }));

      await act(async () => {
        await result.current.handleConfirmOrder();
      });

      expect(result.current.cartItemsArray).toHaveLength(1);
      expect(result.current.displayOrderNumber).toBe('ORD-248CF7A3');
      expect(mockShowAlert).toHaveBeenCalledWith('Table Already Has an Order', expect.stringContaining('ORD-248CF7A3'));

      await act(async () => {
        await result.current.handleConfirmOrder();
      });

      expect(orderService.addItemsToOrderApi).toHaveBeenCalledWith('tenant-1', 77, expect.anything());
      expect(orderService.createTableOrderApi).toHaveBeenCalledTimes(1);
    });
  });

  describe('idempotency', () => {
    it('reuses the key when retrying the same cart and rotates it when the cart changes', async () => {
      (orderService.createTableOrderApi as jest.Mock).mockRejectedValue(new Error('timeout'));

      const { result } = await renderTableHook();

      await act(() => {
        result.current.addToCart(burgerItem);
      });
      await act(async () => {
        await result.current.handleConfirmOrder();
      });
      await act(async () => {
        await result.current.handleConfirmOrder();
      });

      await act(() => {
        result.current.addToCart(pizzaItem);
      });
      await act(async () => {
        await result.current.handleConfirmOrder();
      });

      const keys = (orderService.createTableOrderApi as jest.Mock).mock.calls.map(([, payload]) => payload.idempotencyKey);
      expect(keys).toHaveLength(3);
      expect(keys[0]).toBe(keys[1]);
      expect(keys[2]).not.toBe(keys[0]);
    });
  });

  describe('existing item quantity', () => {
    it('sends the new quantity to the server', async () => {
      mockTable('OCCUPIED');
      mockTableOrder(makeOrder());
      (orderService.updateOrderItemQtyApi as jest.Mock).mockResolvedValue({ success: true });

      const { result } = await renderTableHook();

      await act(async () => {
        await result.current.updateExistingQty('902', 1);
      });

      expect(orderService.updateOrderItemQtyApi).toHaveBeenCalledWith('tenant-1', 77, '902', 3);
      expect(result.current.existingOrderItems.find((i) => i.id === '902')?.quantity).toBe(3);
    });

    it('reduces a dish split across rounds by deleting the extra round line', async () => {
      mockTable('OCCUPIED');
      mockTableOrder(makeOrder({
        items: [
          { id: 901, itemId: 2, itemName: 'Fish Fry', quantity: 1, price: 120, totalPrice: 120 },
          { id: 905, itemId: 2, itemName: 'Fish Fry', quantity: 1, price: 120, totalPrice: 120, newlyAdded: true },
        ],
      }));
      (orderService.deleteOrderItemApi as jest.Mock).mockResolvedValue({ success: true });

      const { result } = await renderTableHook();

      await act(async () => {
        await result.current.updateExistingQty('901', -1);
      });

      expect(orderService.deleteOrderItemApi).toHaveBeenCalledWith('tenant-1', 77, '905');
      expect(orderService.updateOrderItemQtyApi).not.toHaveBeenCalled();
      expect(result.current.existingOrderItems.map((i) => i.id)).toEqual(['901']);
    });

    it('rolls back the quantity when the server rejects it', async () => {
      mockTable('OCCUPIED');
      mockTableOrder(makeOrder());
      (orderService.updateOrderItemQtyApi as jest.Mock).mockRejectedValue(httpError(400));

      const { result } = await renderTableHook();

      await act(async () => {
        await result.current.updateExistingQty('902', 1);
      });

      expect(result.current.existingOrderItems.find((i) => i.id === '902')?.quantity).toBe(2);
    });
  });
});
