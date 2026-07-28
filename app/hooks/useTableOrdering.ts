import { fetchMenuItemsApi, fetchMenusApi } from "@/services/menuService";
import { addItemsToOrderApi, AddOrderItemsPayload, createOrderApi, CreateOrderPayload, createTableOrderApi, CreateTableOrderPayload, fetchActiveOrderByTableIdApi, fetchOrderByIdApi, generateIdempotencyKey } from "@/services/orderService";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCustomAlert } from "../context/AlertContext";
import { useAuth } from "../context/AuthContext";

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
    const [categories, setCategories] = useState<string[]>(["All"])
    const [menuItems, setMenuItems] = useState<UIItem[]>([])

    //loaders
    const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true)
    const [isSearchLoading, setIsSearchLoading] = useState<boolean>(false)
    const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false)
    const [isLoadingExistingOrder, setIsLoadingExistingOrder] = useState<boolean>(false)

    //for pagination and infinite scroll state
    const [page, setPage] = useState<number>(0)
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
    const isInitialMount = useRef<boolean>(true)

    //for orders and cart
    const [cart, setCart] = useState<CartState>({})
    const [existingOrderItems, setExistingOrderItems] = useState<ExistingItem[]>([])
    const [isExpanded, setIsExpanded] = useState(false)
    const [activeOrderId, setActiveOrderId] = useState<string | number | null>(currentOrderId || null) //isolating the db 
    const [activeOrderNumber, setActiveOrderNumber] = useState<string>(currentOrderId || "")

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

    //loading the screen (initializing the menu)
    useEffect(() => {
        const loadInitialData = async () => {
            if (!tenantSlug) return

            try {
                setIsInitialLoading(true)

                const [rawMenus, rawItems] = await Promise.all([
                    fetchMenusApi(tenantSlug),
                    fetchMenuItemsApi(tenantSlug, 0, 10, "")
                ])

                const categoryNames = rawMenus
                    .filter((m) => m.active)
                    .map((m) => m.menuName)

                setCategories(["All", ...new Set(categoryNames)])

                const itemsList = rawItems?.content || []
                const formattedItems: UIItem[] = itemsList
                    .filter((item) => item.active)
                    .map((item) => ({
                        id: String(item.id),
                        name: item.name,
                        price: item.price,
                        category: item.menuName,
                        description: item.description || "",
                        image: item.imageUrl
                    }))

                setMenuItems(formattedItems)
                setPage(0)

                const isLast = rawItems.lastPage ?? rawItems.last ?? (1 >= rawItems.totalPages)
                setHasMore(!isLast && itemsList.length > 0)
            } catch (error) {
                console.error("Failed to load initial menu data:", error)
            } finally {
                setIsInitialLoading(false)
            }
        }

        loadInitialData()
    }, [tenantSlug])

    //debounce effect for the search
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false
            return
        }

        setIsSearchLoading(true)

        const timer = setTimeout(async () => {
            if (!tenantSlug) {
                setIsSearchLoading(false)
                return
            }

            try {
                const rawItems = await fetchMenuItemsApi(tenantSlug, 0, 10, search)
                const itemsList = rawItems?.content || []

                const formattedItems: UIItem[] = itemsList
                    .filter((item) => item.active)
                    .map((item) => ({
                        id: String(item.id),
                        name: item.name,
                        price: item.price,
                        category: item.menuName,
                        description: item.description || "",
                        image: item.imageUrl
                    }))

                setMenuItems(formattedItems)
                setPage(0)

                const isLast = rawItems.lastPage ?? rawItems.last ?? (1 >= rawItems.totalPages)
                setHasMore(!isLast && itemsList.length > 0)
            } catch (error) {
                console.error("Failed to search menu items:", error)
            } finally {
                setIsSearchLoading(false)
            }
        }, 400)

        return () => clearTimeout(timer)
    }, [search, tenantSlug])

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
                        // ⚡ Store order number (e.g. "ORD-AE4AFD3B") or fall back to order id
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

    //infinite pagination
    const loadMoreItems = useCallback(async () => {
        if (!hasMore || isLoadingMore || isInitialLoading || isSearchLoading || !tenantSlug) return

        try {
            setIsLoadingMore(true)
            const nextPage = page + 1
            const rawItems = await fetchMenuItemsApi(tenantSlug, nextPage, 10, search)
            const itemsList = rawItems?.content || []

            const newFormatted: UIItem[] = itemsList
                .filter((item) => item.active)
                .map((item) => ({
                    id: String(item.id),
                    name: item.name,
                    price: item.price,
                    category: item.menuName,
                    description: item.description || "",
                    image: item.imageUrl
                }))

            setMenuItems((prev) => {
                const existingIds = new Set(prev.map((p) => p.id))
                const uniqueNewItems = newFormatted.filter((p) => !existingIds.has(p.id))
                return [...prev, ...uniqueNewItems]
            })

            setPage(nextPage)

            const isLast = rawItems.lastPage ?? rawItems.last ?? (nextPage + 1 >= rawItems.totalPages)
            setHasMore(!isLast && itemsList.length > 0)
        } catch (error) {
            console.error("Failed to load more menu items:", error)
        } finally {
            setIsLoadingMore(false)
        }
    }, [hasMore, isLoadingMore, isInitialLoading, isSearchLoading, tenantSlug, page, search])

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

    const updateExistingQty = useCallback((id: string, delta: number) => {
        setExistingOrderItems(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = item.quantity + delta
                return newQty > 0 ? { ...item, quantity: newQty } : item
            }
            return item
        }))
    }, [])

    const removeExistingItem = useCallback((id: string, name: string) => {
        showAlert(
            "⚠️ Remove Item",
            `Remove "${name}" from the order?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => setExistingOrderItems(prev => prev.filter(item => item.id !== id))
                }
            ],
        )
    }, [showAlert])

    //computations [filtering, total, grandtotal, activeordercount]
    const filteredMenuItems = menuItems.filter((item) => selectedCategory === "All" || item.category === selectedCategory)
    const cartItemsArray = Object.values(cart)
    const newItemsSubtotal = cartItemsArray.reduce((sum, entry) => sum + (entry.item.price * entry.quantity), 0)
    const totalCartCount = cartItemsArray.reduce((prevQty, entry) => prevQty + entry.quantity, 0)
    const existingOrderSubtotal = existingOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const grandTotal = existingOrderSubtotal + newItemsSubtotal
    const hasActiveOrders = existingOrderItems.length > 0 || totalCartCount > 0

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

        // const activeKey = idempotencyKey || generateIdempotencyKey()
        // if (!idempotencyKey) {
        //     setIdempotencyKey(activeKey)
        // }
        const newIdempotencyKey = generateIdempotencyKey();

        const targetOrderId = currentOrderId || activeOrderId;

        const isExistingOrder = (isOccupied || Boolean(targetOrderId) || existingOrderItems.length > 0) && !isDirect

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

            // setIdempotencyKey(null)
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
            console.error("Failed to process order:", error)
            const statusCode = error?.response?.status;
            // const serverMsg = error?.response?.data?.message || "Could not complete request. Please try again."
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

        } finally {
            setIsSubmittingOrder(false)
        }
    }

    return {
        //navigation and identifiers
        displayTableNumber, displayOrderNumber, capacity, isDirect, isOccupied, router,

        //data and filters
        search, setSearch, selectedCategory, setSelectedCategory, categories, filteredMenuItems,

        //cart and order items
        cart, cartItemsArray, existingOrderItems,

        //calculations
        newItemsSubtotal, existingOrderSubtotal, grandTotal, totalCartCount, hasActiveOrders,

        //UI states
        isExpanded, setIsExpanded, isInitialLoading, setIsInitialLoading, isSearchLoading, isLoadingMore, isLoadingExistingOrder, isSubmittingOrder,

        //handlers
        addToCart, removeFromCart, updateExistingQty, removeExistingItem, loadMoreItems, handleConfirmOrder,
    }
}