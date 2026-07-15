import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Text } from "./components/AppText";

import { useRouter } from "expo-router";
import { Eye, EyeOff, LogIn, Moon, Sun } from "lucide-react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from "react-native-reanimated";
import { useTheme } from "./context/ThemeContext";

const LoginScreen = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isEmailFocused, setIsEmailFocused] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()

  const handleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsLoading(false);
    router.replace("/dashboard");
  };

  const { isDark, toggleTheme } = useTheme();

  const colors = {
    background: isDark ? "#0F172A" : "#FFFFFF",
    cardBg: isDark ? "#1E293B" : "#FFFFFF",
    cardBorder: isDark ? "#334155" : "#F1F5F9",
    textPrimary: isDark ? "#F8FAFC" : "#0F172A",
    textSecondary: isDark ? "#94A3B8" : "#64748B",
    inputBg: isDark ? "#0F172A" : "#F8FAFC",
    inputBorder: isDark ? "#334155" : "#E2E8F0",
    inputFocusedBorder: "#4F46E5",
    buttonBg: "#4F46E5",
  };

  const headerOpacity = useSharedValue(0);
  const headerTranslateX = useSharedValue(250);

  const cardOpacity = useSharedValue(0);
  const cardTranslateX = useSharedValue(250);

  useEffect(() => {

    headerOpacity.value = withTiming(1, { duration: 150 });
    headerTranslateX.value = withTiming(0, {
      duration: 250,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });


    cardOpacity.value = withTiming(1, { duration: 200 });
    cardTranslateX.value = withDelay(
      40,
      withTiming(0, {
        duration: 280,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      })
    );
  }, []);

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateX: headerTranslateX.value }],
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateX: cardTranslateX.value }],
  }));

  // const handleLogin = () => {
  //   console.log("Logging in with:", email, password);
  // };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <TouchableOpacity
        style={[
          styles.themeToggleButton,
          { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
        ]}
        onPress={toggleTheme}
        activeOpacity={0.7}
      >
        {isDark ? (
          <Sun size={22} color="#FBBF24" />
        ) : (
          <Moon size={22} color="#4F46E5" />
        )}
      </TouchableOpacity>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.headerContainer, animatedHeaderStyle]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Welcome back!
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Log in to your account
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.formContainer,
            animatedCardStyle,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.inputWrapper}>
            <Text
              style={[
                styles.inputLabel,
                { color: colors.textPrimary, fontWeight: "600" },
              ]}
            >
              Email Address
            </Text>
            <TextInput
              style={[
                styles.inputContainerRow,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.textPrimary,
                },
                isEmailFocused && {
                  borderColor: colors.inputFocusedBorder,
                  backgroundColor: isDark ? colors.cardBg : "#FFFFFF",
                },
              ]}
              placeholder="yourname@gmail.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
            />
          </View>

          <View style={styles.inputWrapper}>
            <View style={styles.passwordHeader}>
              <Text
                style={[styles.inputLabel, { color: colors.textPrimary }]}
              >
                Password
              </Text>
              <TouchableOpacity>
                <Text style={styles.forgotPasswordText}>Forgot?</Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.inputContainerRow,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                },
                isPasswordFocused && {
                  borderColor: colors.inputFocusedBorder,
                  backgroundColor: isDark ? colors.cardBg : "#FFFFFF",
                },
              ]}
            >
              <TextInput
                style={[styles.inputField, { color: colors.textPrimary }]}
                placeholder="Enter password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIconWrapper}
                activeOpacity={0.7}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.8}
            onPress={handleLogin}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>Log In</Text>
              <LogIn size={22} color="#FFFFFF" style={styles.buttonIcon} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  themeToggleButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 20,
    right: 24,
    zIndex: 10,
    padding: 8,
    marginTop: 25,
    borderRadius: 50,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  headerContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
  },
  inputContainerRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 54,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  inputField: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  eyeIconWrapper: {
    paddingLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    height: 54,
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonIcon: {
    marginLeft: 1,
  },
});

export default LoginScreen