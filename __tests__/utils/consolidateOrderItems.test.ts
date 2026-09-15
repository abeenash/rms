import { consolidateOrderItems, findMatchingRawItems, consolidateExistingItems, OrderItem } from '@/utils/consolidateOrderItems';

describe('consolidateOrderItems', () => {
  it('should return empty array for empty input', () => {
    expect(consolidateOrderItems([])).toEqual([]);
  });

  it('should return single item unchanged', () => {
    const items: OrderItem[] = [
      { id: 1, itemName: 'Burger', quantity: 2, price: 100, totalPrice: 200 },
    ];
    const result = consolidateOrderItems(items);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 1,
      itemName: 'Burger',
      quantity: 2,
      price: 100,
      totalPrice: 200,
    });
  });

  it('should consolidate duplicate items by name and price', () => {
    const items: OrderItem[] = [
      { id: 1, itemName: 'Burger', quantity: 1, price: 100, totalPrice: 100 },
      { id: 2, itemName: 'Burger', quantity: 2, price: 100, totalPrice: 200 },
    ];
    const result = consolidateOrderItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
    expect(result[0].totalPrice).toBe(300);
  });

  it('should keep items with same name but different prices separate', () => {
    const items: OrderItem[] = [
      { id: 1, itemName: 'Burger', quantity: 1, price: 100, totalPrice: 100 },
      { id: 2, itemName: 'Burger', quantity: 1, price: 150, totalPrice: 150 },
    ];
    const result = consolidateOrderItems(items);
    expect(result).toHaveLength(2);
  });

  it('should keep items with different names separate', () => {
    const items: OrderItem[] = [
      { id: 1, itemName: 'Burger', quantity: 1, price: 100, totalPrice: 100 },
      { id: 2, itemName: 'Pizza', quantity: 1, price: 200, totalPrice: 200 },
    ];
    const result = consolidateOrderItems(items);
    expect(result).toHaveLength(2);
  });

  it('should preserve discount info from first occurrence', () => {
    const items: OrderItem[] = [
      { id: 1, itemName: 'Burger', quantity: 1, price: 100, totalPrice: 100, discountPercent: 10, discountAmount: 10 },
      { id: 2, itemName: 'Burger', quantity: 1, price: 100, totalPrice: 100, discountPercent: 20, discountAmount: 20 },
    ];
    const result = consolidateOrderItems(items);
    expect(result[0].discountPercent).toBe(10);
    expect(result[0].discountAmount).toBe(10);
  });

  it('should handle null discount values', () => {
    const items: OrderItem[] = [
      { id: 1, itemName: 'Burger', quantity: 1, price: 100, totalPrice: 100, discountPercent: null, discountAmount: null },
    ];
    const result = consolidateOrderItems(items);
    expect(result[0].discountPercent).toBeNull();
    expect(result[0].discountAmount).toBeNull();
  });
});

describe('findMatchingRawItems', () => {
  const rawItems: OrderItem[] = [
    { id: 1, itemName: 'Burger', quantity: 1, price: 100, totalPrice: 100 },
    { id: 2, itemName: 'Burger', quantity: 2, price: 100, totalPrice: 200 },
    { id: 3, itemName: 'Pizza', quantity: 1, price: 200, totalPrice: 200 },
  ];

  it('should find items matching name and price', () => {
    const result = findMatchingRawItems(rawItems, { itemName: 'Burger', price: 100 });
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.itemName === 'Burger' && i.price === 100)).toBe(true);
  });

  it('should return empty array when no match', () => {
    const result = findMatchingRawItems(rawItems, { itemName: 'Pasta', price: 100 });
    expect(result).toHaveLength(0);
  });

  it('should return empty array for price mismatch', () => {
    const result = findMatchingRawItems(rawItems, { itemName: 'Burger', price: 999 });
    expect(result).toHaveLength(0);
  });
});

describe('consolidateExistingItems', () => {
  it('should return empty array for empty input', () => {
    expect(consolidateExistingItems([])).toEqual([]);
  });

  it('should consolidate items by name and price', () => {
    const items = [
      { id: '1', name: 'Burger', price: 100, quantity: 1 },
      { id: '2', name: 'Burger', price: 100, quantity: 2 },
    ];
    const result = consolidateExistingItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
  });

  it('should keep items with different prices separate', () => {
    const items = [
      { id: '1', name: 'Burger', price: 100, quantity: 1 },
      { id: '2', name: 'Burger', price: 150, quantity: 1 },
    ];
    const result = consolidateExistingItems(items);
    expect(result).toHaveLength(2);
  });

  it('should keep id from first occurrence', () => {
    const items = [
      { id: '1', name: 'Burger', price: 100, quantity: 1 },
      { id: '2', name: 'Burger', price: 100, quantity: 2 },
    ];
    const result = consolidateExistingItems(items);
    expect(result[0].id).toBe('1');
  });
});
