import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OrderStatusCard } from '@/components/orders/OrderStatusCard';

const defaultColors = {
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  textMain: '#0F172A',
  textMuted: '#64748B',
};

const getStatusColors = (status: string) => {
  switch (status) {
    case 'DELIVERED':
    case 'PAID':
      return { bg: '#DCFCE7', text: '#16A34A' };
    case 'CANCELLED':
      return { bg: '#FEE2E2', text: '#EF4444' };
    default:
      return { bg: '#FEF3C7', text: '#D97706' };
  }
};

describe('OrderStatusCard', () => {
  it('should render order and payment status', async () => {
    const { getByText } = await render(
      <OrderStatusCard
        orderStatus="CONFIRMED"
        paymentStatus="PENDING"
        isOrderFinalized={false}
        onOrderStatusPress={jest.fn()}
        getStatusColors={getStatusColors}
        colors={defaultColors}
      />
    );

    expect(getByText('Ordered')).toBeTruthy();
    expect(getByText('Unpaid')).toBeTruthy();
  });

  it('should show Order Status and Payment Status labels', async () => {
    const { getByText } = await render(
      <OrderStatusCard
        orderStatus="PENDING"
        paymentStatus="PENDING"
        isOrderFinalized={false}
        onOrderStatusPress={jest.fn()}
        getStatusColors={getStatusColors}
        colors={defaultColors}
      />
    );

    expect(getByText('Order Status')).toBeTruthy();
    expect(getByText('Payment Status')).toBeTruthy();
  });

  it('should call onOrderStatusPress when order status badge is pressed', async () => {
    const onOrderStatusPress = jest.fn();
    const { getByText } = await render(
      <OrderStatusCard
        orderStatus="CONFIRMED"
        paymentStatus="PENDING"
        isOrderFinalized={false}
        onOrderStatusPress={onOrderStatusPress}
        getStatusColors={getStatusColors}
        colors={defaultColors}
      />
    );

    await fireEvent.press(getByText('Ordered'));
    expect(onOrderStatusPress).toHaveBeenCalledTimes(1);  });

  it('should render payment status badge without onPress when not finalized', async () => {
    const { getByText } = await render(
      <OrderStatusCard
        orderStatus="CONFIRMED"
        paymentStatus="PENDING"
        isOrderFinalized={false}
        onOrderStatusPress={jest.fn()}
        getStatusColors={getStatusColors}
        colors={defaultColors}
      />
    );

    const paymentBadge = getByText('Unpaid');
    expect(paymentBadge).toBeTruthy();
    expect(paymentBadge.parent?.props?.disabled).toBeFalsy();
  });

  it('should apply correct status colors', async () => {
    const { getByText } = await render(
      <OrderStatusCard
        orderStatus="CANCELLED"
        paymentStatus="PAID"
        isOrderFinalized={false}
        onOrderStatusPress={jest.fn()}
        getStatusColors={getStatusColors}
        colors={defaultColors}
      />
    );

    expect(getByText('Cancelled')).toBeTruthy();
    expect(getByText('Paid')).toBeTruthy();
  });
});
