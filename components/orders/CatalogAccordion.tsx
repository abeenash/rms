import { MenuItem } from "@/services/menuService";
import { Image } from "expo-image";
import { ChevronDown, ChevronUp, X } from "lucide-react-native";
import React, { useCallback } from "react";
import { ActivityIndicator, FlatList, Platform, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Text from "../AppText";

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80";

interface CatalogDishCardProps {
    dish: MenuItem;
    onSelect: (dish: MenuItem) => void;
    colors: {
        cardBg: string;
        border: string;
        textMain: string;
        textMuted: string;
        primary: string;
    };
}

const CatalogDishCard = React.memo(({ dish, onSelect, colors }: CatalogDishCardProps) => (
    <TouchableOpacity
        onPress={() => onSelect(dish)}
        activeOpacity={0.7}
        style={[styles.dishCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
    >
        <Image
            source={{ uri: dish.imageUrl || DEFAULT_IMAGE }}
            style={styles.dishImage}
            contentFit="cover"
            transition={150}
        />
        <View style={{ padding: 8 }}>
            <Text numberOfLines={1} style={{ color: colors.textMain, fontWeight: "700", fontSize: 12 }}>
                {dish.name}
            </Text>
            <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12, marginTop: 2 }}>
                Rs. {dish.price}
            </Text>
        </View>
    </TouchableOpacity>
));

interface CatalogAccordionProps {
    isAddSectionExpanded: boolean;
    onToggleExpand: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    isSearching: boolean;
    isCatalogLoading: boolean;
    filteredCatalog: MenuItem[];
    onSelectDish: (dish: MenuItem) => void;
    colors: {
        cardBg: string;
        border: string;
        bg: string;
        textMain: string;
        textMuted: string;
        primary: string;
    };
    pendingItems: Array<{ item: MenuItem; quantity: number }>
    onRemovePending: (itemId: number) => void;
    onConfirmAddedItems: () => void;
    isSubmittingNewItems: boolean;
    hasPendingItems: boolean;
}

export const CatalogAccordion: React.FC<CatalogAccordionProps> = ({
    isAddSectionExpanded,
    onToggleExpand,
    searchQuery,
    onSearchChange,
    isSearching,
    isCatalogLoading,
    filteredCatalog,
    onSelectDish,
    colors,
    pendingItems,
    onRemovePending,
    onConfirmAddedItems,
    isSubmittingNewItems,
    hasPendingItems
}) => {
    const renderCatalogDish = useCallback(
        ({ item }: { item: MenuItem }) => (
            <CatalogDishCard dish={item} onSelect={onSelectDish} colors={colors} />
        ),
        [onSelectDish, colors]
    );

    const getCatalogItemLayout = useCallback((_: any, index: number) => ({
        length: 142,
        offset: 142 * index,
        index,
    }), []);

    return (
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <TouchableOpacity
                onPress={onToggleExpand}
                style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
            >
                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    {isAddSectionExpanded ? "- Close Catalog" : "+ Add Items to Order"}
                </Text>
                {isAddSectionExpanded ? (
                    <ChevronUp size={18} color={colors.primary} />
                ) : (
                    <ChevronDown size={18} color={colors.primary} />
                )}
            </TouchableOpacity>

            {isAddSectionExpanded && (
                <View style={{ marginTop: 12 }}>
                    <View style={{ position: "relative", justifyContent: "center" }}>
                        <TextInput
                            style={[
                                styles.searchInput,
                                { backgroundColor: colors.bg, color: colors.textMain, paddingRight: 36 }
                            ]}
                            placeholder="Search dishes..."
                            placeholderTextColor={colors.textMuted}
                            value={searchQuery}
                            onChangeText={onSearchChange}
                        />
                        {isSearching && (
                            <ActivityIndicator
                                size="small"
                                color={colors.primary}
                                style={{ position: "absolute", right: 12 }}
                            />
                        )}
                    </View>

                    {isCatalogLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
                    ) : filteredCatalog.length === 0 ? (
                        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 12, textAlign: "center" }}>
                            No items found in catalog
                        </Text>
                    ) : (
                        <FlatList
                            horizontal
                            data={filteredCatalog}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderCatalogDish}
                            getItemLayout={getCatalogItemLayout}
                            showsHorizontalScrollIndicator={false}
                            initialNumToRender={5}
                            maxToRenderPerBatch={6}
                            windowSize={3}
                            removeClippedSubviews={Platform.OS === "android"}
                            contentContainerStyle={{ gap: 12, marginTop: 10 }}
                        />
                    )}
                    {hasPendingItems && (
                        <View style={[styles.pendingContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                            <Text style={[styles.pendingTitle, { color: colors.textMain }]}>
                                Pending Items ({pendingItems.reduce((acc, p) => acc + p.quantity, 0)})
                            </Text>

                            {pendingItems.map((p) => (
                                <View key={p.item.id} style={[styles.pendingItemRow, { borderBottomColor: colors.border }]}>
                                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                                        <Text style={[styles.pendingItemName, { color: colors.textMain }]} numberOfLines={1}>
                                            {p.item.name}
                                        </Text>
                                        <View style={[styles.qtyBadge, { backgroundColor: colors.primary }]}>
                                            <Text style={styles.qtyBadgeText}>x{p.quantity}</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.pendingItemPrice, { color: colors.textMain }]}>
                                        Rs. {p.item.price * p.quantity}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => onRemovePending(p.item.id)}
                                        style={styles.removePendingBtn}
                                        activeOpacity={0.7}
                                    >
                                        <X size={16} color={colors.textMuted} />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {/* Confirm Added Items CTA */}
                            <TouchableOpacity
                                onPress={onConfirmAddedItems}
                                disabled={isSubmittingNewItems}
                                activeOpacity={0.8}
                                style={[
                                    styles.confirmBtn,
                                    { backgroundColor: colors.primary, opacity: isSubmittingNewItems ? 0.7 : 1 }
                                ]}
                            >
                                {isSubmittingNewItems ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>Confirm Added Items</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    sectionCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    searchInput: {
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 38,
        fontSize: 13,
    },
    dishCard: {
        width: 130,
        borderRadius: 12,
        borderWidth: 1,
        overflow: "hidden",
    },
    dishImage: {
        width: "100%",
        height: 75,
    },
    pendingContainer: {
        marginTop: 14,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
    },
    pendingTitle: {
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    pendingItemRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    pendingItemName: {
        fontSize: 13,
        fontWeight: "600",
        flexShrink: 1,
    },
    qtyBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        right: 4,
    },
    qtyBadgeText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "700",
    },
    pendingItemPrice: {
        fontSize: 13,
        fontWeight: "700",
        marginRight: 10,
    },
    removePendingBtn: {
        padding: 4,
    },
    confirmBtn: {
        marginTop: 6,
        height: 42,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    confirmBtnText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 14,
    },
});
