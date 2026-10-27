import * as WebBrowser from "expo-web-browser";

// Google Play requires this page to be public and linked from inside the app. It must be live before submitting.
export const PRIVACY_POLICY_URL = "https://zylobrains.com/privacy-policy";

export const openPrivacyPolicy = () => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL).catch(() => { });
