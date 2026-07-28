import { useLocalSearchParams, useRouter } from "expo-router"
import {
    ArrowLeft,
    Banknote,
    ChevronDown,
    ChevronUp,
    FileText,
    Lock,
    Minus,
    Percent,
    Plus,
    QrCode,
    X
} from "lucide-react-native"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { fetchMenuItemsApi, MenuItem } from "@/services/menuService"
import { fetchOrderByIdApi, Order, OrderItem } from "@/services/orderService"
import { fetchPromoCodesApi, PromoCode } from "@/services/promoService"
import Text from "../components/AppText"
import { InvoiceModal } from "../components/orders/InvoiceModal"
import { PaymentQRModal } from "../components/orders/PaymentQRModal"
import { useCustomAlert } from "../context/AlertContext"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { usePrintHandler } from "../hooks/usePrintHandler"
import { generateInvoiceHtml, generateKOTHtml, generatePOSHtml } from "../utils/billTemplates"

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80"

// --- MEMOIZED CATALOG DISH CARD ---
interface CatalogDishCardProps {
    dish: MenuItem
    onSelect: (dish: MenuItem) => void
    colors: {
        bg: string
        border: string
        textMain: string
        primary: string
    }
}

const CatalogDishCard = React.memo(({ dish, onSelect, colors }: CatalogDishCardProps) => (
    <TouchableOpacity
        onPress={() => onSelect(dish)}
        activeOpacity={0.7}
        style={[styles.dishCard, { backgroundColor: colors.bg, borderColor: colors.border }]}
    >
        <Image
            source={{ uri: dish.imageUrl || DEFAULT_IMAGE }}
            style={styles.dishImage}
            resizeMode="cover"
        />
        <View style={{ padding: 8 }}>
            <Text numberOfLines={1} style={{ color: colors.textMain, fontWeight: "600", fontSize: 12 }}>
                {dish.name}
            </Text>
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 11 }}>
                Rs. {dish.price}
            </Text>
        </View>
    </TouchableOpacity>
))
CatalogDishCard.displayName = "CatalogDishCard"

