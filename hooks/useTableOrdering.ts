import { addItemsToOrderApi, AddOrderItemsPayload, createOrderApi, CreateOrderPayload, createTableOrderApi, CreateTableOrderPayload, deleteOrderItemApi, fetchActiveOrderByTableIdApi, fetchOrderByIdApi, generateIdempotencyKey, updateOrderItemQtyApi } from "@/services/orderService";
import { isNetworkError, NETWORK_OFFLINE_MESSAGE } from "@/utils/networkError";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCustomAlert } from "../context/AlertContext";
import { useAuth } from "../context/AuthContext";
import { useCatalogItems, useMenuCategories, useMenuSearch } from "./useMenuCatalog";

export interface UIItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    image: string;
}

export interface CartItem {
    item: UIItem;
    quantity: number;
}

export interface CartState {
    [key: string]: CartItem;
}

export interface ExistingItem {
    id: string
    name: string
    price: number
    quantity: number
}

export function useTableOrdering() {
    const { tableId, tableNumber, capacity, isDirectOrder, status, currentOrderId } = useLocalSearchParams<{
        tableId: string
        tableNumber?: string
        capacity?: string
        isDirectOrder: string
        status?: string
        currentOrderId?: string
    }>()

    const router = useRouter()
    const { tenantSlug, user } = useAuth()
    const { showAlert } = useCustomAlert()

    const displayTableNumber = tableNumber || tableId
    const isDirect = tableId === 'direct' || isDirectOrder === 'true'
    const isOccupied = status?.toLowerCase() === 'occupied'

    //ui and control states
    const [search, setSearch] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("All")

    //loaders
    const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false)
    const [isLoadingExistingOrder, setIsLoadingExistingOrder] = useState<boolean>(false)

    //for orders and cart
    const [cart, setCart] = useState<CartState>({})
    const [existingOrderItems, setExistingOrderItems] = useState<ExistingItem[]>([])
    const [isExpanded, setIsExpanded] = useState(false)
    const [activeOrderId, setActiveOrderId] = useState<string | number | null>(currentOrderId || null) //isolating the db 
    const [activeOrderNumber, setActiveOrderNumber] = useState<string>(currentOrderId || "")

    //modification tracking for back action feedback
    const [modifiedItemNames, setModifiedItemNames] = useState<Set<string>>(new Set())

    const targetOrderId = currentOrderId || activeOrderId
    const displayOrderNumber = activeOrderNumber || currentOrderId

    //to fetch the running order for occupied tables
    useEffect(() => {
        const loadExistingOrder = async () => {
            if (isOccupied && currentOrderId && tenantSlug) {
                try {
                    setIsLoadingExistingOrder(true)
                    const orderData = await fetchOrderByIdApi(tenantSlug, currentOrderId)
                    if (orderData && Array.isArray(orderData.items)) {
                        const formattedExisting: ExistingItem[] = orderData.items.map((item) => ({
                            id: String(item.id),
                            name: item.itemName,
                            price: item.price,
                            quantity: item.quantity
                        }))
                        setExistingOrderItems(formattedExisting)
                    }
                } catch (err) {
                    console.error("Failed to fetch running order items:", err)
                } finally {
                    setIsLoadingExistingOrder(false)
                }
            } else {
                setExistingOrderItems([])
            }
        }
        loadExistingOrder()
    }, [isOccupied, currentOrderId, tenantSlug])

    const { catalogItems, isLoading: isCatalogLoading } = useCatalogItems(tenantSlug)
    const categoriesQuery = useMenuCategories(tenantSlug)
    const { searchItems, isLoading: isSearchFetching } = useMenuSearch(tenantSlug, search)

    const categories = useMemo(() => {
        const names = (categoriesQuery.data || []).filter((m) => m.active).map((m) => m.menuName)
        return ["All", ...new Set(names)]
    }, [categoriesQuery.data])

    const isInitialLoading = isCatalogLoading

    const isSearchActive = search.trim().length > 0
    const isSearchLoading = isSearchActive && isSearchFetching

    const sourceItems = isSearchActive ? searchItems : catalogItems

    const filteredMenuItems = useMemo(() => {
        if (isSearchActive) {
            return sourceItems
        }
        return sourceItems.filter((item) => selectedCategory === "All" || item.category === selectedCategory)
    }, [sourceItems, selectedCategory, isSearchActive])

    //active order search by tableId
    useEffect(() => {
        const loadExistingOrder = async () => {
            if (isDirect || !tableId || !tenantSlug) {
                setExistingOrderItems([])
                setActiveOrderNumber("")
                setActiveOrderId(null)
                return
            }
            try {
                setIsLoadingExistingOrder(true)
                const response = await fetchActiveOrderByTableIdApi(tenantSlug, tableId)
                if (response?.success && response?.data) {
                    const orderData = response.data

                    // Only handle confirmed active orders
                    if (orderData.status?.toUpperCase() === "CONFIRMED" && Array.isArray(orderData.items)) {
                        setActiveOrderId(orderData.id)
                        setActiveOrderNumber(orderData.orderNumber || String(orderData.id))

                        const formattedExisting: ExistingItem[] = orderData.items.map((item) => ({
                            id: String(item.id),
                            name: item.itemName,
                            price: item.price,
                            quantity: item.quantity
                        }))
                        setExistingOrderItems(formattedExisting)
                    } else {
                        setActiveOrderId(null)
                        setActiveOrderNumber("")
                        setExistingOrderItems([])
                    }
                } else {
                    setActiveOrderId(null)
                    setActiveOrderNumber("")
                    setExistingOrderItems([])
                }
            } catch (err) {
                setActiveOrderId(null)
                setActiveOrderNumber("")
                setExistingOrderItems([])
            } finally {
                setIsLoadingExistingOrder(false)
            }
        }
        loadExistingOrder()
    }, [tenantSlug, tableId, isDirect])

    //the cart actions [addToCart, removeFromCart, updateExistingQty, removeExistingItem]
    const addToCart = useCallback((itemToAdd: UIItem) => {
        setCart((prev) => {
            const existing = prev[itemToAdd.id]
            return {
                ...prev,
                [itemToAdd.id]: {
                    item: itemToAdd,
                    quantity: (existing?.quantity || 0) + 1
                }
            }
        })
    }, [])

    const removeFromCart = useCallback((id: string) => {
        setCart((prev) => {
            const updated = { ...prev }
            if (updated[id] && updated[id].quantity > 1) {
                updated[id] = {
                    ...updated[id],
                    quantity: updated[id].quantity - 1
                }
            } else {
                delete updated[id]
            }
            return updated
        })
    }, [])

    const updateExistingQty = useCallback(async (itemId: string | number, delta: number) => {
        if (!tenantSlug || !targetOrderId) return

        let targetItemName = ""
        let targetNewQty = 0
        let originalItem: ExistingItem | undefined
        const stringId = String(itemId)

        setExistingOrderItems((prev) => prev.map((item) => {
            if (item.id === stringId) {
                originalItem = item
                targetItemName = item.name
                targetNewQty = Math.max(1, item.quantity + delta)
                return { ...item, quantity: targetNewQty }
            }
            return item
        }))

        if (!originalItem || targetNewQty === originalItem.quantity) return

        try {
            await updateOrderItemQtyApi(tenantSlug, targetOrderId, stringId, targetNewQty)
            setModifiedItemNames((prev) => new Set(prev).add(targetItemName))
        } catch (error: any) {
            if (isNetworkError(error)) {
                showAlert("Network Error", NETWORK_OFFLINE_MESSAGE)
            } else {
                console.error("Failed to update item quantity:", error)
                //rollback ui state on failure
                setExistingOrderItems((prev) => prev.map((item) => (
                    item.id === stringId && originalItem ? originalItem : item
                )))
                showAlert("Update Failed", "Could not update item quantity on the server")
            }
        }
    }, [tenantSlug, targetOrderId, showAlert])

    const removeExistingItem = useCallback(async (itemId: string | number, name: string) => {
        if (!tenantSlug || !targetOrderId) return

        const targetItem = existingOrderItems.find((i) => i.id === String(itemId))
        if (!targetItem) return

        const matchingItems = existingOrderItems.filter(
            (i) => i.name === targetItem.name && i.price === targetItem.price
        )

        const label = matchingItems.length > 1
            ? `"${name}" (all ${matchingItems.length} entries)`
            : `"${name}"`

        showAlert(
            "⚠️ Remove Item",
            `Remove ${label} from Order #${displayOrderNumber}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        const matchingIds = new Set(matchingItems.map((i) => i.id))
                        let originalList: ExistingItem[] = []
                        setExistingOrderItems((prev) => {
                            originalList = prev
                            return prev.filter(item => !matchingIds.has(item.id))
                        })

                        try {
                            for (const item of matchingItems) {
                                await deleteOrderItemApi(tenantSlug, targetOrderId, item.id)
                            }
                            setModifiedItemNames((prev) => new Set(prev).add(name))
                        } catch (error: any) {
                            if (isNetworkError(error)) {
                                showAlert("Network Error", NETWORK_OFFLINE_MESSAGE)
                            } else {
                                console.error("Failed to delete item:", error)
                                setExistingOrderItems(originalList)
                                showAlert("Deletion Failed", `Could not remove ${name} from the server.`)
                            }
                        }
                    }
                }
            ],
        )
    }, [tenantSlug, targetOrderId, displayOrderNumber, existingOrderItems, showAlert])

    //back navigation action with live sync summary feedback
    const handleBackNavigation = useCallback(() => {
        if (modifiedItemNames.size > 0) {
            const itemListStr = Array.from(modifiedItemNames).join(", ")
            showAlert(
                "Order Updated",
                `Live adjustments for ["${itemListStr}"] were synced directly with the order.`,
                [{ text: "OK", onPress: () => router.back() }]
            )
        } else {
            router.back()
        }
    }, [modifiedItemNames, router, showAlert])

    //computations [filtering, total, grandtotal, activeordercount]
    // const filteredMenuItems = menuItems.filter((item) => selectedCategory === "All" || item.category === selectedCategory)
    const cartItemsArray = Object.values(cart)
    const newItemsSubtotal = cartItemsArray.reduce((sum, entry) => sum + (entry.item.price * entry.quantity), 0)
    const totalCartCount = cartItemsArray.reduce((prevQty, entry) => prevQty + entry.quantity, 0)
    const safeExistingOrderItems = existingOrderItems || []
    const existingOrderSubtotal = safeExistingOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const grandTotal = existingOrderSubtotal + newItemsSubtotal
    const hasActiveOrders = safeExistingOrderItems.length > 0 || totalCartCount > 0

    //if drawer state empty, then auto-collapse
    useEffect(() => {
        if (!hasActiveOrders && isExpanded) {
            setIsExpanded(false)
        }
    }, [hasActiveOrders, isExpanded])

    //order submission handler
    const handleConfirmOrder = async () => {
        if (!tenantSlug || cartItemsArray.length === 0 || isSubmittingOrder) return

        setIsSubmittingOrder(true)

        const newIdempotencyKey = generateIdempotencyKey();

        const targetOrderId = currentOrderId || activeOrderId;

        const isExistingOrder = (isOccupied || Boolean(targetOrderId) || safeExistingOrderItems.length > 0) && !isDirect

        const formattedItems = cartItemsArray.map((cartEntry) => {
            const parseId = Number(cartEntry.item.id)
            return {
                itemId: isNaN(parseId) ? 0 : parseId,
                quantity: cartEntry.quantity,
            }
        })

        try {
            let responseOrder;

            if (isExistingOrder && targetOrderId) {
                const addItemsPayload: AddOrderItemsPayload = {
                    idempotencyKey: newIdempotencyKey,
                    items: formattedItems,
                }

                await addItemsToOrderApi(tenantSlug, targetOrderId, addItemsPayload)

                // setIdempotencyKey(null)
                setCart({})

                showAlert(
                    "Order Updated",
                    `New items added to Order #${displayOrderNumber || currentOrderId}!`,
                    [
                        {
                            text: "OK",
                            onPress: () => router.back()
                        }
                    ]
                )
                return
            }

            if (isDirect) {
                // Direct Counter Order
                const orderPayload: CreateOrderPayload = {
                    idempotencyKey: newIdempotencyKey,
                    items: formattedItems,
                }
                responseOrder = await createOrderApi(tenantSlug, orderPayload)
            } else {
                // Table-Based Order with logged-in user details
                const parsedTableId = Number(tableId)
                const tableOrderPayload: CreateTableOrderPayload = {
                    tableId: isNaN(parsedTableId) ? 0 : parsedTableId,
                    customerName: user?.name || "Staff",
                    customerPhone: user?.phone || "",
                    customerAddress: "Dine-in",
                    items: formattedItems,
                    orderedAt: new Date().toISOString(),
                    idempotencyKey: newIdempotencyKey,
                }

                const apiRes = await createTableOrderApi(tenantSlug, tableOrderPayload)
                responseOrder = apiRes.data
            }

            setCart({})

            showAlert(
                "Order Created",
                `Order #${responseOrder.orderNumber} placed successfully!`,
                [
                    {
                        text: "OK",
                        onPress: () => router.back()
                    }
                ]
            )
        } catch (error: any) {
            if (isNetworkError(error)) {
                showAlert("Network Error", NETWORK_OFFLINE_MESSAGE)
            } else {
                console.error("Failed to process order:", error)
                const statusCode = error?.response?.status;
                const serverMsg =
                    error?.response?.data?.message ||
                    (error?.response?.data?.errors ? JSON.stringify(error.response.data.errors) : null) ||
                    "Invalid order parameters provided (400 Bad Request)."

                if (statusCode === 409) {
                    showAlert(
                        "Table State Conflict (409)",
                        `The server rejected the request: "${serverMsg}". If this table is already occupied, please go back to tables view and re-select.`
                    )
                } else {
                    showAlert(
                        "Order Processing Failed",
                        serverMsg
                    )
                }
            }
        } finally {
            setIsSubmittingOrder(false)
        }
    }

    return {
        //navigation and identifiers
        displayTableNumber, displayOrderNumber, capacity, isDirect, isOccupied, handleBackNavigation,

        //data and filters
        search, setSearch, selectedCategory, setSelectedCategory, categories, filteredMenuItems,

        //cart and order items
        cart, cartItemsArray, existingOrderItems,

        //calculations
        newItemsSubtotal, existingOrderSubtotal, grandTotal, totalCartCount, hasActiveOrders,

        //UI states
        isExpanded, setIsExpanded, isInitialLoading, isSearchLoading, isLoadingExistingOrder, isSubmittingOrder,

        //handlers
        addToCart, removeFromCart, updateExistingQty, removeExistingItem, handleConfirmOrder,
    }
}