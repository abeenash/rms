import { formatOrderTime, generatePOSHtml, generateInvoiceHtml, generateKOTHtml } from '@/utils/billTemplates';
import { Order, OrderItem } from '@/services/orderService';

describe('formatOrderTime', () => {
  it('should return "N/A" for undefined', () => {
    expect(formatOrderTime(undefined)).toBe('N/A');
  });

  it('should return "N/A" for invalid date', () => {
    expect(formatOrderTime('not-a-date')).toBe('N/A');
  });

  it('should format valid date string', () => {
    const result = formatOrderTime('2026-08-15T14:30:00Z');
    expect(result).toContain('|');
    expect(result).not.toBe('N/A');
  });
});

const mockOrder: Order = {
  id: 1,
  orderNumber: 'ORD-001',
  status: 'CONFIRMED',
  totalAmount: 500,
  settledAmount: 0,
  orderedAt: '2026-08-15T14:30:00Z',
  tableNumber: 5,
  customerName: 'John Doe',
  items: [],
};

const mockItems: OrderItem[] = [
  { id: 1, itemName: 'Burger', quantity: 2, price: 100, totalPrice: 200 },
  { id: 2, itemName: 'Pizza', quantity: 1, price: 300, totalPrice: 300 },
];

describe('generatePOSHtml', () => {
  it('should generate HTML string', () => {
    const html = generatePOSHtml(mockOrder, '1', 'test-tenant', mockItems, 500, 0, 500);
    expect(typeof html).toBe('string');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
  });

  it('should include tenant slug in header', () => {
    const html = generatePOSHtml(mockOrder, '1', 'my-restaurant', mockItems, 500, 0, 500);
    expect(html).toContain('MY-RESTAURANT');
  });

  it('should default to MERCHANT when tenantSlug is null', () => {
    const html = generatePOSHtml(mockOrder, '1', null, mockItems, 500, 0, 500);
    expect(html).toContain('MERCHANT');
  });

  it('should include order number', () => {
    const html = generatePOSHtml(mockOrder, '1', 'test', mockItems, 500, 0, 500);
    expect(html).toContain('ORD-001');
  });

  it('should show Counter when no table number', () => {
    const orderNoTable = { ...mockOrder, tableNumber: null };
    const html = generatePOSHtml(orderNoTable, '1', 'test', mockItems, 500, 0, 500);
    expect(html).toContain('Counter');
  });

  it('should show table number when available', () => {
    const html = generatePOSHtml(mockOrder, '1', 'test', mockItems, 500, 0, 500);
    expect(html).toContain('Table 5');
  });

  it('should include consolidated items', () => {
    const html = generatePOSHtml(mockOrder, '1', 'test', mockItems, 500, 0, 500);
    expect(html).toContain('Burger');
    expect(html).toContain('Pizza');
  });

  it('should include totals', () => {
    const html = generatePOSHtml(mockOrder, '1', 'test', mockItems, 500, 0, 500);
    expect(html).toContain('500');
  });

  it('should show promo when applied', () => {
    const html = generatePOSHtml(mockOrder, '1', 'test', mockItems, 500, 0, 450, 'SAVE10', 50);
    expect(html).toContain('SAVE10');
    expect(html).toContain('50');
  });

  it('should not show promo section when no promo applied', () => {
    const html = generatePOSHtml(mockOrder, '1', 'test', mockItems, 500, 0, 500);
    expect(html).not.toContain('Promo');
  });

  it('should show discount when present', () => {
    const html = generatePOSHtml(mockOrder, '1', 'test', mockItems, 500, 50, 450);
    expect(html).toContain('Discount');
  });

  it('should default customer name to Walk-in', () => {
    const orderNoName = { ...mockOrder, customerName: null };
    const html = generatePOSHtml(orderNoName, '1', 'test', mockItems, 500, 0, 500);
    expect(html).toContain('Walk-in Customer');
  });
});

describe('generateInvoiceHtml', () => {
  it('should generate HTML string', () => {
    const html = generateInvoiceHtml(mockOrder, '1', 'test-tenant', mockItems, 500, 500);
    expect(typeof html).toBe('string');
    expect(html).toContain('<html>');
  });

  it('should include rate column', () => {
    const html = generateInvoiceHtml(mockOrder, '1', 'test', mockItems, 500, 500);
    expect(html).toContain('Rate');
  });

  it('should include tenant name', () => {
    const html = generateInvoiceHtml(mockOrder, '1', 'my-restaurant', mockItems, 500, 500);
    expect(html).toContain('MY-RESTAURANT');
  });

  it('should show Counter when no table', () => {
    const orderNoTable = { ...mockOrder, tableNumber: null };
    const html = generateInvoiceHtml(orderNoTable, '1', 'test', mockItems, 500, 500);
    expect(html).toContain('Counter');
  });

  it('should include promo discount when provided', () => {
    const html = generateInvoiceHtml(mockOrder, '1', 'test', mockItems, 500, 450, 'SAVE10', 50);
    expect(html).toContain('SAVE10');
  });
});

describe('generateKOTHtml', () => {
  it('should generate HTML string', () => {
    const html = generateKOTHtml(mockOrder, '1', 'test-tenant', mockItems);
    expect(typeof html).toBe('string');
    expect(html).toContain('<html>');
  });

  it('should include KITCHEN ORDER TICKET header', () => {
    const html = generateKOTHtml(mockOrder, '1', 'test-tenant', mockItems);
    expect(html).toContain('KITCHEN ORDER TICKET');
  });

  it('should include KOT marker', () => {
    const html = generateKOTHtml(mockOrder, '1', 'test-tenant', mockItems);
    expect(html).toContain('** KOT **');
  });

  it('should not include prices', () => {
    const html = generateKOTHtml(mockOrder, '1', 'test-tenant', mockItems);
    expect(html).not.toContain('Rate');
  });

  it('should include items and quantities', () => {
    const html = generateKOTHtml(mockOrder, '1', 'test-tenant', mockItems);
    expect(html).toContain('Burger');
    expect(html).toContain('Pizza');
    expect(html).toContain('2');
    expect(html).toContain('1');
  });

  it('should default to KITCHEN when tenantSlug is null', () => {
    const html = generateKOTHtml(mockOrder, '1', null, mockItems);
    expect(html).toContain('KITCHEN');
  });

  it('should show table number when available', () => {
    const html = generateKOTHtml(mockOrder, '1', 'test', mockItems);
    expect(html).toContain('Table 5');
  });

  it('should show Counter when no table', () => {
    const orderNoTable = { ...mockOrder, tableNumber: null };
    const html = generateKOTHtml(orderNoTable, '1', 'test', mockItems);
    expect(html).toContain('Counter');
  });
});
