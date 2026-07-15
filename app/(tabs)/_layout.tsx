import { createMaterialTopTabNavigator, MaterialTopTabNavigationOptions } from "@react-navigation/material-top-tabs"
import {
  ParamListBase,
  TabNavigationState
} from "@react-navigation/native"
import { withLayoutContext } from "expo-router"
import { StatusBar } from "expo-status-bar"
import {
  ClipboardList,
  LayoutDashboard,
  Percent
} from "lucide-react-native"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useTheme } from "../context/ThemeContext"

const { Navigator } = createMaterialTopTabNavigator()

export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  any
>(Navigator)

export default function TopTabsLayout() {
  const insets = useSafeAreaInsets()
  const { isDark } = useTheme()

  const colors = {
    bg: isDark ? "#0F172A" : "#F8FAFC",
    activeText: "#FFFFFF",
    inactiveText: isDark ? "#64748B" : "#94A3B8",
    indicatorBox: "#6366F1",
    border: isDark ? "#1E293B" : "#E2E8F0",
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <StatusBar style={isDark ? "light" : "dark"} translucent backgroundColor="transparent" />

      <MaterialTopTabs
        screenOptions={{
          tabBarActiveTintColor: colors.activeText,
          tabBarInactiveTintColor: colors.inactiveText,
          tabBarShowIcon: true,

          tabBarStyle: {
            backgroundColor: colors.bg,
            height: 64,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            elevation: 0,
            shadowOpacity: 0,
            paddingHorizontal: 6,
          },

          tabBarItemStyle: {
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: 64,
            zIndex: 3,
          },

          tabBarIndicatorStyle: {
            backgroundColor: colors.indicatorBox,
            height: 48,
            borderRadius: 12,
            top: 8,
          },

          tabBarLabelStyle: {
            fontFamily: "Inter-Bold",
            fontSize: 11,
            textTransform: "capitalize",
            margin: 0,
            paddingTop: 2,
          },

          swipeEnabled: true,
        }}
      >
        <MaterialTopTabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color }) => <LayoutDashboard size={18} color={color} />
          }}
        />
        <MaterialTopTabs.Screen
          name="orders"
          options={{
            title: "Orders",
            tabBarIcon: ({ color }) => <ClipboardList size={18} color={color} />
          }}
        />
        <MaterialTopTabs.Screen
          name="promo"
          options={{
            title: "Promos",
            tabBarIcon: ({ color }) => <Percent size={18} color={color} />
          }}
        />
      </MaterialTopTabs>
    </View>
  );
}