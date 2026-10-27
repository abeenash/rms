import { isRunningInExpoGo } from "expo";
import * as Haptics from "expo-haptics";
import { Platform, ToastAndroid } from "react-native";

export const LIVE_ALERTS_CHANNEL_ID = "live-alerts";

type NotificationsModule = typeof import("expo-notifications");

type NotificationPermissionsStatus = Awaited<
  ReturnType<NotificationsModule["getPermissionsAsync"]>
>;

type LiveAlertEvent =
  | "login_success"
  | "order_created"
  | "payment_confirmed"
  | "order_cancelled";

type LiveAlertInput = {
  event: LiveAlertEvent;
  title: string;
  body: string;
  orderId?: string | number;
};

let Notifications: NotificationsModule | null | undefined; // null = loaded, undefined = not tried

// expo-notifications throws inside Expo Go on Android, so there we fall back to a toast.
// isRunningInExpoGo() is used because it doesn't also match development builds.
const EXPO_GO_ANDROID = Platform.OS === "android" && isRunningInExpoGo();

function loadNotifications(): NotificationsModule | null {
  if (Notifications !== undefined) {
    return Notifications;
  }

  if (EXPO_GO_ANDROID || Platform.OS === "web") {
    Notifications = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require("expo-notifications") as NotificationsModule;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,

        // Android needs true for a heads-up/drop-down alert.
        // The Android channel below has sound: null, so it remains silent.
        shouldPlaySound: Platform.OS === "android",

        shouldSetBadge: false,
      }),
    });
  } catch {
    Notifications = null;
  }

  return Notifications;
}

let channelConfigured = false;

function hasNotificationPermission(
  mod: NotificationsModule,
  permissions: NotificationPermissionsStatus
): boolean {
  if (Platform.OS === "ios") {
    return (
      permissions.ios?.status === mod.IosAuthorizationStatus.AUTHORIZED
    );
  }

  return permissions.granted;
}

export async function configureLiveAlertsChannel(): Promise<void> {
  const mod = loadNotifications();

  if (!mod || Platform.OS !== "android" || channelConfigured) {
    return;
  }

  await mod.setNotificationChannelAsync(LIVE_ALERTS_CHANNEL_ID, {
    name: "Live Alerts",
    description: "New orders, payments, and cancellations",
    importance: mod.AndroidImportance.HIGH,
    sound: null,
    enableVibrate: true,
    vibrationPattern: [0, 250, 120, 250],
    showBadge: false,
  });

  channelConfigured = true;
}

export async function requestLiveAlertsPermission(): Promise<boolean> {
  const mod = loadNotifications();

  if (EXPO_GO_ANDROID) {
    // No system permission exists for Expo Go Android (SDK 53+).
    // presentLiveAlert() falls back to an in-app toast in this case.
    return true;
  }

  if (!mod) {
    return false;
  }

  await configureLiveAlertsChannel();

  const current = await mod.getPermissionsAsync();

  if (hasNotificationPermission(mod, current)) {
    return true;
  }

  const requested = await mod.requestPermissionsAsync();
  return hasNotificationPermission(mod, requested);
}

export async function presentLiveAlert({
  event,
  title,
  body,
  orderId,
}: LiveAlertInput): Promise<boolean> {
  const mod = loadNotifications();

  if (!mod) {
    // Expo Go on Android (SDK 53+) cannot show system notifications.
    // Fall back to a system toast so the user still gets the alert.
    if (Platform.OS === "android") {
      ToastAndroid.show(`${title}${body ? `: ${body}` : ""}`, ToastAndroid.SHORT);
      return true;
    }

    return false;
  }

  try {
    await configureLiveAlertsChannel();

    const permissions = await mod.getPermissionsAsync();

    if (!hasNotificationPermission(mod, permissions)) {
      return false;
    }

    const data: Record<string, string> = { event };

    if (orderId !== undefined) {
      data.orderId = String(orderId);
    }

    await mod.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger:
        Platform.OS === "android"
          ? { channelId: LIVE_ALERTS_CHANNEL_ID }
          : null,
    });

    // iOS has no notification vibration-pattern option.
    // This gives foreground haptic feedback without playing sound.
    if (Platform.OS === "ios") {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    }

    return true;
  } catch (error) {
    console.warn("Could not present live notification:", error);
    return false;
  }
}