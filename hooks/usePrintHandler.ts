import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
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
    const pendingToastRef = useRef<string | null>(null);
    const isPrintingRef = useRef<boolean>(false);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                if (isPrintingRef.current && pendingToastRef.current) {
                    const message = pendingToastRef.current;
                    isPrintingRef.current = false;
                    pendingToastRef.current = null;
                    setTimeout(() => { showToast(message); }, 500);
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

    const shareDocument = async (html: string, toastMessage: string) => {
        try {
            const { uri } = await Print.printToFileAsync({ html })
            await Sharing.shareAsync(uri)
            showToast(toastMessage)
        } catch (error) {
            console.error("Share execution failed:", error)
            showToast("Failed to generate document.")
        }
    }

    return { printDocument, shareDocument, showToast }
}
