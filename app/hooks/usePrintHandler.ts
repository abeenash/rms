import * as Print from 'expo-print'
import { useEffect, useRef } from 'react'
import {
    Alert,
    AppState,
    Platform,
    ToastAndroid
} from 'react-native'

export const showToast = (message: string) => {
    if (Platform.OS === 'android') {
        ToastAndroid.showWithGravity(message, ToastAndroid.SHORT, ToastAndroid.BOTTOM)
    } else {
        Alert.alert("Success", message, [{ text: "OK" }], { cancelable: true })
    }
}

export function usePrintHandler() {
    const appBackgroundTimeRef = useRef<number>(0);
    const pendingToastRef = useRef<string | null>(null);
    const isPrintingRef = useRef<boolean>(false);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'inactive' || nextAppState === 'background') {
                if (isPrintingRef.current) {
                    appBackgroundTimeRef.current = Date.now();
                }
            } else if (nextAppState === 'active') {
                if (isPrintingRef.current && pendingToastRef.current) {
                    const message = pendingToastRef.current;
                    const timeSpent = Date.now() - appBackgroundTimeRef.current;

                    isPrintingRef.current = false;
                    pendingToastRef.current = null;

                    if (timeSpent > 2500) {
                        setTimeout(() => { showToast(message); }, 500);
                    }
                }
            }
        });
        return () => subscription.remove();
    }, []);

    const printDocument = async (html: string, toastMessage: string) => {
        try {
            isPrintingRef.current = true
            pendingToastRef.current = toastMessage
            await Print.printAsync({ html })
        } catch (error) {
            isPrintingRef.current = false
            pendingToastRef.current = null
            console.error("Print execution failed:", error)
        }
    }

    return { printDocument, showToast }
}
