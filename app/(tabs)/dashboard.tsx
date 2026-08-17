import { useFocusEffect, useRouter } from "expo-router"
import { BadgeCheck, LogOut, Moon, MoreVertical, Search, Store, Sun, User, Users } from "lucide-react-native"
import React, { useCallback, useEffect, useState } from "react"
import {
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from "react-native"
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated"

import { DiningTable, fetchDiningTablesApi } from "@/services/tableService"
import Text from "../../components/AppText"
import { useCustomAlert } from "../../context/AlertContext"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { isNetworkError, NETWORK_OFFLINE_MESSAGE } from "@/utils/networkError"

const { width } = Dimensions.get("window")
const CARD_WIDTH = (width - 48) / 2

export interface DiningTableUI {
  id: string;
  number: string;
  status: "available" | "occupied";
  capacity: number;
}

export default function DashboardScreen() {
  const { isDark, toggleTheme } = useTheme()
  const router = useRouter()
  const { logout, user, tenantSlug } = useAuth()
  const { showAlert } = useCustomAlert()
  const [search, setSearch] = useState("")
  const [tables, setTables] = useState<DiningTable[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)

  // Popover Menu State & Animations
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuTranslateY = useSharedValue(-15)
  const menuOpacity = useSharedValue(0)
  const pulseOpacity = useSharedValue(0.4)

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withTiming(1, { duration: 800 }),
      -1,
      true
    )
  }, [])

  useEffect(() => {
    if (isMenuOpen) {
      menuTranslateY.value = -12
      menuOpacity.value = 0

      menuOpacity.value = withTiming(1, { duration: 140 })
      menuTranslateY.value = withTiming(0, {
        duration: 140,
        easing: Easing.out(Easing.quad),
      })
    }
  }, [isMenuOpen])

  const closeMenu = (callback?: () => void) => {
    menuOpacity.value = withTiming(0, { duration: 100 })
    menuTranslateY.value = withTiming(-8, { duration: 100 }, (finished) => {
      if (finished) {
        runOnJS(setIsMenuOpen)(false)
        if (callback) {
          runOnJS(callback)()
        }
      }
    })
  }

  const toggleMenu = () => {
    if (isMenuOpen) {
      closeMenu()
    } else {
      setIsMenuOpen(true)
    }
  }

  const animatedMenuStyles = useAnimatedStyle(() => ({
    opacity: menuOpacity.value,
    transform: [{ translateY: menuTranslateY.value }],
  }))

  const loadTables = useCallback(async (showLoader = true) => {
    if (!tenantSlug) return

    try {
      if (showLoader) setIsLoading(true)
      const rawData = await fetchDiningTablesApi(tenantSlug)

      const formattedTables: DiningTable[] = rawData.map((t) => ({
        ...t,
        status: t.status?.toUpperCase() === "AVAILABLE" ? "available" : "occupied"
      }))

      setTables(formattedTables)
    } catch (error) {
      if (isNetworkError(error)) {
        showAlert("Network Error", NETWORK_OFFLINE_MESSAGE)
      }
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [tenantSlug])

  // i guess initial fetch not needed. it will slow down the response.
  // useEffect(() => {
  //   loadTables()
  // }, [loadTables])

  useFocusEffect(
    useCallback(() => {
      loadTables(false)
    }, [loadTables])
  )

  const onRefresh = () => {
    setRefreshing(true)
    loadTables(false)
  }

  const handleTablePress = (table: DiningTable) => {
    router.push({
      pathname: "/tables/[tableId]",
      params: {
        tableId: String(table.id),
        tableNumber: String(table.tableNumber),
        capacity: String(table.capacity),
        status: table.status === "occupied" ? "Occupied" : "Available",
        currentOrderId: table.currentOrderId ? String(table.currentOrderId) : ""
      }
    })
  }

  const handleLogout = () => {
    showAlert(
      "Sign Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await logout()
            router.replace("/")
          }
        }
      ]
    )
  }

  const animatedPulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }))

  const totalTables = tables.length
  const availableTables = tables.filter((t) => t.status === "available").length
  const occupiedTables = totalTables - availableTables

  const filteredTables = tables.filter((table) =>
    String(table.tableNumber).toLowerCase().includes(search.toLowerCase())
  )

  const colors = {
    bg: isDark ? "#0F172A" : "#F8FAFC",
    cardDefault: isDark ? "#1E293B" : "#FFFFFF",
    textMain: isDark ? "#FFFFFF" : "#0F172A",
    textMuted: isDark ? "#94A3B8" : "#64748B",
    searchBg: isDark ? "#1E293B" : "#E2E8F0",
    skeletonBlock: isDark ? "#334155" : "#E2E8F0",
    availableAccent: isDark ? "#22C55E" : "#16A34A",
    occupiedAccent: isDark ? "#EF4444" : "#DC2626",
    cardAvailableBg: isDark ? "#0A251C" : "#E7FFE6",
    cardAvailableBorder: isDark ? "#14532D" : "#DCFCE7",
    cardOccupiedBg: isDark ? "#2A1414" : "#FEF2F2",
    cardOccupiedBorder: isDark ? "#7F1D1D" : "#FEE2E2",
    popoverBg: isDark ? "#1E293B" : "#FFFFFF",
    popoverBorder: isDark ? "#334155" : "#E2E8F0",
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMain} />}
      >
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: isDark ? "#1E293B" : "#6366F1" }]}>
          <View style={styles.profileRow}>
            <View style={styles.profileLeft}>
              <View style={[styles.avatarBox, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                <User size={20} color="#FFFFFF" />
              </View>
              <View style={styles.staffInfo}>
                <View style={[styles.badge, { backgroundColor: "rgba(255, 255, 255, 0.2)", alignSelf: "flex-start", flexDirection: "row" }]}>
                  <BadgeCheck size={13} color="#FFFFFF" />
                  <Text style={[styles.badgeText, { color: "#FFF", fontWeight: "700" }]}>
                    {user?.roles}
                  </Text>
                </View>

                <Text style={[styles.staffName, { color: "#FFFFFF", fontWeight: "700" }]}>
                  {user?.name.toUpperCase()}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={toggleMenu}
              style={styles.threeDotsButton}
            >
              <MoreVertical size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={[styles.storeRow, { borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)" }]}>
            <Store size={14} color="#FFFFFF" />
            <Text style={[styles.storeText, { color: "#FFFFFF", fontWeight: "500" }]}>{user?.tenantSlug}</Text>
          </View>
        </View>

        <View style={styles.contentPadding}>
          <View style={[styles.searchContainer, { backgroundColor: colors.searchBg }]}>
            <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.textMain, fontFamily: "Inter-Regular" }]}
              placeholder="Search table by number..."
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={search}
              editable={!isLoading}
              onChangeText={setSearch}
            />
          </View>

          <Text style={[styles.title, { color: colors.textMain, fontWeight: "700" }]}>
            Select a Table
          </Text>

          {isLoading ? (
            <View style={styles.metricsContainer}>
              <Animated.View style={[styles.metricsSkeleton, { backgroundColor: colors.skeletonBlock }, animatedPulseStyle]} />
              <Animated.View style={[styles.metricsSkeleton, { backgroundColor: colors.skeletonBlock }, animatedPulseStyle]} />
            </View>
          ) : (
            <View style={styles.metricsContainer}>
              <View style={[styles.metricCard, { backgroundColor: colors.cardAvailableBg, borderColor: colors.cardAvailableBorder }]}>
                <Text style={[styles.metricNumber, { color: colors.availableAccent }]}>{availableTables}</Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Available</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: colors.cardOccupiedBg, borderColor: colors.cardOccupiedBorder }]}>
                <Text style={[styles.metricNumber, { color: colors.occupiedAccent }]}>{occupiedTables}</Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Occupied</Text>
              </View>
            </View>
          )}

          <View style={styles.grid}>
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                <View key={`skeleton-${index}`} style={[styles.card, { backgroundColor: colors.cardDefault, borderColor: "transparent" }]}>
                  <Animated.View style={[styles.skeletonSquare, { backgroundColor: colors.skeletonBlock }, animatedPulseStyle]} />
                  <Animated.View style={[styles.skeletonBadge, { backgroundColor: colors.skeletonBlock }, animatedPulseStyle]} />
                  <Animated.View style={[styles.skeletonTextLine, { backgroundColor: colors.skeletonBlock }, animatedPulseStyle]} />
                </View>
              ))
              : filteredTables.map((table) => {
                const isAvailable = table.status === "available"

                const cardBg = isAvailable ? colors.cardAvailableBg : colors.cardOccupiedBg
                const cardBorder = isAvailable ? colors.cardAvailableBorder : colors.cardOccupiedBorder
                const accentColor = isAvailable ? colors.availableAccent : colors.occupiedAccent

                return (
                  <TouchableOpacity
                    key={table.id}
                    activeOpacity={0.7}
                    onPress={() => handleTablePress(table)}
                    style={[
                      styles.card,
                      {
                        backgroundColor: cardBg,
                        borderColor: cardBorder,
                      }
                    ]}
                  >
                    <View style={[styles.numberBlock, { backgroundColor: accentColor }]}>
                      <Text style={[styles.numberText, { fontWeight: "bold" }]}>{table.tableNumber}</Text>
                    </View>

                    <View style={[styles.badge, { backgroundColor: accentColor }]}>
                      <Text style={[styles.badgeText, { fontWeight: "700" }]}>
                        {table.status}
                      </Text>
                    </View>

                    <View style={styles.capacityContainer}>
                      <Users size={13} color={colors.textMuted} style={styles.capacityIcon} />
                      <Text style={[styles.capacityText, { color: colors.textMuted, fontWeight: "600" }]}>
                        Capacity: {table.capacity}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
          </View>
        </View>
      </ScrollView>

      {/* Transparent Modal for Popover Dropdown */}
      <Modal
        visible={isMenuOpen}
        transparent
        animationType="none"
        onRequestClose={toggleMenu}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => closeMenu()}
        >
          <Pressable style={styles.popoverPositioner} onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.dropdownPopover,
                animatedMenuStyles,
                {
                  backgroundColor: colors.popoverBg,
                  borderColor: colors.popoverBorder,
                }
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => {
                  toggleTheme()
                  closeMenu()
                }}
                style={styles.menuRowItem}
              >
                {isDark ? (
                  <Sun size={18} color="#FBBF24" />
                ) : (
                  <Moon size={18} color="#4F46E5" />
                )}
                <Text style={[styles.menuItemLabelText, { color: colors.textMain }]}>
                  {isDark ? "Light Mode" : "Dark Mode"}
                </Text>
              </TouchableOpacity>

              <View style={[styles.dropdownDividerLine, { backgroundColor: colors.popoverBorder }]} />

              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => {
                  closeMenu(() => handleLogout())
                }}
                style={styles.menuRowItem}
              >
                <LogOut size={18} color="#EF4444" />
                <Text style={[styles.menuItemLabelText, { color: "#EF4444", fontWeight: "600" }]}>
                  Log Out
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  contentPadding: {
    padding: 16,
  },
  profileHeader: {
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 4,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  staffLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  staffName: {
    fontSize: 18,
    letterSpacing: -0.2,
  },
  staffInfo: {
    justifyContent: "center",
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  storeText: {
    fontSize: 13,
  },
  threeDotsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "transparent",
  },
  popoverPositioner: {
    position: "absolute",
    top: 56,
    right: 20,
  },
  dropdownPopover: {
    width: 150,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  menuRowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  menuItemLabelText: {
    fontSize: 13,
    fontWeight: "500",
  },
  dropdownDividerLine: {
    height: 1,
    marginVertical: 2,
  },
  title: {
    fontSize: 22,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  metricsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: "700",
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  metricsSkeleton: {
    flex: 1,
    height: 54,
    borderRadius: 14,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginTop: 4,
    marginBottom: 24,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  numberBlock: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  numberText: {
    fontSize: 22,
    color: "#FFFFFF",
  },
  badge: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 11,
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  capacityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  capacityIcon: {
    marginRight: 4,
  },
  capacityText: {
    fontSize: 12,
  },
  skeletonSquare: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginBottom: 12,
  },
  skeletonBadge: {
    width: 70,
    height: 20,
    borderRadius: 99,
    marginBottom: 12,
  },
  skeletonTextLine: {
    width: 80,
    height: 12,
    borderRadius: 4,
  },
})