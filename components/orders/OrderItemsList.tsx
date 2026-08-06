import { OrderItem } from "@/services/orderService";
import { Minus, Plus, X } from "lucide-react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Text from "../AppText";

interface OrderItemsListProps {
    orderItems: OrderItem[];
    isOrderFinalized: boolean;
    onUpdateQty: (itemId: string | number, delta: number) => void;
    onRemoveItem: (itemId: string | number, name: string) => void;
    colors: {
        cardBg: string;
        border: string;
        bg: string;
        textMain: string;
        textMuted: string;
        accentRed: string;
        accentRedBg: string;
    };
}

export const OrderItemsList: React.FC<OrderItemsListProps> = ({
    orderItems,
    isOrderFinalized,
    onUpdateQty,
    onRemoveItem,
    colors,
}) => {
    return (
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionSubtitleHeader, { color: colors.textMuted }]}>
                ORDER ITEMS ({orderItems.length})
            </Text>
            {orderItems.map((item) => (
                <View key={item.id} style={[styles.orderItemRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textMain, fontWeight: "600" }}>{item.itemName}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Rs. {item.price} each</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={[styles.quantityPicker, { backgroundColor: colors.bg }]}>
                            <TouchableOpacity
                                disabled={isOrderFinalized}
                                onPress={() => onUpdateQty(item.id, -1)}
                                style={styles.mathBtn}
                            >
                                <Minus size={14} color={isOrderFinalized ? colors.textMuted : colors.textMain} />
                            </TouchableOpacity>
                            <Text style={{ color: colors.textMain, fontWeight: "700" }}>{item.quantity}</Text>
                            <TouchableOpacity
                                disabled={isOrderFinalized}
                                onPress={() => onUpdateQty(item.id, 1)}
                                style={styles.mathBtn}
                            >
                                <Plus size={14} color={isOrderFinalized ? colors.textMuted : colors.textMain} />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            disabled={isOrderFinalized}
                            onPress={() => onRemoveItem(item.id, item.itemName)}
                            style={styles.trashBtn}
                        >
                            <X size={20} color={colors.accentRed} />
                        </TouchableOpacity>
                        <Text style={{ color: colors.textMain, fontWeight: "700", minWidth: 70, textAlign: "right" }}>
                            Rs. {item.price * item.quantity}
                        </Text>
                    </View>
                </View>
            ))}
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
    orderItemRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    quantityPicker: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 8,
        paddingHorizontal: 4,
        height: 32,
        gap: 8,
    },
    mathBtn: {
        width: 22,
        height: 22,
        justifyContent: "center",
        alignItems: "center",
    },
    trashBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
});
