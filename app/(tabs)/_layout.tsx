import { createMaterialTopTabNavigator, MaterialTopTabNavigationOptions } from "@react-navigation/material-top-tabs"
import {
  ParamListBase,
  TabNavigationState
} from "@react-navigation/native"
import { useRouter, withLayoutContext } from "expo-router"
import { StatusBar } from "expo-status-bar"
import {
  ClipboardList,
  LayoutDashboard,
  Percent,
  Plus
} from "lucide-react-native"
import { TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useTheme } from "../../context/ThemeContext"

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
  const router = useRouter()

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

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          // We route to our menu, but pass 'direct' instead of a numeric table ID
          
          router.push({
            pathname: "/tables/[tableId]",
            params: { tableId: "direct", isDirectOrder: 'true' }
          });
        }}
        style={{
          position: 'absolute',
          bottom: 50,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: '#6366F1',
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.27,
          shadowRadius: 4.65,
          zIndex: 999,
        }}
      >
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}