import api from "./api";

export interface DiningTable {
    id: number;
    tableNumber: number | string;
    capacity: number;
    status: string;
}

export interface DiningTableApiResponse {
    success: boolean;
    message: string;
    data: DiningTable[];
    status?: number;
    errors?: string;
    timestamp: string
}

export interface SingleDiningTableApiResponse {
    success: boolean;
    message: string;
    data: DiningTable | null;
    status?: number;
    errors?: string;
    timestamp: string
}

export const fetchDiningTablesApi = async (tenantSlug: string): Promise<DiningTable[]> => {
    const response = await api.get<DiningTableApiResponse>(`/public/${tenantSlug}/dining-table`);

    return response.data?.data || []
}

export const fetchDiningTableByIdApi = async (tenantSlug: string, tableId: string | number): Promise<DiningTable | null> => {
    const response = await api.get<SingleDiningTableApiResponse>(`/public/${tenantSlug}/dining-table/${tableId}`);

    return response.data?.data || null
}
