import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { useEffect } from "react"
import { ThemeProvider } from "./context/ThemeContext"

import {
  DMSans_400Regular,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts
} from "@expo-google-fonts/dm-sans"


SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Inter-Regular": DMSans_400Regular,
    "Inter-Semibold": DMSans_600SemiBold,
    "Inter-Bold": DMSans_700Bold
  });


  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])


  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
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
    </ThemeProvider>
  )
}