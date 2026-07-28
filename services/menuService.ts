import api from "./api";

export interface PaginatedData<T> {
    content: T[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    firstPage?: boolean;
    lastPage?: boolean;
    first?: boolean;
    last?: boolean;
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

export const fetchMenuItemsApi = async (
    tenantSlug: string,
    page: number = 0,
    size: number = 10,
    search?: string
): Promise<PaginatedData<MenuItem>> => {
    const params: Record<string, any> = { page, size };
    if (search && search.trim() !== "") {
        params.search = search.trim()
    }

    const response = await api.get(`/public/${tenantSlug}/items/list`, { params });

    return response.data?.data || {
        content: [],
        pageNumber: 0,
        pageSize: size,
        totalElements: 0,
        totalPages: 0,
        firstPage: true,
        lastPage: true,
    }
}