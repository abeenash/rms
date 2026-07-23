import api from "./api";

export interface PaginatedData<T> {
    content: T[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    firstPage: boolean;
    lastPage: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: PaginatedData<T>;
    status: number;
    errors?: string | null;
    timestamp: string;
}

export interface Menu {
    id: number;
    menuName: string;
    description: string;
    active: boolean;
    imageUrl: string;
}

export interface MenuItem {
    id: number;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    tags: string[];
    active: boolean;
    menuName: string;
    menuId: number;
}

export const fetchMenusApi = async (tenantSlug: string): Promise<Menu[]> => {
    const response = await api.get(`/public/${tenantSlug}/menu/list`);
    return response.data?.data?.content || []
};

export const fetchMenuItemsApi = async (tenantSlug: string): Promise<MenuItem[]> => {
    const response = await api.get(`/public/${tenantSlug}/items/list`);
    return response.data?.data?.content || []
}