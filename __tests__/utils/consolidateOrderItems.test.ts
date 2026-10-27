import {
  applyQuantityChange,
  consolidateExistingItems,
  consolidateOrderItems,
  findGroupedOrderItems,
  findMatchingRawItems,
  planQuantityChange,
} from '@/utils/consolidateOrderItems';
import { OrderItem } from '@/services/orderService';

// Order #781 after "Update Order" on the table screen: the extra round arrived as new lines.
const order781Items: OrderItem[] = [
  { id: 2695, itemId: 2, itemName: 'Fish Fry', quantity: 3, price: 120, totalPrice: 360, newlyAdded: false, kotSent: false },
  { id: 2696, itemId: 3, itemName: 'Fish churma', quantity: 2, price: 200, totalPrice: 400, newlyAdded: false, kotSent: false },
  { id: 2697, itemId: 2, itemName: 'Fish Fry', quantity: 1, price: 120, totalPrice: 120, newlyAdded: true, kotSent: false },
  { id: 2698, itemId: 3, itemName: 'Fish churma', quantity: 1, price: 200, totalPrice: 200, newlyAdded: true, kotSent: false },
];

describe('order #781 (extra round on new lines)', () => {
  it('shows one row per dish with the summed quantity', () => {
    const result = consolidateOrderItems(order781Items);
    expect(result.map((r) => [r.itemName, r.quantity, r.totalPrice])).toEqual([
      ['Fish Fry', 4, 480],
      ['Fish churma', 3, 600],
    ]);
  });

  it('groups by itemId even if the name was edited between rounds', () => {
    const renamed = order781Items.map((i) => (i.id === 2697 ? { ...i, itemName: 'Fish Fry (new)' } : i));
    expect(findGroupedOrderItems(renamed, 2695).map((i) => i.id)).toEqual([2695, 2697]);
  });

  it('+1 grows the newest line, so the kitchen sees it with the extra round', () => {
    const lines = findGroupedOrderItems(order781Items, 2695);
    expect(planQuantityChange(lines, 1)).toEqual({ kind: 'update', lineId: 2697, quantity: 2 });
  });

  it('+1 skips lines already sent to the kitchen', () => {
    const lines = findGroupedOrderItems(order781Items, 2695).map((i) => (i.id === 2697 ? { ...i, kotSent: true } : i));
    expect(planQuantityChange(lines, 1)).toEqual({ kind: 'update', lineId: 2695, quantity: 4 });
  });

  it('-1 removes the extra round line once it is empty, so 4 can go down to 3', () => {
    const lines = findGroupedOrderItems(order781Items, 2695);
    const change = planQuantityChange(lines, -1);
    expect(change).toEqual({ kind: 'delete', lineId: 2697 });

    const after = consolidateOrderItems(applyQuantityChange(order781Items, change!));
    expect(after.find((r) => r.itemName === 'Fish Fry')?.quantity).toBe(3);
  });

  it('-1 can take a dish split 1 + 1 down to 1 (the old logic got stuck at 2)', () => {
    const lines = [
      { id: 'a', quantity: 1 },
      { id: 'b', quantity: 1 },
    ];
    expect(planQuantityChange(lines, -1)).toEqual({ kind: 'delete', lineId: 'b' });
  });

  it('-1 never removes the last unit of a dish', () => {
    expect(planQuantityChange([{ id: 'a', quantity: 1 }], -1)).toBeNull();
  });

  it('-1 shrinks the newest line while it has more than one', () => {
    expect(planQuantityChange([{ id: 'a', quantity: 3 }, { id: 'b', quantity: 2 }], -1)).toEqual({
      kind: 'update',
      lineId: 'b',
      quantity: 1,
    });
  });
});

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
