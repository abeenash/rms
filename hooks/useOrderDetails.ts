import { fetchMenuItemsApi, MenuItem } from "@/services/menuService";
import { addItemsToOrderApi, AddOrderItemsPayload, deleteOrderItemApi, fetchOrderByIdApi, generateIdempotencyKey, Order, OrderItem, updateOrderItemQtyApi, updateOrderStatusApi, updatePaymentStatusApi } from "@/services/orderService";
import { fetchPromoCodesApi, PromoCode } from "@/services/promoService";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCustomAlert } from "../context/AlertContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { generateInvoiceHtml, generateKOTHtml, generatePOSHtml } from "../utils/billTemplates";
import { usePrintHandler } from "./usePrintHandler";

export function useOrderDetails() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const { isDark } = useTheme();
    const { tenantSlug } = useAuth();
    const { showAlert } = useCustomAlert();
    const { printDocument, showToast } = usePrintHandler();

    // Screen and Order state
    const [isLoading, setIsLoading] = useState(true);
    const [orderData, setOrderData] = useState<Order | null>(null);
    const [isInvoiceVisible, setIsInvoiceVisible] = useState(false);
    const [isQRModalVisible, setIsQRModalVisible] = useState(false);

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
    const [promoInput, setPromoInput] = useState("");
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
    const isOrderFinalized = orderStatus === "DELIVERED" || isCancelled || isPaid;
    const hasPendingItems = pendingItems.length > 0;

    // Load order details
    const loadOrderData = useCallback(async () => {
        if (!tenantSlug || !orderId) return;
        try {
            setIsLoading(true);
            const res = await fetchOrderByIdApi(tenantSlug, orderId);
            if (res) {
                setOrderData(res);
                setOrderStatus(res.status || "PENDING");
                setPaymentStatus(res.paymentStatus || "PENDING");
                setOrderItems(res.items || []);
                if (res.manualDiscount) setManualDiscountStr(res.manualDiscount.toString());
            }
        } catch (error) {
            showAlert("Error", "Could not load order details.");
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
                console.error("Failed to load catalog menu items:", error);
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
            const list = await fetchPromoCodesApi(tenantSlug);
            setAvailablePromos(list);
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

    // Cancel order confirmation
    const confirmOrderCancellation = useCallback(() => {
        showAlert(
            "⚠️ Cancel Order",
            "Are you sure you want to cancel this order? This action is permanent and cannot be undone.",
            [
                { text: "No, Keep Order", style: "cancel" },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: () => {
                        setOrderStatus("CANCELLED");
                        setPaymentStatus("PENDING");
                        showToast("Order cancelled");
                    }
                }
            ]
        );
    }, [showToast, showAlert]);

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
            "Update Order Status",
            "Select the new status for this order:",
            [
                {
                    text: "CONFIRMED",
                    onPress: async () => {
                        try {
                            await updateOrderStatusApi(tenantSlug!, orderId!, "CONFIRMED");
                            setOrderStatus("CONFIRMED");
                            showToast("Order set to Confirmed");
                        } catch (err: any) {
                            const msg = err?.response?.data?.message || "Could not update order status.";
                            showAlert("Update Failed", msg);
                        }
                    }
                },
                {
                    text: "DELIVERED (Mark as Paid)",
                    onPress: async () => {
                        try {
                            await updatePaymentStatusApi(tenantSlug!, orderId!, {
                                paymentStatus: "PAID",
                                paymentMethod: "CASH",
                            });
                            await updateOrderStatusApi(tenantSlug!, orderId!, "DELIVERED");
                            setOrderStatus("DELIVERED");
                            setPaymentStatus("PAID");
                            showToast("Order delivered & paid!");
                        } catch (err: any) {
                            const msg = err?.response?.data?.message || "Could not update order status.";
                            showAlert("Update Failed", msg);
                        }
                    }
                },
                {
                    text: "CANCEL ORDER",
                    style: "destructive",
                    onPress: () => confirmOrderCancellation()
                },
                { text: "Cancel", style: "cancel" }
            ]
        );
    }, [isOrderFinalized, orderStatus, tenantSlug, orderId, showToast, confirmOrderCancellation, showAlert]);

    // Payment status selection modal
    const handlePaymentStatusSelect = useCallback(() => {
        if (isOrderFinalized) {
            showAlert(
                "🔒 Payment Locked",
                `Payment status is finalized as ${paymentStatus.toUpperCase()} and cannot be reverted.`
            );
            return;
        }

        showAlert(
            "Update Payment Status",
            "Select payment status:",
            [
                {
                    text: "PAID (Delivers Order)",
                    onPress: async () => {
                        try {
                            await updatePaymentStatusApi(tenantSlug!, orderId!, {
                                paymentStatus: "PAID",
                                paymentMethod: "CASH",
                            });
                            await updateOrderStatusApi(tenantSlug!, orderId!, "DELIVERED");
                            setPaymentStatus("PAID");
                            setOrderStatus("DELIVERED");
                            showToast("Payment settled! Order delivered.");
                        } catch (err: any) {
                            const msg = err?.response?.data?.message || "Could not update payment status.";
                            showAlert("Update Failed", msg);
                        }
                    }
                },
                {
                    text: "PENDING",
                    onPress: async () => {
                        try {
                            await updatePaymentStatusApi(tenantSlug!, orderId!, {
                                paymentStatus: "PENDING",
                                paymentMethod: "CASH",
                            });
                            setPaymentStatus("PENDING");
                            showToast("Payment set to Pending");
                        } catch (err: any) {
                            const msg = err?.response?.data?.message || "Could not update payment status.";
                            showAlert("Update Failed", msg);
                        }
                    }
                },
                { text: "Cancel", style: "cancel" }
            ]
        );
    }, [isOrderFinalized, paymentStatus, tenantSlug, orderId, showToast, showAlert]);

    // Settle payment (Cash / Digital)
    const handleSettlePayment = useCallback(async (method: string) => {
        if (isCancelled) { return; }
        if (isPaid) { return; }
        if (hasPendingItems) {
            showAlert("Pending Items", "Confirm the added items before settling payment.")
            return;
        }

        const paymentMethod = method === "Cash" ? "CASH" : "DIGITAL_WALLET";

        try {
            await updatePaymentStatusApi(tenantSlug!, orderId!, {
                paymentStatus: "PAID",
                paymentMethod,
                manualDiscount: parsedManualDiscount || 0,
            });

            await updateOrderStatusApi(tenantSlug!, orderId!, "DELIVERED");

            setPaymentStatus("PAID");
            setOrderStatus("DELIVERED");
            showToast(`Settled via ${method}! Order marked as Delivered.`)
        } catch (error: any) {
            console.error("Payment settlement error:", error?.response?.data || error);
            const serverErr = error?.response?.data?.errors;
            const msg =
                (serverErr ? (typeof serverErr === "object" ? JSON.stringify(serverErr) : String(serverErr)) : null) ||
                error?.response?.data?.message ||
                "Failed to settle payment. Please try again.";
            showAlert("Settlement Failed", msg);
        }
    }, [isCancelled, isPaid, hasPendingItems, tenantSlug, orderId, parsedManualDiscount, showToast, showAlert]);

    // Update existing item quantity API integration
    const updateExistingQty = useCallback(async (itemId: string | number, delta: number) => {
        if (isOrderFinalized || !tenantSlug || !orderId) {
            if (isOrderFinalized) showAlert("Order Locked", "Cannot modify items on a finalized order.");
            return;
        }

        const targetItem = orderItems.find((i) => String(i.id) === String(itemId));
        if (!targetItem) return;

        const nextQty = Math.max(1, targetItem.quantity + delta);
        if (nextQty === targetItem.quantity) return;

        setOrderItems((prev) => prev.map((item) => {
            if (String(item.id) === String(itemId)) {
                return { ...item, quantity: nextQty, totalPrice: nextQty * item.price };
            }
            return item;
        }));

        try {
            await updateOrderItemQtyApi(tenantSlug, orderId, itemId, nextQty);
        } catch (error) {
            console.error("Failed to update item quantity:", error);
            setOrderItems((prev) => prev.map((item) => (
                String(item.id) === String(itemId) ? targetItem : item
            )));
            showAlert("Update Failed", "Could not update item quantity on the server.");
        }
    }, [isOrderFinalized, tenantSlug, orderId, orderItems, showAlert]);

    // Remove item from order API integration
    const removeItem = useCallback((itemId: string | number, name: string) => {
        if (isOrderFinalized || !tenantSlug || !orderId) {
            if (isOrderFinalized) showAlert("Order Locked", "Cannot remove items from a finalized order.");
            return;
        }
        showAlert("⚠️ Remove Item", `Remove "${name}" from order?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Yes, Delete",
                style: "destructive",
                onPress: async () => {
                    const prevItems = orderItems;
                    setOrderItems((prev) => prev.filter((item) => String(item.id) !== String(itemId)));
                    try {
                        await deleteOrderItemApi(tenantSlug, orderId, itemId);
                    } catch (error) {
                        console.error("Failed to delete item:", error);
                        setOrderItems(prevItems);
                        showAlert("Delete Failed", "Could not delete item from server.");
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
            const msg = error?.response?.data?.message || "Failed to add items. Please try again."
            showAlert("Add Items Failed", msg);
        } finally {
            setIsNewSubmittingNewItems(false);
        }
    }, [tenantSlug, orderId, pendingItems, isSubmittingNewItems, loadOrderData, showToast, showAlert])

    // Apply promo code logic
    const handleApplyPromo = useCallback(() => {
        const inputCode = promoInput.trim().toUpperCase();
        if (!inputCode) return;
        const matchedPromo = availablePromos.find(
            (p) => p.code.toUpperCase() === inputCode && p.status === "ACTIVE"
        );
        if (!matchedPromo) {
            showAlert("Invalid Promo", "The promo code entered is invalid or expired.");
            return;
        }
        if (matchedPromo.minOrderAmount && itemsTotalSum < matchedPromo.minOrderAmount) {
            showAlert(
                "Minimum Amount Required",
                `Order total must be at least Rs. ${matchedPromo.minOrderAmount} to use code ${matchedPromo.code}`
            );
            return;
        }

        let discountAmount = (itemsTotalSum * matchedPromo.discountPercent) / 100;
        if (matchedPromo.maxDiscountAmount && matchedPromo.maxDiscountAmount > 0) {
            discountAmount = Math.min(discountAmount, matchedPromo.maxDiscountAmount);
        }

        discountAmount = Math.round(discountAmount);
        setAppliedPromo(matchedPromo.code);
        setPromoDiscountVal(discountAmount);
        setPromoInput("");

        showAlert("Promo Applied!", `Code '${matchedPromo.code}' applied. Discount: Rs. ${discountAmount}`);
    }, [availablePromos, itemsTotalSum, promoInput, showAlert]);

    const getStatusColors = useCallback((status: string) => {
        switch (status) {
            case "DELIVERED":
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
        printDocument(generatePOSHtml(orderData, orderId || "", tenantSlug || "", orderItems, itemsTotalSum, parsedManualDiscount, grandFinalTotal), "POS bill saved!");
    }, [printDocument, orderData, orderId, tenantSlug, orderItems, itemsTotalSum, parsedManualDiscount, grandFinalTotal]);

    const handlePrintInvoice = useCallback(() => {
        printDocument(generateInvoiceHtml(orderData, orderId || "", tenantSlug || "", orderItems, itemsTotalSum, grandFinalTotal), "Invoice bill saved!");
    }, [printDocument, orderData, orderId, tenantSlug, orderItems, itemsTotalSum, grandFinalTotal]);

    const handlePrintKOT = useCallback(() => {
        printDocument(generateKOTHtml(orderData, orderId || "", tenantSlug || "", orderItems), "KOT ticket sent to kitchen!");
    }, [printDocument, orderData, orderId, tenantSlug, orderItems]);

    return {
        orderId,
        tenantSlug,
        colors,
        isLoading,
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
        promoInput,
        setPromoInput,
        appliedPromo,
        setAppliedPromo,
        setPromoDiscountVal,
        itemsTotalSum,
        parsedManualDiscount,
        grandFinalTotal,
        isInvoiceVisible,
        setIsInvoiceVisible,
        isQRModalVisible,
        setIsQRModalVisible,
        handleOrderStatusSelect,
        handlePaymentStatusSelect,
        handleSettlePayment,
        updateExistingQty,
        removeItem,
        addItemToActiveOrder,
        handleApplyPromo,
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
