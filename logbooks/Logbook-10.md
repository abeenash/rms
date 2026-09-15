# Logbook #10 — September 13, 2026
*Mobile App Intern (React-Native) · Zylobrains*

## 1. Discussion Topics
- Performance review of API flows: TanStack Query caching (staleTime), idempotency keys against duplicate orders, paginated + debounced catalog search.
- Release readiness: production app-bundle, offline behaviour, live alerts with WebSocket disabled.

## 2. Achievements
- Production app-bundle EAS build configured and validated.
- Regression pass on the signed .apk across login, ordering and promo; dynamic QR and live alerts re-validated within practice scope.

## 3. Problems (if any)
- WebSocket proxy is a single point of failure for live alerts; WS flag fallback + offline banner keep the app healthy.
- Store-submission metadata (icons, permissions, privacy) still pending.

## 4. Tasks for Next Meeting
- Renew WebSocket auth before JWT expiry and extend event types; explore remote push via EAS later.
- Hand over release checklist and coverage report to the supervisor.