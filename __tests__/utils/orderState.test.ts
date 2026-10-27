import {
  getKitchenStage,
  getOrderStatusLabel,
  getPaymentStatusLabel,
  getWaiterOrderState,
  isTableOrder,
} from '@/utils/orderState';

describe('getWaiterOrderState', () => {
  it.each([
    ['PENDING', 'PENDING', 'unpaid'],
    ['CONFIRMED', 'PENDING', 'unpaid'],
    ['PREPARING', 'PENDING', 'unpaid'],
    ['OUT_FOR_DELIVERY', 'PENDING', 'unpaid'],
    ['DELIVERED', 'PENDING', 'unpaid'],
    ['COMPLETED', 'PAID', 'paid'],
    ['DELIVERED', 'PAID', 'paid'],
    ['CANCELLED', 'PENDING', 'cancelled'],
    ['CANCELLED', 'PAID', 'cancelled'],
  ])('status %s with payment %s is %s', (status, paymentStatus, expected) => {
    expect(getWaiterOrderState({ status: status as any, paymentStatus })).toBe(expected);
  });

  it('treats a missing payment status as unpaid', () => {
    expect(getWaiterOrderState({ status: 'CONFIRMED' as any, paymentStatus: undefined })).toBe('unpaid');
  });
});

describe('getKitchenStage', () => {
  it('flags unpaid orders that are cooking or ready', () => {
    expect(getKitchenStage({ status: 'PREPARING' as any, paymentStatus: 'PENDING' })).toBe('in-kitchen');
    expect(getKitchenStage({ status: 'OUT_FOR_DELIVERY' as any, paymentStatus: 'PENDING' })).toBe('ready');
  });

  it('shows nothing for freshly taken, paid or cancelled orders', () => {
    expect(getKitchenStage({ status: 'CONFIRMED' as any, paymentStatus: 'PENDING' })).toBeNull();
    expect(getKitchenStage({ status: 'OUT_FOR_DELIVERY' as any, paymentStatus: 'PAID' })).toBeNull();
    expect(getKitchenStage({ status: 'CANCELLED' as any, paymentStatus: 'PENDING' })).toBeNull();
  });
});

describe('isTableOrder', () => {
  it('uses orderType when present', () => {
    expect(isTableOrder({ status: 'CONFIRMED' as any, paymentStatus: 'PENDING', orderType: 'DINE_IN' })).toBe(true);
  });

  it('falls back to the table fields', () => {
    expect(isTableOrder({ status: 'CONFIRMED' as any, paymentStatus: 'PENDING', tableNumber: 2 })).toBe(true);
    expect(isTableOrder({ status: 'PENDING' as any, paymentStatus: 'PENDING', tableNumber: null })).toBe(false);
  });
});

describe('status labels', () => {
  it('collapses PENDING and CONFIRMED into one waiter-facing word', () => {
    expect(getOrderStatusLabel('PENDING')).toBe('Ordered');
    expect(getOrderStatusLabel('CONFIRMED')).toBe('Ordered');
    expect(getOrderStatusLabel('OUT_FOR_DELIVERY')).toBe('Ready to serve');
    expect(getOrderStatusLabel('COMPLETED')).toBe('Completed');
  });

  it('passes unknown statuses through unchanged', () => {
    expect(getOrderStatusLabel('ON_HOLD')).toBe('ON_HOLD');
  });

  it('labels payment states for waiters', () => {
    expect(getPaymentStatusLabel('PENDING')).toBe('Unpaid');
    expect(getPaymentStatusLabel('PAID')).toBe('Paid');
  });
});
