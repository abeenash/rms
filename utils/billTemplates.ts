import { Order, OrderItem } from "@/services/orderService";
import { consolidateOrderItems } from "./consolidateOrderItems";

// Safe Date Formatter Helper
export const formatOrderTime = (isoString?: string) => {
  if (!isoString) return "N/A"
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return "N/A"
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  return `${dateStr} | ${timeStr}`
}

export const generatePOSHtml = (
  orderData: Order | null,
  orderId: string,
  tenantSlug: string | null | undefined,
  orderItems: OrderItem[],
  itemsTotalSum: number,
  parsedManualDiscount: number,
  grandFinalTotal: number,
  appliedPromo?: string | null,
  promoDiscountVal?: number
) => {
  const currentDateTime = formatOrderTime(orderData?.orderedAt);
  const displayOrderNum = orderData?.orderNumber || `ORD-${orderId}`;
  const tableNum = orderData?.tableNumber ? `Table ${orderData.tableNumber}` : "Counter";
  const custName = orderData?.customerName || "Walk-in Customer";
  const consolidated = consolidateOrderItems(orderItems);

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Courier New', Courier, monospace; color: #000; margin: 0; padding: 10px; font-size: 14px; line-height: 1.4; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .header-title { font-size: 22px; font-weight: bold; margin-bottom: 2px; letter-spacing: 1px; }
          .subtitle { font-size: 12px; margin-bottom: 4px; }
          .timestamp { font-size: 12px; margin-bottom: 15px; }
          .meta-section { margin-bottom: 10px; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .divider-dashed { border-bottom: 1px dashed #000; margin: 10px 0; }
          .item-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
          .item-table th { text-align: left; font-weight: bold; padding-bottom: 5px; }
          .item-table td { padding: 6px 0; vertical-align: top; }
          .totals-section { margin-top: 10px; }
          .total-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .grand-total { font-size: 18px; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 6px 0; margin-top: 4px; }
          .footer { margin-top: 25px; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="header-title">${(tenantSlug || 'MERCHANT').toUpperCase()}</div>
          <div class="subtitle">★ TAX INVOICE / RECEIPT ★</div>
          <div class="timestamp">${currentDateTime}</div>
        </div>

        <div class="meta-section">
          <div class="meta-row"><span>Order #</span><span class="bold">${displayOrderNum}</span></div>
          <div class="meta-row"><span>Location</span><span>${tableNum}</span></div>
          <div class="meta-row"><span>Customer</span><span>${custName}</span></div>
        </div>

        <div class="divider-dashed"></div>

        <table class="item-table">
          <thead>
            <tr>
              <th style="width: 55%;">Item</th>
              <th style="width: 15%; text-align: center;">Qty</th>
              <th style="width: 30%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${consolidated.map(item => `
              <tr>
                <td>${item.itemName}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right bold">Rs ${item.totalPrice}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="divider-dashed"></div>

        <div class="totals-section">
          <div class="total-row">
            <span>Subtotal</span>
            <span class="bold">Rs ${itemsTotalSum}</span>
          </div>
          ${appliedPromo && promoDiscountVal ? `<div class="total-row"><span>Promo (${appliedPromo})</span><span class="bold">-Rs ${promoDiscountVal}</span></div>` : ''}
          ${parsedManualDiscount > 0 ? `<div class="total-row"><span>Discount</span><span class="bold">-Rs ${parsedManualDiscount}</span></div>` : ''}
          <div class="total-row grand-total">
            <span class="bold">TOTAL</span>
            <span class="bold">Rs ${grandFinalTotal}</span>
          </div>
        </div>

        <div class="text-center footer">
          <div class="bold">Thank you for dining with us!</div>
        </div>
      </body>
    </html>
  `
}

export const generateInvoiceHtml = (
  orderData: Order | null,
  orderId: string,
  tenantSlug: string | null | undefined,
  orderItems: OrderItem[],
  itemsTotalSum: number,
  grandFinalTotal: number,
  appliedPromo?: string | null,
  promoDiscountVal?: number
) => {
  const currentDateTime = formatOrderTime(orderData?.orderedAt);
  const displayOrderNum = orderData?.orderNumber || `ORD-${orderId}`;
  const tableNum = orderData?.tableNumber ? `Table ${orderData.tableNumber}` : "Counter";
  const custName = orderData?.customerName || "Walk-in Customer";
  const consolidated = consolidateOrderItems(orderItems);

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: 'Times New Roman', Times, serif; color: #0F172A; margin: 0; padding: 40px; font-size: 14px; line-height: 1.6; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .header-title { font-size: 28px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
          .subtitle { font-size: 12px; margin-top: 6px; letter-spacing: 3px; color: #475569; }
          .timestamp { font-size: 13px; margin-top: 4px; color: #64748B; }
          .divider-thick { border-bottom: 2px solid #0F172A; margin: 20px 0; }
          .meta-table { width: 100%; margin-bottom: 25px; font-size: 13px; }
          .meta-table td { padding: 3px 0; }
          .item-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .item-table th { text-transform: uppercase; font-size: 12px; letter-spacing: 1.5px; border-bottom: 2px solid #0F172A; padding-bottom: 8px; text-align: left; }
          .item-table td { padding: 12px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
          .totals-wrapper { margin-top: 20px; display: flex; flex-direction: column; align-items: flex-end; }
          .total-row { display: flex; width: 40%; justify-content: space-between; padding: 6px 0; }
          .grand-total { border-top: 2px solid #0F172A; border-bottom: 2px solid #0F172A; margin-top: 6px; padding: 10px 0; }
          .footer { margin-top: 50px; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="header-title">${(tenantSlug || 'MERCHANT').toUpperCase()}</div>
          <div class="subtitle">INVOICE / RECEIPT</div>
          <div class="timestamp">${currentDateTime}</div>
        </div>

        <div class="divider-thick"></div>

        <table class="meta-table">
          <tr><td>Order #</td><td class="text-right bold">${displayOrderNum}</td></tr>
          <tr><td>Location</td><td class="text-right">${tableNum}</td></tr>
          <tr><td>Customer</td><td class="text-right">${custName}</td></tr>
        </table>

        <table class="item-table">
          <thead>
            <tr>
              <th style="width: 50%;">Item</th>
              <th style="width: 15%; text-align: center;">Qty</th>
              <th style="width: 15%; text-align: right;">Rate</th>
              <th style="width: 20%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${consolidated.map(item => `
              <tr>
                <td>${item.itemName}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">Rs ${item.price}</td>
                <td class="text-right bold">Rs ${item.totalPrice}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals-wrapper">
          <div class="total-row"><span>Subtotal</span><span>Rs ${itemsTotalSum}</span></div>
          ${appliedPromo && promoDiscountVal ? `<div class="total-row"><span>Promo (${appliedPromo})</span><span class="bold">-Rs ${promoDiscountVal}</span></div>` : ''}
          <div class="total-row grand-total"><span class="bold">Total</span><span class="bold">Rs ${grandFinalTotal}</span></div>
        </div>

        <div class="text-center footer">
          <div style="font-size: 16px; font-weight: bold;">Thank you for your order!</div>
        </div>
      </body>
    </html>
  `
};

export const generateKOTHtml = (
  orderData: Order | null,
  orderId: string,
  tenantSlug: string | null | undefined,
  orderItems: OrderItem[]
) => {
  const currentDateTime = formatOrderTime(orderData?.orderedAt);
  const displayOrderNum = orderData?.orderNumber || `ORD-${orderId}`;
  const tableNum = orderData?.tableNumber ? `Table ${orderData.tableNumber}` : "Counter";
  const consolidated = consolidateOrderItems(orderItems);

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: 'Courier New', Courier, monospace; color: #000; margin: 0; padding: 10px; font-size: 15px; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .header-title { font-size: 20px; font-weight: bold; text-transform: uppercase; }
          .subtitle { font-size: 13px; margin: 4px 0 10px 0; }
          .divider-dashed { border-bottom: 1.5px dashed #000; margin: 8px 0; }
          .divider-double { border-bottom: 3px double #000; margin: 12px 0; }
          .meta-section { margin-bottom: 12px; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .item-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
          .item-table th { text-align: left; font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 6px; }
          .item-table td { padding: 8px 0; font-size: 16px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="header-title">${(tenantSlug || 'KITCHEN').toUpperCase()}</div>
          <div class="subtitle">KITCHEN ORDER TICKET</div>
        </div>

        <div class="divider-dashed"></div>

        <div class="meta-section">
          <div class="meta-row"><span>Date/Time</span><span>${currentDateTime}</span></div>
          <div class="meta-row"><span>Order #</span><span class="bold">${displayOrderNum}</span></div>
          <div class="meta-row"><span>Location</span><span class="bold">${tableNum}</span></div>
        </div>

        <div class="divider-dashed"></div>

        <table class="item-table">
          <thead>
            <tr>
              <th style="width: 80%;">Item</th>
              <th style="width: 20%; text-align: right;">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${consolidated.map(item => `
              <tr>
                <td>${item.itemName}</td>
                <td style="text-align: right;">${item.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="divider-double"></div>
        <div class="text-center bold" style="letter-spacing: 2px; margin-top: 15px;">** KOT **</div>
      </body>
    </html>
  `
};