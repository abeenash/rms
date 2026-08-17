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
        // Provide a custom factory so we can pass the STOMP subprotocol in the
        // WebSocket upgrade handshake. The server (nginx → Spring) uses the
        // sec-websocket-protocol header to route the connection to the STOMP
        // broker. Without it the upgrade is accepted (101) but the STOMP handler
        // never receives the CONNECT frame, causing a 10 s connection timeout.
        webSocketFactory: () => new WebSocket(WS_URL!, ["v12.stomp", "v11.stomp", "v10.stomp"]),

        // Matches the deployed web client's CONNECT frame.
        connectHeaders: {
            Authorization: `Bearer ${token}`,
        },

        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        // Reconnection is intentionally disabled here. React (useOrderEventAlerts)
        // owns the socket lifecycle and will re-create the socket when the token
        // changes. Enabling reconnectDelay causes the STOMP client to race against
        // React's effect cleanup/remount cycle, producing duplicate connections.
        reconnectDelay: 0,
        connectionTimeout: 10000,

        // React Native compatibility workarounds.
        // forceBinaryWSFrames: true,
        // appendMissingNULLonIncoming: true, — disabled; server sends proper NULL
        // terminators, and leaving this on caused frame mis-parsing that triggered
        // server-side close.

        // Temporary debug logging — remove before release.
        // Logs every STOMP frame so we can see exactly what the server sends
        // before the connection closes on mobile.
        debug: (msg) => {
            // Strip the JWT value from CONNECT frames before logging.
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

        // Only surface "disconnected" for unintentional drops.
        // When we called deactivate() ourselves the status is already
        // being torn down — no need to fire a spurious status update.
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