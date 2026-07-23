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
    tableNumber?: number;
    items: OrderItem[];
}

export interface PaginatedData<T> {
    content: T[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    firstPage: boolean;
    last: boolean;
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

export const fetchOrdersApi = async (tenantSlug: string): Promise<Order[]> => {
    const response = await api.get<OrderApiResponse>(`public/${tenantSlug}/order`);
    return response.data?.data?.content || []
}

export const fetchOrderByIdApi = async (tenantSlug: string, orderId: string | number): Promise<Order | null> => {
    const response = await api.get<SingleOrderApiResponse>(`public/${tenantSlug}/order/${orderId}`)
    return response.data?.data || null
}