import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, useWindowDimensions } from "react-native";

interface Props {
    onAnimationComplete?: () => void;
    isReady: boolean;
}

export function SplashScreenOverlay({ onAnimationComplete, isReady }: Props) {
    const { width: screenWidth } = useWindowDimensions();
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let holdTimer: NodeJS.Timeout;

        if (isReady) {
            holdTimer = setTimeout(() => {
                Animated.timing(slideAnim, {
                    toValue: -screenWidth,
                    duration: 150,
                    useNativeDriver: true,
                }).start(({ finished }) => {
                    if (finished && onAnimationComplete) {
                        onAnimationComplete();
                    }
                });
            }, 1500);
        }
        return () => {
            if (holdTimer) clearTimeout(holdTimer);
            slideAnim.stopAnimation();
        };
    }, [isReady, onAnimationComplete, screenWidth, slideAnim]);

    return (
        <Animated.View
            pointerEvents="auto"
            style={[
                styles.container,
                {
                    transform: [{ translateX: slideAnim }],
                },
            ]}
        >
            <Image
                source={require("../assets/logo_transparent.png")}
                style={styles.logo}
                resizeMode="contain"
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "#6366f1",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 99999,
    },
    logo: {
        width: 240,
        height: 100,
    },
});