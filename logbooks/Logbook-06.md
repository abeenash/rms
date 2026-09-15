# Logbook #6 — August 30, 2026
*Mobile App Intern (React-Native) · Zylobrains*

## 1. Discussion Topics
- EAS profiles: development (dev-client), preview (.apk), production (app-bundle), with per-profile build env.
- Dynamic QR payment flow (practice scope): backend returns the QR payload + transaction UUID; verification, not HTTP success, confirms payment.

## 2. Achievements
- First signed .apk built and tested on a device.
- PaymentQRModal: poll-verify (3s), 5-min session expiry, retry, non-overlapping checks.
- Backend remains the source of truth for amounts, promo and discount.

## 3. Problems (if any)
- Dynamic QR is not production-ready: the merchant must be registered with a connected billing system and provide that payment configuration to us first.
- Keeping the QR scannable on small screens; eSewa stays PENDING long; network failure ≠ failed payment (poll continues).
- Wrong API can slip into builds if env vars aren't inlined per profile.

## 4. Tasks for Next Meeting
- Practice WebSocket / STOMP real-time events, accounting for native-app Origin / access-control-allow-origin constraints.
- Add a local-notification layer for the practice environment.