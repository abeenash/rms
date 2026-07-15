import { useLocalSearchParams, useRouter } from "expo-router"
import { ArrowLeft, Minus, Plus, Search, ShoppingBag } from "lucide-react-native"
import React, { useState } from "react"
import {
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Text } from "../components/AppText"
import { useTheme } from "../context/ThemeContext"

const { width } = Dimensions.get("window")
const CARD_WIDTH = (width - 44) / 2

const MENU_ITEMS = [
    {
        id: "m1",
        name: "Chicken Roast",
        price: 440,
        category: "Lekali Menu One",
        description: "Best and testy roasted chicken",
        image: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500&q=80",
    },
    {
        id: "m2",
        name: "Lekali Menu 1",
        price: 300,
        category: "Lekali Menu One",
        description: "Lekali special set combo",
        image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80",
    },
    {
        id: "m3",
        name: "Lekali Momo",
        price: 200,
        category: "Momo",
        description: "Best and testy steamed momos",
        image: "https://images.unsplash.com/photo-1625220194771-7ebedd0870b6?w=500&q=80",
    },
    {
        id: "m4",
        name: "Lekali Sekuwa",
        price: 200,
        category: "Sekuwa",
        description: "Charcoal grilled authentic sekuwa",
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80",
    },
]

interface CartState {
    [key: string]: number
}

