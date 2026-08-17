import { ChefHat, FileText, X } from "lucide-react-native"
import React from "react"
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native"

import { Order, OrderItem } from "@/services/orderService"
import { formatOrderTime } from "../../utils/billTemplates"
import Text from "../AppText"

interface InvoiceModalProps {
    visible: boolean
    onClose: () => void
    orderData: Order | null
    orderId: string
    orderItems: OrderItem[]
    itemsTotalSum: number
    grandFinalTotal: number
    tenantSlug?: string | null
    appliedPromo?: string | null
    promoDiscountVal?: number
    onPrintPOS: () => void
    onPrintInvoice: () => void
    onPrintKOT: () => void
}

export function InvoiceModal({
    visible,
    onClose,
    orderData,
    orderId,
    orderItems,
    itemsTotalSum,
    grandFinalTotal,
    tenantSlug,
    appliedPromo,
    promoDiscountVal,
    onPrintPOS,
    onPrintInvoice,
    onPrintKOT,
}: InvoiceModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalBlurOverlay}>
                <View style={styles.invoiceModalContainer}>

                    <View style={styles.invoiceHeaderLayout}>
                        <View style={{ width: 16 }} />
                        <View style={{ alignItems: "center" }}>
                            <Text style={styles.invoiceBrandHeading}>{(tenantSlug || "Merchant").toUpperCase()}</Text>
                            <Text style={styles.invoiceSubheading}>INVOICE / RECEIPT</Text>
                            <Text style={styles.invoiceTimestamp}>{formatOrderTime(orderData?.orderedAt)}</Text>
                            <Text style={styles.invoiceOrderTitle}>Order #{orderData?.orderNumber || orderId}</Text>
                            {orderData?.tableNumber ? (
                                <View style={styles.invoiceTableContainer}>
                                    <Text style={styles.invoiceTableLabel}>Table {orderData.tableNumber}</Text>
                                </View>
                            ) : null}
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.invoiceCloseTopX}>
                            <X size={16} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.invoiceGuestHeader}>{orderData?.customerName || "Walk-in Customer"}</Text>
                    <View style={styles.invoiceLineDivider} />

                    <View style={styles.invoiceTableGridHeader}>
                        <Text style={[styles.invoiceGridTitle, { flex: 2 }]}>Item</Text>
                        <Text style={[styles.invoiceGridTitle, { flex: 0.5, textAlign: "center" }]}>Qty</Text>
                        <Text style={[styles.invoiceGridTitle, { flex: 1, textAlign: "right" }]}>Rate</Text>
                        <Text style={[styles.invoiceGridTitle, { flex: 1.2, textAlign: "right" }]}>Amount</Text>
                    </View>
                    <View style={styles.invoiceLineDivider} />

                    <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                        {orderItems.map((item) => (
                            <View key={item.id} style={styles.invoiceProductItemRow}>
                                <Text style={[styles.invoiceItemNameText, { flex: 2 }]}>{item.itemName}</Text>
                                <Text style={[styles.invoiceItemQtyText, { flex: 0.5, textAlign: "center" }]}>{item.quantity}</Text>
                                <Text style={[styles.invoiceItemRateText, { flex: 1, textAlign: "right" }]}>NPR {item.price}</Text>
                                <Text style={[styles.invoiceItemAmountText, { flex: 1.2, textAlign: "right" }]}>NPR {item.price * item.quantity}</Text>
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.invoiceDottedDivider} />

                    <View style={styles.invoiceSummaryRow}>
                        <Text style={styles.invoiceSummaryLabel}>Subtotal</Text>
                        <Text style={styles.invoiceSummaryValue}>NPR {itemsTotalSum}</Text>
                    </View>
                    {appliedPromo && (promoDiscountVal ?? 0) > 0 && (
                        <View style={styles.invoiceSummaryRow}>
                            <Text style={[styles.invoiceSummaryLabel, { color: "#DC2626" }]}>Promo ({appliedPromo})</Text>
                            <Text style={[styles.invoiceSummaryValue, { color: "#DC2626" }]}>-NPR {promoDiscountVal}</Text>
                        </View>
                    )}
                    <View style={styles.invoiceSummaryRow}>
                        <Text style={[styles.invoiceSummaryLabel, { fontWeight: "bold", color: "#0F172A" }]}>Total</Text>
                        <Text style={[styles.invoiceSummaryValue, { fontWeight: "bold", fontSize: 16, color: "#0F172A" }]}>NPR {grandFinalTotal}</Text>
                    </View>

                    <View style={{ alignItems: "center", marginTop: 20, marginBottom: 16 }}>
                        <Text style={styles.invoiceFooterGreetings}>Thank you for your order!</Text>
                    </View>

                    <View style={styles.invoiceModalActionsRow}>
                        <TouchableOpacity
                            onPress={onPrintPOS}
                            activeOpacity={0.8}
                            style={[styles.invoiceActionBtn, { backgroundColor: "#1E293B", flex: 1.2 }]}>
                            <FileText size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={[styles.invoiceActionBtnLabel, { color: "#FFFFFF" }]}>POS</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onPrintInvoice}
                            activeOpacity={0.8}
                            style={[styles.invoiceActionBtn, { borderColor: "#CBD5E1", borderWidth: 1, flex: 1.2 }]}>
                            <Text style={[styles.invoiceActionBtnLabel, { color: "#0F172A" }]}>Print</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onPrintKOT}
                            activeOpacity={0.8}
                            style={[styles.invoiceActionBtn, { borderColor: "#FFEDD5", backgroundColor: "#FFF7ED", borderWidth: 1, flex: 1.2 }]}>
                            <ChefHat size={14} color="#EA580C" style={{ marginRight: 4 }} />
                            <Text style={[styles.invoiceActionBtnLabel, { color: "#EA580C" }]}>KOT</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onClose} style={[styles.invoiceActionBtn, { backgroundColor: "#000000", flex: 1 }]}>
                            <X size={14} color="#FFFFFF" style={{ marginRight: 2 }} />
                            <Text style={[styles.invoiceActionBtnLabel, { color: "#FFFFFF" }]}>Close</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    modalBlurOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
    invoiceModalContainer: { width: "100%", maxWidth: 380, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, elevation: 20 },
    invoiceHeaderLayout: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", width: "100%" },
    invoiceCloseTopX: { padding: 4 },
    invoiceBrandHeading: { fontSize: 18, fontWeight: "bold", color: "#0F172A", letterSpacing: 0.5 },
    invoiceSubheading: { fontSize: 11, color: "#64748B", marginTop: 2 },
    invoiceTimestamp: { fontSize: 11, color: "#64748B", marginTop: 4 },
    invoiceOrderTitle: { fontSize: 13, fontWeight: "700", color: "#0F172A", marginTop: 6 },
    invoiceTableContainer: { backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 6 },
    invoiceTableLabel: { fontSize: 10, color: "#475569", fontWeight: "600" },
    invoiceGuestHeader: { fontSize: 12, color: "#64748B", marginTop: 16, marginBottom: 4 },
    invoiceLineDivider: { height: 1, backgroundColor: "#E2E8F0", width: "100%", marginVertical: 4 },
    invoiceDottedDivider: { height: 1, borderWidth: 1, borderColor: "#CBD5E1", borderStyle: "dashed", width: "100%", marginVertical: 10 },
    invoiceTableGridHeader: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
    invoiceGridTitle: { fontSize: 11, fontWeight: "700", color: "#475569" },
    invoiceProductItemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
    invoiceItemNameText: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
    invoiceItemQtyText: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
    invoiceItemRateText: { fontSize: 12, color: "#475569" },
    invoiceItemAmountText: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
    invoiceSummaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
    invoiceSummaryLabel: { fontSize: 13, color: "#64748B" },
    invoiceSummaryValue: { fontSize: 13, color: "#475569" },
    invoiceFooterGreetings: { fontSize: 12, fontWeight: "700", color: "#0F172A" },
    invoiceModalActionsRow: { flexDirection: "row", gap: 6, width: "100%", marginTop: 4 },
    invoiceActionBtn: { height: 36, borderRadius: 8, flexDirection: "row", justifyContent: "center", alignItems: "center" },
    invoiceActionBtnLabel: { fontSize: 12, fontWeight: "700" },
})