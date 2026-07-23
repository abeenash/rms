import { useLocalSearchParams, useRouter } from "expo-router"
import {
    ArrowLeft,
    Maximize2,
    Minimize2,
    Minus,
    Plus,
    Search,
    ShoppingBag,
    X
} from "lucide-react-native"
import React, { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
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

import Text from "../components/AppText"
import { useTheme } from "../context/ThemeContext"

import { fetchMenuItemsApi, fetchMenusApi } from "@/services/menuService"
import { useAuth } from "../context/AuthContext"

const { width } = Dimensions.get("window")
const CARD_WIDTH = (width - 44) / 2
interface CartState {
    [key: string]: number
}

interface ExistingItem {
    id: string
    name: string
    price: number
    quantity: number
}

export interface UIItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    image: string;
}

export default function TableOrderingScreen() {
    const { tableId, tableNumber, capacity, isDirectOrder, status } = useLocalSearchParams<{
        tableId: string
        tableNumber?: string
        capacity?: string
        isDirectOrder: string
        status?: string
    }>()

    const displayTableNumber = tableNumber || tableId

    const router = useRouter()
    const insets = useSafeAreaInsets()
    const { isDark } = useTheme()
    const { tenantSlug } = useAuth()

    const [search, setSearch] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("All")

    //dynamic categories and items state
    const [categories, setCategories] = useState<string[]>(["All"])
    const [menuItems, setMenuItems] = useState<UIItem[]>([]);
    const [isMenuLoading, setIsMenuLoading] = useState<boolean>(true);

    const [cart, setCart] = useState<CartState>({})
    const [customerName, setCustomerName] = useState('')
    const [isExpanded, setIsExpanded] = useState(false)


    //for the occupied
    const isOccupied = status === 'Occupied' || status === 'occupied' || tableId === '2' || tableId === '4' || tableId === '5';
    const [existingOrderItems, setExistingOrderItems] = useState<ExistingItem[]>([])

    // Simulate loading existing running order for occupied tables
    useEffect(() => {
        if (isOccupied) {
            setExistingOrderItems([
                { id: "m3", name: "Lekali Momo", price: 200, quantity: 1 },
                { id: "m2", name: "Lekali Menu 1", price: 300, quantity: 1 }
            ])
        }
    }, [isOccupied])

    //trigger the parallel network requests when the screen mounts
    useEffect(() => {
        const loadMenuData = async () => {
            if (!tenantSlug) return

            try {
                setIsMenuLoading(true)

                const [rawMenus, rawItems] = await Promise.all([
                    fetchMenusApi(tenantSlug),
                    fetchMenuItemsApi(tenantSlug)
                ])

                //extract the active categories
                const categoryNames = rawMenus
                    .filter((m) => m.active)
                    .map((m) => m.menuName)

                setCategories(["All", ...new Set(categoryNames)])

                const formattedItems: UIItem[] = rawItems
                    .filter((item) => item.active)
                    .map((item) => ({
                        id: String(item.id),
                        name: item.name,
                        price: item.price,
                        category: item.menuName,
                        description: item.description || "",
                        image: item.imageUrl
                    }));

                setMenuItems(formattedItems)
            } catch (error) {
                console.error("Failed to load menu data:", error)
            } finally {
                setIsMenuLoading(false)
            }
        }
        loadMenuData()
    }, [tenantSlug])

    const isDirect = tableId === 'direct' || isDirectOrder === 'true'
    const colors = {
        bg: isDark ? "#0F172A" : "#F8FAFC",
        cardBg: isDark ? "#1E293B" : "#FFFFFF",
        textMain: isDark ? "#FFFFFF" : "#0F172A",
        textMuted: isDark ? "#94A3B8" : "#64748B",
        searchBg: isDark ? "#1E293B" : "#E2E8F0",
        border: isDark ? "#334155" : "#E2E8F0",
        accentMain: "#6366F1",
        accentMainBg: "#6366F1",
        accentRed: '#EF4444',
        badgeBg: isDark ? "#334155" : "#F1F5F9",
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

    const updateExistingQty = (id: string, delta: number) => {
        setExistingOrderItems(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = item.quantity + delta
                return newQty > 0 ? { ...item, quantity: newQty } : item
            }
            return item
        }))
    }

    const removeExistingItem = (id: string, name: string) => {
        Alert.alert(
            "⚠️ Remove Item",
            `Remove "${name}" from the order?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => setExistingOrderItems(prev => prev.filter(item => item.id !== id))
                }
            ],
            { cancelable: true }
        )
    }

    const filteredMenuItems = menuItems.filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
        const matchesCat = selectedCategory === "All" || item.category === selectedCategory
        return matchesSearch && matchesCat
    })

    const cartItemsArray = Object.keys(cart).map((id) => {
        const item = menuItems.find((m) => m.id === id)
        return { item, quantity: cart[id] }
    }).filter(entry => entry.item !== undefined)

    const newItemsSubtotal = cartItemsArray.reduce((sum, entry) => sum + (entry.item!.price * entry.quantity), 0)

    const totalCartCount = Object.values(cart).reduce((prevQty, currQty) => prevQty + currQty, 0)

    const hasActiveOrders = existingOrderItems.length > 0 || totalCartCount > 0

    //collapse the fullscreen if the waiter removes all items
    useEffect(() => {
        if (!hasActiveOrders && isExpanded) {
            setIsExpanded(false)
        }
    }, [hasActiveOrders, isExpanded])

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
                            {isDirect ? "Direct Counter Checkout" : isOccupied ? "Order #ORD-FB4903CC" : `Capacity: ${capacity} | Cash on order`}
                        </Text>
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
                    {categories.map((cat) => {
                        const isSelected = selectedCategory === cat;
                        return (
                            <TouchableOpacity
                                key={cat}
                                onPress={() => setSelectedCategory(cat)}
                                style={[styles.catChip, { backgroundColor: isSelected ? colors.accentMain : colors.cardBg, borderColor: isSelected ? colors.accentMain : colors.border }]}
                            >
                                <Text style={[styles.catChipText, { color: isSelected ? "#FFFFFF" : colors.textMuted, fontWeight: isSelected ? "700" : "500" }]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {isMenuLoading ? (
                    <View style={{ padding: 40, alignItems: "center" }}>
                        <ActivityIndicator size="large" color={colors.accentMain} />
                        <Text style={{ marginTop: 12, color: colors.textMuted }}>Loading menu...</Text>
                    </View>
                ) : (
                    <View style={styles.gridContainer}>
                        {filteredMenuItems.map((item) => {
                            const itemQty = cart[item.id] || 0;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    activeOpacity={0.8}
                                    onPress={() => addToCart(item.id)}
                                    style={[styles.productCard, { backgroundColor: colors.cardBg, borderColor: itemQty > 0 ? colors.accentMain : colors.border }]}
                                >
                                    <View style={styles.imageContainer}>
                                        <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover" />
                                        {itemQty > 0 && (
                                            <View style={[styles.floatingBadge, { backgroundColor: colors.accentMain }]}>
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
                                        <Text style={[styles.productPriceText, { color: colors.textMain, fontWeight: "700", marginTop: 4 }]}>
                                            NPR {item.price}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            <View style={[
                styles.bottomCartDrawer,
                {
                    backgroundColor: colors.cardBg,
                    borderTopColor: colors.border,
                },
                isExpanded ? {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    paddingTop: insets.top + 16,
                    paddingBottom: Math.max(insets.bottom + 12, 16),
                    zIndex: 999,
                    height: '100%'
                } : {
                    borderTopWidth: 1,
                    paddingBottom: Math.max(insets.bottom + 8, 12),
                }
            ]}>
                {hasActiveOrders && (
                    <View style={styles.drawerControlHeader}>
                        <Text style={[styles.drawerHeaderText, { color: colors.textMain, fontWeight: "700" }]}>
                            {isExpanded ? "Review Order Summary" : "Current Selection"}
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => setIsExpanded(!isExpanded)}
                            style={[styles.expandToggleCircle, { backgroundColor: "#6366F1" }]}>
                            {isExpanded ? (
                                <Minimize2 size={16} color="#FFF" />
                            ) : (
                                <Maximize2 size={16} color="#FFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {!hasActiveOrders ? (
                    <View style={styles.emptyDrawerState}>
                        <ShoppingBag size={20} color={colors.textMuted} style={{ marginBottom: 4 }} />
                        <Text style={[styles.emptyStateText, { color: colors.textMuted, fontWeight: "600" }]}>
                            Orders not yet added. Tap cards to order.
                        </Text>
                    </View>
                ) : (
                    <View style={isExpanded ? { flex: 1, justifyContent: 'space-between' } : null}>
                        <ScrollView style={[styles.cartItemsScroll,
                        isExpanded ? { flex: 1, maxHeight: "100%" } : { maxHeight: 180 }
                        ]} nestedScrollEnabled
                            showsVerticalScrollIndicator={true}>

                            {isOccupied && existingOrderItems.length > 0 && (
                                <View style={{ marginBottom: 12 }}>
                                    <View style={styles.sectionHeaderRow}>
                                        <Text style={[styles.sectionTitleText, { color: colors.textMain }]}>Current Order</Text>
                                    </View>

                                    {existingOrderItems.map((item) => (
                                        <View key={`existing-${item.id}`} style={[styles.cartItemRow, { borderBottomColor: colors.border }]}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.cartItemNameText, { color: colors.textMain, fontWeight: "600" }]}>{item.name}</Text>
                                                <Text style={[styles.cartItemPriceLabel, { color: colors.textMuted }]}>NPR {item.price}</Text>
                                            </View>
                                            <View style={styles.actionControlsContainer}>
                                                <View style={[styles.drawerQtyCounterBox, { backgroundColor: isDark ? "#1E293B" : "#FFF" }]}>
                                                    <TouchableOpacity onPress={() => updateExistingQty(item.id, -1)} style={[styles.qtyControlActionNode, { backgroundColor: "#6366F1" }]}>
                                                        <Minus size={14} color="#FFF" />
                                                    </TouchableOpacity>
                                                    <Text style={[styles.qtyNodeDisplayValue, { color: colors.textMain, fontWeight: "700" }]}>{item.quantity}</Text>
                                                    <TouchableOpacity onPress={() => updateExistingQty(item.id, 1)} style={[styles.qtyControlActionNode, { backgroundColor: "#6366F1" }]}>
                                                        <Plus size={14} color="#FFF" />
                                                    </TouchableOpacity>
                                                </View>
                                                <TouchableOpacity onPress={() => removeExistingItem(item.id, item.name)} style={[styles.deleteActionButton, { backgroundColor: '#FEE2E2' }]}>
                                                    <X size={14} color={colors.accentRed} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                            {cartItemsArray.length > 0 && (
                                <View style={{ marginTop: 4 }}>
                                    <Text style={[styles.sectionTitleText, { color: colors.textMain, marginBottom: 6 }]}>New Items</Text>
                                    {cartItemsArray.map(({ item, quantity }) => (
                                        <View key={item!.id} style={[styles.cartItemRow, { borderBottomColor: colors.border }]}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.cartItemNameText, { color: colors.textMain, fontWeight: "600" }]}>{item!.name}</Text>
                                                <Text style={[styles.cartItemPriceLabel, { color: colors.textMuted }]}>NPR {item!.price}</Text>
                                            </View>
                                            <View style={[styles.drawerQtyCounterBox, { backgroundColor: isDark ? "#1E293B" : "#FFF" }]}>
                                                <TouchableOpacity onPress={() => removeFromCart(item!.id)} style={[styles.qtyControlActionNode, { backgroundColor: "#6366F1" }]}>
                                                    <Minus size={14} color="#FFF" />
                                                </TouchableOpacity>
                                                <Text style={[styles.qtyNodeDisplayValue, { color: colors.textMain, fontWeight: "500", fontSize: 17 }]}>{quantity}</Text>
                                                <TouchableOpacity onPress={() => addToCart(item!.id)} style={[styles.qtyControlActionNode, { backgroundColor: "#6366F1" }]}>
                                                    <Plus size={14} color="#FFF" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.subtotalRowBlock}>
                            <Text style={[styles.subtotalLabelText, { color: colors.textMain, fontWeight: "700" }]}>{isOccupied ? "New Items Total" : "Subtotal"}</Text>
                            <Text style={[styles.subtotalValueText, { color: colors.textMain, fontWeight: "800" }]}>NPR {newItemsSubtotal}</Text>
                        </View>
                    </View>
                )}

                <TouchableOpacity
                    disabled={!hasActiveOrders}
                    activeOpacity={0.8}
                    style={[styles.primaryCheckoutBtn, { backgroundColor: !hasActiveOrders ? colors.border : "#6366F1" }]}
                >
                    <Text style={[styles.checkoutBtnText, { fontWeight: "700" }]}>
                        {isOccupied ? "Update Order" : "Confirm Order"}
                    </Text>
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
        borderRadius: 19,
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
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 6,
    },
    sectionTitleText: {
        fontSize: 13,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        opacity: 0.7,
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        borderWidth: 1,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: "700",
    },
    actionControlsContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    deleteActionButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    drawerControlHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 10,
        marginBottom: 4,
    },
    drawerHeaderText: {
        fontSize: 14,
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    expandToggleCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
});