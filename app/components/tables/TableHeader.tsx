import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Text from "../AppText";

interface TableHeaderProps {
    isDirect: boolean;
    displayTableNumber: string;
    displayOrderNumber?: string;
    capacity?: string;
    isOccupied: boolean;
    insetsTop: number;
    onBack: () => void;
    colors: any;
}

export const TableHeader: React.FC<TableHeaderProps> = React.memo(({
    isDirect,
    displayTableNumber,
    displayOrderNumber,
    capacity,
    isOccupied,
    insetsTop,
    onBack,
    colors,
}) => {
    return (
        <View style={[styles.header, { paddingTop: insetsTop + 12, backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
            <View style={styles.headerLeftContainer}>
                <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
                    <ArrowLeft size={20} color={colors.textMain} />
                    <Text style={[styles.backText, { color: colors.textMain, fontWeight: "600" }]}>Back</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                {!isDirect && (
                    <View style={[styles.tableBadge, { backgroundColor: colors.accentMain }]}>
                        <Text style={styles.tableBadgeText}>{displayTableNumber}</Text>
                    </View>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={[styles.tableTitle, { color: colors.textMain, fontWeight: "700" }]}>
                        {isDirect ? "New Order" : `Table ${displayTableNumber}`}
                    </Text>
                    <Text style={[styles.tableSubtitle, { color: colors.textMuted, fontWeight: "500" }]}>
                        {isDirect ?
                            "Direct Counter Checkout"
                            : (isOccupied || displayOrderNumber)
                                ? `Order #${displayOrderNumber || '...'}`
                                : `Capacity: ${capacity} | Cash on order`}
                    </Text>
                </View>
            </View>
        </View>
    )
})

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
    },
    headerLeftContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    backText: {
        fontSize: 15,
    },
    divider: {
        width: 1,
        height: 20,
        backgroundColor: "#94A3B8",
        marginHorizontal: 12,
    },
    tableBadge: {
        width: 26,
        height: 26,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    tableBadgeText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "bold",
    },
    tableTitle: {
        fontSize: 16,
        lineHeight: 18,
    },
    tableSubtitle: {
        fontSize: 11,
        marginTop: 1,
    },
})