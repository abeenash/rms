import React from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Text from "../components/AppText";
import { CatalogAccordion } from "../components/orders/CatalogAccordion";
import { InvoiceModal } from "../components/orders/InvoiceModal";
import { OrderBottomBar } from "../components/orders/OrderBottomBar";
import { OrderDetailsHeader } from "../components/orders/OrderDetailsHeader";
import { OrderItemsList } from "../components/orders/OrderItemsList";
import { OrderStatusCard } from "../components/orders/OrderStatusCard";
import { OrderSummaryCard } from "../components/orders/OrderSummaryCard";
import { PaymentQRModal } from "../components/orders/PaymentQRModal";
import { useOrderDetails } from "../hooks/useOrderDetails";

export default function OrderDetailsScreen() {
    const insets = useSafeAreaInsets();
    const {
        orderId,
        tenantSlug,
        colors,
        isLoading,
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
        promoInput,
        setPromoInput,
        appliedPromo,
        setAppliedPromo,
        setPromoDiscountVal,
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
                    promoInput={promoInput}
                    onPromoInputChange={setPromoInput}
                    appliedPromo={appliedPromo}
                    onApplyPromo={handleApplyPromo}
                    onClearPromo={() => {
                        setAppliedPromo(null);
                        setPromoDiscountVal(0);
                    }}
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
                onPrintPOS={handlePrintPOS}
                onPrintInvoice={handlePrintInvoice}
                onPrintKOT={handlePrintKOT}
            />
            <PaymentQRModal
                visible={isQRModalVisible}
                onClose={() => setIsQRModalVisible(false)}
                orderData={orderData}
                orderId={orderId || ""}
                grandFinalTotal={grandFinalTotal}
                tenantSlug={tenantSlug || ""}
                onConfirmPaid={() => handleSettlePayment("Digital Wallet")}
            />
        </KeyboardAvoidingView>
    );
}