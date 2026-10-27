import { PromoCode } from "@/services/promoService";
import { ChevronDown, ChevronUp, Percent, Tag, X } from "lucide-react-native";
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Text from "../AppText";

interface OrderSummaryFooterProps {
    itemsTotalSum: number;
    grandFinalTotal: number;
    isOrderFinalized: boolean;
    promoSearchQuery: string;
    onPromoSearchChange: (text: string) => void;
    isPromoExpanded: boolean;
    onTogglePromoExpanded: () => void;
    filteredPromos: PromoCode[];
    selectedPromo: PromoCode | null;
    onSelectPromo: (promo: PromoCode) => void;
    appliedPromo: string | null;
    promoDiscountVal: number;
    onApplyPromo: () => void;
    onClearPromo: () => void;
    onCancelSelection: () => void;
    colors: {
        cardBg: string;
        border: string;
        bg: string;
        textMain: string;
        textMuted: string;
        primary: string;
        accentRed: string;
        accentGreen: string;
    };
}

export const OrderSummaryCard: React.FC<OrderSummaryFooterProps> = ({
    itemsTotalSum,
    grandFinalTotal,
    isOrderFinalized,
    promoSearchQuery,
    onPromoSearchChange,
    isPromoExpanded,
    onTogglePromoExpanded,
    filteredPromos,
    selectedPromo,
    onSelectPromo,
    appliedPromo,
    promoDiscountVal,
    onApplyPromo,
    onClearPromo,
    onCancelSelection,
    colors,
}) => {
    return (
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionSubtitleHeader, { color: colors.textMuted }]}>ORDER SUMMARY</Text>
            <View style={styles.calcRow}>
                <Text style={{ color: colors.textMuted }}>Total Amount</Text>
                <Text style={{ color: colors.textMain, fontWeight: "600" }}>Rs. {itemsTotalSum}</Text>
            </View>

            {/* Applied promo display (when promo is already applied) */}
            {appliedPromo && (
                <View style={[styles.appliedPromoRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Tag size={14} color={"#6366F1"} />
                        <Text style={{ color: "#6366F1", fontWeight: "700", fontSize: 13 }}>
                            {appliedPromo}
                        </Text>
                        <Text style={{ color: colors.textMain, fontSize: 12 }}>
                            -Rs. {promoDiscountVal}
                        </Text>
                    </View>
                    {!isOrderFinalized && (
                        <TouchableOpacity onPress={onClearPromo} style={styles.removeBtn} activeOpacity={0.7}>
                            <X size={14} color={colors.accentRed} />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Promo selection accordion (when no promo applied and order not finalized) */}
            {!isOrderFinalized && !appliedPromo && (
                <View style={{ marginTop: 8, marginBottom: 6 }}>
                    {/* Toggle button */}
                    <TouchableOpacity
                        onPress={onTogglePromoExpanded}
                        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                    >
                        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>
                            {isPromoExpanded ? "- Close Promos" : "+ Select Promo Code"}
                        </Text>
                        {isPromoExpanded ? (
                            <ChevronUp size={16} color={colors.primary} />
                        ) : (
                            <ChevronDown size={16} color={colors.primary} />
                        )}
                    </TouchableOpacity>

                    {/* Expanded: search + promo list */}
                    {isPromoExpanded && (
                        <View style={{ marginTop: 10 }}>
                            <TextInput
                                style={[styles.searchInput, { backgroundColor: colors.bg, color: colors.textMain }]}
                                placeholder="Search promo codes..."
                                placeholderTextColor={colors.textMuted}
                                value={promoSearchQuery}
                                onChangeText={onPromoSearchChange}
                            />

                            {filteredPromos.length === 0 ? (
                                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 10, textAlign: "center" }}>
                                    No active promo codes found
                                </Text>
                            ) : (
                                <View style={{ marginTop: 8, gap: 6 }}>
                                    {filteredPromos.map((promo) => (
                                        <TouchableOpacity
                                            key={promo.id}
                                            onPress={() => onSelectPromo(promo)}
                                            activeOpacity={0.7}
                                            style={[
                                                styles.promoCard,
                                                {
                                                    backgroundColor: colors.bg,
                                                    borderColor: selectedPromo?.id === promo.id ? colors.primary : colors.border,
                                                },
                                            ]}
                                        >
                                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                                    <Percent size={14} color={colors.primary} />
                                                    <Text style={{ color: colors.textMain, fontWeight: "700", fontSize: 13 }}>
                                                        {promo.code}
                                                    </Text>
                                                </View>
                                                <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>
                                                    {promo.discountPercent}% OFF
                                                </Text>
                                            </View>
                                            {promo.description ? (
                                                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
                                                    {promo.description}
                                                </Text>
                                            ) : null}
                                            <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                                                {promo.maxDiscountAmount > 0 && (
                                                    <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                                                        Max<Text style={{ color: colors.textMain, fontSize: 10 }}> Rs. {promo.maxDiscountAmount}</Text>
                                                    </Text>
                                                )}
                                                {promo.minOrderAmount > 0 && (
                                                    <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                                                        Min order
                                                        <Text style={{ color: colors.textMain, fontSize: 10 }}> Rs. {promo.minOrderAmount}</Text>
                                                    </Text>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Selected promo: show info + apply/cancel buttons */}
                    {selectedPromo && !isPromoExpanded && (
                        <View style={[styles.selectedPromoRow, { backgroundColor: colors.bg, borderColor: colors.primary }]}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Tag size={14} color={colors.primary} />
                                <Text style={{ color: colors.textMain, fontWeight: "700", fontSize: 13 }}>
                                    {selectedPromo.code}
                                </Text>
                                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                                    {selectedPromo.discountPercent}% off
                                </Text>
                            </View>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                <TouchableOpacity
                                    onPress={onCancelSelection} style={styles.removeBtn} activeOpacity={0.7}>
                                    <X size={18} color={colors.accentRed} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={onApplyPromo} style={[styles.applyBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
                                    <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 12 }}>APPLY</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            )}

            <View style={[styles.calcRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }]}>
                <Text style={{ color: colors.textMain, fontWeight: "700", fontSize: 16 }}>FINAL TOTAL</Text>
                <Text style={{ color: colors.textMain, fontWeight: "800", fontSize: 20 }}>Rs. {grandFinalTotal}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    sectionCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    sectionSubtitleHeader: {
        fontSize: 12,
        letterSpacing: 1,
        marginBottom: 12,
        fontWeight: "700",
    },
    calcRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 4,
    },
    searchInput: {
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 38,
        fontSize: 13,
    },
    promoCard: {
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    appliedPromoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginTop: 8,
    },
    selectedPromoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginTop: 10,
    },
    applyBtn: {
        height: 30,
        paddingHorizontal: 14,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    cancelBtn: {
        height: 30,
        width: 30,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#CBD5E1",
    },
    removeBtn: {
        height: 28,
        width: 28,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
    },
});
