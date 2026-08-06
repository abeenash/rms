import NetInfo from "@react-native-community/netinfo";
import { Wifi, WifiOff } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Text from "./AppText";

export const OfflineBanner: React.FC = () => {
    const insets = useSafeAreaInsets()
    const [isConnected, setIsConnected] = useState<boolean | null>(true);
    const [wasOffline, setWasOffline] = useState<boolean>(false);
    const slideAnim = useRef(new Animated.Value(-60)).current; // Initially hidden above screen

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            const online = state.isConnected && state.isInternetReachable !== false;

            if (!online) {
                setIsConnected(false);
                setWasOffline(true);
                // Slide down
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            } else if (online && wasOffline) {
                setIsConnected(true);
                // Hold "Back Online" green banner for 2.5s then slide back up
                setTimeout(() => {
                    Animated.timing(slideAnim, {
                        toValue: -60,
                        duration: 300,
                        useNativeDriver: true,
                    }).start(() => setWasOffline(false));
                }, 2500);
            }
        });

        return () => unsubscribe();
    }, [wasOffline, slideAnim]);

    if (isConnected && !wasOffline) return null;

    const isOfflineMode = !isConnected;

    return (
        <Animated.View
            style={[
                styles.banner,
                {
                    backgroundColor: isOfflineMode ? "#EF4444" : "#10B981",
                    transform: [{ translateY: slideAnim }],
                    paddingTop: insets.top
                },
            ]}
        >
            <View style={styles.contentContainer}>
                {isOfflineMode ? (
                    <>
                        <WifiOff size={16} color="#FFFFFF" />
                        <Text style={styles.bannerText}>NO INTERNET CONNECTION</Text>
                    </>
                ) : (
                    <>
                        <Wifi size={16} color="#FFFFFF" />
                        <Text style={styles.bannerText}>BACK ONLINE</Text>
                    </>
                )}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    banner: {
        zIndex: 9999,
        justifyContent: "center",
        alignItems: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    contentContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
    },
    bannerText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "600",
    },
});