import { ChevronDown, Lock } from "lucide-react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Text from "../AppText";

interface OrderStatusCardProps {
    orderStatus: string;
    paymentStatus: string;
    isOrderFinalized: boolean;
    onOrderStatusPress: () => void;
    onPaymentStatusPress: () => void;
    getStatusColors: (status: string) => { bg: string; text: string };
    colors: {
        cardBg: string;
        border: string;
        textMain: string;
        textMuted: string;
    };
}

export const OrderStatusCard: React.FC<OrderStatusCardProps> = ({
    orderStatus,
    paymentStatus,
    isOrderFinalized,
    onOrderStatusPress,
    onPaymentStatusPress,
    getStatusColors,
    colors,
}) => {
    const statusColors = getStatusColors(orderStatus);
    const paymentColors = getStatusColors(paymentStatus);

    return (
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.progressRow}>
                <Text style={{ color: colors.textMuted, fontWeight: "600" }}>Order Status</Text>
                <TouchableOpacity
                    disabled={isOrderFinalized}
                    onPress={onOrderStatusPress}
                    activeOpacity={0.7}
                    style={[styles.toggleBadge, { backgroundColor: statusColors.bg }]}
                >
                    <Text style={{ color: statusColors.text, fontWeight: "700", fontSize: 13 }}>
                        {orderStatus}
                    </Text>
                    {isOrderFinalized ? (
                        <Lock size={12} color={statusColors.text} style={{ marginLeft: 6 }} />
                    ) : (
                        <ChevronDown size={14} color={statusColors.text} style={{ marginLeft: 6 }} />
                    )}
                </TouchableOpacity>
            </View>

            <View style={[styles.progressRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 }]}>
                <Text style={{ color: colors.textMuted, fontWeight: "600" }}>Payment Status</Text>
                <TouchableOpacity
                    disabled={isOrderFinalized}
                    activeOpacity={0.7}
                    style={[styles.toggleBadge, { backgroundColor: paymentColors.bg }]}
                >
                    <Text style={{ color: paymentColors.text, fontWeight: "700", fontSize: 13 }}>
                        {paymentStatus}
                    </Text>
                    {isOrderFinalized && (
                        <Lock size={12} color={paymentColors.text} style={{ marginLeft: 6 }} />
                    ) }
                </TouchableOpacity>
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
    progressRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 4,
    },
    toggleBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
    },
});
