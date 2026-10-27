import { Client, IFrame, IMessage, ReconnectionTimeMode } from "@stomp/stompjs";

const WS_URL = process.env.EXPO_PUBLIC_WS_URL;

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 60000;

const ORDER_EVENT_TYPES = new Set([
    "NEW_ORDER",
    "PAYMENT_CONFIRMED",
    "ORDER_CANCELLED",
]);

export type ServerOrderEventType =
    | "NEW_ORDER"
    | "PAYMENT_CONFIRMED"
    | "ORDER_CANCELLED";

export type ServerOrderEvent = {
    messageId?: string;
    type: ServerOrderEventType;
    title: string;
    message: string;
    orderId: number;
};

type ConnectionStatus = "connected" | "disconnected" | "error";

type StartOrderEventSocketOptions = {
    token: string;
    tenantSlug: string;
    onEvent: (event: ServerOrderEvent) => void;
    onConnectionStatusChange?: (status: ConnectionStatus) => void;
};

function parseOrderEvent(frame: IMessage): ServerOrderEvent | null {
    try {
        const value: unknown = JSON.parse(frame.body);

        if (!value || typeof value !== "object") {
            return null;
        }

        const event = value as Record<string, unknown>;

        if (
            typeof event.type !== "string" ||
            !ORDER_EVENT_TYPES.has(event.type) ||
            typeof event.title !== "string" ||
            typeof event.message !== "string" ||
            typeof event.orderId !== "number" ||
            !Number.isFinite(event.orderId)
        ) {
            return null;
        }

        return {
            messageId: frame.headers["message-id"],
            type: event.type as ServerOrderEventType,
            title: event.title,
            message: event.message,
            orderId: event.orderId,
        };
    } catch {
        return null;
    }
}

export function startOrderEventSocket({
    token,
    tenantSlug,
    onEvent,
    onConnectionStatusChange,
}: StartOrderEventSocketOptions): () => void {
    if (!WS_URL) {
        throw new Error("EXPO_PUBLIC_WS_URL is not configured.");
    }

    const seenMessageIds = new Set<string>();
    let intentionalShutdown = false;

    let isFirstConnect = true;
    let reconnectAttempts = 0;

    const client = new Client({
        webSocketFactory: () =>
            new WebSocket(WS_URL!, ["v12.stomp", "v11.stomp", "v10.stomp"]),

        connectHeaders: {
            Authorization: `Bearer ${token}`,
        },

        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,

        reconnectDelay: BASE_RECONNECT_DELAY,
        reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
        maxReconnectDelay: MAX_RECONNECT_DELAY,

        beforeConnect: async (c) => {
            if (isFirstConnect) {
                isFirstConnect = false;
                return;
            }
            reconnectAttempts++;
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.warn(
                    `RMS STOMP: max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached, giving up`
                );
                onConnectionStatusChange?.("error");
                await c.deactivate();
                return;
            }
            console.log(
                `RMS STOMP: reconnecting (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
            );
        },

        connectionTimeout: 10000,

        debug: (msg) => {
            const safe = msg.replace(
                /(Authorization:Bearer\s+)\S+/i,
                "$1[redacted]"
            );
            console.log("RMS STOMP debug:", safe);
        },
    });

    client.onConnect = () => {
        const destination = `/topic/tenant/${tenantSlug}`;

        console.log("RMS STOMP subscribing:", destination);
        onConnectionStatusChange?.("connected");

        client.subscribe(
            destination,
            (frame) => {
                const event = parseOrderEvent(frame);

                if (!event) {
                    return;
                }

                if (event.messageId) {
                    if (seenMessageIds.has(event.messageId)) {
                        return;
                    }

                    seenMessageIds.add(event.messageId);

                    if (seenMessageIds.size > 100) {
                        const oldestId = seenMessageIds.values().next().value;

                        if (oldestId) {
                            seenMessageIds.delete(oldestId);
                        }
                    }
                }

                onEvent(event);
            },
            {
                id: "sub-0",
                ack: "auto",
            }
        );
    };

    // Use onDisconnect — NOT onWebSocketClose — to avoid interfering
    // with stompjs internal reconnection logic.
    client.onDisconnect = () => {
        if (!intentionalShutdown) {
            console.warn("RMS STOMP: disconnected unexpectedly");
            onConnectionStatusChange?.("disconnected");
        }
    };

    client.onWebSocketError = (event) => {
        console.warn("RMS live-event WebSocket error:", event);
        onConnectionStatusChange?.("error");
    };

    client.onStompError = (frame: IFrame) => {
        console.warn("RMS STOMP error:", frame.headers, frame.body);
        onConnectionStatusChange?.("error");

        const receiptId = frame.headers["receipt-id"];
        if (receiptId) {
            console.warn("RMS STOMP: error in response to receipt:", receiptId);
        }
    };

    client.activate();

    return () => {
        intentionalShutdown = true;
        console.log("RMS live alerts: effect cleanup requested");
        void client.deactivate();
    };
}