import React from "react"
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Text from "../components/AppText"
import { CartDrawer } from "../components/tables/CartDrawer"
import { CategorySearch } from "../components/tables/CategorySearch"
import { ProductCard } from "../components/tables/ProductCard"
import { TableHeader } from "../components/tables/TableHeader"
import { useTheme } from "../context/ThemeContext"
import { useTableOrdering } from "../hooks/useTableOrdering"

export default function TableOrderingScreen() {
    const insets = useSafeAreaInsets()
    const { isDark } = useTheme()

    const { displayTableNumber,
        displayOrderNumber,
        capacity,
        isDirect,
        isOccupied,
        router,
        search,
        setSearch,
        selectedCategory,
        setSelectedCategory,
        categories,
        filteredMenuItems,
        cart,
        cartItemsArray,
        existingOrderItems,
        newItemsSubtotal,
        existingOrderSubtotal,
        grandTotal,
        totalCartCount,
        hasActiveOrders,
        isExpanded,
        setIsExpanded,
        isInitialLoading,
        isSearchLoading,
        isLoadingMore,
        isLoadingExistingOrder,
        isSubmittingOrder,
        addToCart,
        removeFromCart,
        updateExistingQty,
        removeExistingItem,
        loadMoreItems,
        handleConfirmOrder, } = useTableOrdering()

    const colors = {
        bg: isDark ? "#0F172A" : "#F8FAFC",
        cardBg: isDark ? "#1E293B" : "#FFFFFF",
        textMain: isDark ? "#FFFFFF" : "#0F172A",
        textMuted: isDark ? "#94A3B8" : "#64748B",
        searchBg: isDark ? "#1E293B" : "#E2E8F0",
        border: isDark ? "#334155" : "#E2E8F0",
        accentMain: "#6366F1",
        accentRed: '#EF4444',
    }

    const renderListFooter = () => {
        if (!isLoadingMore) return null
        return (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <ActivityIndicator size="small" color={colors.accentMain} />
                <Text style={{ marginTop: 6, color: colors.textMuted, fontSize: 12 }}>
                    Loading more dishes...
                </Text>
            </View>
        )
    }


    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.bg }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >

            {/* Header */}
            <TableHeader
                isDirect={isDirect}
                displayTableNumber={displayTableNumber}
                displayOrderNumber={displayOrderNumber}
                capacity={capacity}
                isOccupied={isOccupied}
                insetsTop={insets.top}
                onBack={() => router.back()}
                colors={colors}
            />

            {/* Search and Categories */}
            <CategorySearch
                search={search}
                onSearchChange={setSearch}
                isSearchLoading={isSearchLoading}
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                colors={colors}
            />

            {/* Catalog Grid */}
            {isInitialLoading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color={colors.accentMain} />
                    <Text style={{ marginTop: 12, color: colors.textMuted }}>Loading menu catalog...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredMenuItems}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    numColumns={2}
                    columnWrapperStyle={styles.columnWrapper}
                    contentContainerStyle={styles.menuScrollContent}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={renderListFooter}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                        <ProductCard
                            item={item}
                            quantity={cart[item.id]?.quantity || 0}
                            onAddToCart={addToCart}
                            colors={colors}
                        />
                    )}
                    onEndReached={loadMoreItems}
                    onEndReachedThreshold={0.5}
                    initialNumToRender={8}
                    maxToRenderPerBatch={8}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === "android"}
                />
            )}

            {/* Bottom Cart Drawer */}
            <CartDrawer
                isExpanded={isExpanded}
                onToggleExpand={() => setIsExpanded(!isExpanded)}
                hasActiveOrders={hasActiveOrders}
                isLoadingExistingOrder={isLoadingExistingOrder}
                isOccupied={isOccupied}
                existingOrderItems={existingOrderItems}
                cartItemsArray={cartItemsArray}
                onUpdateExistingQty={updateExistingQty}
                onRemoveExistingItem={removeExistingItem}
                onRemoveFromCart={removeFromCart}
                onAddToCart={addToCart}
                existingOrderSubtotal={existingOrderSubtotal}
                newItemsSubtotal={newItemsSubtotal}
                grandTotal={grandTotal}
                totalCartCount={totalCartCount}
                isSubmittingOrder={isSubmittingOrder}
                onConfirmOrder={handleConfirmOrder}
                insets={insets}
                colors={colors}
                isDark={isDark}
            />

        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    menuScrollContent: {
        paddingHorizontal: 14,
        paddingTop: 8,
        paddingBottom: 30,
    },
    columnWrapper: {
        justifyContent: "space-between",
        marginBottom: 16,
    },
})