import { fetchMenuItemsApi, MenuItem } from "@/services/menuService";
import { addItemsToOrderApi, AddOrderItemsPayload, applyPromoApi, cancelOrderApi, deleteOrderItemApi, fetchOrderByIdApi, generateIdempotencyKey, Order, OrderItem, removePromoApi, updateOrderItemQtyApi, updateOrderStatusApi, updatePaymentStatusApi } from "@/services/orderService";
import { fetchPromoCodesApi, PromoCode } from "@/services/promoService";
import { isNetworkError, NETWORK_OFFLINE_MESSAGE } from "@/utils/networkError";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCustomAlert } from "../context/AlertContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { generateInvoiceHtml, generateKOTHtml, generatePOSHtml } from "../utils/billTemplates";
import { applyQuantityChange, findGroupedOrderItems, planQuantityChange } from "../utils/consolidateOrderItems";
import { usePrintHandler } from "./usePrintHandler";

export function useOrderDetails() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const { isDark } = useTheme();
    const { tenantSlug } = useAuth();
    const { showAlert } = useCustomAlert();
    const { printDocument, shareDocument, showToast } = usePrintHandler();

    // Screen and Order state
    const [isLoading, setIsLoading] = useState(true);
    const [networkError, setNetworkError] = useState(false);
    const [orderData, setOrderData] = useState<Order | null>(null);
    const [isInvoiceVisible, setIsInvoiceVisible] = useState(false);

    const [orderStatus, setOrderStatus] = useState<string>("PENDING");
    const [paymentStatus, setPaymentStatus] = useState<string>("PENDING");
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

    //states for the staged items that awaits Confirm Added Items
    const [pendingItems, setPendingItems] = useState<Array<{ item: MenuItem; quantity: number }>>([]);
    const [isSubmittingNewItems, setIsNewSubmittingNewItems] = useState<boolean>(false);

    // Catalog state
    const [catalogItems, setCatalogItems] = useState<MenuItem[]>([]);
    const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(false);
    const [isAddSectionExpanded, setIsAddSectionExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [debouncedQuery, setDebouncedQuery] = useState<string>("");
    const [isSearching, setIsSearching] = useState<boolean>(false);

    // Discounts & Promo state
    const [promoSearchQuery, setPromoSearchQuery] = useState("");
    const [selectedPromo, setSelectedPromo] = useState<PromoCode | null>(null);
    const [isPromoExpanded, setIsPromoExpanded] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
    const [promoDiscountVal, setPromoDiscountVal] = useState(0);
    const [manualDiscountStr, setManualDiscountStr] = useState("0");
    const [availablePromos, setAvailablePromos] = useState<PromoCode[]>([]);

    // Theme palette
    const colors = useMemo(() => ({
        bg: isDark ? "#0F172A" : "#F8FAFC",
        cardBg: isDark ? "#1E293B" : "#FFFFFF",
        textMain: isDark ? "#FFFFFF" : "#0F172A",
        textMuted: isDark ? "#94A3B8" : "#64748B",
        border: isDark ? "#334155" : "#E2E8F0",
        primary: "#6366F1",
        accentGreen: "#16A34A",
        accentRed: "#EF4444",
        accentYellow: "#D97706",
        accentYellowBg: isDark ? "#451A03" : "#FEF3C7",
        accentGreenBg: isDark ? "#064E3B" : "#DCFCE7",
        accentRedBg: isDark ? "#7F1D1D" : "#FEE2E2",
    }), [isDark]);

    // State flags
    const isCancelled = orderStatus === "CANCELLED";
    const isPaid = paymentStatus === "PAID";
    const isOrderFinalized = orderStatus === "DELIVERED" || orderStatus === "COMPLETED" || isCancelled || isPaid;
    const hasPendingItems = pendingItems.length > 0;

    // Load order details
    const loadOrderData = useCallback(async () => {
        if (!tenantSlug || !orderId) {
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            const res = await fetchOrderByIdApi(tenantSlug, orderId);
            if (res) {
                setOrderData(res);
                setOrderStatus(res.status || "PENDING");
                setPaymentStatus(res.paymentStatus || "PENDING");
                setOrderItems(res.items || []);
                if (res.manualDiscount) setManualDiscountStr(res.manualDiscount.toString());
                if (res.promoCode) {
                    setAppliedPromo(res.promoCode);
                    setPromoDiscountVal(res.promoDiscount || 0);
                } else {
                    setAppliedPromo(null);
                    setPromoDiscountVal(0);
                }
            }
        } catch (error) {
            if (isNetworkError(error)) {
                setNetworkError(true);
            }
        } finally {
            setIsLoading(false);
        }
    }, [tenantSlug, orderId, showAlert]);

    useEffect(() => { loadOrderData(); }, [loadOrderData]);

    // Load catalog menu items
    useEffect(() => {
        if (!tenantSlug) return;
        const loadCatalog = async () => {
            try {
                setIsCatalogLoading(true);
                const response = await fetchMenuItemsApi(tenantSlug, 0, 100, "");
                const itemsList = response?.content || [];
                setCatalogItems(itemsList.filter((item) => item.active !== false));
        } catch (error) {
            if (isNetworkError(error)) {
                setNetworkError(true);
            }
        } finally {
                setIsCatalogLoading(false);
            }
        };
        loadCatalog();
    }, [tenantSlug]);

    // Load promo codes
    useEffect(() => {
        if (!tenantSlug) return;
        const loadPromos = async () => {
            try {
                const list = await fetchPromoCodesApi(tenantSlug);
                setAvailablePromos(list);
            } catch (error) {
                if (isNetworkError(error)) {
                    showAlert("Network Error", NETWORK_OFFLINE_MESSAGE)
                }
            }
        };
        loadPromos();
    }, [tenantSlug]);

    // Search query debouncing
    useEffect(() => {
        if (searchQuery !== debouncedQuery) {
            setIsSearching(true);
        }
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(handler);
    }, [searchQuery, debouncedQuery]);

    // Math calculations
    const itemsTotalSum = useMemo(() => {
        return orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [orderItems]);

    const parsedManualDiscount = parseFloat(manualDiscountStr) || 0;
    const grandFinalTotal = Math.max(0, itemsTotalSum - promoDiscountVal - parsedManualDiscount);

    // Filtering catalog
    const filteredCatalog = useMemo(() => {
        if (!debouncedQuery.trim()) return catalogItems;
        const query = debouncedQuery.toLowerCase();
        return catalogItems.filter((item) => item.name.toLowerCase().includes(query));
    }, [catalogItems, debouncedQuery]);

    // Filtering available promos by search query
    const filteredPromos = useMemo(() => {
        const activePromos = availablePromos.filter((p) => p.status === "ACTIVE");
        const query = (promoSearchQuery || "").trim().toLowerCase();
        if (!query) return activePromos;
        return activePromos.filter(
            (p) =>
                (p.code || "").toLowerCase().includes(query) ||
                (p.description || "").toLowerCase().includes(query)
        );
    }, [availablePromos, promoSearchQuery]);

    // Cancel order confirmation
    const confirmOrderCancellation = useCallback(async () => {
        if (!tenantSlug || !orderId) return

        showAlert(
            "⚠️ Cancel Order",
            "Are you sure you want to cancel this order? This action is permanent and cannot be undone.",
            [
                { text: "Keep Order", style: "cancel" },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const updatedOrder = await cancelOrderApi(tenantSlug, orderId)
                            setOrderStatus(updatedOrder.status)
                            setPaymentStatus(updatedOrder.paymentStatus || "PENDING")
                            showToast("Order cancelled")
                        } catch (error: any) {
                            const msg = error?.response?.data?.message || "Could not cancel order. Please try again."
                            showAlert("Cancellation failed", msg)
                        }
                    }
                },
            ],
            { cancelable: true }
        );
    }, [tenantSlug, orderId, showToast, showAlert]);

    // Order status selection modal
    const handleOrderStatusSelect = useCallback(() => {
        if (isOrderFinalized) {
            showAlert(
                "🔒 Order Locked",
                `This order is marked as ${orderStatus.toUpperCase()} and cannot be changed further.`
            );
            return;
        }

        showAlert(
            "Is this order cancelled?",
            "Tap below if this order is cancelled.",
            [
                {
                    text: "CANCEL ORDER",
                    style: "destructive",
                    onPress: () => confirmOrderCancellation()
                }
            ],
            { cancelable: true }
        );

    }, [isOrderFinalized, orderStatus, tenantSlug, confirmOrderCancellation, showAlert]);

    // Settle payment (Cash / Digital)
    const handleSettlePayment = useCallback(async (method: string) => {
        if (isCancelled || isPaid || !tenantSlug || !orderId) return;
        if (hasPendingItems) {
            showAlert("Pending Items", "Confirm the added items before settling payment.")
            return;
        }

        const paymentMethod = method === "Cash" ? "CASH" : "DIGITAL_WALLET";

        try {
            await updatePaymentStatusApi(tenantSlug, orderId, {
                paymentStatus: "PAID",
                paymentMethod,
                manualDiscount: parsedManualDiscount || 0,
            });

            await updateOrderStatusApi(tenantSlug, orderId, "DELIVERED");

            setPaymentStatus("PAID");
            setOrderStatus("DELIVERED");
            showToast(`Settled via ${method}! Order marked as Delivered.`)
        } catch (error: any) {
            if (isNetworkError(error)) {
                showAlert("Network Error", NETWORK_OFFLINE_MESSAGE);
            } else {
                const serverErr = error?.response?.data?.errors;
                const msg =
                    (serverErr ? (typeof serverErr === "object" ? JSON.stringify(serverErr) : String(serverErr)) : null) ||
                    error?.response?.data?.message ||
                    "Failed to settle payment. Please try again.";
                showAlert("Settlement Failed", msg);
            }
        }
    }, [isCancelled, isPaid, hasPendingItems, tenantSlug, orderId, parsedManualDiscount, showToast, showAlert]);

    // Update existing item quantity API integration.
    // itemId is the merged row's id; the change lands on one of the lines merged into it.
    const updateExistingQty = useCallback(async (itemId: string | number, delta: number) => {
        if (isOrderFinalized || !tenantSlug || !orderId) {
            if (isOrderFinalized) showAlert("Order Locked", "Cannot modify items on a finalized order.");
            return;
        }

        const change = planQuantityChange(findGroupedOrderItems(orderItems, itemId), delta);
        if (!change) return;

        const previousItems = orderItems;
        setOrderItems(applyQuantityChange(orderItems, change).map((item) => ({ ...item, totalPrice: item.quantity * item.price })));

        try {
            if (change.kind === "delete") {
                await deleteOrderItemApi(tenantSlug, orderId, change.lineId);
            } else {
                await updateOrderItemQtyApi(tenantSlug, orderId, change.lineId, change.quantity);
            }
        } catch (error) {
            setOrderItems(previousItems);
            if (isNetworkError(error)) {
                showAlert("Network Error", NETWORK_OFFLINE_MESSAGE);
            } else {
                showAlert("Update Failed", "Could not update item quantity on the server.");
            }
        }
    }, [isOrderFinalized, tenantSlug, orderId, orderItems, showAlert]);

    // Remove item from order API integration
    const removeItem = useCallback((itemId: string | number, name: string) => {
        if (isOrderFinalized || !tenantSlug || !orderId) {
            if (isOrderFinalized) showAlert("Order Locked", "Cannot remove items from a finalized order.");
            return;
        }

        const matchingItems = findGroupedOrderItems(orderItems, itemId);
        if (matchingItems.length === 0) return;

        const label = matchingItems.length > 1
            ? `"${name}" (all ${matchingItems.length} entries)`
            : `"${name}"`;

        showAlert("⚠️ Remove Item", `Remove ${label} from order?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Yes, Delete",
                style: "destructive",
                onPress: async () => {
                    const prevItems = orderItems;
                    const matchingIds = new Set(matchingItems.map((i) => String(i.id)));
                    setOrderItems((prev) => prev.filter((item) => !matchingIds.has(String(item.id))));
                    try {
                        for (const item of matchingItems) {
                            await deleteOrderItemApi(tenantSlug, orderId, item.id);
                        }
                    } catch (error) {
                        setOrderItems(prevItems);
                        if (isNetworkError(error)) {
                            showAlert("Network Error", NETWORK_OFFLINE_MESSAGE);
                        } else {
                            showAlert("Delete Failed", "Could not delete item from server.");
                        }
                    }
                }
            }
        ]);
    }, [isOrderFinalized, tenantSlug, orderId, orderItems, showAlert]);

    // Add item from catalog to order
    const addItemToActiveOrder = useCallback((catalogItem: MenuItem) => {
        if (isOrderFinalized) {
            showAlert("Order Locked", "Cannot add items to a finalized order.");
            return;
        }
        setPendingItems((prev) => {
            const existing = prev.find((p) => p.item.id === catalogItem.id);
            if (existing) {
                return prev.map((p) =>
                    p.item.id === catalogItem.id
                        ? { ...p, quantity: p.quantity + 1 } : p
                );
            }
            return [...prev, { item: catalogItem, quantity: 1 }];
        });
    }, [isOrderFinalized, showAlert]);

    const handleConfirmAddedItems = useCallback(async () => {
        if (!tenantSlug || !orderId || pendingItems.length === 0 || isSubmittingNewItems) return;

        setIsNewSubmittingNewItems(true);
        const idempotencyKey = generateIdempotencyKey();

        const formattedItems = pendingItems.map((p) => ({
            itemId: p.item.id,
            quantity: p.quantity,
        }))

        const payload: AddOrderItemsPayload = {
            idempotencyKey,
            items: formattedItems,
        }

        try {
            await addItemsToOrderApi(tenantSlug, orderId, payload)
            setPendingItems([])
            await loadOrderData()
            showToast("Items added to order!")
        } catch (error: any) {
            if (isNetworkError(error)) {
                showAlert("Network Error", NETWORK_OFFLINE_MESSAGE);
            } else {
                const msg = error?.response?.data?.message || "Failed to add items. Please try again."
                showAlert("Add Items Failed", msg);
            }
        } finally {
            setIsNewSubmittingNewItems(false);
        }
    }, [tenantSlug, orderId, pendingItems, isSubmittingNewItems, loadOrderData, showToast, showAlert])

    // Select a promo from the search list
    const handleSelectPromo = useCallback((promo: PromoCode) => {
        setSelectedPromo(promo);
        setPromoSearchQuery("");
        setIsPromoExpanded(false);
    }, []);

    // Apply promo code logic — backend is the source of truth for validation & discount
    const handleApplyPromo = useCallback(async () => {
        if (!tenantSlug || !orderId) return;
        if (!selectedPromo) {
            showAlert("No Promo Selected", "Please select a promo code from the list first.");
            return;
        }

        try {
            const updatedOrder = await applyPromoApi(tenantSlug, orderId, selectedPromo.code);
            setAppliedPromo(updatedOrder.promoCode || selectedPromo.code);
            setPromoDiscountVal(updatedOrder.promoDiscount || 0);
            setSelectedPromo(null);
            showAlert("Promo Applied!", `Code '${updatedOrder.promoCode || selectedPromo.code}' applied. Discount: Rs. ${updatedOrder.promoDiscount || 0}`);
        } catch (error: any) {
            if (isNetworkError(error)) {
                showAlert("Network Error", NETWORK_OFFLINE_MESSAGE);
            } else {
                const msg = error?.response?.data?.message || "Failed to apply promo. Please try again.";
                showAlert("Promo Failed", msg);
            }
        }
    }, [selectedPromo, tenantSlug, orderId, showAlert]);

    const handleClearPromo = useCallback(() => {
        if (!appliedPromo || !tenantSlug || !orderId) return;
        showAlert(
            "Remove Promo",
            `Remove promo code '${appliedPromo}' from this order?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes, Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await removePromoApi(tenantSlug, orderId);
                            setAppliedPromo(null);
                            setPromoDiscountVal(0);
                            showToast("Promo removed");
                        } catch (error: any) {
                            if (isNetworkError(error)) {
                                showAlert("Network Error", NETWORK_OFFLINE_MESSAGE);
                            } else {
                                const msg = error?.response?.data?.message || "Failed to remove promo. Please try again.";
                                showAlert("Remove Failed", msg);
                            }
                        }
                    }
                },
            ],
            { cancelable: true }
        );
    }, [appliedPromo, tenantSlug, orderId, showToast, showAlert]);

    const getStatusColors = useCallback((status: string) => {
        switch (status) {
            case "DELIVERED":
            case "COMPLETED":
            case "PAID":
                return { bg: colors.accentGreenBg, text: colors.accentGreen };
            case "CANCELLED":
                return { bg: colors.accentRedBg, text: colors.accentRed };
            case "CONFIRMED":
            case "PENDING":
            default:
                return { bg: colors.accentYellowBg, text: colors.accentYellow };
        }
    }, [colors]);

    const handlePrintPOS = useCallback(() => {
        shareDocument(generatePOSHtml(orderData, orderId || "", tenantSlug || "", orderItems, itemsTotalSum, parsedManualDiscount, grandFinalTotal, appliedPromo, promoDiscountVal), "POS bill ready to share!");
    }, [shareDocument, orderData, orderId, tenantSlug, orderItems, itemsTotalSum, parsedManualDiscount, grandFinalTotal, appliedPromo, promoDiscountVal]);

    const handlePrintInvoice = useCallback(() => {
        shareDocument(generateInvoiceHtml(orderData, orderId || "", tenantSlug || "", orderItems, itemsTotalSum, grandFinalTotal, appliedPromo, promoDiscountVal), "Invoice ready to share!");
    }, [shareDocument, orderData, orderId, tenantSlug, orderItems, itemsTotalSum, grandFinalTotal, appliedPromo, promoDiscountVal]);

    const handlePrintKOT = useCallback(() => {
        printDocument(generateKOTHtml(orderData, orderId || "", tenantSlug || "", orderItems), "KOT ticket sent to kitchen!");
    }, [printDocument, orderData, orderId, tenantSlug, orderItems]);

    return {
        orderId,
        tenantSlug,
        colors,
        isLoading,
        networkError,
        orderData,
        orderStatus,
        paymentStatus,
        orderItems,
        isCancelled,
        isPaid,
        isOrderFinalized,
        searchQuery,
        setSearchQuery,
        isSearching,
        isCatalogLoading,
        filteredCatalog,
        isAddSectionExpanded,
        setIsAddSectionExpanded,
        promoSearchQuery,
        setPromoSearchQuery,
        selectedPromo,
        setSelectedPromo,
        isPromoExpanded,
        setIsPromoExpanded,
        filteredPromos,
        appliedPromo,
        setAppliedPromo,
        setPromoDiscountVal,
        promoDiscountVal,
        itemsTotalSum,
        parsedManualDiscount,
        grandFinalTotal,
        isInvoiceVisible,
        setIsInvoiceVisible,
        handleOrderStatusSelect,
        handleSettlePayment,
        updateExistingQty,
        removeItem,
        addItemToActiveOrder,
        handleSelectPromo,
        handleApplyPromo,
        handleClearPromo,
        getStatusColors,
        handlePrintPOS,
        handlePrintInvoice,
        handlePrintKOT,
        pendingItems,
        setPendingItems,
        hasPendingItems,
        isSubmittingNewItems,
        handleConfirmAddedItems,
    };
}