export default function OrderDetailsScreen() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>()
    const router = useRouter()
    const insets = useSafeAreaInsets()
    const { isDark } = useTheme()
    const { tenantSlug } = useAuth()
    const { showAlert } = useCustomAlert()

    const { printDocument, showToast } = usePrintHandler()

    // Screen and Order state
    const [isLoading, setIsLoading] = useState(true)
    const [orderData, setOrderData] = useState<Order | null>(null)
    const [isInvoiceVisible, setIsInvoiceVisible] = useState(false)
    const [isQRModalVisible, setIsQRModalVisible] = useState(false)

    const [orderStatus, setOrderStatus] = useState<string>("PENDING")
    const [paymentStatus, setPaymentStatus] = useState<string>("PENDING")
    const [orderItems, setOrderItems] = useState<OrderItem[]>([])

    // Catalog state
    const [catalogItems, setCatalogItems] = useState<MenuItem[]>([])
    const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(false)
    const [isAddSectionExpanded, setIsAddSectionExpanded] = useState(false)
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [debouncedQuery, setDebouncedQuery] = useState<string>("")
    const [isSearching, setIsSearching] = useState<boolean>(false)

    // Discounts & Promo state
    const [promoInput, setPromoInput] = useState("")
    const [appliedPromo, setAppliedPromo] = useState<string | null>(null)
    const [promoDiscountVal, setPromoDiscountVal] = useState(0)
    const [manualDiscountStr, setManualDiscountStr] = useState("0")
    const [availablePromos, setAvailablePromos] = useState<PromoCode[]>([])



    // Memoized Colors
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
    }), [isDark])

    // State flags
    const isCancelled = orderStatus === "CANCELLED"
    const isPaid = paymentStatus === "PAID"
    const isOrderFinalized = orderStatus === "DELIVERED" || isCancelled || isPaid

    // Load order details
    const loadOrderData = useCallback(async () => {
        if (!tenantSlug || !orderId) return
        try {
            setIsLoading(true)
            const res = await fetchOrderByIdApi(tenantSlug, orderId)
            if (res) {
                setOrderData(res)
                setOrderStatus(res.status || "PENDING")
                setPaymentStatus(res.paymentStatus || "PENDING")
                setOrderItems(res.items || [])
                if (res.manualDiscount) setManualDiscountStr(res.manualDiscount.toString())
            }
        } catch (error) {
            showAlert("Error", "Could not load order details.")
        } finally {
            setIsLoading(false)
        }
    }, [tenantSlug, orderId])

    useEffect(() => { loadOrderData() }, [loadOrderData])

    // Load catalog menu items
    useEffect(() => {
        if (!tenantSlug) return

        const loadCatalog = async () => {
            try {
                setIsCatalogLoading(true)
                const response = await fetchMenuItemsApi(tenantSlug, 0, 100, "")
                const itemsList = response?.content || []
                setCatalogItems(itemsList.filter((item) => item.active !== false))
            } catch (error) {
                console.error("Failed to load catalog menu items:", error)
            } finally {
                setIsCatalogLoading(false)
            }
        }
        loadCatalog()
    }, [tenantSlug])

    // Load promo codes
    useEffect(() => {
        if (!tenantSlug) return
        const loadPromos = async () => {
            const list = await fetchPromoCodesApi(tenantSlug)
            setAvailablePromos(list)
        }
        loadPromos()
    }, [tenantSlug])

    // Handle 300ms debouncing for fast typing
    useEffect(() => {
        if (searchQuery !== debouncedQuery) {
            setIsSearching(true)
        }
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery)
            setIsSearching(false)
        }, 300)

        return () => clearTimeout(handler)
    }, [searchQuery, debouncedQuery])

    // Math calculations
    const itemsTotalSum = useMemo(() => {
        return orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    }, [orderItems])

    const parsedManualDiscount = parseFloat(manualDiscountStr) || 0
    const grandFinalTotal = Math.max(0, itemsTotalSum - promoDiscountVal - parsedManualDiscount)

    // Memoized filtering against debounced query
    const filteredCatalog = useMemo(() => {
        if (!debouncedQuery.trim()) return catalogItems
        const query = debouncedQuery.toLowerCase()
        return catalogItems.filter((item) => item.name.toLowerCase().includes(query))
    }, [catalogItems, debouncedQuery])

    // Cancellation Warning Modal
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
                        setOrderStatus("CANCELLED")
                        setPaymentStatus("PENDING")
                        showToast("Order cancelled")
                        // TODO: Call PUT API to update backend
                    }
                }
            ]
        )
    }, [showToast])

    // Order Status Handler
    const handleOrderStatusSelect = useCallback(() => {
        if (isOrderFinalized) {
            showAlert(
                "🔒 Order Locked",
                `This order is marked as ${orderStatus.toUpperCase()} and cannot be changed further.`
            )
            return
        }

        showAlert(
            "Update Order Status",
            "Select the new status for this order:",
            [
                {
                    text: "CONFIRMED",
                    onPress: () => {
                        setOrderStatus("CONFIRMED")
                        showToast("Order set to Confirmed")
                        // TODO: Call PUT API to update backend
                    }
                },
                {
                    text: "DELIVERED (Mark as Paid)",
                    onPress: () => {
                        setOrderStatus("DELIVERED")
                        setPaymentStatus("PAID")
                        showToast("Order delivered & paid!")
                        // TODO: Call PUT API to update backend
                    }
                },
                {
                    text: "CANCEL ORDER",
                    style: "destructive",
                    onPress: () => confirmOrderCancellation()
                },
                { text: "Cancel", style: "cancel" }
            ]
        )
    }, [isOrderFinalized, orderStatus, showToast, confirmOrderCancellation])

    // Payment Status Handler
    const handlePaymentStatusSelect = useCallback(() => {
        if (isOrderFinalized) {
            showAlert(
                "🔒 Payment Locked",
                `Payment status is finalized as ${paymentStatus.toUpperCase()} and cannot be reverted.`
            )
            return
        }

        showAlert(
            "Update Payment Status",
            "Select payment status:",
            [
                {
                    text: "PAID (Delivers Order)",
                    onPress: () => {
                        setPaymentStatus("PAID")
                        setOrderStatus("DELIVERED")
                        showToast("Payment settled! Order delivered.")
                        // TODO: Call PUT API to update backend
                    }
                },
                {
                    text: "PENDING",
                    onPress: () => {
                        setPaymentStatus("PENDING")
                        showToast("Payment set to Pending")
                        // TODO: Call PUT API to update backend
                    }
                },
                { text: "Cancel", style: "cancel" }
            ]
        )
    }, [isOrderFinalized, paymentStatus, showToast])

    // Settle Payment Action (Cash / QR)
    const handleSettlePayment = useCallback((method: string) => {
        if (isCancelled) {
            showAlert("Order Cancelled", "Cannot process payment for a cancelled order.")
            return
        }
        if (isPaid) {
            showAlert("Already Paid", "This order has already been paid and settled.")
            return
        }

        setPaymentStatus("PAID")
        setOrderStatus("DELIVERED")
        showToast(`Settled via ${method}! Order marked as Delivered.`)
        // TODO: Call PUT API to update backend
    }, [isCancelled, isPaid, showToast])

    const updateQty = useCallback((id: number, delta: number) => {
        if (isOrderFinalized) {
            showAlert("Order Locked", "Cannot modify items on a finalized order.")
            return
        }
        setOrderItems((prev) => prev.map((item) => {
            if (item.id === id) {
                const nextQty = item.quantity + delta
                return nextQty > 0 ? { ...item, quantity: nextQty, totalPrice: nextQty * item.price } : item
            }
            return item
        }))
    }, [isOrderFinalized])

    const removeItem = useCallback((id: number, name: string) => {
        if (isOrderFinalized) {
            showAlert("Order Locked", "Cannot remove items from a finalized order.")
            return
        }
        showAlert("⚠️ Remove Item", `Remove "${name}" from order?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Yes, Delete", style: "destructive", onPress: () => setOrderItems((prev) => prev.filter((item) => item.id !== id)) }
        ])
    }, [isOrderFinalized])

    const addItemToActiveOrder = useCallback((catalogItem: MenuItem) => {
        if (isOrderFinalized) {
            showAlert("Order Locked", "Cannot add items to a finalized order.")
            return
        }
        setOrderItems((prev) => {
            const existing = prev.find((item) => item.id === catalogItem.id || item.itemName.toLowerCase() === catalogItem.name.toLowerCase())
            if (existing) {
                return prev.map((item) => (item.id === catalogItem.id || item.itemName.toLowerCase() === catalogItem.name.toLowerCase())
                    ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.price }
                    : item)
            }
            return [...prev, { id: Date.now(), itemName: catalogItem.name, price: catalogItem.price, quantity: 1, totalPrice: catalogItem.price, discountAmount: 0, discountPercent: 0 }]
        })
    }, [isOrderFinalized])

    const handleApplyPromo = useCallback(() => {
        const inputCode = promoInput.trim().toUpperCase()
        if (!inputCode) return
        const matchedPromo = availablePromos.find(
            (p) => p.code.toUpperCase() === inputCode && p.status === "ACTIVE"
        )
        if (!matchedPromo) {
            showAlert("Invalid Promo", "The promo code entered is invalid or expired.")
            return
        }
        if (matchedPromo.minOrderAmount && itemsTotalSum < matchedPromo.minOrderAmount) {
            showAlert(
                "Minimum Amount Required",
                `Order total must be at least Rs. ${matchedPromo.minOrderAmount} to use code ${matchedPromo.code}`
            )
            return
        }

        let discountAmount = (itemsTotalSum * matchedPromo.discountPercent) / 100
        if (matchedPromo.maxDiscountAmount && matchedPromo.maxDiscountAmount > 0) {
            discountAmount = Math.min(discountAmount, matchedPromo.maxDiscountAmount)
        }

        discountAmount = Math.round(discountAmount)

        setAppliedPromo(matchedPromo.code)
        setPromoDiscountVal(discountAmount)
        setPromoInput("")

        showAlert("Promo Applied!", `Code '${matchedPromo.code}' applied. Discount: Rs. ${discountAmount}`)
    }, [availablePromos, itemsTotalSum, promoInput])

    const getStatusColors = useCallback((status: string) => {
        switch (status) {
            case "DELIVERED":
            case "PAID":
                return { bg: colors.accentGreenBg, text: colors.accentGreen }
            case "CANCELLED":
                return { bg: colors.accentRedBg, text: colors.accentRed }
            case "CONFIRMED":
            case "PENDING":
            default:
                return { bg: colors.accentYellowBg, text: colors.accentYellow }
        }
    }, [colors])

    // Memoized FlatList render item
    const renderCatalogDish = useCallback(
        ({ item }: { item: MenuItem }) => (
            <CatalogDishCard
                dish={item}
                onSelect={addItemToActiveOrder}
                colors={colors}
            />
        ),
        [addItemToActiveOrder, colors]
    )

    // Pre-calculated item layout (130px card width + 12px gap = 142px total)
    const getCatalogItemLayout = useCallback((_: any, index: number) => ({
        length: 142,
        offset: 142 * index,
        index,
    }), [])

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 12, color: colors.textMuted, fontWeight: "500" }}>Loading order details...</Text>
            </View>
        )
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            {/* HEADER */}
            <View style={[styles.navHeader, { paddingTop: insets.top + 12, backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backTouch}>
                    <ArrowLeft size={20} color={colors.textMain} />
                </TouchableOpacity>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[styles.orderIdTitle, { color: colors.textMain, fontWeight: "700" }]}>Order #{orderData?.orderNumber || orderId}</Text>
                    {orderData?.tableNumber && (
                        <View style={[styles.tableIndicatorBadge, { borderColor: colors.primary, backgroundColor: "#6266F1" }]}>
                            <Text style={[styles.tableIndicatorText, { color: "#FFF", fontWeight: "700" }]}>T{orderData.tableNumber}</Text>
                        </View>
                    )}
                </View>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 140 }}>
                {/* PROGRESS CARD */}
                <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={[styles.sectionSubtitleHeader, { color: colors.textMuted }]}>PROGRESS</Text>

                    {/* Order Status Dropdown */}
                    <View style={styles.progressRow}>
                        <Text style={{ color: colors.textMain, fontWeight: "600" }}>Order Status:</Text>
                        <TouchableOpacity
                            activeOpacity={isOrderFinalized ? 1 : 0.7}
                            onPress={handleOrderStatusSelect}
                            style={[
                                styles.toggleBadge,
                                { backgroundColor: getStatusColors(orderStatus).bg }
                            ]}
                        >
                            <Text style={{ color: getStatusColors(orderStatus).text, fontWeight: "700", fontSize: 13 }}>
                                {orderStatus}
                            </Text>
                            {isOrderFinalized ? (
                                <Lock size={12} color={getStatusColors(orderStatus).text} style={{ marginLeft: 6 }} />
                            ) : (
                                <ChevronDown size={14} color={getStatusColors(orderStatus).text} style={{ marginLeft: 6 }} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Payment Status Dropdown */}
                    <View style={styles.progressRow}>
                        <Text style={{ color: colors.textMain, fontWeight: "600" }}>Payment Status:</Text>
                        <TouchableOpacity
                            activeOpacity={isOrderFinalized ? 1 : 0.7}
                            onPress={handlePaymentStatusSelect}
                            style={[
                                styles.toggleBadge,
                                { backgroundColor: getStatusColors(paymentStatus).bg }
                            ]}
                        >
                            <Text style={{ color: getStatusColors(paymentStatus).text, fontWeight: "700", fontSize: 13 }}>
                                {paymentStatus}
                            </Text>
                            {isOrderFinalized ? (
                                <Lock size={12} color={getStatusColors(paymentStatus).text} style={{ marginLeft: 6 }} />
                            ) : (
                                <ChevronDown size={14} color={getStatusColors(paymentStatus).text} style={{ marginLeft: 6 }} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ITEMS */}
                <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={[styles.sectionSubtitleHeader, { color: colors.textMuted }]}>ORDER ITEMS ({orderItems.length})</Text>
                    {orderItems.map((item) => (
                        <View key={item.id} style={[styles.orderItemRow, { borderBottomColor: colors.border }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.textMain, fontWeight: "600" }}>{item.itemName}</Text>
                                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Rs. {item.price} each</Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                <View style={[styles.quantityPicker, { backgroundColor: colors.bg }]}>
                                    <TouchableOpacity disabled={isOrderFinalized} onPress={() => updateQty(item.id, -1)} style={styles.mathBtn}>
                                        <Minus size={14} color={isOrderFinalized ? colors.textMuted : colors.textMain} />
                                    </TouchableOpacity>
                                    <Text style={{ color: colors.textMain, fontWeight: "700" }}>{item.quantity}</Text>
                                    <TouchableOpacity disabled={isOrderFinalized} onPress={() => updateQty(item.id, 1)} style={styles.mathBtn}>
                                        <Plus size={14} color={isOrderFinalized ? colors.textMuted : colors.textMain} />
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity disabled={isOrderFinalized} onPress={() => removeItem(item.id, item.itemName)} style={[styles.trashBtn, { backgroundColor: colors.accentRedBg }]}>
                                    <X size={16} color={colors.accentRed} />
                                </TouchableOpacity>
                                <Text style={{ color: colors.textMain, fontWeight: "700", minWidth: 70, textAlign: "right" }}>Rs. {item.price * item.quantity}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* CATALOG ACCORDION */}
                {!isOrderFinalized && (
                    <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                        <TouchableOpacity
                            onPress={() => setIsAddSectionExpanded(!isAddSectionExpanded)}
                            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                        >
                            <Text style={{ color: colors.primary, fontWeight: "700" }}>
                                {isAddSectionExpanded ? "- Close Catalog" : "+ Add Items to Order"}
                            </Text>
                            {isAddSectionExpanded ? (
                                <ChevronUp size={18} color={colors.primary} />
                            ) : (
                                <ChevronDown size={18} color={colors.primary} />
                            )}
                        </TouchableOpacity>

                        {isAddSectionExpanded && (
                            <View style={{ marginTop: 12 }}>
                                {/* Search Bar with Debounce Activity Indicator */}
                                <View style={{ position: "relative", justifyContent: "center" }}>
                                    <TextInput
                                        style={[
                                            styles.searchInput,
                                            { backgroundColor: colors.bg, color: colors.textMain, paddingRight: 36 }
                                        ]}
                                        placeholder="Search dishes..."
                                        placeholderTextColor={colors.textMuted}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                    {isSearching && (
                                        <ActivityIndicator
                                            size="small"
                                            color={colors.primary}
                                            style={{ position: "absolute", right: 12 }}
                                        />
                                    )}
                                </View>

                                {isCatalogLoading ? (
                                    <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
                                ) : filteredCatalog.length === 0 ? (
                                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 12, textAlign: "center" }}>
                                        No items found in catalog
                                    </Text>
                                ) : (
                                    /* Virtualized Horizontal FlatList replacing heavy ScrollView */
                                    <FlatList
                                        horizontal
                                        data={filteredCatalog}
                                        keyExtractor={(item) => item.id.toString()}
                                        renderItem={renderCatalogDish}
                                        getItemLayout={getCatalogItemLayout}
                                        showsHorizontalScrollIndicator={false}
                                        initialNumToRender={5}
                                        maxToRenderPerBatch={6}
                                        windowSize={3}
                                        removeClippedSubviews={Platform.OS === "android"}
                                        contentContainerStyle={{ gap: 12, marginTop: 10 }}
                                    />
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* SUMMARY */}
                <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={[styles.sectionSubtitleHeader, { color: colors.textMuted }]}>ORDER SUMMARY</Text>
                    <View style={styles.calcRow}><Text style={{ color: colors.textMuted }}>Total Amount</Text><Text style={{ color: colors.textMain, fontWeight: "600" }}>Rs. {itemsTotalSum}</Text></View>
                    {!isOrderFinalized && (
                        <View style={{ flexDirection: "row", gap: 8, marginVertical: 8 }}>
                            <View style={[styles.promoBox, { backgroundColor: colors.bg }]}>
                                <Percent size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
                                <TextInput style={{ flex: 1, color: colors.textMain }} placeholder={appliedPromo || "Promo code"} placeholderTextColor={colors.textMuted} value={promoInput} onChangeText={setPromoInput} editable={!appliedPromo} />
                            </View>
                            {appliedPromo ? (
                                <TouchableOpacity onPress={() => { setAppliedPromo(null); setPromoDiscountVal(0) }} style={[styles.promoBtn, { backgroundColor: colors.accentRed }]}><X size={16} color="#FFF" /></TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={handleApplyPromo} style={[styles.promoBtn, { backgroundColor: colors.primary }]}><Text style={{ color: "#FFF", fontWeight: "700" }}>APPLY</Text></TouchableOpacity>
                            )}
                        </View>
                    )}
                    <View style={[styles.calcRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }]}>
                        <Text style={{ color: colors.textMain, fontWeight: "700", fontSize: 16 }}>FINAL TOTAL</Text>
                        <Text style={{ color: colors.textMain, fontWeight: "800", fontSize: 20 }}>Rs. {grandFinalTotal}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* BOTTOM PANEL */}
            <View style={[styles.bottomPanel, { backgroundColor: colors.cardBg, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                        disabled={isCancelled || isPaid}
                        onPress={() => handleSettlePayment("Cash")}
                        style={[
                            styles.cashBtn,
                            (isCancelled || isPaid) && { opacity: 0.4 }
                        ]}
                    >
                        <Banknote size={18} color="#475569" style={{ marginRight: 6 }} />
                        <Text style={{ color: "#475569", fontWeight: "700" }}>
                            {isPaid ? "Paid via Cash" : "Cash"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        disabled={isCancelled || isPaid}
                        onPress={() => setIsQRModalVisible(true)}
                        style={[
                            styles.qrBtn,
                            (isCancelled || isPaid) && { opacity: 0.4 }
                        ]}
                    >
                        <QrCode size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                            {isPaid ? "Paid via QR" : "QR Code"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    disabled={isCancelled}
                    onPress={() => setIsInvoiceVisible(true)}
                    style={[
                        styles.invoiceTriggerBtn,
                        { backgroundColor: isCancelled ? colors.border : colors.primary },
                        isCancelled && { opacity: 0.5 }
                    ]}
                >
                    <FileText size={18} color={isCancelled ? colors.textMuted : "#FFF"} style={{ marginRight: 6 }} />
                    <Text style={{ color: isCancelled ? colors.textMuted : "#FFF", fontWeight: "700" }}>
                        {isCancelled ? "Invoice Disabled (Cancelled)" : "View Invoice / Receipt"}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* MODALS */}
            <InvoiceModal
                visible={isInvoiceVisible}
                onClose={() => setIsInvoiceVisible(false)}
                orderData={orderData}
                orderId={orderId || ""}
                orderItems={orderItems}
                itemsTotalSum={itemsTotalSum}
                grandFinalTotal={grandFinalTotal}
                tenantSlug={tenantSlug}
                onPrintPOS={() => printDocument(generatePOSHtml(orderData, orderId || "", tenantSlug, orderItems, itemsTotalSum, parsedManualDiscount, grandFinalTotal), "POS bill saved!")}
                onPrintInvoice={() => printDocument(generateInvoiceHtml(orderData, orderId || "", tenantSlug, orderItems, itemsTotalSum, grandFinalTotal), "Invoice bill saved!")}
                onPrintKOT={() => printDocument(generateKOTHtml(orderData, orderId || "", tenantSlug, orderItems), "KOT ticket sent to kitchen!")}
            />

            <PaymentQRModal
                visible={isQRModalVisible}
                onClose={() => setIsQRModalVisible(false)}
                orderData={orderData}
                orderId={orderId || ""}
                grandFinalTotal={grandFinalTotal}
                tenantSlug={tenantSlug}
                onConfirmPaid={() => handleSettlePayment("Digital Wallet")}
            />
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    navHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 14,
        borderBottomWidth: 1
    },
    backTouch: {
        padding: 4
    },
    orderIdTitle: {
        fontSize: 16
    },
    tableIndicatorBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1
    },
    tableIndicatorText: {
        fontSize: 12
    },
    sectionCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16
    },
    sectionSubtitleHeader: {
        fontSize: 12,
        letterSpacing: 1,
        marginBottom: 12,
        fontWeight: "700"
    },
    progressRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8
    },
    toggleBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8
    },
    orderItemRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth
    },
    quantityPicker: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 8,
        paddingHorizontal: 4,
        height: 32,
        gap: 8
    },
    mathBtn: {
        width: 22,
        height: 22,
        justifyContent: "center",
        alignItems: "center"
    },
    trashBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center"
    },
    searchInput: {
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 38,
        fontSize: 13
    },
    dishCard: {
        width: 130,
        borderRadius: 12,
        borderWidth: 1,
        overflow: "hidden"
    },
    dishImage: {
        width: "100%",
        height: 75
    },
    calcRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 4
    },
    promoBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 38
    },
    promoBtn: {
        height: 38,
        paddingHorizontal: 14,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center"
    },
    bottomPanel: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        gap: 10,
        elevation: 15
    },
    cashBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: "#F1F5F9",
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 12,
        paddingVertical: 12
    },
    qrBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: "#16A34A",
        borderRadius: 12,
        paddingVertical: 12
    },
    invoiceTriggerBtn: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        paddingVertical: 14
    },
})