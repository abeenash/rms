import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const LIVE_ALERTS_CHANNEL_ID = "fos-live-alerts";

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

// Must be set once, as soon as this module is imported.
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

let channelConfigured = false;

function hasNotificationPermission(
  permissions: Notifications.NotificationPermissionsStatus
): boolean {
  if (Platform.OS === "ios") {
    return (
      permissions.ios?.status ===
      Notifications.IosAuthorizationStatus.AUTHORIZED
    );
  }

  return permissions.granted;
}

export async function configureLiveAlertsChannel(): Promise<void> {
  if (Platform.OS !== "android" || channelConfigured) {
    return;
  }

  await Notifications.setNotificationChannelAsync(LIVE_ALERTS_CHANNEL_ID, {
    name: "FOS Live Alerts",
    description: "New orders, payments, and cancellations",
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
    enableVibrate: true,
    vibrationPattern: [0, 250, 120, 250],
    showBadge: false,
  });

  channelConfigured = true;
}

export async function requestLiveAlertsPermission(): Promise<boolean> {
  await configureLiveAlertsChannel();

  const current = await Notifications.getPermissionsAsync();

  if (hasNotificationPermission(current)) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return hasNotificationPermission(requested);
}

export async function presentLiveAlert({
  event,
  title,
  body,
  orderId,
}: LiveAlertInput): Promise<boolean> {
  try {
    await configureLiveAlertsChannel();

    const permissions = await Notifications.getPermissionsAsync();

    if (!hasNotificationPermission(permissions)) {
      return false;
    }

    const data: Record<string, string> = { event };

    if (orderId !== undefined) {
      data.orderId = String(orderId);
    }

    await Notifications.scheduleNotificationAsync({
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