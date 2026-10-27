import { ActiveTableOrderData, addItemsToOrderApi, AddOrderItemsPayload, createOrderApi, CreateOrderPayload, createTableOrderApi, CreateTableOrderPayload, deleteOrderItemApi, fetchActiveOrderByTableIdApi, generateIdempotencyKey, isOpenOrderStatus, updateOrderItemQtyApi } from "@/services/orderService";
import { fetchDiningTableByIdApi } from "@/services/tableService";
import { applyQuantityChange, ExistingItem, findGroupedExistingItems, planQuantityChange } from "@/utils/consolidateOrderItems";
import { isNetworkError, NETWORK_OFFLINE_MESSAGE } from "@/utils/networkError";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { AlertButton, useCustomAlert } from "../context/AlertContext";
import { useAuth } from "../context/AuthContext";
import { useCatalogItems, useMenuCategories, useMenuSearch } from "./useMenuCatalog";

const isSubscriptionError = (error: any): boolean => {
    const status = error?.response?.status;
    const msg = (error?.response?.data?.message || "").toLowerCase();
    return status === 400 && (msg.includes("subscription") || msg.includes("expired") || msg.includes("renew"));
};

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

export type { ExistingItem }

//why a table cannot take a new order right now
export interface TableBlock {
    reason: "no-open-order" | "lookup-failed"
    message: string
    lastOrderId: number | null
}

interface TableOrderLookup {
    tableStatus: string
    openOrder: ActiveTableOrderData | null
    block: TableBlock | null
}

const toExistingItems =(order: ActiveTableOrderData): ExistingItem[] =>
    (order.items || []).map((item) => ({
        id: String(item.id),
        itemId: item.itemId,
        name: item.itemName,
        price: item.price,
        quantity: item.quantity,
        kotSent: item.kotSent,
    }))

