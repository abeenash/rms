import { Client, IMessage } from "@stomp/stompjs";

const WS_URL = process.env.EXPO_PUBLIC_WS_URL;

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

    const client = new Client({

        webSocketFactory: () => new WebSocket(WS_URL!, ["v12.stomp", "v11.stomp", "v10.stomp"]),

        connectHeaders: {
            Authorization: `Bearer ${token}`,
        },

        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
     
        reconnectDelay: 0,
        connectionTimeout: 10000,
        debug: (msg) => {
            
            const safe = msg.replace(/(Authorization:Bearer\s+)\S+/i, "$1[redacted]");
            console.log("FOS STOMP debug:", safe);
        },
    });

    client.onConnect = () => {
        const destination = `/topic/tenant/${tenantSlug}`;

        console.log("FOS STOMP subscribing:", destination);
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

    client.onWebSocketClose = (event) => {
        console.warn("FOS WebSocket closed:", {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            initiatedByApp: intentionalShutdown,
        });


        if (!intentionalShutdown) {
            onConnectionStatusChange?.("disconnected");
        }
    };

    client.onWebSocketError = () => {
        onConnectionStatusChange?.("error");
        console.warn("FOS live-event WebSocket connection failed.");
    };

    client.onStompError = (frame) => {
        console.warn("FOS STOMP error headers:", frame.headers);
        onConnectionStatusChange?.("error");
    };

    client.activate();

    return () => {
        intentionalShutdown = true;
        console.log("FOS live alerts: effect cleanup requested");
        void client.deactivate();
    };
}