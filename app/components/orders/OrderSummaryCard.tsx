import { Percent, X } from "lucide-react-native";
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Text from "../AppText";

interface OrderSummaryFooterProps {
    itemsTotalSum: number;
    grandFinalTotal: number;
    isOrderFinalized: boolean;
    promoInput: string;
    onPromoInputChange: (text: string) => void;
    appliedPromo: string | null;
    onApplyPromo: () => void;
    onClearPromo: () => void;
    colors: {
        cardBg: string;
        border: string;
        bg: string;
        textMain: string;
        textMuted: string;
        primary: string;
        accentRed: string;
    };
}

export const OrderSummaryCard: React.FC<OrderSummaryFooterProps> = ({
    itemsTotalSum,
    grandFinalTotal,
    isOrderFinalized,
    promoInput,
    onPromoInputChange,
    appliedPromo,
    onApplyPromo,
    onClearPromo,
    colors,
}) => {
    return (
            <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Text style={[styles.sectionSubtitleHeader, { color: colors.textMuted }]}>ORDER SUMMARY</Text>
                <View style={styles.calcRow}>
                    <Text style={{ color: colors.textMuted }}>Total Amount</Text>
                    <Text style={{ color: colors.textMain, fontWeight: "600" }}>Rs. {itemsTotalSum}</Text>
                </View>
                {!isOrderFinalized && (
                    <View style={{ flexDirection: "row", gap: 8, marginVertical: 8 }}>
                        <View style={[styles.promoBox, { backgroundColor: colors.bg }]}>
                            <Percent size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
                            <TextInput
                                style={{ flex: 1, color: colors.textMain }}
                                placeholder={appliedPromo || "Promo code"}
                                placeholderTextColor={colors.textMuted}
                                value={promoInput}
                                onChangeText={onPromoInputChange}
                                editable={!appliedPromo}
                            />
                        </View>
                        {appliedPromo ? (
                            <TouchableOpacity onPress={onClearPromo} style={[styles.promoBtn, { backgroundColor: colors.accentRed }]}>
                                <X size={16} color="#FFF" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={onApplyPromo} style={[styles.promoBtn, { backgroundColor: colors.primary }]}>
                                <Text style={{ color: "#FFF", fontWeight: "700" }}>APPLY</Text>
                            </TouchableOpacity>
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
        // marginBottom: 100,
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
    promoBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 38,
    },
    promoBtn: {
        height: 38,
        paddingHorizontal: 14,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
});
