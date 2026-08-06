import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Text from "../AppText";

interface OrderDetailsHeaderProps {
    orderId: string | undefined;
    tableNumber?: number | null;
    insetsTop: number;
    colors: {
        cardBg: string;
        border: string;
        textMain: string;
        textMuted: string;
        primary: string;
    };
}

export const OrderDetailsHeader: React.FC<OrderDetailsHeaderProps> = ({
    orderId,
    tableNumber,
    insetsTop,
    colors,
}) => {
    const router = useRouter();

    return (
        <View style={[styles.navHeader, { paddingTop: insetsTop + 12, backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backTouch} activeOpacity={0.7}>
                <ArrowLeft size={20} color={colors.textMain} />
            </TouchableOpacity>

            <Text style={[styles.orderIdTitle, { color: colors.textMain, fontWeight: "700" }]}>
                Order #{orderId || "---"}
            </Text>

            {tableNumber ? (
                <View style={[styles.tableIndicatorBadge, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    <Text style={[styles.tableIndicatorText, { color: "#FFF", fontWeight: "700" }]}>
                        Table {tableNumber}
                    </Text>
                </View>
            ) : (
                <View style={{ width: 40 }} />
            )}
        </View>
    );
};

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
});
