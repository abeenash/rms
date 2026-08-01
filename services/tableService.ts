import api from "./api";

export interface DiningTable {
    id: number;
    tableNumber: number | string;
    capacity: number;
    status: string;
    currentOrderId?: string | number | null;
}

export interface DiningTableApiResponse {
    success: boolean;
    message: string;
    data: DiningTable[];
    status?: number;
    errors?: string;
    timestamp: string
}

export const fetchDiningTablesApi = async (tenantSlug: string): Promise<DiningTable[]> => {
    const response = await api.get<DiningTableApiResponse>(`/public/${tenantSlug}/dining-table`);

    return response.data?.data || []
}