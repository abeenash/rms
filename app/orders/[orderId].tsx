import { useLocalSearchParams, useRouter } from "expo-router"
import {
    ArrowLeft, Check, ChevronDown, ChevronUp,
    FileText, Minus, Percent, Plus, Trash2, X
} from "lucide-react-native"
import React, { useState } from "react"
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Text } from "../components/AppText"
import { useTheme } from "../context/ThemeContext"

const dummy_catalog = [
    { id: "m1", name: "Chicken roasted", price: 322, image: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=200&q=80" },
    { id: "m2", name: "Lekali Menu 1", price: 300, image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=200&q=80" },
    { id: "m3", name: "Lekali Momo", price: 200, image: "https://images.unsplash.com/photo-1625220194771-7ebedd0870b6?w=200&q=80" },
    { id: "m4", name: "Lekali Sekuwa", price: 200, image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=200&q=80" },
]

export default function OrderDetailsScreen() {
    const { orderId } = useLocalSearchParams()
    const router = useRouter()
    const insets = useSafeAreaInsets()
    const { isDark } = useTheme()
    const [isInvoiceVisible, setIsInvoiceVisible] = useState(false)

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

    //1. progress indicator
    const [orderStatus, setOrderStatus] = useState<"CONFIRMED" | "CANCELLED">("CONFIRMED")
    const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "PAID">("PENDING")

    //2. order items section
    const [orderItems, setOrderItems] = useState([
        { id: "m1", name: "Chicken roasted", price: 322, qty: 2 },
        { id: "m2", name: "Lekali Menu 1", price: 300, qty: 1 },
        { id: "m3", name: "Lekali Momo", price: 200, qty: 1 },
    ])

    //3. expandable items section
    const [isAddSectionExpanded, setIsAddSectionExpanded] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    //4. order summary section. manual discount and promo code
    const [promoInput, setPromoInput] = useState("")
    const [appliedPromo, setAppliedPromo] = useState<string | null>(null)
    const [promoDiscountVal, setPromoDiscountVal] = useState(0)
    const [manualDiscountStr, setManualDiscountStr] = useState("0")

    //5. update the quantity in order items
    const updateQty = (id: string, currQty: number) => {
        setOrderItems((prev) => prev.map((item) => {
            if (item.id === id) {
                const nextQty = item.qty + currQty;
                return nextQty > 0 ? { ...item, qty: nextQty } : item
            }
            return item
        })
        )
    }

    //6. deleting from the order items
    const removeItem = (id: string, name: string) => {
        Alert.alert(
            "⚠️ Remove Item",
            `Are you sure you want to remove "${name}" from this order? This will modify the active bill amount.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes, Delete",
                    style: "destructive",
                    onPress: () => setOrderItems((prev) => prev.filter((item) => item.id !== id))
                }
            ],
            { cancelable: true }
        );
    };

    //add items from accordion to active items list
    const addItemToActiveOrder = (catalogItem: typeof dummy_catalog[0]) => {
        setOrderItems((prev) => {
            const existing = prev.find((item) => item.id === catalogItem.id);
            if (existing) {
                return prev.map((item) => item.id === catalogItem.id ? { ...item, qty: item.qty + 1 } : item);
            } else {
                return [...prev, { id: catalogItem.id, name: catalogItem.name, price: catalogItem.price, qty: 1 }];
            }
        });
    };

    const toggleOrderStatus = () => {
        setOrderStatus((prev) => (prev === "CONFIRMED" ? "CANCELLED" : "CONFIRMED"));
    };
    const togglePaymentStatus = () => {
        setPaymentStatus((prev) => (prev === "PENDING" ? "PAID" : "PENDING"));
    };

    //promo code
    const handleApplyPromo = () => {
        if (promoInput.trim().toUpperCase() === "LEKALI50") {
            setAppliedPromo("LEKALI50");
            setPromoDiscountVal(50);
            Alert.alert("Success", "NPR 50 discount applied!");
        } else {
            Alert.alert("Invalid Code", "Try using LEKALI50 for test discount");
        }
        setPromoInput("");
    };

    const handleClearPromo = () => {
        setAppliedPromo(null);
        setPromoDiscountVal(0);
    };

    //three natures of total
    const itemsTotalSum = orderItems.reduce((acc, item) => acc + item.price * item.qty, 0);
    const parsedManualDiscount = parseFloat(manualDiscountStr) || 0;
    const grandFinalTotal = Math.max(0, itemsTotalSum - promoDiscountVal - parsedManualDiscount);

    //filter search
    const filteredCatalog = dummy_catalog.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.bg }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            {/* HEADER BAR */}
            <View style={[styles.navHeader, { paddingTop: insets.top + 12, backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backTouch}>
                    <ArrowLeft size={20} color={colors.textMain} />
                </TouchableOpacity>
                <View style={styles.headerInfoContainer}>
                    <Text style={[styles.orderIdTitle, { color: colors.textMain, fontWeight: "700" }]}>
                        Order #{orderId || "7CC3AB"}
                    </Text>
                    <View style={[styles.tableIndicatorBadge, { borderColor: colors.primary }]}>
                        <Text style={[styles.tableIndicatorText, { color: colors.primary, fontWeight: "700" }]}>T3</Text>
                    </View>
                </View>
                {/* Visual Spacing Balancer */}
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* progress section */}
                <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={[styles.sectionSubtitleHeader, { color: colors.textMuted, fontWeight: "700" }]}>PROGRESS</Text>

                    <View style={styles.progressRow}>
                        <Text style={[styles.progressLabelText, { color: colors.textMain }]}>Order Status:</Text>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={toggleOrderStatus}
                            style={[
                                styles.toggleInteractiveBadge,
                                { backgroundColor: orderStatus === "CONFIRMED" ? colors.accentGreenBg : colors.accentRedBg }
                            ]}
                        >
                            <Text style={[
                                styles.badgeStatusText,
                                { color: orderStatus === "CONFIRMED" ? colors.accentGreen : colors.accentRed, fontWeight: "700" }
                            ]}>
                                {orderStatus}
                            </Text>
                            <ChevronDown size={12} color={orderStatus === "CONFIRMED" ? colors.accentGreen : colors.accentRed} style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.progressRow}>
                        <Text style={[styles.progressLabelText, { color: colors.textMain }]}>Payment Status:</Text>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={togglePaymentStatus}
                            style={[
                                styles.toggleInteractiveBadge,
                                { backgroundColor: paymentStatus === "PAID" ? colors.accentGreenBg : colors.accentYellowBg }
                            ]}
                        >
                            <Text style={[
                                styles.badgeStatusText,
                                { color: paymentStatus === "PAID" ? colors.accentGreen : colors.accentYellow, fontWeight: "700" }
                            ]}>
                                {paymentStatus}
                            </Text>
                            <ChevronDown size={12} color={paymentStatus === "PAID" ? colors.accentGreen : colors.accentYellow} style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* order items section */}
                <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={[styles.sectionSubtitleHeader, { color: colors.textMuted, fontWeight: "700" }]}>
                        ORDER ITEMS ({orderItems.length})
                    </Text>

                    {orderItems.map((item) => (
                        <View key={item.id} style={[styles.orderItemRowLine, { borderBottomColor: colors.border }]}>
                            <View style={styles.itemMetaColumn}>
                                <Text style={[styles.itemNameTitleText, { color: colors.textMain, fontWeight: "600" }]}>
                                    {item.name}
                                </Text>
                                <Text style={[styles.itemSubPriceLabel, { color: colors.textMuted }]}>
                                    NPR {item.price} each
                                </Text>
                            </View>

                            <View style={styles.interactivePanelRow}>
                                {/* adjust the quantity against the current one */}
                                <View style={[styles.quantityPickerFrame, { backgroundColor: colors.bg }]}>
                                    <TouchableOpacity onPress={() => updateQty(item.id, -1)} style={styles.controlMathBtnNode}>
                                        <Minus size={14} color={colors.textMain} />
                                    </TouchableOpacity>
                                    <Text style={[styles.pickerValueTextText, { color: colors.textMain, fontWeight: "700" }]}>
                                        {item.qty}
                                    </Text>
                                    <TouchableOpacity onPress={() => updateQty(item.id, 1)} style={styles.controlMathBtnNode}>
                                        <Plus size={14} color={colors.textMain} />
                                    </TouchableOpacity>
                                </View>

                                {/* delete with alert */}
                                <TouchableOpacity
                                    onPress={() => removeItem(item.id, item.name)}
                                    style={[styles.trashActionNode, { backgroundColor: colors.accentRedBg }]}
                                >
                                    <Trash2 size={16} color={colors.accentRed} />
                                </TouchableOpacity>

                                {/* subtotal A */}
                                <Text style={[styles.itemCumulativeSubtotalValue, { color: colors.textMain, fontWeight: "700" }]}>
                                    NPR {item.price * item.qty}
                                </Text>
                            </View>
                        </View>
                    ))}

                    <View style={styles.subtotalItemsSumRow}>
                        <Text style={[styles.summaryRawPriceLabelText, { color: colors.textMuted, fontWeight: "600" }]}>TOTAL</Text>
                        <Text style={[styles.summaryRawPriceValueText, { color: colors.textMain, fontWeight: "800" }]}>
                            NPR {itemsTotalSum}
                        </Text>
                    </View>
                </View>

                {/* 3. expandable catalog */}
                <View style={[styles.accordionSectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setIsAddSectionExpanded(!isAddSectionExpanded)}
                        style={styles.accordionToggleInteractiveRow}
                    >
                        <Text style={[styles.accordionLabelTitle, { color: colors.primary, fontWeight: "700" }]}>
                            {isAddSectionExpanded ? "- Close Catalog Items" : "+ Add Items to Order"}
                        </Text>
                        {isAddSectionExpanded ? (
                            <ChevronUp size={18} color={colors.primary} />
                        ) : (
                            <ChevronDown size={18} color={colors.primary} />
                        )}
                    </TouchableOpacity>

                    {isAddSectionExpanded && (
                        <View style={styles.accordionOpenBodyContainer}>
                            <View style={[styles.drawerSearchInputBox, { backgroundColor: colors.bg }]}>
                                <TextInput
                                    style={[styles.searchDrawerInputInstance, { color: colors.textMain }]}
                                    placeholder="Filter available dishes..."
                                    placeholderTextColor={colors.textMuted}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalShelfLayout}>
                                {filteredCatalog.map((dish) => (
                                    <TouchableOpacity
                                        key={dish.id}
                                        activeOpacity={0.8}
                                        onPress={() => addItemToActiveOrder(dish)}
                                        style={[styles.horizontalCardInstance, { backgroundColor: colors.bg, borderColor: colors.border }]}
                                    >
                                        <Image source={{ uri: dish.image }} style={styles.horizontalCardThumbnail} />
                                        <View style={styles.shelfTextDetailsBlock}>
                                            <Text numberOfLines={1} style={[styles.shelfCardTitleText, { color: colors.textMain, fontWeight: "600" }]}>
                                                {dish.name}
                                            </Text>
                                            <Text style={[styles.shelfCardPriceText, { color: colors.primary, fontWeight: "700" }]}>
                                                NPR {dish.price}
                                            </Text>
                                        </View>
                                        <View style={[styles.quickAddNodeBadge, { backgroundColor: colors.primary }]}>
                                            <Plus size={14} color="#FFFFFF" />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>

                {/* order summary section */}
                <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={[styles.sectionSubtitleHeader, { color: colors.textMuted, fontWeight: "700" }]}>
                        ORDER SUMMARY
                    </Text>

                    <View style={styles.calculationRecordLine}>
                        <Text style={[styles.calcRecordKeyLabelText, { color: colors.textMuted }]}>Total Amount</Text>
                        <Text style={[styles.calcRecordValueTextLabel, { color: colors.textMain, fontWeight: "600" }]}>
                            NPR {itemsTotalSum}
                        </Text>
                    </View>

                    {/* apply promo code text input*/}
                    <View style={styles.couponAndDiscountAdjustmentRow}>
                        <View style={[styles.textInputBoxWrapper, { backgroundColor: colors.bg, flex: 1 }]}>
                            <Percent size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
                            <TextInput
                                style={[styles.rawPromoTextInput, { color: colors.textMain }]}
                                placeholder={appliedPromo ? `Active: ${appliedPromo}` : "Promo code"}
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="characters"
                                value={promoInput}
                                onChangeText={setPromoInput}
                                editable={!appliedPromo}
                            />
                        </View>
                        {appliedPromo ? (
                            <TouchableOpacity onPress={handleClearPromo} style={[styles.promoTriggerButtonNode, { backgroundColor: colors.accentRed }]}>
                                <X size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={handleApplyPromo} style={[styles.promoTriggerButtonNode, { backgroundColor: colors.primary }]}>
                                <Text style={styles.promoActionTriggerBtnLabelText}>APPLY</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* manual discount */}
                    <View style={styles.manualDiscountFlexGridRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.calcRecordKeyLabelText, { color: colors.textMuted }]}>Manual Discount (NPR)</Text>
                            <View style={[styles.textInputBoxWrapper, { backgroundColor: colors.bg, marginTop: 6 }]}>
                                <TextInput
                                    keyboardType="numeric"
                                    style={[styles.rawPromoTextInput, { color: colors.textMain }]}
                                    placeholder="Enter custom reduction..."
                                    placeholderTextColor={colors.textMuted}
                                    value={manualDiscountStr}
                                    onChangeText={setManualDiscountStr}
                                />
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={() => setManualDiscountStr("0")}
                            style={[styles.clearManualDiscountButtonNode, { borderColor: colors.border }]}
                        >
                            <Text style={[styles.clearManualDiscountBtnLabel, { color: colors.textMain }]}>Clear</Text>
                        </TouchableOpacity>
                    </View>

                    {/* if promo discount applied, then show the deducted price */}
                    {promoDiscountVal > 0 && (
                        <View style={styles.calculationRecordLine}>
                            <Text style={[styles.calcRecordKeyLabelText, { color: colors.accentGreen }]}>Promo discount</Text>
                            <Text style={[styles.calcRecordValueTextLabel, { color: colors.accentGreen, fontWeight: "600" }]}>
                                -NPR {promoDiscountVal}
                            </Text>
                        </View>
                    )}

                    {/* if manual discount applied, then show the deducted price */}
                    {parsedManualDiscount > 0 && (
                        <View style={styles.calculationRecordLine}>
                            <Text style={[styles.calcRecordKeyLabelText, { color: colors.accentRed }]}>Manual discount</Text>
                            <Text style={[styles.calcRecordValueTextLabel, { color: colors.accentRed, fontWeight: "600" }]}>
                                -NPR {parsedManualDiscount}
                            </Text>
                        </View>
                    )}

                    <View style={[styles.calculationRecordLine, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }]}>
                        <Text style={[styles.finalTotalBigHeaderLabel, { color: colors.textMain, fontWeight: "700" }]}>
                            FINAL TOTAL
                        </Text>
                        <Text style={[styles.finalTotalBigValueDisplay, { color: colors.textMain, fontWeight: "800" }]}>
                            NPR {grandFinalTotal}
                        </Text>
                    </View>

                    <View style={styles.calculationRecordLine}>
                        <Text style={[styles.calcRecordKeyLabelText, { color: colors.textMuted }]}>PAYMENT</Text>
                        <View style={[
                            styles.paymentFinalBadge,
                            { backgroundColor: paymentStatus === "PAID" ? colors.accentGreenBg : colors.accentYellowBg }
                        ]}>
                            <Text style={[
                                styles.paymentFinalBadgeText,
                                { color: paymentStatus === "PAID" ? colors.accentGreen : colors.accentYellow, fontWeight: "700" }
                            ]}>
                                {paymentStatus}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* two fixed buttons: pay now and view invoice/ receipt */}
            <View style={[styles.bottomControlButtonsPanel, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                        setPaymentStatus("PAID");
                        Alert.alert("Payment Cleared", `Transaction of NPR ${grandFinalTotal} completed!`);
                    }}
                    style={[styles.primaryCheckoutActionBtn, { backgroundColor: colors.accentGreen }]}
                >
                    <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.checkoutActionBtnLabelText}>Pay Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIsInvoiceVisible(true)}
                    style={[styles.secondaryReceiptActionBtn, { borderColor: colors.border }]}
                >
                    <FileText size={18} color={colors.textMain} style={{ marginRight: 6 }} />
                    <Text style={[styles.receiptActionBtnLabelText, { color: colors.textMain }]}>View Invoice / Receipt</Text>
                </TouchableOpacity>
            </View>

            {/* for invoice/ receipt generation, overlaying the react-native modal  */}
            <Modal
                visible={isInvoiceVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsInvoiceVisible(false)}
            >
                <View style={styles.modalBlurOverlay}>
                    <View style={styles.invoiceModalContainer}>

                        {/* top main headings for the invoice */}
                        <View style={styles.invoiceHeaderLayout}>
                            <View style={{ width: 16 }} />
                            <View style={{ alignItems: "center" }}>
                                <Text style={styles.invoiceBrandHeading}>LEKALI SEKUWA</Text>
                                <Text style={styles.invoiceSubheading}>INVOICE / RECEIPT</Text>
                                <Text style={styles.invoiceTimestamp}>Jul 14, 2026 14:44</Text>
                                <Text style={styles.invoiceOrderTitle}>Order #{orderId || "FB4903EC"}</Text>
                                <View style={styles.invoiceTableContainer}>
                                    <Text style={styles.invoiceTableLabel}>Table 3</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setIsInvoiceVisible(false)} style={styles.invoiceCloseTopX}>
                                <X size={16} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.invoiceGuestHeader}>Guest</Text>
                        <View style={styles.invoiceLineDivider} />

                        {/* billing table headers */}
                        <View style={styles.invoiceTableGridHeader}>
                            <Text style={[styles.invoiceGridTitle, { flex: 2 }]}>Item</Text>
                            <Text style={[styles.invoiceGridTitle, { flex: 0.5, textAlign: "center" }]}>Qty</Text>
                            <Text style={[styles.invoiceGridTitle, { flex: 1, textAlign: "right" }]}>Rate</Text>
                            <Text style={[styles.invoiceGridTitle, { flex: 1.2, textAlign: "right" }]}>Amount</Text>
                        </View>
                        <View style={styles.invoiceLineDivider} />

                        {/* loopable item list */}
                        <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                            {orderItems.map((item) => (
                                <View key={item.id} style={styles.invoiceProductItemRow}>
                                    <Text style={[styles.invoiceItemNameText, { flex: 2 }]}>{item.name}</Text>
                                    <Text style={[styles.invoiceItemQtyText, { flex: 0.5, textAlign: "center" }]}>{item.qty}</Text>
                                    <Text style={[styles.invoiceItemRateText, { flex: 1, textAlign: "right" }]}>NPR {item.price}.00</Text>
                                    <Text style={[styles.invoiceItemAmountText, { flex: 1.2, textAlign: "right" }]}>NPR {item.price * item.qty}.00</Text>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.invoiceDottedDivider} />

                        {/* final calculation */}
                        <View style={styles.invoiceSummaryRow}>
                            <Text style={styles.invoiceSummaryLabel}>Subtotal</Text>
                            <Text style={styles.invoiceSummaryValue}>NPR {itemsTotalSum}.00</Text>
                        </View>
                        <View style={styles.invoiceSummaryRow}>
                            <Text style={[styles.invoiceSummaryLabel, { fontWeight: "bold", color: "#0F172A" }]}>Total</Text>
                            <Text style={[styles.invoiceSummaryValue, { fontWeight: "bold", fontSize: 16, color: "#0F172A" }]}>NPR {itemsTotalSum}.00</Text>
                        </View>

                        {/* footer for acknowledgement */}
                        <View style={{ alignItems: "center", marginTop: 20, marginBottom: 16 }}>
                            <Text style={styles.invoiceFooterGreetings}>Thank you for your order!</Text>
                            <Text style={styles.invoiceFooterSubText}>Lekali Sekuwa</Text>
                        </View>

                        {/* action buttons for print in POS, normally, and Kitchen Order Table. And Close dialog */}
                        <View style={styles.invoiceModalActionsRow}>
                            <TouchableOpacity style={[styles.invoiceActionBtn, { backgroundColor: "#1E293B", flex: 1.2 }]}>
                                <FileText size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                                <Text style={[styles.invoiceActionBtnLabel, { color: "#FFFFFF" }]}>POS</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.invoiceActionBtn, { borderColor: "#CBD5E1", borderWidth: 1, flex: 1.2 }]}>
                                <Text style={[styles.invoiceActionBtnLabel, { color: "#0F172A" }]}>Print</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.invoiceActionBtn, { borderColor: "#FFEDD5", backgroundColor: "#FFF7ED", borderWidth: 1, flex: 1.2 }]}>
                                <Text style={[styles.invoiceActionBtnLabel, { color: "#EA580C" }]}>KOT</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setIsInvoiceVisible(false)} style={[styles.invoiceActionBtn, { backgroundColor: "#000000", flex: 1 }]}>
                                <X size={14} color="#FFFFFF" style={{ marginRight: 2 }} />
                                <Text style={[styles.invoiceActionBtnLabel, { color: "#FFFFFF" }]}>Close</Text>
                            </TouchableOpacity>
                        </View>

                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    navHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
    },
    backTouch: {
        padding: 4,
    },
    headerInfoContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    orderIdTitle: {
        fontSize: 16,
    },
    tableIndicatorBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
    },
    tableIndicatorText: {
        fontSize: 12,
    },
    scrollContainer: {
        padding: 16,
        gap: 16,
    },
    sectionCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    sectionSubtitleHeader: {
        fontSize: 12,
        letterSpacing: 1,
        marginBottom: 12,
    },
    progressRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
    },
    progressLabelText: {
        fontSize: 14,
    },
    toggleInteractiveBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    badgeStatusText: {
        fontSize: 13,
    },
    captionInstructionText: {
        fontSize: 9,
        marginTop: 1,
    },
    orderItemRowLine: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemMetaColumn: {
        flex: 1,
    },
    itemNameTitleText: {
        fontSize: 14,
    },
    itemSubPriceLabel: {
        fontSize: 12,
        marginTop: 2,
    },
    interactivePanelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    quantityPickerFrame: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 8,
        paddingHorizontal: 4,
        height: 32,
        gap: 10,
    },
    controlMathBtnNode: {
        width: 24,
        height: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    pickerValueTextText: {
        fontSize: 13,
        minWidth: 12,
        textAlign: "center",
    },
    trashActionNode: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    itemCumulativeSubtotalValue: {
        fontSize: 13,
        minWidth: 80,
        textAlign: "right",
    },
    subtotalItemsSumRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 12,
    },
    summaryRawPriceLabelText: {
        fontSize: 13,
    },
    summaryRawPriceValueText: {
        fontSize: 16,
    },
    accordionSectionCard: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: "hidden",
    },
    accordionToggleInteractiveRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
    },
    accordionLabelTitle: {
        fontSize: 14,
    },
    accordionOpenBodyContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    drawerSearchInputBox: {
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 38,
        marginBottom: 12,
    },
    searchDrawerInputInstance: {
        fontSize: 13,
        height: "100%",
    },
    horizontalShelfLayout: {
        gap: 12,
    },
    horizontalCardInstance: {
        width: 140,
        borderRadius: 12,
        borderWidth: 1,
        overflow: "hidden",
        position: "relative",
    },
    horizontalCardThumbnail: {
        width: "100%",
        height: 80,
    },
    shelfTextDetailsBlock: {
        padding: 8,
    },
    shelfCardTitleText: {
        fontSize: 12,
    },
    shelfCardPriceText: {
        fontSize: 11,
        marginTop: 2,
    },
    quickAddNodeBadge: {
        position: "absolute",
        top: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: "center",
        alignItems: "center",
    },
    calculationRecordLine: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 6,
    },
    calcRecordKeyLabelText: {
        fontSize: 13,
    },
    calcRecordValueTextLabel: {
        fontSize: 14,
    },
    couponAndDiscountAdjustmentRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 8,
        marginBottom: 12,
    },
    textInputBoxWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 38,
    },
    rawPromoTextInput: {
        flex: 1,
        fontSize: 13,
        height: "100%",
    },
    promoTriggerButtonNode: {
        height: 38,
        paddingHorizontal: 14,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    promoActionTriggerBtnLabelText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "bold",
    },
    manualDiscountFlexGridRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8,
        marginBottom: 12,
    },
    clearManualDiscountButtonNode: {
        height: 38,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    clearManualDiscountBtnLabel: {
        fontSize: 12,
        fontWeight: "600",
    },
    finalTotalBigHeaderLabel: {
        fontSize: 14,
    },
    finalTotalBigValueDisplay: {
        fontSize: 20,
    },
    paymentFinalBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    paymentFinalBadgeText: {
        fontSize: 12,
        letterSpacing: 0.5,
    },
    bottomControlButtonsPanel: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 15,
    },
    primaryCheckoutActionBtn: {
        height: 44,
        borderRadius: 10,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    checkoutActionBtnLabelText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "bold",
    },
    secondaryReceiptActionBtn: {
        height: 44,
        borderRadius: 10,
        borderWidth: 1,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    receiptActionBtnLabelText: {
        fontSize: 13,
        fontWeight: "600",
    },
    // INVOICE DIALOG MODAL LAYOUT EXTENSIONS
    modalBlurOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    invoiceModalContainer: {
        width: "100%",
        maxWidth: 380,
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 20,
    },
    invoiceHeaderLayout: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        position: "relative",
        width: "100%",
    },
    invoiceCloseTopX: {
        padding: 4,
    },
    invoiceBrandHeading: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#0F172A",
        letterSpacing: 0.5,
    },
    invoiceSubheading: {
        fontSize: 11,
        color: "#64748B",
        marginTop: 2,
        letterSpacing: 0.5,
    },
    invoiceTimestamp: {
        fontSize: 11,
        color: "#64748B",
        marginTop: 4,
    },
    invoiceOrderTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#0F172A",
        marginTop: 6,
    },
    invoiceTableContainer: {
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 6,
    },
    invoiceTableLabel: {
        fontSize: 10,
        color: "#475569",
        fontWeight: "600",
    },
    invoiceGuestHeader: {
        fontSize: 12,
        color: "#64748B",
        marginTop: 16,
        marginBottom: 4,
    },
    invoiceLineDivider: {
        height: 1,
        backgroundColor: "#E2E8F0",
        width: "100%",
        marginVertical: 4,
    },
    invoiceDottedDivider: {
        height: 1,
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderStyle: "dashed",
        width: "100%",
        marginVertical: 10,
    },
    invoiceTableGridHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
    },
    invoiceGridTitle: {
        fontSize: 11,
        fontWeight: "700",
        color: "#475569",
    },
    invoiceProductItemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10,
    },
    invoiceItemNameText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#0F172A",
    },
    invoiceItemQtyText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#0F172A",
    },
    invoiceItemRateText: {
        fontSize: 12,
        color: "#475569",
    },
    invoiceItemAmountText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#0F172A",
    },
    invoiceSummaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 4,
    },
    invoiceSummaryLabel: {
        fontSize: 13,
        color: "#64748B",
    },
    invoiceSummaryValue: {
        fontSize: 13,
        color: "#475569",
    },
    invoiceFooterGreetings: {
        fontSize: 12,
        fontWeight: "700",
        color: "#0F172A",
    },
    invoiceFooterSubText: {
        fontSize: 11,
        color: "#64748B",
        marginTop: 2,
    },
    invoiceModalActionsRow: {
        flexDirection: "row",
        gap: 6,
        width: "100%",
        marginTop: 4,
    },
    invoiceActionBtn: {
        height: 36,
        borderRadius: 8,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    invoiceActionBtnLabel: {
        fontSize: 12,
        fontWeight: "700",
    },
});