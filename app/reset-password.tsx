import { useEffect, useRef, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    TextInput,
    TextInputInstance,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "@/components/AppText";
import { useCustomAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { forgotPassword, resetPassword } from "@/services/authService";
import { isNetworkError, NETWORK_OFFLINE_MESSAGE } from "@/utils/networkError";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Clock, Eye, EyeOff, Lock, RotateCcw, ShieldCheck } from "lucide-react-native";

const RESEND_COOLDOWN = 180;

// Formats seconds as "Mm SSs" — e.g. 179 → "2m 59s"
const formatCooldown = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
};

export default function ResetPasswordScreen() {
    const { email } = useLocalSearchParams<{ email: string }>();
    const router = useRouter();
    const { isDark } = useTheme();
    const { showAlert } = useCustomAlert();

    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);
    const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const otpRefs = useRef<(TextInputInstance | null)[]>([]);

    const colors = {
        bg: isDark ? "#0F172A" : "#F8FAFC",
        cardBg: isDark ? "#1E293B" : "#FFFFFF",
        textMain: isDark ? "#FFFFFF" : "#0F172A",
        textMuted: isDark ? "#94A3B8" : "#64748B",
        border: isDark ? "#334155" : "#E2E8F0",
        inputBg: isDark ? "#0F172A" : "#F8FAFC",
        primary: "#6366F1",
        iconBg: isDark ? "#312E81" : "#EEF2FF",
        otpBg: isDark ? "#0F172A" : "#F8FAFC",
        otpFocusBg: isDark ? "#1E293B" : "#FFFFFF",
        success: "#10B981",
    };

    // Resend cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleOtpChange = (value: string, index: number) => {
        const digit = value.replace(/[^0-9]/g, "").slice(-1);
        const updated = [...otp];
        updated[index] = digit;
        setOtp(updated);

        if (digit && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyPress = (key: string, index: number) => {
        if (key === "Backspace" && !otp[index] && index > 0) {
            const updated = [...otp];
            updated[index - 1] = "";
            setOtp(updated);
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleResendOtp = async () => {
        if (cooldown > 0 || isResending) return;
        try {
            setIsResending(true);
            await forgotPassword(email ?? "");
            setCooldown(RESEND_COOLDOWN);
            showAlert("OTP Sent", "A new OTP has been sent to your email.");
        } catch (error: any) {
            if (isNetworkError(error)) {
                showAlert("No Connection", NETWORK_OFFLINE_MESSAGE);
            } else {
                const message = error.response?.data?.message || error.message || "Failed to resend OTP.";
                showAlert("Error", message);
            }
        } finally {
            setIsResending(false);
        }
    };

    const handleResetPassword = async () => {
        const otpCode = otp.join("");

        // Only frontend validation: password confirmation match
        if (newPassword !== confirmPassword) {
            showAlert("Error", "Passwords do not match.");
            return;
        }

        try {
            setIsLoading(true);
            await resetPassword({ email: email ?? "", otp: otpCode, newPassword });
            showAlert(
                "Success",
                "Your password has been reset successfully. Please log in with your new password.",
                [{ text: "Log In", onPress: () => router.replace("/") }]
            );
        } catch (error: any) {
            if (isNetworkError(error)) {
                showAlert("No Connection", NETWORK_OFFLINE_MESSAGE);
            } else {
                const message = error.response?.data?.message || error.message || "Failed to reset password. Please try again.";
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
                        <ShieldCheck size={32} color={colors.primary} />
                    </View>

                    {/* Header */}
                    <AppText style={[styles.title, { color: colors.textMain }]}>Reset Password</AppText>
                    <AppText style={[styles.subtitle, { color: colors.textMuted }]}>
                        Enter the OTP sent to{" "}
                        <AppText style={[styles.emailHighlight, { color: colors.primary }]}>
                            {email}
                        </AppText>{" "}
                        and choose a new password.
                    </AppText>

                    {/* Card */}
                    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>

                        {/* OTP Section */}
                        <AppText style={[styles.sectionLabel, { color: colors.textMain }]}>
                            One-Time Password
                        </AppText>
                        <View style={styles.otpRow}>
                            {otp.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={(ref) => { otpRefs.current[index] = ref; }}
                                    style={[
                                        styles.otpBox,
                                        {
                                            backgroundColor: digit ? colors.otpFocusBg : colors.otpBg,
                                            borderColor: digit ? colors.primary : colors.border,
                                            color: colors.textMain,
                                        },
                                    ]}
                                    value={digit}
                                    onChangeText={(val) => handleOtpChange(val, index)}
                                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    textAlign="center"
                                    selectTextOnFocus
                                />
                            ))}
                        </View>

                        {/* Resend OTP */}
                        <View style={styles.resendRow}>
                            {cooldown > 0 ? (
                                <View style={styles.resendCooldown}>
                                    <Clock size={14} color={colors.textMuted} style={{ marginRight: 5 }} />
                                    <AppText style={[styles.resendCooldownText, { color: colors.textMuted }]}>
                                        Resend in {formatCooldown(cooldown)}
                                    </AppText>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={handleResendOtp}
                                    disabled={isResending}
                                    activeOpacity={0.7}
                                    style={styles.resendButton}
                                >
                                    <RotateCcw size={14} color={isResending ? colors.textMuted : colors.primary} style={{ marginRight: 5 }} />
                                    <AppText
                                        style={[
                                            styles.resendText,
                                            { color: isResending ? colors.textMuted : colors.primary },
                                        ]}
                                    >
                                        {isResending ? "Sending..." : "Resend OTP"}
                                    </AppText>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        {/* New Password */}
                        <AppText style={[styles.inputLabel, { color: colors.textMain }]}>New Password</AppText>
                        <View
                            style={[
                                styles.inputRow,
                                {
                                    backgroundColor: colors.inputBg,
                                    borderColor: isNewPasswordFocused ? colors.primary : colors.border,
                                },
                            ]}
                        >
                            <Lock size={18} color={isNewPasswordFocused ? colors.primary : colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.textInput, { color: colors.textMain }]}
                                placeholder="Enter new password"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry={!showNewPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                onFocus={() => setIsNewPasswordFocused(true)}
                                onBlur={() => setIsNewPasswordFocused(false)}
                            />
                            <TouchableOpacity
                                onPress={() => setShowNewPassword(!showNewPassword)}
                                activeOpacity={0.7}
                                style={styles.eyeButton}
                            >
                                {showNewPassword ? (
                                    <EyeOff size={18} color={colors.textMuted} />
                                ) : (
                                    <Eye size={18} color={colors.textMuted} />
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Confirm Password */}
                        <AppText style={[styles.inputLabel, { color: colors.textMain, marginTop: 16 }]}>
                            Confirm Password
                        </AppText>
                        <View
                            style={[
                                styles.inputRow,
                                {
                                    backgroundColor: colors.inputBg,
                                    borderColor: isConfirmPasswordFocused ? colors.primary : colors.border,
                                },
                            ]}
                        >
                            <Lock size={18} color={isConfirmPasswordFocused ? colors.primary : colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.textInput, { color: colors.textMain }]}
                                placeholder="Re-enter new password"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry={!showConfirmPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                onFocus={() => setIsConfirmPasswordFocused(true)}
                                onBlur={() => setIsConfirmPasswordFocused(false)}
                            />
                            <TouchableOpacity
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                activeOpacity={0.7}
                                style={styles.eyeButton}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff size={18} color={colors.textMuted} />
                                ) : (
                                    <Eye size={18} color={colors.textMuted} />
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Password match indicator */}
                        {confirmPassword.length > 0 && (
                            <AppText
                                style={[
                                    styles.matchIndicator,
                                    { color: newPassword === confirmPassword ? colors.success : "#EF4444" },
                                ]}
                            >
                                {newPassword === confirmPassword ? "Passwords match" : "Passwords do not match"}
                            </AppText>
                        )}

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[styles.button, { marginTop: 24 }, isLoading && styles.buttonDisabled]}
                            activeOpacity={0.8}
                            onPress={handleResetPassword}
                            disabled={isLoading}
                        >
                            <AppText style={styles.buttonText}>
                                {isLoading ? "Resetting..." : "Reset Password"}
                            </AppText>
                            {!isLoading && <ShieldCheck size={20} color="#FFFFFF" style={styles.buttonIcon} />}
                        </TouchableOpacity>
                    </View>
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
        paddingBottom: 40,
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
    emailHighlight: {
        fontWeight: "600",
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
    sectionLabel: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 14,
    },
    otpRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
    },
    otpBox: {
        flex: 1,
        height: 54,
        borderWidth: 1.5,
        borderRadius: 12,
        fontSize: 22,
        fontWeight: "700",
    },
    resendRow: {
        marginTop: 14,
        alignItems: "center",
    },
    resendButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
    },
    resendText: {
        fontSize: 13,
        fontWeight: "600",
    },
    resendCooldown: {
        flexDirection: "row",
        alignItems: "center",
    },
    resendCooldownText: {
        fontSize: 13,
    },
    divider: {
        height: 1,
        marginVertical: 20,
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
    },
    inputIcon: {
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        height: "100%",
    },
    eyeButton: {
        paddingLeft: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    matchIndicator: {
        fontSize: 12,
        fontWeight: "600",
        marginTop: 6,
        marginLeft: 2,
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
});
