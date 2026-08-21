import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "@/components/AppText";
import { useCustomAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { forgotPassword } from "@/services/authService";
import { isNetworkError, NETWORK_OFFLINE_MESSAGE } from "@/utils/networkError";
import { useRouter } from "expo-router";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react-native";

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState("");
    const [isEmailFocused, setIsEmailFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { isDark } = useTheme();
    const router = useRouter();
    const { showAlert } = useCustomAlert();

    const colors = {
        bg: isDark ? "#0F172A" : "#F8FAFC",
        cardBg: isDark ? "#1E293B" : "#FFFFFF",
        textMain: isDark ? "#FFFFFF" : "#0F172A",
        textMuted: isDark ? "#94A3B8" : "#64748B",
        border: isDark ? "#334155" : "#E2E8F0",
        inputBg: isDark ? "#0F172A" : "#F8FAFC",
        primary: "#6366F1",
        iconBg: isDark ? "#312E81" : "#EEF2FF",
    };

    const handleSendOtp = async () => {
        try {
            setIsLoading(true);
            await forgotPassword(email.trim());
            router.push({ pathname: "/reset-password", params: { email: email.trim() } });
        } catch (error: any) {
            if (isNetworkError(error)) {
                showAlert("No Connection", NETWORK_OFFLINE_MESSAGE);
            } else {
                const message = error.response?.data?.message || error.message || "Failed to send OTP. Please try again.";
                showAlert("Error", message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Back button */}
                    <TouchableOpacity
                        style={[styles.backButton, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <ArrowLeft size={20} color={colors.textMain} />
                    </TouchableOpacity>

                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: colors.iconBg }]}>
                        <Mail size={32} color={colors.primary} />
                    </View>

                    {/* Header */}
                    <AppText style={[styles.title, { color: colors.textMain }]}>Forgot Password?</AppText>
                    <AppText style={[styles.subtitle, { color: colors.textMuted }]}>
                        No worries! Enter your email and we'll send you a one-time password to reset your account.
                    </AppText>

                    {/* Card */}
                    <View
                        style={[
                            styles.card,
                            { backgroundColor: colors.cardBg, borderColor: colors.border },
                        ]}
                    >
                        <AppText style={[styles.inputLabel, { color: colors.textMain }]}>
                            Email Address
                        </AppText>
                        <View
                            style={[
                                styles.inputRow,
                                {
                                    backgroundColor: colors.inputBg,
                                    borderColor: isEmailFocused ? colors.primary : colors.border,
                                },
                            ]}
                        >
                            <Mail size={18} color={isEmailFocused ? colors.primary : colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.textInput, { color: colors.textMain }]}
                                placeholder="yourname@gmail.com"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={email}
                                onChangeText={setEmail}
                                onFocus={() => setIsEmailFocused(true)}
                                onBlur={() => setIsEmailFocused(false)}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            activeOpacity={0.8}
                            onPress={handleSendOtp}
                            disabled={isLoading}
                        >
                            <AppText style={styles.buttonText}>
                                {isLoading ? "Sending OTP..." : "Send OTP"}
                            </AppText>
                            {!isLoading && <ArrowRight size={20} color="#FFFFFF" style={styles.buttonIcon} />}
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                        <AppText style={[styles.footerText, { color: colors.textMuted }]}>
                            Remember your password?{" "}
                            <AppText style={[styles.footerLink, { color: colors.primary }]}>Log In</AppText>
                        </AppText>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    backButton: {
        alignSelf: "flex-start",
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 32,
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        letterSpacing: -0.5,
        marginBottom: 10,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: "center",
        marginBottom: 32,
        paddingHorizontal: 8,
    },
    card: {
        width: "100%",
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        marginBottom: 24,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 6,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        height: 54,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        marginBottom: 20,
    },
    inputIcon: {
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        height: "100%",
    },
    button: {
        height: 54,
        backgroundColor: "#6366F1",
        borderRadius: 12,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.65,
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    buttonIcon: {
        marginLeft: 8,
    },
    footerText: {
        fontSize: 14,
        textAlign: "center",
    },
    footerLink: {
        fontWeight: "600",
    },
});
