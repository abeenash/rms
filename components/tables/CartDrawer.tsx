import { Maximize2, Minimize2, Minus, Plus, X } from "lucide-react-native";
import React, { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { CartItem, ExistingItem, UIItem } from "../../hooks/useTableOrdering";
import { consolidateExistingItems } from "@/utils/consolidateOrderItems";
import Text from "../AppText";

interface CartDrawerProps {
    isExpanded: boolean;
    onToggleExpand: () => void;
    hasActiveOrders: boolean;
    isLoadingExistingOrder: boolean;
    isOccupied: boolean;
    existingOrderItems: ExistingItem[];
    cartItemsArray: CartItem[];
    onUpdateExistingQty: (id: string, delta: number) => void;
    onRemoveExistingItem: (id: string, name: string) => void;
    onRemoveFromCart: (id: string) => void;
    onAddToCart: (item: UIItem) => void;
    existingOrderSubtotal: number;
    newItemsSubtotal: number;
    grandTotal: number;
    totalCartCount: number;
    isSubmittingOrder: boolean;
    onConfirmOrder: () => void;
    insets: { top: number; bottom: number };
    colors: any;
    isDark: boolean
}

export const CartDrawer: React.FC<CartDrawerProps> = React.memo(({
    isExpanded,
    onToggleExpand,
    hasActiveOrders,
    isLoadingExistingOrder,
    isOccupied,
    existingOrderItems,
    cartItemsArray,
    onUpdateExistingQty,
    onRemoveExistingItem,
    onRemoveFromCart,
    onAddToCart,
    existingOrderSubtotal,
    newItemsSubtotal,
    grandTotal,
    totalCartCount,
    isSubmittingOrder,
    onConfirmOrder,
    insets,
    colors,
    isDark
}) => {
    const consolidatedExisting = useMemo(
        () => consolidateExistingItems(existingOrderItems),
        [existingOrderItems]
    );

    return (
        <View style={[
            styles.bottomCartDrawer,
            {
                backgroundColor: colors.cardBg,
                borderTopColor: colors.border,
            },
            isExpanded ? {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                paddingTop: insets.top + 16,
                paddingBottom: Math.max(insets.bottom + 12, 16),
                zIndex: 999,
                height: '100%'
            } : {
                borderTopWidth: 1,
                paddingBottom: Math.max(insets.bottom + 8, 12),
            }
        ]}>
            {hasActiveOrders && (
                <View style={styles.drawerControlHeader}>
                    <Text style={[styles.drawerHeaderText, { color: colors.textMain, fontWeight: "700" }]}>
                        {isExpanded ? "Review Order Summary" : "Current Selection"}
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={onToggleExpand}
                        style={[styles.expandToggleCircle, { backgroundColor: colors.accentMain }]}>
                        {isExpanded ? (
                            <Minimize2 size={16} color="#FFF" />
                        ) : (
                            <Maximize2 size={16} color="#FFF" />
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {isLoadingExistingOrder ? (
                <View style={styles.emptyDrawerState}>
                    <ActivityIndicator size="small" color={colors.accentMain} />
                    <Text style={[styles.emptyStateText, { color: colors.textMuted, marginTop: 6 }]}>
                        Fetching active table order...
                    </Text>
                </View>
            ) : hasActiveOrders && (
                <View style={isExpanded ? { flex: 1, justifyContent: 'space-between' } : null}>
                    <ScrollView style={[styles.cartItemsScroll,
                    isExpanded ? { flex: 1, maxHeight: "100%" } : { maxHeight: 180 }
                    ]} nestedScrollEnabled
                        showsVerticalScrollIndicator={true}>

                        {isOccupied && consolidatedExisting.length > 0 && (
                            <View style={{ marginBottom: 12 }}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={[styles.sectionTitleText, { color: colors.textMain }]}>Current Order</Text>
                                </View>

                                {consolidatedExisting.map((item) => (
                                    <View key={`existing-${item.id}`} style={[styles.cartItemRow, { borderBottomColor: colors.border }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.cartItemNameText, { color: colors.textMain, fontWeight: "600" }]}>{item.name}</Text>
                                            <Text style={[styles.cartItemPriceLabel, { color: colors.textMuted }]}>Rs. {item.price}</Text>
                                        </View>
                                        <View style={styles.actionControlsContainer}>
                                            <View style={[styles.drawerQtyCounterBox, { backgroundColor: isDark ? "#1E293B" : "#FFF" }]}>
                                                <TouchableOpacity onPress={() => onUpdateExistingQty(item.id, -1)} style={[styles.qtyControlActionNode, { backgroundColor: colors.accentMain }]}>
                                                    <Minus size={14} color="#FFF" />
                                                </TouchableOpacity>
                                                <Text style={[styles.qtyNodeDisplayValue, { color: colors.textMain, fontWeight: "700" }]}>{item.quantity}</Text>
                                                <TouchableOpacity onPress={() => onUpdateExistingQty(item.id, 1)} style={[styles.qtyControlActionNode, { backgroundColor: colors.accentMain }]}>
                                                    <Plus size={14} color="#FFF" />
                                                </TouchableOpacity>
                                            </View>
                                            <TouchableOpacity onPress={() => onRemoveExistingItem(item.id, item.name)} style={styles.deleteActionButton}>
                                                <X size={18} color={colors.accentRed} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {cartItemsArray.length > 0 && (
                            <View style={{ marginTop: 4 }}>
                                <Text style={[styles.sectionTitleText, { color: colors.textMain, marginBottom: 6 }]}>New Items</Text>
                                {cartItemsArray.map(({ item, quantity }) => (
                                    <View key={item.id} style={[styles.cartItemRow, { borderBottomColor: colors.border }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.cartItemNameText, { color: colors.textMain, fontWeight: "600" }]}>{item.name}</Text>
                                            <Text style={[styles.cartItemPriceLabel, { color: colors.textMuted }]}>Rs. {item.price}</Text>
                                        </View>
                                        <View style={[styles.drawerQtyCounterBox, { backgroundColor: isDark ? "#1E293B" : "#FFF" }]}>
                                            <TouchableOpacity onPress={() => onRemoveFromCart(item.id)} style={[styles.qtyControlActionNode, { backgroundColor: colors.accentMain }]}>
                                                <Minus size={14} color="#FFF" />
                                            </TouchableOpacity>
                                            <Text style={[styles.qtyNodeDisplayValue, { color: colors.textMain, fontWeight: "500", fontSize: 17 }]}>{quantity}</Text>
                                            <TouchableOpacity onPress={() => onAddToCart(item)} style={[styles.qtyControlActionNode, { backgroundColor: colors.accentMain }]}>
                                                <Plus size={14} color="#FFF" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>

                    {/* --- REPLACE THE OLD subtotalRowBlock WITH THIS --- */}
                    <View style={styles.totalsContainerBlock}>
                        {isOccupied && consolidatedExisting.length > 0 ? (
                            <>
                                <View style={styles.subtotalRowBlock}>
                                    <Text style={[styles.subtotalLabelText, { color: colors.textMuted }]}>
                                        Previous Order Total
                                    </Text>
                                    <Text style={[styles.subtotalValueText, { color: colors.textMain, fontWeight: "600" }]}>
                                        Rs. {existingOrderSubtotal}
                                    </Text>
                                </View>

                                <View style={styles.subtotalRowBlock}>
                                    <Text style={[styles.subtotalLabelText, { color: colors.textMuted }]}>
                                        New Items Total
                                    </Text>
                                    <Text style={[styles.subtotalValueText, { color: colors.textMain, fontWeight: "600" }]}>
                                        Rs. {newItemsSubtotal}
                                    </Text>
                                </View>

                                <View style={[styles.grandTotalDivider, { backgroundColor: colors.border }]} />

                                <View style={styles.subtotalRowBlock}>
                                    <Text style={[styles.grandTotalLabelText, { color: colors.textMain, fontWeight: "700" }]}>
                                        Grand Total
                                    </Text>
                                    <Text style={[styles.grandTotalValueText, { color: colors.accentMain, fontWeight: "800" }]}>
                                        Rs. {grandTotal}
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <View style={styles.subtotalRowBlock}>
                                <Text style={[styles.grandTotalLabelText, { color: colors.textMain, fontWeight: "700" }]}>
                                    Total Amount
                                </Text>
                                <Text style={[styles.grandTotalValueText, { color: colors.accentMain, fontWeight: "800" }]}>
                                    Rs. {newItemsSubtotal}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            <TouchableOpacity
                disabled={totalCartCount === 0 || isSubmittingOrder}
                onPress={onConfirmOrder}
                activeOpacity={0.8}
                style={[
                    styles.primaryCheckoutBtn,
                    { backgroundColor: (totalCartCount === 0 || isSubmittingOrder) ? colors.border : colors.accentMain }
                ]}
            >
                {isSubmittingOrder ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <Text style={[styles.checkoutBtnText, { fontWeight: "700" }]}>
                        {isOccupied ? "Update Order" : "Confirm Order"}
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    )
})

const styles = StyleSheet.create({
    bottomCartDrawer: {
        borderTopWidth: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 10,
    },
    drawerControlHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 10,
        marginBottom: 4,
    },
    drawerHeaderText: {
        fontSize: 14,
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    expandToggleCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyDrawerState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
    },
    emptyStateText: {
        fontSize: 13,
        textAlign: "center",
    },
    cartItemsScroll: {
        maxHeight: 130,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 6,
    },
    sectionTitleText: {
        fontSize: 13,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        opacity: 0.7,
    },
    cartItemRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    cartItemNameText: {
        fontSize: 14,
    },
    cartItemPriceLabel: {
        fontSize: 12,
        marginTop: 1,
    },
    actionControlsContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    drawerQtyCounterBox: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 8,
        paddingHorizontal: 4,
        height: 32,
        gap: 12,
    },
    qtyControlActionNode: {
        width: 24,
        height: 24,
        borderRadius: 19,
        justifyContent: "center",
        alignItems: "center",
    },
    qtyNodeDisplayValue: {
        fontSize: 14,
        minWidth: 14,
        textAlign: "center",
    },
    deleteActionButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    totalsContainerBlock: {
        marginTop: 8,
        paddingTop: 8,
        gap: 4,
    },
    subtotalRowBlock: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    subtotalLabelText: {
        fontSize: 13,
    },
    subtotalValueText: {
        fontSize: 14,
    },
    grandTotalDivider: {
        height: 1,
        marginVertical: 4,
    },
    grandTotalLabelText: {
        fontSize: 15,
    },
    grandTotalValueText: {
        fontSize: 18,
    },
    primaryCheckoutBtn: {
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 8,
    },
    checkoutBtnText: {
        color: "#FFFFFF",
        fontSize: 15,
    },

})