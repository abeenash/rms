import { ChevronDown, Clock, ShoppingBag } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
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

import { isNetworkError, NETWORK_OFFLINE_MESSAGE } from "@/utils/networkError";
import { useFocusEffect, useRouter } from "expo-router";
import Text from "../../components/AppText";
import { useCustomAlert } from "../../context/AlertContext";
import { useTheme } from "../../context/ThemeContext";

import { fetchOrdersApi, Order } from "@/services/orderService";
import { getKitchenStage, getWaiterOrderState, isTableOrder, KITCHEN_STAGE_LABEL, WAITER_STATE_LABEL, WaiterOrderState } from "@/utils/orderState";
import { timeAgo } from "@/utils/timeAgo";
import { useAuth } from "../../context/AuthContext";

type StateFilter = "all" | WaiterOrderState;
type TypeFilter = "all" | "direct" | "table";

const STATE_FILTERS: StateFilter[] = ["all", "unpaid", "paid", "cancelled"];

const TYPE_FILTER_LABEL: Record<TypeFilter, string> = {
  all: "All orders",
  table: "Table orders",
  direct: "Direct orders",
};

// waiters only work with the last 24 hours; older orders stay reachable through their table
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

const emptyMessage = (stateFilter: StateFilter, typeFilter: TypeFilter): string => {
  const state = stateFilter === "all" ? "" : `${WAITER_STATE_LABEL[stateFilter].toLowerCase()} `;
  const type = typeFilter === "all" ? "" : `${typeFilter} `;
  return `No ${state}${type}orders in the last 24 hours.`;
};

function PulsingDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.set(withRepeat(withTiming(0.2, { duration: 650 }), -1, true));
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return <Animated.View style={[styles.stageDot, { backgroundColor: color }, animatedStyle]} />;
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { showAlert } = useCustomAlert();

  const router = useRouter()
  const { tenantSlug } = useAuth();
  const pulseOpacity = useSharedValue(0.4);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<StateFilter>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<TypeFilter>("all");
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(() => Date.now());
  const [loadError, setLoadError] = useState<boolean>(false);

  const loadOrders = useCallback(async (showLoader = true) => {
    if (!tenantSlug) {
      setIsLoading(false)
      return
    }
    try {
      if (showLoader) {
        setIsLoading(true)
        pulseOpacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
      }

      const fetchedOrders = await fetchOrdersApi(tenantSlug);
      setOrders(fetchedOrders)
      setLastFetchTime(Date.now())
      setLoadError(false)
    } catch (error) {
      setLoadError(true)
      if (isNetworkError(error)) {
        showAlert("Network Error", NETWORK_OFFLINE_MESSAGE)
      }
    } finally {
      setIsLoading(false)
      setRefreshing(false);
    }
  }, [tenantSlug, pulseOpacity, showAlert])

  useEffect(() => {
    loadOrders(true);
  }, [loadOrders]);

  useFocusEffect(
    useCallback(() => {
      loadOrders(false)
    }, [loadOrders])
  )

  const onRefresh = () => {
    setRefreshing(true);
    setOrderTypeFilter("all");
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

    unpaid: isDark ? "#EAB308" : "#D97706",
    paid: isDark ? "#22C55E" : "#16A34A",
    cancelled: isDark ? "#EF4444" : "#DC2626",
    inKitchen: isDark ? "#60A5FA" : "#2563EB",
    ready: isDark ? "#A78BFA" : "#7C3AED",

    unpaidBg: isDark ? "#2E2509" : "#FEF3C7",
    paidBg: isDark ? "#0A251C" : "#F0FDF4",
    cancelledBg: isDark ? "#2A1414" : "#FEF2F2",
  };

  const { filteredOrders, filterCounts } = useMemo(() => {
    const cutoffTime = lastFetchTime - RECENT_WINDOW_MS
    const ofType = orders
      .filter((order) => new Date(order.orderedAt).getTime() >= cutoffTime)
      .filter((order) => orderTypeFilter === "all" || (orderTypeFilter === "table") === isTableOrder(order))
      .sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime())

    const matches = (filter: StateFilter) => (order: Order) =>
      filter === "all" || getWaiterOrderState(order) === filter

    const counts = Object.fromEntries(
      STATE_FILTERS.map((filter) => [filter, ofType.filter(matches(filter)).length])
    ) as Record<StateFilter, number>

    return { filteredOrders: ofType.filter(matches(activeFilter)), filterCounts: counts }
  }, [orders, activeFilter, orderTypeFilter, lastFetchTime]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMain} />
      }
    >

      <View style={styles.contentPadding}>
        <View style={styles.titleRow}>
          <Text style={[styles.sectionTitle, { color: colors.textMain, fontWeight: "700" }]}>
            Your Recent Orders
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsTypeMenuOpen(true)}
            style={[styles.typeDropdown, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          >
            <Text style={[styles.typeDropdownText, { color: orderTypeFilter === "all" ? colors.textMuted : colors.textMain, fontWeight: "600" }]}>
              {TYPE_FILTER_LABEL[orderTypeFilter]}
            </Text>
            <ChevronDown size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8 }}>
          {STATE_FILTERS.map((filter) => {
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
                  {filter === "all" ? "All" : WAITER_STATE_LABEL[filter]} ({filterCounts[filter]})
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
              <ShoppingBag size={36} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textMain, fontWeight: "700" }]}>
                {loadError && orders.length === 0 ? "Couldn't load orders" : emptyMessage(activeFilter, orderTypeFilter)}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                {loadError && orders.length === 0
                  ? "Check the internet connection, then pull down to try again."
                  : "New orders will appear here. Pull down to refresh."}
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const waiterState = getWaiterOrderState(order)
              const kitchenStage = getKitchenStage(order)
              const badgeBg = colors[`${waiterState}Bg`]
              const badgeText = colors[waiterState]
              const stageColor = kitchenStage === "ready" ? colors.ready : colors.inKitchen

              const display = timeAgo(order.orderedAt)

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
                          {WAITER_STATE_LABEL[waiterState]}
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
                          {display}
                        </Text>
                        {kitchenStage ? (
                          <View style={styles.stageTag}>
                            {kitchenStage === "ready" ? (
                              <PulsingDot color={stageColor} />
                            ) : (
                              <View style={[styles.stageDot, { backgroundColor: stageColor }]} />
                            )}
                            <Text style={[styles.stageText, { color: stageColor, fontWeight: "700" }]}>
                              {KITCHEN_STAGE_LABEL[kitchenStage]}
                            </Text>
                          </View>
                        ) : null}
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

    <Modal
      visible={isTypeMenuOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setIsTypeMenuOpen(false)}
    >
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={() => setIsTypeMenuOpen(false)}
      >
        <View style={[styles.typeMenu, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {(["all", "table", "direct"] as const).map((typeKey) => (
            <TouchableOpacity
              key={typeKey}
              activeOpacity={0.6}
              onPress={() => {
                setOrderTypeFilter(typeKey)
                setIsTypeMenuOpen(false)
              }}
              style={[
                styles.typeMenuItem,
                orderTypeFilter === typeKey && { backgroundColor: "#6366F1" },
              ]}
            >
              <Text style={[
                styles.typeMenuItemText,
                { color: orderTypeFilter === typeKey ? "#FFFFFF" : colors.textMain },
              ]}>
                {TYPE_FILTER_LABEL[typeKey]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
    </View>
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
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  typeDropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeDropdownText: {
    fontSize: 12,
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
  stageTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: 10,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stageText: {
    fontSize: 12,
  },
  amountText: {
    fontSize: 16,
  },
  emptyContainer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 4,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: "center",
  },
  skBlock: {
    borderRadius: 4,
  },
  existedTable: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 16,
  },
  typeMenu: {
    width: 160,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  typeMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  typeMenuItemText: {
    fontSize: 13,
    fontWeight: "600",
  },
});