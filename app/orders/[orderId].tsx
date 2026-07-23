import { useLocalSearchParams, useRouter } from "expo-router"
import { ArrowLeft, Banknote, ChevronDown, ChevronUp, FileText, Minus, Percent, Plus, QrCode, X } from "lucide-react-native"
import React, { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { fetchOrderByIdApi, Order, OrderItem } from "@/services/orderService"
import Text from "../components/AppText"
import { InvoiceModal } from "../components/orders/InvoiceModal"
import { PaymentQRModal } from "../components/orders/PaymentQRModal"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { usePrintHandler } from "../hooks/usePrintHandler"
import { generateInvoiceHtml, generateKOTHtml, generatePOSHtml } from "../utils/billTemplates"

const dummy_catalog = [
    { id: "m1", name: "Chicken roasted", price: 322, image: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=200&q=80" },
    { id: "m2", name: "Lekali Menu 1", price: 300, image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=200&q=80" },
    { id: "m3", name: "Lekali Momo", price: 200, image: "https://images.unsplash.com/photo-1625220194771-7ebedd0870b6?w=200&q=80" },
    { id: "m4", name: "Lekali Sekuwa", price: 200, image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=200&q=80" },
]

export default function OrderDetailsScreen() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>()
    const router = useRouter()
    const insets = useSafeAreaInsets()
    const { isDark } = useTheme()
    const { tenantSlug } = useAuth()

    const { printDocument, showToast } = usePrintHandler()

    // State
    const [isLoading, setIsLoading] = useState(true)
    const [orderData, setOrderData] = useState<Order | null>(null)
    const [isInvoiceVisible, setIsInvoiceVisible] = useState(false)
    const [isQRModalVisible, setIsQRModalVisible] = useState(false)

    const [orderStatus, setOrderStatus] = useState<string>("PENDING")
    const [paymentStatus, setPaymentStatus] = useState<string>("PENDING")
    const [orderItems, setOrderItems] = useState<OrderItem[]>([])

    // Catalog & Discounts
    const [isAddSectionExpanded, setIsAddSectionExpanded] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [promoInput, setPromoInput] = useState("")
    const [appliedPromo, setAppliedPromo] = useState<string | null>(null)
    const [promoDiscountVal, setPromoDiscountVal] = useState(0)
    const [manualDiscountStr, setManualDiscountStr] = useState("0")

    const colors = {
        bg: isDark ? "#0F172A" : "#F8FAFC",
        cardBg: isDark ? "#1E293B" : "#FFFFFF",
        textMain: isDark ? "#FFFFFF" : "#0F172A",
        textMuted: isDark ? "#94A3B8" : "#64748B",
        border: isDark ? "#334155" : "#E2E8F0",
        primary: "#6366F1",
        accentGreen: "#16A34A",
        accentRed: "#EF4444",
        accentYellow: "#F59E0B",
        accentYellowBg: "#FEF3C7",
        accentGreenBg: "#DCFCE7",
        accentRedBg: "#FEE2E2",
    }

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
            Alert.alert("Error", "Could not load order details.")
        } finally {
            setIsLoading(false)
        }
    }, [tenantSlug, orderId])

    useEffect(() => { loadOrderData() }, [loadOrderData])

    // Math Calculations
    const itemsTotalSum = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const parsedManualDiscount = parseFloat(manualDiscountStr) || 0
    const grandFinalTotal = Math.max(0, itemsTotalSum - promoDiscountVal - parsedManualDiscount)

    const updateQty = (id: number, delta: number) => {
        setOrderItems((prev) => prev.map((item) => {
            if (item.id === id) {
                const nextQty = item.quantity + delta
                return nextQty > 0 ? { ...item, quantity: nextQty, totalPrice: nextQty * item.price } : item
            }
            return item
        }))
    }

    const removeItem = (id: number, name: string) => {
        Alert.alert("⚠️ Remove Item", `Remove "${name}" from order?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Yes, Delete", style: "destructive", onPress: () => setOrderItems((prev) => prev.filter((item) => item.id !== id)) }
        ])
    }

    const addItemToActiveOrder = (catalogItem: typeof dummy_catalog[0]) => {
        setOrderItems((prev) => {
            const existing = prev.find((item) => item.id.toString() === catalogItem.id)
            if (existing) {
                return prev.map((item) => item.id.toString() === catalogItem.id
                    ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.price }
                    : item)
            }
            return [...prev, { id: Date.now(), itemName: catalogItem.name, price: catalogItem.price, quantity: 1, totalPrice: catalogItem.price, discountAmount: 0, discountPercent: 0 }]
        })
    }

    const handleApplyPromo = () => {
        if (promoInput.trim().toUpperCase() === "LEKALI50") {
            setAppliedPromo("LEKALI50")
            setPromoDiscountVal(50)
            Alert.alert("Success", "NPR 50 discount applied!")
        } else {
            Alert.alert("Invalid Code", "Try using LEKALI50")
        }
        setPromoInput("")
    }

    const filteredCatalog = dummy_catalog.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))

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

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 120 }}>
                {/* PROGRESS */}
                <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={[styles.sectionSubtitleHeader, { color: colors.textMuted }]}>PROGRESS</Text>
                    <View style={styles.progressRow}>
                        <Text style={{ color: colors.textMain }}>Order Status:</Text>
                        <TouchableOpacity onPress={() => setOrderStatus((prev) => prev === "CONFIRMED" ? "CANCELLED" : "CONFIRMED")} style={[styles.toggleBadge, { backgroundColor: orderStatus === "CONFIRMED" ? colors.accentGreenBg : colors.accentRedBg }]}>
                            <Text style={{ color: orderStatus === "CONFIRMED" ? colors.accentGreen : colors.accentRed, fontWeight: "700" }}>{orderStatus}</Text>
                            <ChevronDown size={12} color={orderStatus === "CONFIRMED" ? colors.accentGreen : colors.accentRed} style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.progressRow}>
                        <Text style={{ color: colors.textMain }}>Payment Status:</Text>
                        <TouchableOpacity onPress={() => setPaymentStatus((prev) => prev === "PENDING" ? "PAID" : "PENDING")} style={[styles.toggleBadge, { backgroundColor: paymentStatus === "PAID" ? colors.accentGreenBg : colors.accentYellowBg }]}>
                            <Text style={{ color: paymentStatus === "PAID" ? colors.accentGreen : colors.accentYellow, fontWeight: "700" }}>{paymentStatus}</Text>
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
                                    <TouchableOpacity onPress={() => updateQty(item.id, -1)} style={styles.mathBtn}><Minus size={14} color={colors.textMain} /></TouchableOpacity>
                                    <Text style={{ color: colors.textMain, fontWeight: "700" }}>{item.quantity}</Text>
                                    <TouchableOpacity onPress={() => updateQty(item.id, 1)} style={styles.mathBtn}><Plus size={14} color={colors.textMain} /></TouchableOpacity>
                                </View>
                                <TouchableOpacity onPress={() => removeItem(item.id, item.itemName)} style={[styles.trashBtn, { backgroundColor: colors.accentRedBg }]}>
                                    <X size={16} color={colors.accentRed} />
                                </TouchableOpacity>
                                <Text style={{ color: colors.textMain, fontWeight: "700", minWidth: 70, textAlign: "right" }}>Rs. {item.price * item.quantity}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* CATALOG ACCORDION */}
                <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <TouchableOpacity onPress={() => setIsAddSectionExpanded(!isAddSectionExpanded)} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: colors.primary, fontWeight: "700" }}>{isAddSectionExpanded ? "- Close Catalog" : "+ Add Items to Order"}</Text>
                        {isAddSectionExpanded ? <ChevronUp size={18} color={colors.primary} /> : <ChevronDown size={18} color={colors.primary} />}
                    </TouchableOpacity>
                    {isAddSectionExpanded && (
                        <View style={{ marginTop: 12 }}>
                            <TextInput style={[styles.searchInput, { backgroundColor: colors.bg, color: colors.textMain }]} placeholder="Filter dishes..." placeholderTextColor={colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, marginTop: 10 }}>
                                {filteredCatalog.map((dish) => (
                                    <TouchableOpacity key={dish.id} onPress={() => addItemToActiveOrder(dish)} style={[styles.dishCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                                        <Image source={{ uri: dish.image }} style={{ width: "100%", height: 75 }} />
                                        <View style={{ padding: 8 }}>
                                            <Text numberOfLines={1} style={{ color: colors.textMain, fontWeight: "600", fontSize: 12 }}>{dish.name}</Text>
                                            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 11 }}>Rs. {dish.price}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>

                {/* SUMMARY */}
                <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={[styles.sectionSubtitleHeader, { color: colors.textMuted }]}>ORDER SUMMARY</Text>
                    <View style={styles.calcRow}><Text style={{ color: colors.textMuted }}>Total Amount</Text><Text style={{ color: colors.textMain, fontWeight: "600" }}>Rs. {itemsTotalSum}</Text></View>
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
                    <View style={[styles.calcRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }]}>
                        <Text style={{ color: colors.textMain, fontWeight: "700", fontSize: 16 }}>FINAL TOTAL</Text>
                        <Text style={{ color: colors.textMain, fontWeight: "800", fontSize: 20 }}>Rs. {grandFinalTotal}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* BOTTOM PANEL */}
            <View style={[styles.bottomPanel, { backgroundColor: colors.cardBg, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => { setPaymentStatus("PAID"); showToast("Settled via Cash!") }} style={styles.cashBtn}>
                        <Banknote size={18} color="#475569" style={{ marginRight: 6 }} />
                        <Text style={{ color: "#475569", fontWeight: "700" }}>Cash</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsQRModalVisible(true)} style={styles.qrBtn}>
                        <QrCode size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>QR Code</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setIsInvoiceVisible(true)} style={[styles.invoiceTriggerBtn, { backgroundColor: colors.primary }]}>
                    <FileText size={18} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={{ color: "#FFF", fontWeight: "700" }}>View Invoice / Receipt</Text>
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
                onConfirmPaid={() => { setPaymentStatus("PAID"); showToast("Paid via Digital Wallet!") }}
            />
        </KeyboardAvoidingView >
    )
}

const styles = StyleSheet.create({
    navHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
    backTouch: { padding: 4 },
    orderIdTitle: { fontSize: 16 },
    tableIndicatorBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    tableIndicatorText: { fontSize: 12 },
    sectionCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
    sectionSubtitleHeader: { fontSize: 12, letterSpacing: 1, marginBottom: 12, fontWeight: "700" },
    progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
    toggleBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    orderItemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
    quantityPicker: { flexDirection: "row", alignItems: "center", borderRadius: 8, paddingHorizontal: 4, height: 32, gap: 8 },
    mathBtn: { width: 22, height: 22, justifyContent: "center", alignItems: "center" },
    trashBtn: { width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center" },
    searchInput: { borderRadius: 8, paddingHorizontal: 12, height: 38, fontSize: 13 },
    dishCard: { width: 130, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
    calcRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
    promoBox: { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: 8, paddingHorizontal: 10, height: 38 },
    promoBtn: { height: 38, paddingHorizontal: 14, borderRadius: 8, justifyContent: "center", alignItems: "center" },
    bottomPanel: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, gap: 10, elevation: 15 },
    cashBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, paddingVertical: 12 },
    qrBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: "#16A34A", borderRadius: 12, paddingVertical: 12 },
    invoiceTriggerBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14 },
})