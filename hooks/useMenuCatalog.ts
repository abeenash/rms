import { fetchMenuItemsApi, fetchMenusApi } from "@/services/menuService";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { UIItem } from "./useTableOrdering";

export const menuKeys = {
    all: ["menuCatalog"] as const,
    categories: (tenantSlug: string) => [...menuKeys.all, "categories", tenantSlug] as const,
    items: (tenantSlug: string) => [...menuKeys.all, "items", tenantSlug] as const,
    search: (tenantSlug: string, query: string) => [...menuKeys.all, "search", tenantSlug, query] as const,
}

//to fetch catgories from menu list
export function useMenuCategories(tenantSlug: string | null) {
    return useQuery({
        queryKey: menuKeys.categories(tenantSlug || ""),
        queryFn: () => fetchMenusApi(tenantSlug!),
        enabled: !!tenantSlug,
        staleTime: 1000 * 60 * 30,
    })
}

//fetch menu items with pagination
export function useMenuItems(tenantSlug: string | null) {
    return useInfiniteQuery({
        queryKey: menuKeys.items(tenantSlug || ""),
        queryFn: ({ pageParam = 0 }) => fetchMenuItemsApi(tenantSlug!, pageParam, 10, ""),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const isLast = lastPage.lastPage ?? lastPage.last ?? (allPages.length >= lastPage.totalPages)
            return isLast ? undefined : allPages.length;
        },
        enabled: !!tenantSlug,
        staleTime: 1000 * 60 * 10,
    })
}

//to flatten the paginated results into a single UIItem array
export function useFlattenedMenuItems(tenantSlug: string | null) {
    const query = useMenuItems(tenantSlug)

    const items: UIItem[] = useMemo(() => {
        if (!query.data) return [];
        return query.data.pages.flatMap((page) =>
            (page.content || []).filter((item) => item.active)
                .map((item) => ({
                    id: String(item.id),
                    name: item.name,
                    price: item.price,
                    category: item.menuName,
                    description: item.description || "",
                    image: item.imageUrl,
                }))
        )
    }, [query.data])
    return { ...query, flatItems: items }
}

export function useMenuSearch(tenantSlug: string | null, search: string) {
    const trimmedSearch = search.trim()

    return useQuery({
        queryKey: menuKeys.search(tenantSlug || "", trimmedSearch),
        queryFn: () => fetchMenuItemsApi(tenantSlug!, 0, 10, trimmedSearch),
        enabled: !!tenantSlug && trimmedSearch.length > 0,
        staleTime: 1000 * 60 * 5,
    })
}