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

// lines are grouped by dish (itemId, or the name when it's missing) and price
export const orderItemGroupKey = (itemId: number | null | undefined, name: string, price: number): string =>
    `${itemId ?? name}||${price}`;

const groupKeyOfOrderItem = (item: OrderItem) => orderItemGroupKey(item.itemId, item.itemName, item.price);

export function consolidateOrderItems(items: OrderItem[]): ConsolidatedOrderItem[] {
    const map = new Map<string, ConsolidatedOrderItem>();

    for (const item of items) {
        const key = groupKeyOfOrderItem(item);
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

// every line shown in the same row as the given line
export function findGroupedOrderItems(rawItems: OrderItem[], lineId: string | number): OrderItem[] {
    const line = rawItems.find((item) => String(item.id) === String(lineId));
    if (!line) return [];
    const key = groupKeyOfOrderItem(line);
    return rawItems.filter((item) => groupKeyOfOrderItem(item) === key);
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
    itemId?: number | null;
    name: string;
    price: number;
    quantity: number;
    kotSent?: boolean | null;
}

export interface ConsolidatedExistingItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

const groupKeyOfExistingItem = (item: ExistingItem) => orderItemGroupKey(item.itemId, item.name, item.price);

export function consolidateExistingItems(items: ExistingItem[]): ConsolidatedExistingItem[] {
    const map = new Map<string, ConsolidatedExistingItem>();

    for (const item of items) {
        const key = groupKeyOfExistingItem(item);
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

export function findGroupedExistingItems(items: ExistingItem[], lineId: string | number): ExistingItem[] {
    const line = items.find((item) => item.id === String(lineId));
    if (!line) return [];
    const key = groupKeyOfExistingItem(line);
    return items.filter((item) => groupKeyOfExistingItem(item) === key);
}

export interface QuantityLine {
    id: string | number;
    quantity: number;
    kotSent?: boolean | null;
}

export type QuantityChange =
    | { kind: "update"; lineId: string | number; quantity: number }
    | { kind: "delete"; lineId: string | number };

// +1 goes to the newest line not yet sent to the kitchen; -1 comes off the newest line and
// deletes it once empty. The last unit is left to the remove button (returns null).
export function planQuantityChange(lines: QuantityLine[], delta: number): QuantityChange | null {
    if (lines.length === 0 || delta === 0) return null;

    const newest = lines[lines.length - 1];

    if (delta > 0) {
        const target = [...lines].reverse().find((line) => !line.kotSent) ?? newest;
        return { kind: "update", lineId: target.id, quantity: target.quantity + delta };
    }

    if (newest.quantity + delta >= 1) {
        return { kind: "update", lineId: newest.id, quantity: newest.quantity + delta };
    }
    if (lines.length > 1) {
        return { kind: "delete", lineId: newest.id };
    }
    return null;
}

// optimistic local update
export function applyQuantityChange<T extends QuantityLine>(lines: T[], change: QuantityChange): T[] {
    if (change.kind === "delete") {
        return lines.filter((line) => String(line.id) !== String(change.lineId));
    }
    return lines.map((line) => (
        String(line.id) === String(change.lineId) ? { ...line, quantity: change.quantity } : line
    ));
}
