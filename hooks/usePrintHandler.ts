import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import {
    Alert,
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
    const printDocument = async (html: string, toastMessage: string) => {
        try {
            await Print.printAsync({ html })
            showToast(toastMessage)
        } catch (error) {
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
