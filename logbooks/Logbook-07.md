# Logbook #7 — September 3, 2026
*Mobile App Intern (React-Native) · Zylobrains*

## 1. Discussion Topics
- STOMP-over-WebSocket (@stomp/stompjs) and the subprotocol handshake (v12 / v11 / v10).
- Live event contract: NEW_ORDER, PAYMENT_CONFIRMED, ORDER_CANCELLED on /topic/tenant/{tenantSlug}.
- JWT auth over the socket, reconnection and heartbeat strategy.
- CORS / access-control-allow-origin: web clients are validated by browser Origin, but native apps have no dedicated Origin URL — whitelisting localhost:8081 on the backend was judged risky, so this stays in practice scope.

## 2. Achievements
- orderEventSocket built and exercised in practice: JWT Bearer auth, 10s heartbeat, exponential-backoff reconnect (2s→60s, max 10 attempts), status callbacks.
- Message dedup via STOMP message-id; Authorization redacted from logs.
- useOrderEventAlerts wired at root layout; socket restarts only on credential change.

## 3. Problems (if any)
- Native apps can't present an Origin that satisfies access-control-allow-origin, so the handshake is refused; whitelisting localhost:8081 on the backend is a risk.
- Fixed-interval reconnects hammer the server — needed backoff + attempt cap + intentional shutdown flag.

## 4. Tasks for Next Meeting
- Practice a WebSocket proxy workaround for the Origin / subprotocol checks.
- Build the notification layer for the practice environment.