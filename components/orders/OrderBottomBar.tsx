import { Banknote, FileText, Wallet } from "lucide-react-native";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Text from "../AppText";

interface OrderBottomBarProps {
    isCancelled: boolean;
    isPaid: boolean;
    onSettleCash: () => void;
    onSettleWallet:() => void;
    onOpenInvoiceModal: () => void;
    insetsBottom?: number;
    colors: {
        cardBg: string;
        border: string;
        textMuted: string;
        primary: string;
    }
    hasPendingItems: boolean;
}

export const OrderBottomBar: React.FC<OrderBottomBarProps> = ({
    isCancelled,
    isPaid,
    onSettleCash,
    onSettleWallet,
    onOpenInvoiceModal,
    insetsBottom,
    colors,
    hasPendingItems,

}) => {
    const systemInsets = useSafeAreaInsets();
    const bottomInset = insetsBottom ?? systemInsets.bottom;

    const paddingBottom = Math.max(bottomInset, 12) + (bottomInset > 0 ? 4 : 8);

    return (
        <View style={[styles.bottomBarContainer, { backgroundColor: colors.cardBg, borderTopColor: colors.border, paddingBottom }]}>
            <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                    disabled={isCancelled || isPaid || hasPendingItems}
                    onPress={onSettleCash}
                    style={[styles.cashBtn, (isCancelled || isPaid || hasPendingItems) && { opacity: 0.4 }]}
                >
                    <Banknote size={18} color="#475569" style={{ marginRight: 6 }} />
                    <Text style={{ color: "#475569", fontWeight: "700" }}>
                        {isPaid ? "Paid via Cash" : "Cash"}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    disabled={isCancelled || isPaid || hasPendingItems}
                    onPress={onSettleWallet}
                    style={[styles.qrBtn, (isCancelled || isPaid || hasPendingItems) && { opacity: 0.4 }]}
                >
                    <Wallet size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                        {isPaid ? "Paid via Wallet" : "Digital Wallet"}
                    </Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                disabled={isCancelled || hasPendingItems}
                onPress={onOpenInvoiceModal}
                style={[
                    styles.invoiceTriggerBtn,
                    { backgroundColor: isCancelled ? colors.border : colors.primary },
                    (isCancelled || hasPendingItems) && { opacity: 0.5 },
                ]}
            >
                <FileText size={18} color={isCancelled ? colors.textMuted : "#FFF"} style={{ marginRight: 6 }} />
                <Text style={{ color: isCancelled ? colors.textMuted : "#FFF", fontWeight: "700" }}>
                    {isCancelled ? "Invoice Disabled (Cancelled)" : "View Invoice / Receipt"}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    bottomBarContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        gap: 10,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cashBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F1F5F9",
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 12,
        paddingVertical: 12,
    },
    qrBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#16A34A",
        borderRadius: 12,
        paddingVertical: 12,
    },
    invoiceTriggerBtn: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        paddingVertical: 14,
    },
})