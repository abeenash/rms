import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { presentLiveAlert } from "../services/localNotificationService";
import {
  ServerOrderEventType,
  startOrderEventSocket,
} from "../services/orderEventSocket";

function notificationEventFor(type: ServerOrderEventType) {
    switch (type) {
        case "NEW_ORDER":
            return "order_created" as const;

        case "PAYMENT_CONFIRMED":
            return "payment_confirmed" as const;

        case "ORDER_CANCELLED":
            return "order_cancelled" as const;
    }
}

const WS_ENABLED = process.env.EXPO_PUBLIC_WS_ENABLED === "true";

export function useOrderEventAlerts() {
    const { token, tenantSlug } = useAuth();

    /**
     * Tracks the credential pair the currently live socket was opened for.
     * This ref is intentionally NOT cleared in the effect's cleanup return.
     *
     * Why: React Strict Mode fires cleanup → re-run with identical deps.
     * By keeping this ref set across that cleanup, the re-run can detect that
     * the credentials haven't changed and skip opening a second connection.
     *
     * On a genuine credential change (new login, logout→re-login), the new
     * token/tenantSlug won't match, so Case 3 below fires correctly.
     */
    const activeCredsRef = useRef<{
        token: string;
        tenantSlug: string;
    } | null>(null);

    useEffect(() => {
        // ── WebSocket disabled via env flag ──────────────────────────────
        if (!WS_ENABLED) {
            return;
        }

        // ── No credentials: close any open socket ────────────────────────
        if (!token || !tenantSlug) {
            activeCredsRef.current = null;
            return;
        }

        // ── Same credentials as the live socket: skip re-creation ─────────
        // This covers Strict Mode's cleanup → remount cycle and any other
        // re-render that leaves token/tenantSlug unchanged.
        if (
            activeCredsRef.current?.token === token &&
            activeCredsRef.current?.tenantSlug === tenantSlug
        ) {
            return;
        }

        // ── New credentials: open a fresh socket ──────────────────────────
        activeCredsRef.current = { token, tenantSlug };

        const cleanup = startOrderEventSocket({
            token,
            tenantSlug,

            onEvent: (event) => {
                void presentLiveAlert({
                    event: notificationEventFor(event.type),
                    title: event.title,
                    body: event.message,
                    orderId: event.orderId,
                });
            },

            onConnectionStatusChange: (status) => {
                console.log("FOS live alerts:", status);
            },
        });

        return () => {
            // Tear down the socket when deps change (real credential change or
            // component unmount). Do NOT clear activeCredsRef here — keeping it
            // set lets the Strict Mode remount hit the "same credentials" guard
            // above and avoid opening a second connection.
            cleanup();
        };
    }, [token, tenantSlug]);
}
