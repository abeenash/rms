import "../polyfills"

import {
  DMSans_400Regular,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts
} from "@expo-google-fonts/dm-sans"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { useEffect, useState } from "react"
import { OfflineBanner } from "../components/OfflineBanner"
import { SplashScreenOverlay } from "../components/SplashScreenOverlay"
import { AlertProvider } from "../context/AlertContext"
import { AuthProvider, useAuth } from "../context/AuthContext"
import { ThemeProvider } from "../context/ThemeContext"
import { useOrderEventAlerts } from "../hooks/useOrderEventAlerts"
import { TanStackProvider } from "../providers/TanStackProvider"
import { configureLiveAlertsChannel } from "../services/localNotificationService"


SplashScreen.preventAutoHideAsync()

function RootLayoutInner() {
  const [fontsLoaded, fontError] = useFonts({
    "Inter-Regular": DMSans_400Regular,
    "Inter-Semibold": DMSans_600SemiBold,
    "Inter-Bold": DMSans_700Bold
  });

  const { isLoading: authLoading } = useAuth();
  useOrderEventAlerts();
  const [overlayDismissed, setOverlayDismissed] = useState(false);

  const fontsReady = fontsLoaded || fontError;
  const isReady = fontsReady && !authLoading && overlayDismissed;

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync()
    }
  }, [fontsReady])

  useEffect(() => {
    configureLiveAlertsChannel().catch((error) => {
      console.warn("Could not configure live alert channel:", error);
    });
  }, [])

  if (!fontsReady) {
    return null;
  }

  return (
    <>
      {!overlayDismissed && (
        <SplashScreenOverlay
          isReady={!authLoading}
          onAnimationComplete={() => setOverlayDismissed(true)}
        />
      )}
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: '#ababab'
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontSize: 20,
            fontFamily: "Inter-Bold",
          },
        }}>
        <Stack.Screen name="index" options={{ title: "Login", headerShown: false }} />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <TanStackProvider>
        <ThemeProvider>
          <AlertProvider>
            <RootLayoutInner />
          </AlertProvider>
        </ThemeProvider>
      </TanStackProvider>
    </AuthProvider>
  )
}