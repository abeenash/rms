# Logbook #8 — September 7, 2026
*Mobile App Intern (React-Native) · Zylobrains*

## 1. Discussion Topics
- Local notifications: Android "FOS Live Alerts" channel, iOS haptic instead of sound.
- Expo Go Android (SDK 53+) has no remote push — plan an in-app toast fallback.
- Standalone Node WebSocket proxy: a practice workaround that relays the backend with a browser Origin + STOMP subprotocols.

## 2. Achievements
- localNotificationService: channel setup, permission request, alert presentation with orderId payload; toast fallback on Expo Go Android.
- Notifications fire on order_created / payment_confirmed / order_cancelled and login.
- Proxy: forwards subprotocols, injects Origin, buffers early frames (max 50), 10s connect timeout, clean shutdown.
- Live pipeline gated behind EXPO_PUBLIC_WS_ENABLED per EAS profile.

## 3. Problems (if any)
- Proxy is only a practice workaround, not a production fix — the backend must eventually offer a native-friendly channel instead of browser-style Origin checks.
- Proxy must be hosted separately (Render) with its URL wired per environment; queue overflow drops the oldest frame.

## 4. Tasks for Next Meeting
- Add Jest unit coverage (services, hooks, components, context, utils) and fix native-module mocks.