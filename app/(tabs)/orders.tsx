import { Clock, ShoppingBag } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFocusEffect, useRouter } from "expo-router";
import Text from "../../components/AppText";
import { useTheme } from "../../context/ThemeContext";

import { Order, fetchOrdersApi } from "@/services/orderService";
import { useAuth } from "../../context/AuthContext";

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const router = useRouter()
  const { tenantSlug } = useAuth();
  const pulseOpacity = useSharedValue(0.4);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "confirmed" | "delivered" | "cancelled">("all");

  const formatOrderTime = (isoString?: string) => {
    if (!isoString) return { dateDisplay: "N/A", timeStr: "" };
    const date = new Date(isoString);

    if (isNaN(date.getTime())) return { dateDisplay: "N/A", timestr: "" }

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    return {
      dateDisplay: `${dateStr} | ${timeStr}`,
      timeStr
    };
  };

  const loadOrders = useCallback(async (showLoader = true) => {
    if (!tenantSlug) return
    try {
      if (showLoader) {
        setIsLoading(true)
        pulseOpacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
      }

      const fetchedOrders = await fetchOrdersApi(tenantSlug);
      setOrders(fetchedOrders)
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setIsLoading(false)
      setRefreshing(false);
    }
  }, [tenantSlug])

  useEffect(() => {
    loadOrders(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders(false)
    }, [loadOrders])
  )

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders(false);
  };

  const animatedPulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const colors = {
    bg: isDark ? "#0F172A" : "#F8FAFC",
    cardBg: isDark ? "#1E293B" : "#FFFFFF",
    textMain: isDark ? "#FFFFFF" : "#0F172A",
    textMuted: isDark ? "#94A3B8" : "#64748B",
    border: isDark ? "#334155" : "#E2E8F0",
    skeletonBlock: isDark ? "#334155" : "#E2E8F0",

    confirmed: isDark ? "#EAB308" : "#D97706",
    delivered: isDark ? "#22C55E" : "#16A34A",
    cancelled: isDark ? "#EF4444" : "#DC2626",

    confirmedBg: isDark ? "#2E2509" : "#FEF3C7",
    deliveredBg: isDark ? "#0A251C" : "#F0FDF4",
    cancelledBg: isDark ? "#2A1414" : "#FEF2F2",
  };

  const filteredOrders = orders.filter(order => {
    const statusLower = order.status?.toLowerCase();
    if (activeFilter === "all") return true
    return statusLower === activeFilter
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMain} />
      }
    >

      <View style={styles.contentPadding}>
        <Text style={[styles.sectionTitle, { color: colors.textMain, fontWeight: "700" }]}>
          Your Recent Orders
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8 }}>
          {(["all", "confirmed", "delivered", "cancelled"] as const).map((filter) => {
            const isSelected = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? "#6366F1" : colors.cardBg,
                    borderColor: colors.border,
                  }
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isSelected ? "#FFFFFF" : colors.textMuted,
                      fontWeight: isSelected ? "700" : "500"
                    }
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.ordersList}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <View key={`dashboard-sk-${idx}`} style={[styles.orderCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <Animated.View style={[styles.skBlock, { width: 110, height: 16, backgroundColor: colors.skeletonBlock }, animatedPulseStyle]} />
                  <Animated.View style={[styles.skBlock, { width: 80, height: 22, borderRadius: 99, backgroundColor: colors.skeletonBlock }, animatedPulseStyle]} />
                </View>
                <Animated.View style={[styles.skBlock, { width: 160, height: 14, marginTop: 12, backgroundColor: colors.skeletonBlock }, animatedPulseStyle]} />
                <View style={[styles.cardFooter, { marginTop: 16 }]}>
                  <Animated.View style={[styles.skBlock, { width: 120, height: 12, backgroundColor: colors.skeletonBlock }, animatedPulseStyle]} />
                  <Animated.View style={[styles.skBlock, { width: 60, height: 18, backgroundColor: colors.skeletonBlock }, animatedPulseStyle]} />
                </View>
              </View>
            ))
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ color: colors.textMuted, fontWeight: "500" }}>No orders found in this filter you have selected.</Text>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const statusLower = (order.status || "pending").toLowerCase()
              const badgeBg = colors[`${statusLower}Bg` as keyof typeof colors] || colors.confirmedBg;  //make your pendingBg and down pending also
              const badgeText = colors[statusLower as keyof typeof colors] || colors.confirmed;

              const { dateDisplay } = formatOrderTime(order.orderedAt)

              const itemsCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

              return (
                <TouchableOpacity
                  key={order.id}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/orders/${order.id}`)}>
                  <View
                    style={[
                      styles.orderCard,
                      {
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                      }
                    ]}
                  >

                    <View style={styles.cardHeader}>
                      <Text style={[styles.orderIdText, { color: colors.textMain, fontWeight: "700" }]}>
                        #{order.orderNumber}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.statusBadgeText, { color: badgeText, fontWeight: "700" }]}>
                          {order.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.customerRow}>
                      <Text style={[styles.customerText, { color: colors.textMain, fontWeight: "600" }]}>
                        {order.customerName || "Walk-in Customer"}
                      </Text>
                      {order.tableNumber ? (
                        <>
                          <View style={styles.dotDivider} />
                          <View style={[styles.existedTable, { backgroundColor: "#6366F1", borderColor: "#6366F1" }]}>
                            <Text style={[styles.itemsText, { color: "#FFF", fontWeight: "500" }]}>
                              T{order.tableNumber}
                            </Text>
                          </View>
                        </>
                      ) : null}
                      <View style={styles.dotDivider} />
                      <ShoppingBag size={13} color={colors.textMuted} />
                      <Text style={[styles.itemsText, { color: colors.textMuted, fontWeight: "500" }]}>
                        {itemsCount} {itemsCount === 1 ? "item" : "items"}
                      </Text>
                    </View>

                    <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                      <View style={styles.timeContainer}>
                        <Clock size={13} color={colors.textMuted} />
                        <Text style={[styles.timeText, { color: colors.textMuted, fontWeight: "500" }]}>
                          {dateDisplay}
                        </Text>
                      </View>
                      <Text style={[styles.amountText, { color: colors.textMain, fontWeight: "700" }]}>
                        Rs. {order.totalAmount}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    textTransform: "capitalize",
  },
  ordersList: {
    gap: 12,
  },
  orderCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderIdText: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  customerText: {
    fontSize: 14,
  },
  dotDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#94A3B8",
    marginHorizontal: 8,
  },
  itemsText: {
    fontSize: 13,
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 12,
  },
  amountText: {
    fontSize: 16,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  skBlock: {
    borderRadius: 4,
  },
  existedTable: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  }
});