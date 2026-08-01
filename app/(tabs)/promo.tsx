import { Calendar, Tag, TicketPercent } from "lucide-react-native"
import React, { useCallback, useEffect, useState } from "react"
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated"

import { fetchPromoCodesApi, PromoCode } from "@/services/promoService"
import Text from "../components/AppText"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"

export default function PromoScreen() {
  const { isDark } = useTheme()
  const { tenantSlug } = useAuth()

  const [promos, setPromos] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const pulseOpacity = useSharedValue(0.4)

  const loadPromos = useCallback(async () => {
    if (!tenantSlug) return
    try {
      setLoading(true)
      pulseOpacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true)
      const data = await fetchPromoCodesApi(tenantSlug)
      setPromos(data)
    } catch (error) {
      console.error("Failed to load promo screen data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [tenantSlug, pulseOpacity])

  useEffect(() => {
    loadPromos()
  }, [loadPromos])

  const onRefresh = () => {
    setRefreshing(true)
    loadPromos()
  }

  const animatedPulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }))

  const colors = {
    bg: isDark ? "#0F172A" : "#F8FAFC",
    cardBg: isDark ? "#1E293B" : "#FFFFFF",
    textMain: isDark ? "#FFFFFF" : "#0F172A",
    textMuted: isDark ? "#94A3B8" : "#64748B",
    border: isDark ? "#334155" : "#E2E8F0",
    skeletonBlock: isDark ? "#344155" : "#E2E8F0",
    promoAccent: isDark ? "#818CF8" : "#4F46E5",
    promoBadgeBg: isDark ? "#1E1B4B" : "#EEF2FF",
    emptyBg: isDark ? "#1E293B" : "#F1F5F9",
  }

  const formatDate = (isoString?: string) => {
    if (!isoString) return "N/A"
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return "N/A"
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMain} />
      }
    >
      <View style={styles.contentPadding}>
        <Text style={[styles.sectionTitle, { color: colors.textMain, fontWeight: "700" }]}>
          Active Promotions
        </Text>

        <View style={styles.promosList}>
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <View key={`promo-sk-${idx}`} style={[styles.promoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <Animated.View style={[styles.skBlock, { width: 120, height: 18, backgroundColor: colors.skeletonBlock }, animatedPulseStyle]} />
                  <Animated.View style={[styles.skBlock, { width: 85, height: 22, borderRadius: 8, backgroundColor: colors.skeletonBlock }, animatedPulseStyle]} />
                </View>
                <Animated.View style={[styles.skBlock, { width: "90%", height: 14, marginTop: 12, backgroundColor: colors.skeletonBlock }, animatedPulseStyle]} />
                <View style={[styles.cardFooter, { marginTop: 16, borderTopColor: colors.border }]}>
                  <Animated.View style={[styles.skBlock, { width: 140, height: 12, backgroundColor: colors.skeletonBlock }, animatedPulseStyle]} />
                </View>
              </View>
            ))
          ) : promos.length === 0 ? (
            /* EMPTY STATE FOR WAITER */
            <View style={[styles.emptyContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.emptyBg }]}>
                <TicketPercent size={36} color={colors.promoAccent} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textMain, fontWeight: "700" }]}>
                No Active Promo Codes
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                There are currently no active promotional offers or discounts available.
              </Text>
            </View>
          ) : (
            promos.map((promo) => (
              <TouchableOpacity
                key={promo.id}
                activeOpacity={0.8}
                style={[styles.promoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>

                <View style={styles.cardHeader}>
                  <View style={styles.titleRow}>
                    <Tag size={16} color={colors.promoAccent} />
                    <Text style={[styles.promoTitleText, { color: colors.textMain, fontWeight: "700" }]}>
                      {promo.code}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: colors.promoBadgeBg }]}>
                    <Text style={[styles.statusBadgeText, { color: colors.promoAccent, fontWeight: "700" }]}>
                      {promo.discountPercent}% OFF
                    </Text>
                  </View>
                </View>

                <View style={styles.descriptionContainer}>
                  <Text style={[styles.descriptionText, { color: colors.textMain, fontWeight: "500" }]}>
                    {promo.description || `Get ${promo.discountPercent}% off on orders above NPR ${promo.minOrderAmount}`}
                  </Text>
                </View>

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <View style={styles.timeContainer}>
                    <Calendar size={13} color={colors.textMuted} />
                    <Text style={[styles.timeText, { color: colors.textMuted, fontWeight: "600" }]}>
                      Valid till {formatDate(promo.validUntil)}
                    </Text>
                  </View>
                </View>

              </TouchableOpacity>
            ))
          )}
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
  sectionTitle: {
    fontSize: 20,
    letterSpacing: -0.5,
    marginTop: 2,
    marginBottom: 16,
  },
  contentPadding: {
    padding: 16,
  },
  promosList: {
    gap: 14,
  },
  promoCard: {
    borderRadius: 16,
    padding: 16,
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  promoTitleText: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  descriptionContainer: {
    marginTop: 10,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    fontSize: 12,
  },
  skBlock: {
    borderRadius: 4,
  },
  emptyContainer: {
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
})