export default function TableOrderingScreen() {
    const { tableId } = useLocalSearchParams()
    const router = useRouter()
    const insets = useSafeAreaInsets()
    const { isDark } = useTheme()

    const [search, setSearch] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("All")
    const [cart, setCart] = useState<CartState>({})

    const colors = {
        bg: isDark ? "#0F172A" : "#F8FAFC",
        cardBg: isDark ? "#1E293B" : "#FFFFFF",
        textMain: isDark ? "#FFFFFF" : "#0F172A",
        textMuted: isDark ? "#94A3B8" : "#64748B",
        searchBg: isDark ? "#1E293B" : "#E2E8F0",
        border: isDark ? "#334155" : "#E2E8F0",
        accentGreen: isDark ? "#22C55E" : "#16A34A",
        accentGreenBg: isDark ? "#0A251C" : "#DCFCE7",
    }

    const addToCart = (id: string) => {
        setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
    }

    const removeFromCart = (id: string) => {
        setCart((prev) => {
            const updated = { ...prev }
            if (updated[id] > 1) updated[id] -= 1
            else delete updated[id]
            return updated
        })
    }

    const filteredMenuItems = MENU_ITEMS.filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
        const matchesCat = selectedCategory === "All" || item.category === selectedCategory
        return matchesSearch && matchesCat
    })

    const cartItemsArray = Object.keys(cart).map((id) => {
        const item = MENU_ITEMS.find((m) => m.id === id)
        return { item, quantity: cart[id] }
    }).filter(entry => entry.item !== undefined)

    const subtotal = cartItemsArray.reduce((sum, entry) => sum + (entry.item!.price * entry.quantity), 0)

    const totalCartCount = Object.values(cart).reduce((prevQty, currQty) => prevQty + currQty, 0)

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.bg }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
                <View style={styles.headerLeftContainer}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
                        <ArrowLeft size={20} color={colors.textMain} />
                        <Text style={[styles.backText, { color: colors.textMain, fontWeight: "600" }]}>Back</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <View style={[styles.tableBadge, { backgroundColor: colors.accentGreen }]}>
                        <Text style={styles.tableBadgeText}>{tableId}</Text>
                    </View>
                    <View>
                        <Text style={[styles.tableTitle, { color: colors.textMain, fontWeight: "700" }]}>Table {tableId}</Text>
                        <Text style={[styles.tableSubtitle, { color: colors.textMuted, fontWeight: "500" }]}>Capacity: 4 | Cash on order</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.menuScrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.searchContainer, { backgroundColor: colors.searchBg }]}>
                    <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.textMain }]}
                        placeholder="Search menu items..."
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow} contentContainerStyle={{ gap: 8 }}>
                    {["All", "Lekali Menu One", "Momo", "Sekuwa"].map((cat) => {
                        const isSelected = selectedCategory === cat;
                        return (
                            <TouchableOpacity
                                key={cat}
                                onPress={() => setSelectedCategory(cat)}
                                style={[styles.catChip, { backgroundColor: isSelected ? colors.accentGreen : colors.cardBg, borderColor: isSelected ? colors.accentGreen : colors.border }]}
                            >
                                <Text style={[styles.catChipText, { color: isSelected ? "#FFFFFF" : colors.textMuted, fontWeight: isSelected ? "700" : "500" }]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View style={styles.gridContainer}>
                    {filteredMenuItems.map((item) => {
                        const itemQty = cart[item.id] || 0;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.8}
                                onPress={() => addToCart(item.id)}
                                style={[styles.productCard, { backgroundColor: colors.cardBg, borderColor: itemQty > 0 ? colors.accentGreen : colors.border }]}
                            >
                                <View style={styles.imageContainer}>
                                    <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover" />
                                    {itemQty > 0 && (
                                        <View style={[styles.floatingBadge, { backgroundColor: colors.accentGreen }]}>
                                            <Text style={styles.floatingBadgeText}>{itemQty}</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.productDetailsBox}>
                                    <Text numberOfLines={1} style={[styles.productName, { color: colors.textMain, fontWeight: "700" }]}>
                                        {item.name}
                                    </Text>
                                    <Text numberOfLines={1} style={[styles.productDesc, { color: colors.textMuted }]}>
                                        {item.description}
                                    </Text>
                                    <Text style={[styles.productPriceText, { color: colors.accentGreen, fontWeight: "700", marginTop: 4 }]}>
                                        NPR {item.price}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <View style={[
                styles.bottomCartDrawer,
                {
                    backgroundColor: colors.cardBg,
                    borderTopColor: colors.border,
                    paddingBottom: Math.max(insets.bottom + 8, 12)
                }
            ]}>
                <View style={styles.drawerHeaderLine}>
                    <View style={[styles.cashBadge, { borderColor: colors.accentGreen, backgroundColor: colors.accentGreenBg }]}>
                        <Text style={[styles.cashBadgeText, { color: colors.accentGreen, fontWeight: "700" }]}>CASH</Text>
                    </View>
                </View>

                {totalCartCount === 0 ? (
                    <View style={styles.emptyDrawerState}>
                        <ShoppingBag size={20} color={colors.textMuted} style={{ marginBottom: 4 }} />
                        <Text style={[styles.emptyStateText, { color: colors.textMuted, fontWeight: "600" }]}>
                            Orders not yet added. Tap cards to order.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.activeCartWrapper}>
                        <ScrollView style={styles.cartItemsScroll} nestedScrollEnabled showsVerticalScrollIndicator={true}>
                            {cartItemsArray.map(({ item, quantity }) => (
                                <View key={item!.id} style={[styles.cartItemRow, { borderBottomColor: colors.border }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cartItemNameText, { color: colors.textMain, fontWeight: "600" }]}>{item!.name}</Text>
                                        <Text style={[styles.cartItemPriceLabel, { color: colors.textMuted }]}>NPR {item!.price}</Text>
                                    </View>
                                    <View style={[styles.drawerQtyCounterBox, { backgroundColor: colors.searchBg }]}>
                                        <TouchableOpacity onPress={() => removeFromCart(item!.id)} style={styles.qtyControlActionNode}>
                                            <Minus size={14} color={colors.textMain} />
                                        </TouchableOpacity>
                                        <Text style={[styles.qtyNodeDisplayValue, { color: colors.textMain, fontWeight: "700" }]}>{quantity}</Text>
                                        <TouchableOpacity onPress={() => addToCart(item!.id)} style={styles.qtyControlActionNode}>
                                            <Plus size={14} color={colors.textMain} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.subtotalRowBlock}>
                            <Text style={[styles.subtotalLabelText, { color: colors.textMain, fontWeight: "600" }]}>Subtotal</Text>
                            <Text style={[styles.subtotalValueText, { color: colors.textMain, fontWeight: "800" }]}>NPR {subtotal}</Text>
                        </View>
                    </View>
                )}

                <TouchableOpacity
                    disabled={totalCartCount === 0}
                    activeOpacity={0.8}
                    style={[styles.primaryCheckoutBtn, { backgroundColor: totalCartCount === 0 ? colors.border : "#6366F1" }]}
                >
                    <Text style={[styles.checkoutBtnText, { fontWeight: "700" }]}>Confirm Order</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

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
    menuScrollContent: {
        padding: 14,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        marginBottom: 14,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        height: "100%",
    },
    categoryRow: {
        flexDirection: "row",
        marginBottom: 16,
    },
    catChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 99,
        borderWidth: 1,
    },
    catChipText: {
        fontSize: 13,
    },
    gridContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
    },
    productCard: {
        width: CARD_WIDTH,
        borderRadius: 16,
        borderWidth: 1,
        overflow: "hidden",
    },
    imageContainer: {
        position: "relative",
        width: "100%",
        height: 110,
    },
    productImage: {
        width: "100%",
        height: "100%",
    },
    floatingBadge: {
        position: "absolute",
        top: 8,
        right: 8,
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 4,
    },
    floatingBadgeText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "bold",
    },
    productDetailsBox: {
        padding: 12,
    },
    productName: {
        fontSize: 14,
    },
    productDesc: {
        fontSize: 11,
        marginTop: 2,
    },
    productPriceText: {
        fontSize: 13,
    },
    bottomCartDrawer: {
        borderTopWidth: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 10,
    },
    drawerHeaderLine: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 8,
    },
    cashBadge: {
        paddingHorizontal: 12,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    cashBadgeText: {
        fontSize: 10,
        letterSpacing: 0.5,
    },
    emptyDrawerState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
    },
    emptyStateText: {
        fontSize: 13,
        textAlign: "center",
    },
    activeCartWrapper: {
        maxHeight: 190,
    },
    cartItemsScroll: {
        maxHeight: 130,
    },
    cartItemRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    cartItemNameText: {
        fontSize: 14,
    },
    cartItemPriceLabel: {
        fontSize: 12,
        marginTop: 1,
    },
    drawerQtyCounterBox: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 8,
        paddingHorizontal: 4,
        height: 32,
        gap: 12,
    },
    qtyControlActionNode: {
        width: 24,
        height: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    qtyNodeDisplayValue: {
        fontSize: 14,
        minWidth: 14,
        textAlign: "center",
    },
    subtotalRowBlock: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
        paddingTop: 8,
    },
    subtotalLabelText: {
        fontSize: 14,
    },
    subtotalValueText: {
        fontSize: 18,
    },
    primaryCheckoutBtn: {
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 8,
    },
    checkoutBtnText: {
        color: "#FFFFFF",
        fontSize: 15,
    },
});