export function useTableOrdering() {
    const { tableId, tableNumber, capacity, isDirectOrder, status } = useLocalSearchParams<{
        tableId: string
        tableNumber?: string
        capacity?: string
        isDirectOrder: string
        status?: string
    }>()

    const router = useRouter()
    const { tenantSlug, user } = useAuth()
    const { showAlert } = useCustomAlert()

    const displayTableNumber = tableNumber || tableId
    const isDirect = tableId === 'direct' || isDirectOrder === 'true'

    //ui and control states
    const [search, setSearch] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("All")

    //loaders
    const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false)
    const [isLoadingExistingOrder, setIsLoadingExistingOrder] = useState<boolean>(!isDirect)

    //for orders and cart
    const [cart, setCart] = useState<CartState>({})
    const [existingOrderItems, setExistingOrderItems] = useState<ExistingItem[]>([])
    const [isExpanded, setIsExpanded] = useState(false)

    //live table state from the server; the dashboard param is only a fallback
    const [liveTableStatus, setLiveTableStatus] = useState<string>((status || "").toUpperCase())
    const [activeOrder, setActiveOrder] = useState<ActiveTableOrderData | null>(null)
    const [tableBlock, setTableBlock] = useState<TableBlock | null>(null)

    //modification tracking for back action feedback
    const [modifiedItemNames, setModifiedItemNames] = useState<Set<string>>(new Set())

    //retrying the same cart reuses its idempotency key
    const submitAttemptRef = useRef<{ signature: string, key: string } | null>(null)
    const lookupSeqRef = useRef(0)

    const targetOrderId = activeOrder?.id ?? null
    const displayOrderNumber = activeOrder ? (activeOrder.orderNumber || String(activeOrder.id)) : ""
    const isOccupied = !isDirect && (Boolean(activeOrder) || liveTableStatus === "OCCUPIED")

    //finds the table's open order, or the reason it can't take a new one
    const lookupTableOrder = useCallback(async (): Promise<TableOrderLookup> => {
        if (isDirect || !tableId || !tenantSlug) {
            return { tableStatus: "", openOrder: null, block: null }
        }

        const [tableResult, orderResult] = await Promise.allSettled([
            fetchDiningTableByIdApi(tenantSlug, tableId),
            fetchActiveOrderByTableIdApi(tenantSlug, tableId),
        ])

        const tableStatus = tableResult.status === "fulfilled" && tableResult.value?.status
            ? tableResult.value.status.toUpperCase()
            : (status || "").toUpperCase()
        const isTableOccupied = tableStatus === "OCCUPIED"

        let openOrder: ActiveTableOrderData | null = null
        let block: TableBlock | null = null

        if (orderResult.status === "fulfilled") {
            const order = orderResult.value?.data ?? null

            if (order && isOpenOrderStatus(order.status)) {
                openOrder = order
            } else if (isTableOccupied) {
                const orderLabel = order ? `Order #${order.orderNumber || order.id} (${order.status}, payment ${order.paymentStatus || "PENDING"})` : ""
                const isLastOrderClosed = !order || order.status?.toUpperCase() === "CANCELLED" || order.paymentStatus?.toUpperCase() === "PAID"
                block = {
                    reason: "no-open-order",
                    message: !order
                        ? `Table ${displayTableNumber} is marked occupied but has no order. Ask an admin to free the table.`
                        : isLastOrderClosed
                            ? `Table ${displayTableNumber} is still marked occupied, but its last order ${orderLabel} is already closed. Ask an admin to free the table.`
                            : `Table ${displayTableNumber} is still occupied by ${orderLabel}. Settle that order before starting a new one.`,
                    lastOrderId: order?.id ?? null,
                }
            }
        } else if (isTableOccupied || isNetworkError(orderResult.reason)) {
            //don't guess that the table is free
            block = {
                reason: "lookup-failed",
                message: isNetworkError(orderResult.reason)
                    ? NETWORK_OFFLINE_MESSAGE
                    : `Could not load the running order for Table ${displayTableNumber}. Tap the order button to try again.`,
                lastOrderId: null,
            }
        }

        return { tableStatus, openOrder, block }
    }, [isDirect, tableId, tenantSlug, status, displayTableNumber])

    const applyLookup = useCallback((lookup: TableOrderLookup) => {
        setLiveTableStatus(lookup.tableStatus)
        setActiveOrder(lookup.openOrder)
        setExistingOrderItems(lookup.openOrder ? toExistingItems(lookup.openOrder) : [])
        setTableBlock(lookup.block)
        setIsLoadingExistingOrder(false)
    }, [])

    const showTableBlockAlert = useCallback((block: TableBlock) => {
        const buttons: AlertButton[] = [
            { text: "OK", style: "cancel" },
        ]
        if (block.lastOrderId !== null) {
            const orderId = block.lastOrderId
            buttons.push({ text: "Open Order", onPress: () => router.push(`/orders/${orderId}`) })
        }
        showAlert(block.reason === "lookup-failed" ? "Table Unavailable" : "Table Occupied", block.message, buttons)
    }, [router, showAlert])

    //showAlert changes on every alert, so it stays out of the lookup effect's deps
    const announceTableBlock = useEffectEvent((block: TableBlock) => showTableBlockAlert(block))

    //look the table up once and warn right away if it's blocked
    useEffect(() => {
        if (isDirect) return
        const seq = ++lookupSeqRef.current
        lookupTableOrder().then((lookup) => {
            if (seq !== lookupSeqRef.current) return
            applyLookup(lookup)
            if (lookup.block) announceTableBlock(lookup.block)
        })
    }, [isDirect, lookupTableOrder, applyLookup])

    const reloadTableOrder = useCallback(async (): Promise<TableOrderLookup> => {
        const seq = ++lookupSeqRef.current
        setIsLoadingExistingOrder(true)
        const lookup = await lookupTableOrder()
        if (seq === lookupSeqRef.current) applyLookup(lookup)
        return lookup
    }, [lookupTableOrder, applyLookup])

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

        //itemId is the merged row's id; the change goes to one of its lines
        const groupedLines = findGroupedExistingItems(existingOrderItems, itemId)
        const change = planQuantityChange(groupedLines, delta)
        if (!change) return

        const previousItems = existingOrderItems
        setExistingOrderItems(applyQuantityChange(existingOrderItems, change))

        try {
            if (change.kind === "delete") {
                await deleteOrderItemApi(tenantSlug, targetOrderId, change.lineId)
            } else {
                await updateOrderItemQtyApi(tenantSlug, targetOrderId, change.lineId, change.quantity)
            }
            setModifiedItemNames((prev) => new Set(prev).add(groupedLines[0].name))
        } catch (error: any) {
            //rollback ui state on failure
            setExistingOrderItems(previousItems)
            if (isNetworkError(error)) {
                showAlert("Network Error", NETWORK_OFFLINE_MESSAGE)
            } else {
                console.error("Failed to update item quantity:", error)
                showAlert("Update Failed", "Could not update item quantity on the server")
            }
        }
    }, [tenantSlug, targetOrderId, existingOrderItems, showAlert])

    const removeExistingItem = useCallback(async (itemId: string | number, name: string) => {
        if (!tenantSlug || !targetOrderId) return

        const matchingItems = findGroupedExistingItems(existingOrderItems, itemId)
        if (matchingItems.length === 0) return

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
                        const originalList = existingOrderItems
                        setExistingOrderItems((prev) => prev.filter(item => !matchingIds.has(item.id)))

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

        if (!isDirect && isLoadingExistingOrder) return

        if (!isDirect && tableBlock) {
            if (tableBlock.reason !== "lookup-failed") {
                showTableBlockAlert(tableBlock)
                return
            }
            //the first lookup failed: retry it before placing anything
            const lookup = await reloadTableOrder()
            if (lookup.block) {
                showTableBlockAlert(lookup.block)
                return
            }
            if (lookup.openOrder) {
                showAlert(
                    "Running Order Found",
                    `Table ${displayTableNumber} has Order #${lookup.openOrder.orderNumber || lookup.openOrder.id} (${lookup.openOrder.status}). Review it and tap "Update Order" to add your items.`
                )
                return
            }
        }

        const formattedItems = cartItemsArray.map((cartEntry) => {
            const parseId = Number(cartEntry.item.id)
            return {
                itemId: isNaN(parseId) ? 0 : parseId,
                quantity: cartEntry.quantity,
            }
        })

        const target = isDirect ? "direct" : targetOrderId ? `order:${targetOrderId}` : `table:${tableId}`
        const signature = `${target}|${JSON.stringify(formattedItems)}`
        if (submitAttemptRef.current?.signature !== signature) {
            submitAttemptRef.current = { signature, key: generateIdempotencyKey() }
        }
        const idempotencyKey = submitAttemptRef.current.key

        setIsSubmittingOrder(true)

        try {
            let responseOrder;

            if (!isDirect && targetOrderId) {
                const addItemsPayload: AddOrderItemsPayload = {
                    idempotencyKey,
                    items: formattedItems,
                }

                await addItemsToOrderApi(tenantSlug, targetOrderId, addItemsPayload)

                submitAttemptRef.current = null
                setCart({})

                showAlert(
                    "Order Updated",
                    `New items added to Order #${displayOrderNumber}!`,
                    [
                        {
                            text: "OK",
                            onPress: () => router.replace("/(tabs)/orders")
                        }
                    ]
                )
                return
            }

            if (isDirect) {
                // Direct Counter Order
                const orderPayload: CreateOrderPayload = {
                    idempotencyKey,
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
                    idempotencyKey,
                }

                const apiRes = await createTableOrderApi(tenantSlug, tableOrderPayload)
                responseOrder = apiRes.data
            }

            submitAttemptRef.current = null
            setCart({})

            showAlert(
                "Order Created",
                `Order #${responseOrder.orderNumber} placed successfully!`,
                [
                    {
                        text: "OK",
                        onPress: () => isDirect ? router.back() : router.replace("/(tabs)/orders")
                    }
                ]
            )
        } catch (error: any) {
            if (isNetworkError(error)) {
                showAlert("Network Error", NETWORK_OFFLINE_MESSAGE)
            } else {
                console.error("Failed to process order:", {
                    status: error?.response?.status,
                    message: error?.response?.data?.message,
                    url: error?.config?.url,
                })
                const statusCode = error?.response?.status;
                const serverMsg =
                    error?.response?.data?.message ||
                    (error?.response?.data?.errors ? JSON.stringify(error.response.data.errors) : null) ||
                    "Invalid order parameters provided (400 Bad Request)."

                if (statusCode === 409 && !isDirect) {
                    //the table got an order meanwhile: switch to it and keep the cart
                    const { openOrder } = await reloadTableOrder()
                    if (openOrder) {
                        showAlert(
                            "Table Already Has an Order",
                            `Table ${displayTableNumber} already has Order #${openOrder.orderNumber || openOrder.id} (${openOrder.status}). Your items are still in the cart — review them and tap "Update Order" to add them to that order.`
                        )
                    } else {
                        showAlert(
                            "Table State Conflict (409)",
                            `The server rejected the request: "${serverMsg}". Go back to the tables view and re-select this table.`
                        )
                    }
                } else if (isSubscriptionError(error)) {
                    showAlert(
                        "Subscription Expired",
                        "Your subscription has expired. Please contact your administrator to renew before placing orders."
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

        //live table state
        activeOrderStatus: activeOrder?.status ?? null, tableBlock, reloadTableOrder,

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
