import React, { useEffect } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WifiOff } from "lucide-react-native";
import { useRouter } from "expo-router";
import Text from "../../components/AppText";
import { useCustomAlert } from "../../context/AlertContext";
import { NETWORK_OFFLINE_MESSAGE } from "@/utils/networkError";
import { CatalogAccordion } from "../../components/orders/CatalogAccordion";
import { InvoiceModal } from "../../components/orders/InvoiceModal";
import { OrderBottomBar } from "../../components/orders/OrderBottomBar";
import { OrderDetailsHeader } from "../../components/orders/OrderDetailsHeader";
import { OrderItemsList } from "../../components/orders/OrderItemsList";
import { OrderStatusCard } from "../../components/orders/OrderStatusCard";
import { OrderSummaryCard } from "../../components/orders/OrderSummaryCard";
import { useOrderDetails } from "../../hooks/useOrderDetails";

export default function OrderDetailsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { showAlert } = useCustomAlert();
    const {
        orderId,
        tenantSlug,
        colors,
        isLoading,
        networkError,
        orderData,
        orderStatus,
        paymentStatus,
        orderItems,
        isCancelled,
        isPaid,
        isOrderFinalized,
        searchQuery,
        setSearchQuery,
        isSearching,
        isCatalogLoading,
        filteredCatalog,
        isAddSectionExpanded,
        setIsAddSectionExpanded,
        promoSearchQuery,
        setPromoSearchQuery,
        selectedPromo,
        setSelectedPromo,
        isPromoExpanded,
        setIsPromoExpanded,
        filteredPromos,
        appliedPromo,
        setAppliedPromo,
        setPromoDiscountVal,
        promoDiscountVal,
        itemsTotalSum,
        grandFinalTotal,
        isInvoiceVisible,
        setIsInvoiceVisible,
        isQRModalVisible,
        setIsQRModalVisible,
        handleOrderStatusSelect,
        handlePaymentStatusSelect,
        handleSettlePayment,
        updateExistingQty,
        removeItem,
        addItemToActiveOrder,
        handleApplyPromo,
        handleSelectPromo,
        handleClearPromo,
        getStatusColors,
        handlePrintPOS,
        handlePrintInvoice,
        handlePrintKOT,
        pendingItems,
        setPendingItems,
        hasPendingItems,
        isSubmittingNewItems,
        handleConfirmAddedItems
    } = useOrderDetails();

    useEffect(() => {
        if (networkError) {
            showAlert("Network Error", NETWORK_OFFLINE_MESSAGE);
        }
    }, [networkError, showAlert]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 12, color: colors.textMuted, fontWeight: "500" }}>
                    Loading order details...
                </Text>
            </View>
        );
    }

    if (networkError) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.cardBg, justifyContent: "center", alignItems: "center", marginBottom: 20 }}>
                    <WifiOff size={36} color="#EF4444" />
                </View>
                <Text style={{ fontSize: 20, color: colors.textMain, fontWeight: "700", marginBottom: 8, textAlign: "center" }}>
                    No Internet Connection
                </Text>
                <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: "center", lineHeight: 20, marginBottom: 28 }}>
                    {NETWORK_OFFLINE_MESSAGE}
                </Text>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.back()}
                    style={{ backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 }}
                >
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>
                        Go Back
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }
    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.bg }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            {/* HEADER */}
            <OrderDetailsHeader
                orderId={orderData?.orderNumber}
                tableNumber={orderData?.tableNumber}
                insetsTop={insets.top}
                colors={colors}
            />
            {/* MAIN SCROLL CONTENT */}
            <ScrollView
                contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 170 }}
                showsVerticalScrollIndicator={true}
            >
                {/* ORDER & PAYMENT STATUS CARD */}
                <OrderStatusCard
                    orderStatus={orderStatus}
                    paymentStatus={paymentStatus}
                    isOrderFinalized={isOrderFinalized}
                    onOrderStatusPress={handleOrderStatusSelect}
                    onPaymentStatusPress={handlePaymentStatusSelect}
                    getStatusColors={getStatusColors}
                    colors={colors}
                />

                {/* ORDER ITEMS LIST */}
                <OrderItemsList
                    orderItems={orderItems}
                    isOrderFinalized={isOrderFinalized}
                    onUpdateQty={updateExistingQty}
                    onRemoveItem={removeItem}
                    colors={colors}
                />

                {/* MENU CATALOG ACCORDION */}
                {!isOrderFinalized && (
                    <CatalogAccordion
                        isAddSectionExpanded={isAddSectionExpanded}
                        onToggleExpand={() => setIsAddSectionExpanded(!isAddSectionExpanded)}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        isSearching={isSearching}
                        isCatalogLoading={isCatalogLoading}
                        filteredCatalog={filteredCatalog}
                        onSelectDish={addItemToActiveOrder}
                        colors={colors}
                        pendingItems={pendingItems}
                        onRemovePending={(itemId) => setPendingItems((prev) => prev.filter((p) => p.item.id !== itemId))}
                        onConfirmAddedItems={handleConfirmAddedItems}
                        isSubmittingNewItems={isSubmittingNewItems}
                        hasPendingItems={hasPendingItems}
                    />
                )}

                {/* ORDER SUMMARY */}
                <OrderSummaryCard
                    itemsTotalSum={itemsTotalSum}
                    grandFinalTotal={grandFinalTotal}
                    isOrderFinalized={isOrderFinalized}
                    promoSearchQuery={promoSearchQuery}
                    onPromoSearchChange={setPromoSearchQuery}
                    isPromoExpanded={isPromoExpanded}
                    onTogglePromoExpanded={() => setIsPromoExpanded(!isPromoExpanded)}
                    filteredPromos={filteredPromos}
                    selectedPromo={selectedPromo}
                    onSelectPromo={handleSelectPromo}
                    appliedPromo={appliedPromo}
                    promoDiscountVal={promoDiscountVal}
                    onApplyPromo={handleApplyPromo}
                    onClearPromo={handleClearPromo}
                    onCancelSelection={() => setSelectedPromo(null)}
                    colors={colors}
                />
            </ScrollView>

            {/* PAYMENT ACTIONS AT THE BOTTOM*/}
            <OrderBottomBar
                isCancelled={isCancelled}
                isPaid={isPaid}
                onSettleCash={() => handleSettlePayment("Cash")}
                onSettleWallet={() => handleSettlePayment("Digital Wallet")}
                onOpenInvoiceModal={() => setIsInvoiceVisible(true)}
                insetsBottom={insets.bottom}
                colors={colors}
                hasPendingItems={hasPendingItems} />

            {/* MODALS */}
            <InvoiceModal
                visible={isInvoiceVisible}
                onClose={() => setIsInvoiceVisible(false)}
                orderData={orderData}
                orderId={orderId || ""}
                orderItems={orderItems}
                itemsTotalSum={itemsTotalSum}
                grandFinalTotal={grandFinalTotal}
                tenantSlug={tenantSlug || ""}
                appliedPromo={appliedPromo}
                promoDiscountVal={promoDiscountVal}
                onPrintPOS={handlePrintPOS}
                onPrintInvoice={handlePrintInvoice}
                onPrintKOT={handlePrintKOT}
            />
            {/* <PaymentQRModal
                visible={isQRModalVisible}
                onClose={() => setIsQRModalVisible(false)}
                orderData={orderData}
                orderId={orderId || ""}
                grandFinalTotal={grandFinalTotal}
                tenantSlug={tenantSlug || ""}
                onConfirmPaid={() => handleSettlePayment("Digital Wallet")}
            /> */}
        </KeyboardAvoidingView>
    );
}