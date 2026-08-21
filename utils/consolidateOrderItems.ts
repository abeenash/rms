import { OrderItem } from "@/services/orderService";

export interface ConsolidatedOrderItem {
    id: number;
    itemName: string;
    quantity: number;
    price: number;
    totalPrice: number;
    discountPercent?: number | null;
    discountAmount?: number | null;
}

export function consolidateOrderItems(items: OrderItem[]): ConsolidatedOrderItem[] {
    const map = new Map<string, ConsolidatedOrderItem>();

    for (const item of items) {
        const key = `${item.itemName}||${item.price}`;
        const existing = map.get(key);

        if (existing) {
            existing.quantity += item.quantity;
            existing.totalPrice = existing.price * existing.quantity;
        } else {
            map.set(key, {
                id: item.id,
                itemName: item.itemName,
                quantity: item.quantity,
                price: item.price,
                totalPrice: item.price * item.quantity,
                discountPercent: item.discountPercent,
                discountAmount: item.discountAmount,
            });
        }
    }

    return Array.from(map.values());
}

export function findMatchingRawItems(
    rawItems: OrderItem[],
    consolidatedItem: { itemName: string; price: number }
): OrderItem[] {
    return rawItems.filter(
        (item) => item.itemName === consolidatedItem.itemName && item.price === consolidatedItem.price
    );
}

export interface ExistingItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

export interface ConsolidatedExistingItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

export function consolidateExistingItems(items: ExistingItem[]): ConsolidatedExistingItem[] {
    const map = new Map<string, ConsolidatedExistingItem>();

    for (const item of items) {
        const key = `${item.name}||${item.price}`;
        const existing = map.get(key);

        if (existing) {
            existing.quantity += item.quantity;
        } else {
            map.set(key, {
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
            });
        }
    }

    return Array.from(map.values());
}
