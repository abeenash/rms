import { Order } from "@/services/orderService";

type OrderLike = Pick<Order, "status" | "paymentStatus"> & Partial<Pick<Order, "orderType" | "tableId" | "tableNumber">>;

// what a waiter tracks: money still due, paid, or cancelled
export type WaiterOrderState = "unpaid" | "paid" | "cancelled";

// "ready" is the one stage that needs the waiter to act
export type KitchenStage = "in-kitchen" | "ready";

export const WAITER_STATE_LABEL: Record<WaiterOrderState, string> = {
    unpaid: "Unpaid",
    paid: "Paid",
    cancelled: "Cancelled",
};

export const KITCHEN_STAGE_LABEL: Record<KitchenStage, string> = {
    "in-kitchen": "In kitchen",
    ready: "Ready to serve",
};

// PENDING (direct) and CONFIRMED (table) mean the same to a waiter
const ORDER_STATUS_LABEL: Record<string, string> = {
    PENDING: "Ordered",
    CONFIRMED: "Ordered",
    PREPARING: "In kitchen",
    OUT_FOR_DELIVERY: "Ready to serve",
    DELIVERED: "Completed",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
    INITIATED: "Unpaid",
    PENDING: "Unpaid",
    PAID: "Paid",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
};

export const getWaiterOrderState = ({ status, paymentStatus }: OrderLike): WaiterOrderState => {
    if (status?.toUpperCase() === "CANCELLED") return "cancelled";
    if (paymentStatus?.toUpperCase() === "PAID") return "paid";
    return "unpaid";
};

export const getKitchenStage = (order: OrderLike): KitchenStage | null => {
    if (getWaiterOrderState(order) !== "unpaid") return null;
    switch (order.status?.toUpperCase()) {
        case "PREPARING":
            return "in-kitchen";
        case "OUT_FOR_DELIVERY":
            return "ready";
        default:
            return null;
    }
};

export const isTableOrder = (order: OrderLike): boolean =>
    order.orderType?.toUpperCase() === "DINE_IN" || order.tableId != null || order.tableNumber != null;

export const getOrderStatusLabel = (status?: string | null): string =>
    (status && ORDER_STATUS_LABEL[status.toUpperCase()]) || status || "";

export const getPaymentStatusLabel = (paymentStatus?: string | null): string =>
    (paymentStatus && PAYMENT_STATUS_LABEL[paymentStatus.toUpperCase()]) || paymentStatus || "";
