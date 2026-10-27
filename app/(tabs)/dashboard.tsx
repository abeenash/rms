import { useFocusEffect, useRouter } from "expo-router"
import { BadgeCheck, LogOut, Moon, MoreVertical, Search, ShieldCheck, Store, Sun, User, Users } from "lucide-react-native"
import { openPrivacyPolicy } from "../../constants/legal"
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
import { isNetworkError, NETWORK_OFFLINE_MESSAGE } from "@/utils/networkError"
import Text from "../../components/AppText"
import { useCustomAlert } from "../../context/AlertContext"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"

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
  const [statusFilter, setStatusFilter] = useState<"available" | "occupied" | null>(null)
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
    if (!tenantSlug) {
      setIsLoading(false)
      return
    }

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
  }, [tenantSlug, showAlert])

  useFocusEffect(
    useCallback(() => {
      loadTables(false)
    }, [loadTables])
  )

  const onRefresh = () => {
    setRefreshing(true)
    setStatusFilter(null)
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

  const filteredTables = tables.filter((table) => {
    const matchesSearch = String(table.tableNumber).toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !statusFilter || table.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
        <View style={styles.contentPadding}>
          {/* Search Table Bar */}
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

          {/* Section Header with Right-Aligned Action Button */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textMain, fontWeight: "700" }]}>
              Select a Table
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={toggleMenu}
              style={[
                styles.threeDotsButton,
                { backgroundColor:"#6366F1" }
              ]}
            >
              <MoreVertical size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Table Metrics */}
          {isLoading ? (
            <View style={styles.metricsContainer}>
              <Animated.View style={[styles.metricsSkeleton, { backgroundColor: colors.skeletonBlock }, animatedPulseStyle]} />
              <Animated.View style={[styles.metricsSkeleton, { backgroundColor: colors.skeletonBlock }, animatedPulseStyle]} />
            </View>
          ) : (
            <View style={styles.metricsContainer}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setStatusFilter(statusFilter === "available" ? null : "available")}
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: colors.cardAvailableBg,
                    borderColor: colors.cardAvailableBorder,
                    opacity: statusFilter && statusFilter !== "available" ? 0.45 : 1,
                  }
                ]}
              >
                <Text style={[styles.metricNumber, { color: colors.availableAccent }]}>{availableTables}</Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Available</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setStatusFilter(statusFilter === "occupied" ? null : "occupied")}
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: colors.cardOccupiedBg,
                    borderColor: colors.cardOccupiedBorder,
                    opacity: statusFilter && statusFilter !== "occupied" ? 0.45 : 1,
                  }
                ]}
              >
                <Text style={[styles.metricNumber, { color: colors.occupiedAccent }]}>{occupiedTables}</Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Occupied</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Dining Table Grid */}
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

      {/* Dimming Backdrop Overlay & Staff Card Popover */}
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
          <Pressable style={styles.modalContentWrapper} onPress={(e) => e.stopPropagation()}>
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
              {/* Staff Details Header */}
              <View style={styles.staffCardHeader}>
                <View style={[styles.avatarBox, { backgroundColor: "#6366F1" }]}>
                  <User size={20} color="#FFFFFF" />
                </View>
                <View style={styles.staffDetailsColumn}>
                  <Text style={[styles.staffNameText, { color: colors.textMain, fontWeight: "700" }]}>
                    {user?.name ? user.name.toUpperCase() : "STAFF"}
                  </Text>

                  <View style={styles.roleBadgeContainer}>
                    <BadgeCheck size={11} color="#6366F1" />
                    <Text style={styles.roleBadgeText}>
                      {user?.roles ? (Array.isArray(user.roles) ? user.roles.join(", ") : String(user.roles)) : "STAFF"}
                    </Text>
                  </View>

                  <View style={styles.storeSlugContainer}>
                    <Store size={11} color={colors.textMuted} />
                    <Text style={[styles.storeSlugText, { color: colors.textMuted }]}>
                      {user?.tenantSlug}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.dropdownDividerLine, { backgroundColor: colors.popoverBorder }]} />

              {/* Dark Mode Toggle */}
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

              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => closeMenu(() => openPrivacyPolicy())}
                style={styles.menuRowItem}
              >
                <ShieldCheck size={18} color={colors.textMuted} />
                <Text style={[styles.menuItemLabelText, { color: colors.textMain }]}>
                  Privacy Policy
                </Text>
              </TouchableOpacity>

              <View style={[styles.dropdownDividerLine, { backgroundColor: colors.popoverBorder }]} />

              {/* Log Out Button */}
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
    paddingTop: 1,
  },
  contentPadding: {
    padding: 15,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  threeDotsButton: {
    width: 38,
    height: 38,
    borderRadius: 99,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 16,
  },
  modalContentWrapper: {
    width: 230,
  },
  dropdownPopover: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  staffCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  staffDetailsColumn: {
    flex: 1,
    gap: 2,
  },
  staffNameText: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  roleBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6366F1",
    textTransform: "uppercase",
  },
  storeSlugContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  storeSlugText: {
    fontSize: 11,
    fontWeight: "500",
  },
  menuRowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  menuItemLabelText: {
    fontSize: 13,
    fontWeight: "500",
  },
  dropdownDividerLine: {
    height: 1,
    marginVertical: 4,
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
    marginBottom: 16,
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