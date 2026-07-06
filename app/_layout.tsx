import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack
    screenOptions={{
      headerStyle: {
        backgroundColor: '#ababab'
      },
      headerTintColor: "#fff",
      headerTitleStyle: {
        fontSize: 20,
        fontWeight: "bold",
      },
      contentStyle: {
        paddingHorizontal: 5,
        backgroundColor: '#fff'
      }
    }}>
    <Stack.Screen name="index" options={{ title: "Login" }} />
  </Stack>;
}
