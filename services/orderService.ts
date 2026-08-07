import api from "./api";

export interface OrderItem {
    id: number;
    itemName: string;
    quantity: number;
    price: number;
    totalPrice: number;
    discountPercent?: number | null;
    discountAmount?: number | null;
}

export interface ActiveOrderItem {
    id: number;
    itemName: string;
    quantity: number;
    price: number;
    totalPrice: number;
    discountPercent?: number | null;
    discountAmount?: number | null;
}

export interface Order {
    id: number;
    orderNumber: string;
    status: "PENDING" | "CONFIRMED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED";
    totalAmount: number;
    promoCode?: string | null;
    promoDiscount?: number | null;
    manualDiscount?: number | null;
    vatPercentage?: number | null;
    vatAmount?: number | null;
    settledAmount: number;
    customerName?: string | null;
    customerPhone?: string | null;
    customerAddress?: string | null;
    customerNote?: string | null;
    paymentMethod?: string;
    paymentStatus?: string;
    orderedAt: string;
    tableNumber?: number | null;
    items: OrderItem[];
}

export type OrderStatus =
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED";

export type PaymentStatus =
    | "INITIATED"
    | "PENDING"
    | "PAID"
    | "FAILED"
    | "CANCELLED"
    | "REFUNDED";

export interface PaginatedData<T> {
    content: T[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    firstPage: boolean;
    last: boolean;
}

export interface ActiveTableOrderData {
    id: number;
    orderNumber: string;
    status: "CONFIRMED" | "DELIVERED" | "PENDING" | string;
    totalAmount: number;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    orderedAt?: string;
    tableNumber?: number;
    items: ActiveOrderItem[];
}

export interface UpdatePaymentStatusPayload {
    paymentStatus: PaymentStatus;
    paymentMethod: string;
    manualDiscount?: number;
}

export interface OrderApiResponse {
    success: boolean;
    message: string;
    data: PaginatedData<Order>
    status: number;
    errors?: string | null
    timestamp: string;
}

export interface SingleOrderApiResponse {
    success: boolean;
    message: string;
    data: Order;
    status: number;
    errors?: string | null;
    timestamp: string;
}

export interface ActiveTableOrderApiResponse {
    success: boolean;
    message: string;
    data: ActiveTableOrderData | null;
    status: number;
    errors?: string | null;
    timestamp: string;
}

export interface CreateOrderItemPayload {
    itemId: number;
    quantity: number;
}

export interface CreateOrderPayload {
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    customerNote?: string;
    paymentMethod?: string;
    promoCode?: string;
    idempotencyKey?: string;
    items: CreateOrderItemPayload[];
}

export interface CreateTableOrderPayload {
    tableId: number;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    items: Array<{
        itemId: number;
        quantity: number;
    }>;
    orderedAt: string;
    idempotencyKey: string;
}


export interface AddOrderItemsPayload {
    idempotencyKey?: string;
    items: Array<{
        itemId: number;
        quantity: number;
    }>;
}

export const generateIdempotencyKey = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `ord_ik_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const fetchOrdersApi = async (tenantSlug: string): Promise<Order[]> => {
    const response = await api.get<OrderApiResponse>(`public/${tenantSlug}/order`);
    return response.data?.data?.content || []
}

export const fetchOrderByIdApi = async (tenantSlug: string, orderId: string | number): Promise<Order | null> => {
    const response = await api.get<SingleOrderApiResponse>(`public/${tenantSlug}/order/${orderId}`)
    return response.data?.data || null
}

export const fetchActiveOrderByTableIdApi = async (tenantSlug: string, tableId: string | number): Promise<ActiveTableOrderApiResponse> => {
    const response = await api.get<ActiveTableOrderApiResponse>(`/public/${tenantSlug}/order/table/${tableId}`)
    return response.data;
}

//for the direct order
export const createOrderApi = async (tenantSlug: string, payload: CreateOrderPayload): Promise<Order> => {
    const requestBody = {
        customerName: payload.customerName?.trim() || "Walk-in Customer",
        customerPhone: payload.customerPhone?.trim() || "0000000000",
        customerAddress: payload.customerAddress?.trim() || "Counter",
        customerNote: payload.customerNote?.trim() || "",
        paymentMethod: payload.paymentMethod || "CASH",
        promoCode: payload.promoCode?.trim() || "",
        idempotencyKey: payload.idempotencyKey || generateIdempotencyKey(),
        items: payload.items,
    };

    const response = await api.post<SingleOrderApiResponse>(`public/${tenantSlug}/order`, requestBody)

    return response.data.data;
}

export const createTableOrderApi = async (tenantSlug: string, payload: CreateTableOrderPayload) => {
    const response = await api.post(`/public/${tenantSlug}/order/table-order`, payload)
    return response.data;
}

export const addItemsToOrderApi = async (tenantSlug: string, orderId: string | number, payload: AddOrderItemsPayload) => {
    const response = await api.post(`/public/${tenantSlug}/order/${orderId}/items`, payload);
    return response.data
}

export const updateOrderItemQtyApi = async (tenantSlug: string, orderId: string | number, itemId: string | number, quantity: number) => {
    const response = await api.put(`/public/${tenantSlug}/order/${orderId}/items/${itemId}`, { quantity });
    return response.data
}

export const deleteOrderItemApi = async (tenantSlug: string, orderId: string | number, itemId: string | number) => {
    const response = await api.delete(`/public/${tenantSlug}/order/${orderId}/items/${itemId}`)
    return response.data
}

export const updateOrderStatusApi = async (tenantSlug: string, orderId: string | number, status: OrderStatus) => {
    const response = await api.put(`/public/${tenantSlug}/order/${orderId}/status`, null, {
        params: { status }
    });
    return response.data;
}

export const updatePaymentStatusApi = async (tenantSlug: string, orderId: string | number, payload: UpdatePaymentStatusPayload) => {
    const params: Record<string, any> = {
        paymentStatus: payload.paymentStatus,
    };
    if (payload.paymentMethod) {
        params.paymentMethod = payload.paymentMethod;
    }
    if (payload.manualDiscount !== undefined && payload.manualDiscount !== null) {
        params.manualDiscount = payload.manualDiscount;
    }
    const response = await api.put(`/public/${tenantSlug}/order/${orderId}/paymentStatus`, null, { params });
    return response.data;
}

export const cancelOrderApi = async (tenantSlug: string, orderId: string | number): Promise<Order> => {
    const response = await api.patch<SingleOrderApiResponse>(`/public/${tenantSlug}/order/${orderId}/cancel`)
    return response.data.data;
}

