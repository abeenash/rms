import { useRouter } from "expo-router"
import { LogOutIcon, Search, Store, User, Users } from "lucide-react-native"
import React, { useCallback, useEffect, useState } from "react"
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated"

import { DiningTable, fetchDiningTablesApi } from "@/services/tableService"
import Text from "../components/AppText"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"

import * as SecureStore from 'expo-secure-store'; //imported for verification purpose only

const { width } = Dimensions.get("window")

const CARD_WIDTH = (width - 48) / 2

// const INITIAL_TABLES = [
//   { id: "1", number: "1", status: "available", capacity: 4 },
//   { id: "2", number: "2", status: "occupied", capacity: 3 },
//   { id: "3", number: "3", status: "available", capacity: 4 },
//   { id: "4", number: "4", status: "occupied", capacity: 2 },
//   { id: "5", number: "5", status: "occupied", capacity: 4 },
// ]

export interface DiningTableUI {
  id: string;
  number: string;
  status: "available" | "occupied";
  capacity: number;
}

export default function DashboardScreen() {
  const { isDark } = useTheme()
  const router = useRouter()
  const { logout, user, tenantSlug } = useAuth()
  const [search, setSearch] = useState("")
  const [tables, setTables] = useState<DiningTable[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const pulseOpacity = useSharedValue(0.4)

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withTiming(1, { duration: 800 }),
      -1,
      true
    );

    // const timer = setTimeout(() => {
    //   setTables(INITIAL_TABLES)
    //   setIsLoading(false)
    // }, 1500)

    // return () => clearTimeout(timer)
  }, [])

  const loadTables = useCallback(async (showLoader = true) => {
    if (!tenantSlug) return;

    try {
      if (showLoader) setIsLoading(true);
      const rawData = await fetchDiningTablesApi(tenantSlug);

      // Normalize backend status while keeping the DiningTable type structure
      const formattedTables: DiningTable[] = rawData.map((t) => ({
        ...t,
        status: t.status?.toUpperCase() === "AVAILABLE" ? "available" : "occupied"
      }));

      setTables(formattedTables);
    } catch (error) {
      console.error("Failed to fetch live tables:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    loadTables()
  }, [loadTables])

  const onRefresh = () => {
    setRefreshing(true)
    loadTables(false)
  }


  //this function is for verification purpose only.............
  const checkStorage = async () => {
    const token = await SecureStore.getItemAsync('access_token');
    const userData = await SecureStore.getItemAsync('user_data');

    console.log("🔑 STORED JWT TOKEN:", token);
    console.log("👤 STORED USER DATA:", JSON.parse(userData || '{}'));
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
  }

  const handleTablePress = (table: DiningTable) => {
    router.push({
      pathname: "/tables/[tableId]",
      params: {
        tableId: String(table.id),
        tableNumber: String(table.tableNumber),
        capacity: String(table.capacity),
        status: table.status === "occupied" ? "Occupied" : "Available"
      }
    })
  }

  const handleLogout = () => {
    Alert.alert(
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >

      <View style={[styles.profileHeader, { backgroundColor: isDark ? "#1E293B" : "#6366F1" }]}>
        <View style={styles.profileRow}>
          <View style={styles.profileLeft}>
            <View style={[styles.avatarBox, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
              <User size={20} color="#FFFFFF" />
            </View>
            <View style={styles.staffInfo}>
              <Text style={[styles.staffLabel, { color: "#FFFFFF" }]}>Staff member</Text>
              <Text style={[styles.staffName, { color: "#FFFFFF", fontWeight: "700" }]}>Mohan Rai</Text>
            </View>
          </View>
          {/* ---------FOR TESTING THE JWT AND USER DATA 
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={checkStorage}
            style={[styles.logoutButton, { backgroundColor: isDark ? "#6366F1" : "#5355F1" }]}>
            <LogOutIcon size={20} color="#FFFFFF" />
          </TouchableOpacity> */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLogout}
            style={[styles.logoutButton, { backgroundColor: isDark ? "#6366F1" : "#5355F1" }]}>
            <LogOutIcon size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={[styles.storeRow, { borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)" }]}>
          <Store size={14} color="#FFFFFF" />
          <Text style={[styles.storeText, { color: "#FFFFFF", fontWeight: "500" }]}>lekali-sekuwa branch</Text>
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
    gap: 12,
  },
  profileLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    left: 120,
    top: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    marginBottom: 10,
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