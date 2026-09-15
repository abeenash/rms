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

    const activeCredsRef = useRef<{
        token: string;
        tenantSlug: string;
    } | null>(null);

    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!WS_ENABLED) {
            return;
        }

        if (!token || !tenantSlug) {
            activeCredsRef.current = null;
            return;
        }

        if (
            activeCredsRef.current?.token === token &&
            activeCredsRef.current?.tenantSlug === tenantSlug
        ) {
            return;
        }

        activeCredsRef.current = { token, tenantSlug };

        const cleanup = startOrderEventSocket({
            token,
            tenantSlug,

            onEvent: (event) => {
                if (!mountedRef.current) return;
                void presentLiveAlert({
                    event: notificationEventFor(event.type),
                    title: event.title,
                    body: event.message,
                    orderId: event.orderId,
                });
            },

            onConnectionStatusChange: (status) => {
                if (!mountedRef.current) return;
                console.log("FOS live alerts:", status);
            },
        });

        return () => {
            cleanup();
        };
    }, [token, tenantSlug]);
}
