import React, { createContext, useContext, useState } from "react"
import {
    Dimensions,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native"
import Text from "../components/AppText"
import { useTheme } from "./ThemeContext"

export interface AlertButton {
    text: string
    style?: "default" | "cancel" | "destructive"
    onPress?: () => void
}

export interface AlertOptions {
    title: string
    message?: string
    buttons?: AlertButton[]
    cancelable?: boolean
}

interface AlertContextType {
    showAlert: (title: string, message?: string, buttons?: AlertButton[], options?: { cancelable?: boolean }) => void
    hideAlert: () => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

const { width } = Dimensions.get("window")

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isDark } = useTheme()
    const [visible, setVisible] = useState(false)
    const [config, setConfig] = useState<AlertOptions>({ title: "" })

    const colors = {
        overlayBg: "rgba(0, 0, 0, 0.6)",
        cardBg: isDark ? "#1E293B" : "#FFFFFF",
        titleText: isDark ? "#FFFFFF" : "#0F172A",
        messageText: isDark ? "#FFFFFF" : "#0F172A",
        border: isDark ? "#334155" : "#E2E8F0",
        primaryBtnBg: "#6366F1",
        cancelBtnBg: isDark ? "#334155" : "#E2E8F0",
        cancelBtnText: isDark ? "#FFFFFF" : "#475569",
        destructiveBtnBg: "#DC2626",
    }

    const showAlert = (title: string, message?: string, buttons?: AlertButton[], options?: { cancelable?: boolean }) => {
        setConfig({
            title,
            message,
            buttons: buttons && buttons.length > 0 ? buttons : [{ text: "OK", style: "default" }],
            cancelable: options?.cancelable ?? false,
        })
        setVisible(true)
    }

    const hideAlert = () => {
        setVisible(false)
    }

    const handleButtonPress = (btn: AlertButton) => {
        hideAlert()
        if (btn.onPress) {
            btn.onPress()
        }
    }

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}

            <Modal
                transparent
                visible={visible}
                animationType="fade"
                onRequestClose={hideAlert}
            >
                {config.cancelable ? (
                    <TouchableWithoutFeedback onPress={hideAlert}>
                        <View style={[styles.overlay, { backgroundColor: colors.overlayBg }]}>
                            <TouchableWithoutFeedback>
                                <View style={[styles.alertCard, { backgroundColor: colors.cardBg }]}>
                                    <Text style={[styles.title, { color: colors.titleText }]}>
                                        {config.title}
                                    </Text>
                                    {!!config.message && (
                                        <Text style={[styles.message, { color: colors.messageText }]}>
                                            {config.message}
                                        </Text>
                                    )}
                                    <View
                                        style={[
                                            styles.buttonContainer,
                                            config.buttons && config.buttons.length > 2
                                                ? { flexDirection: "column" }
                                                : { flexDirection: "row" },
                                        ]}
                                    >
                                        {config.buttons?.map((btn, index) => {
                                            const isDestructive = btn.style === "destructive"
                                            const isCancel = btn.style === "cancel"
                                            let btnBg = colors.primaryBtnBg
                                            let textColor = "#FFFFFF"
                                            if (isDestructive) {
                                                btnBg = colors.destructiveBtnBg
                                            } else if (isCancel) {
                                                btnBg = colors.cancelBtnBg
                                                textColor = colors.cancelBtnText
                                            }
                                            return (
                                                <TouchableOpacity
                                                    key={index}
                                                    activeOpacity={0.8}
                                                    onPress={() => handleButtonPress(btn)}
                                                    style={[
                                                        styles.button,
                                                        { backgroundColor: btnBg },
                                                        config.buttons && config.buttons.length <= 2 && { flex: 1 },
                                                    ]}
                                                >
                                                    <Text style={[styles.buttonText, { color: textColor }]}>
                                                        {btn.text}
                                                    </Text>
                                                </TouchableOpacity>
                                            )
                                        })}
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                ) : (
                    <View style={[styles.overlay, { backgroundColor: colors.overlayBg }]}>
                        <View style={[styles.alertCard, { backgroundColor: colors.cardBg }]}>
                            <Text style={[styles.title, { color: colors.titleText }]}>
                                {config.title}
                            </Text>
                            {!!config.message && (
                                <Text style={[styles.message, { color: colors.messageText }]}>
                                    {config.message}
                                </Text>
                            )}
                            <View
                                style={[
                                    styles.buttonContainer,
                                    config.buttons && config.buttons.length > 2
                                        ? { flexDirection: "column" }
                                        : { flexDirection: "row" },
                                ]}
                            >
                                {config.buttons?.map((btn, index) => {
                                    const isDestructive = btn.style === "destructive"
                                    const isCancel = btn.style === "cancel"
                                    let btnBg = colors.primaryBtnBg
                                    let textColor = "#FFFFFF"
                                    if (isDestructive) {
                                        btnBg = colors.destructiveBtnBg
                                    } else if (isCancel) {
                                        btnBg = colors.cancelBtnBg
                                        textColor = colors.cancelBtnText
                                    }
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            activeOpacity={0.8}
                                            onPress={() => handleButtonPress(btn)}
                                            style={[
                                                styles.button,
                                                { backgroundColor: btnBg },
                                                config.buttons && config.buttons.length <= 2 && { flex: 1 },
                                            ]}
                                        >
                                            <Text style={[styles.buttonText, { color: textColor }]}>
                                                {btn.text}
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>
                        </View>
                    </View>
                )}
            </Modal>
        </AlertContext.Provider>
    )
}

export const useCustomAlert = () => {
    const context = useContext(AlertContext)
    if (!context) {
        throw new Error("useCustomAlert must be used within an AlertProvider")
    }
    return context
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    alertCard: {
        width: Math.min(width - 48, 360),
        borderRadius: 20,
        padding: 20,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 20,
    },
    buttonContainer: {
        width: "100%",
        gap: 10,
        justifyContent: "center",
    },
    button: {
        height: 46,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16,
    },
    buttonText: {
        fontSize: 15,
        fontWeight: "600",
    },
})