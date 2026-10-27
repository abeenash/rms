// Not used yet: dynamic QR payments are parked until the backend's payment endpoints are ready.
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import { Order } from "@/services/orderService";
import {
    initiateEsewaPaymentApi,
    PaymentResponse,
    verifyEsewaPaymentApi,
} from "@/services/paymentService";

interface PaymentQRModalProps {
    visible: boolean;
    onClose: () => void;
    orderData: Order | null;
    orderId: string;
    grandFinalTotal: number;
    tenantSlug?: string | null;
    onConfirmPaid: () => void;
}

type PaymentState =
    | "IDLE"
    | "INITIATING"
    | "WAITING"
    | "VERIFYING"
    | "PAID"
    | "FAILED";

const POLLING_INTERVAL = 3000;
const MAX_POLLING_DURATION = 5 * 60 * 1000; // 5 minutes

export function PaymentQRModal({
    visible,
    onClose,
    orderData,
    orderId,
    grandFinalTotal,
    tenantSlug,
    onConfirmPaid,
}: PaymentQRModalProps) {
    const [paymentState, setPaymentState] =
        useState<PaymentState>("IDLE");

    const [paymentData, setPaymentData] =
        useState<PaymentResponse | null>(null);

    const [statusMessage, setStatusMessage] = useState(
        "Waiting for payment..."
    );

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null);

    const pollingTimeoutRef =
        useRef<ReturnType<typeof setTimeout> | null>(null);

    const pollingStartedAtRef =
        useRef<number | null>(null);

    const isMountedRef =
        useRef(true);

    /**
     * Stop any scheduled polling request.
     */
    const stopPolling = () => {
        if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
        }

        pollingStartedAtRef.current = null;
    };

    /**
     * Reset the payment session when the modal closes.
     */
    const resetPaymentState = () => {
        stopPolling();

        setPaymentState("IDLE");
        setPaymentData(null);
        setStatusMessage("Waiting for payment...");
        setErrorMessage(null);
    };

    /**
     * Initiate or restore the payment transaction.
     *
     * The backend is responsible for:
     * - calculating the actual amount
     * - creating the transaction
     * - returning the dynamic QR payload
     * - returning an existing PENDING transaction if one exists
     */
    const startPaymentInitiation = async () => {
        if (!tenantSlug || !orderId) {
            setErrorMessage(
                "Unable to start payment. Missing order or merchant information."
            );
            setPaymentState("FAILED");
            return;
        }

        try {
            stopPolling();

            setPaymentState("INITIATING");
            setPaymentData(null);
            setErrorMessage(null);
            setStatusMessage("Generating payment QR...");

            const response =
                await initiateEsewaPaymentApi(
                    tenantSlug,
                    {
                        orderId: String(orderId),
                        description: `Order #${orderData?.orderNumber || orderId
                            }`,
                    }
                );

            if (!response.success || !response.data) {
                throw new Error(
                    response.message ||
                    "Unable to generate payment QR."
                );
            }

            if (!response.data.qrString) {
                throw new Error(
                    "Payment provider did not return a QR payload."
                );
            }

            if (!isMountedRef.current) {
                return;
            }

            setPaymentData(response.data);
            setPaymentState("WAITING");
            setStatusMessage(
                "Waiting for customer to scan & pay..."
            );

        } catch (error: any) {
            console.error(
                "Payment initiation error:",
                error
            );

            if (!isMountedRef.current) {
                return;
            }

            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Failed to generate QR code. Please try again.";

            setPaymentState("FAILED");
            setErrorMessage(message);
            setStatusMessage("Unable to generate payment QR.");

        }
    };

    /**
     * Verify the current payment transaction once.
     *
     * IMPORTANT:
     * success === true only means the API request succeeded.
     * The actual payment state is response.data.status.
     */
    const verifyPayment = async () => {
        if (
            !tenantSlug ||
            !paymentData?.transaction_uuid
        ) {
            return;
        }

        try {
            setPaymentState("VERIFYING");
            setStatusMessage(
                "Checking payment status..."
            );

            const response =
                await verifyEsewaPaymentApi(
                    tenantSlug,
                    paymentData.transaction_uuid
                );

            if (!isMountedRef.current) {
                return;
            }

            const paymentStatus =
                response.data?.status;

            switch (paymentStatus) {
                case "COMPLETE":
                    stopPolling();

                    setPaymentState("PAID");
                    setStatusMessage(
                        "Payment verified successfully."
                    );

                    // The backend verification endpoint
                    // should already have marked the payment
                    // as PAID.
                    setTimeout(() => {
                        if (!isMountedRef.current) {
                            return;
                        }

                        onClose();
                        onConfirmPaid();
                    }, 1000);

                    return;

                case "FAILED":
                    stopPolling();

                    setPaymentState("FAILED");
                    setErrorMessage(
                        "The payment was not completed."
                    );
                    setStatusMessage(
                        "Payment failed."
                    );

                    return;

                case "PENDING":
                default:
                    setPaymentState("WAITING");
                    setStatusMessage(
                        "Waiting for customer to complete payment..."
                    );

                    scheduleNextPoll();
                    return;
            }

        } catch (error) {
            console.error(
                "Payment verification error:",
                error
            );

            if (!isMountedRef.current) {
                return;
            }

            /*
             * A temporary network/provider error does NOT mean
             * the payment failed.
             *
             * Therefore we continue polling.
             */
            setPaymentState("WAITING");
            setStatusMessage(
                "Checking payment status..."
            );

            scheduleNextPoll();
        }
    };

    /**
     * Schedule the next verification request.
     *
     * setTimeout is intentionally used instead of setInterval
     * so that verification requests cannot overlap.
     */
    const scheduleNextPoll = () => {
        if (
            !tenantSlug ||
            !paymentData?.transaction_uuid
        ) {
            return;
        }

        if (!pollingStartedAtRef.current) {
            pollingStartedAtRef.current =
                Date.now();
        }

        const elapsed =
            Date.now() -
            pollingStartedAtRef.current;

        if (elapsed >= MAX_POLLING_DURATION) {
            stopPolling();

            setPaymentState("FAILED");
            setErrorMessage(
                "Payment session expired. Please generate a new QR code."
            );
            setStatusMessage(
                "Payment session expired."
            );

            return;
        }

        if (pollingTimeoutRef.current) {
            clearTimeout(
                pollingTimeoutRef.current
            );
        }

        pollingTimeoutRef.current =
            setTimeout(() => {
                pollingTimeoutRef.current = null;

                if (!isMountedRef.current) {
                    return;
                }

                verifyPayment();
            }, POLLING_INTERVAL);
    };

    /**
     * Start payment verification after a successful
     * QR initiation.
     */
    const startPolling = () => {
        stopPolling();

        pollingStartedAtRef.current =
            Date.now();

        verifyPayment();
    };

    /**
     * Start/stop the payment session with modal visibility.
     */
    useEffect(() => {
        isMountedRef.current = true;

        if (!visible) {
            resetPaymentState();
            return;
        }

        startPaymentInitiation();

        return () => {
            isMountedRef.current = false;
            stopPolling();
        };
    }, [
        visible,
        tenantSlug,
        orderId,
    ]);

    /**
     * Once a valid payment transaction has been received,
     * begin verification polling.
     */
    useEffect(() => {
        if (
            !visible ||
            !paymentData?.transaction_uuid ||
            !paymentData?.qrString ||
            paymentState !== "WAITING"
        ) {
            return;
        }

        startPolling();

        return () => {
            stopPolling();
        };
    }, [
        visible,
        paymentData?.transaction_uuid,
        paymentData?.qrString,
    ]);

    const handleClose = () => {
        stopPolling();
        onClose();
    };

    const handleRetry = () => {
        startPaymentInitiation();
    };

    const displayAmount =
        paymentData?.amount ??
        grandFinalTotal.toFixed(2);

    const isLoading =
        paymentState === "INITIATING";

    const isChecking =
        paymentState === "VERIFYING";

    const isPaid =
        paymentState === "PAID";

    const hasError =
        paymentState === "FAILED";

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={handleClose}
        >
            <View
                style={{
                    flex: 1,
                    backgroundColor:
                        "rgba(0,0,0,0.5)",
                    justifyContent: "flex-end",
                }}
            >
                <View
                    style={{
                        backgroundColor: "#FFFFFF",
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        padding: 24,
                        alignItems: "center",
                    }}
                >
                    {/* Handle */}
                    <View
                        style={{
                            width: 40,
                            height: 4,
                            backgroundColor:
                                "#CBD5E1",
                            borderRadius: 2,
                            marginBottom: 20,
                        }}
                    />

                    {/* Title */}
                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: "700",
                            color: "#0F172A",
                            marginBottom: 2,
                        }}
                    >
                        Scan to Pay
                    </Text>

                    <Text
                        style={{
                            fontSize: 13,
                            color: "#64748B",
                            marginBottom: 20,
                        }}
                    >
                        {(tenantSlug || "Merchant").toUpperCase()}{" "}
                        Terminal
                    </Text>

                    {/* QR Code */}
                    <View
                        style={{
                            padding: 16,
                            backgroundColor:
                                "#F8FAFC",
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor:
                                "#E2E8F0",
                            marginBottom: 16,
                            minHeight: 232,
                            width: 232,
                            justifyContent:
                                "center",
                            alignItems: "center",
                        }}
                    >
                        {isLoading ? (
                            <ActivityIndicator
                                size="large"
                                color="#16A34A"
                            />
                        ) : hasError ? (
                            <Text
                                style={{
                                    color: "#EF4444",
                                    fontSize: 13,
                                    textAlign:
                                        "center",
                                    paddingHorizontal: 10,
                                }}
                            >
                                {errorMessage}
                            </Text>
                        ) : paymentData?.qrString ? (
                            <QRCode
                                value={
                                    paymentData.qrString
                                }
                                size={200}
                                backgroundColor="#F8FAFC"
                                color="#000000"
                            />
                        ) : null}
                    </View>

                    {/* Status */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor:
                                isPaid
                                    ? "#DCFCE7"
                                    : hasError
                                        ? "#FEF2F2"
                                        : "#F1F5F9",
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 8,
                            marginBottom: 16,
                        }}
                    >
                        {(isLoading ||
                            isChecking ||
                            paymentState ===
                            "WAITING") && (
                                <ActivityIndicator
                                    size="small"
                                    color="#16A34A"
                                    style={{
                                        marginRight: 8,
                                    }}
                                />
                            )}

                        <Text
                            style={{
                                fontSize: 13,
                                fontWeight: "500",
                                color: isPaid
                                    ? "#15803D"
                                    : hasError
                                        ? "#B91C1C"
                                        : "#475569",
                            }}
                        >
                            {statusMessage}
                        </Text>
                    </View>

                    {/* Payment information */}
                    <View
                        style={{
                            width: "100%",
                            backgroundColor:
                                "#F8FAFC",
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 24,
                        }}
                    >
                        <View
                            style={{
                                flexDirection:
                                    "row",
                                justifyContent:
                                    "space-between",
                                marginBottom: 6,
                            }}
                        >
                            <Text
                                style={{
                                    color:
                                        "#64748B",
                                    fontSize: 14,
                                }}
                            >
                                Order ID
                            </Text>

                            <Text
                                style={{
                                    color:
                                        "#0F172A",
                                    fontWeight:
                                        "600",
                                    fontSize: 14,
                                }}
                            >
                                #
                                {orderData?.orderNumber ||
                                    orderId}
                            </Text>
                        </View>

                        <View
                            style={{
                                flexDirection:
                                    "row",
                                justifyContent:
                                    "space-between",
                            }}
                        >
                            <Text
                                style={{
                                    color:
                                        "#64748B",
                                    fontSize: 14,
                                }}
                            >
                                Amount Due
                            </Text>

                            <Text
                                style={{
                                    color:
                                        "#16A34A",
                                    fontWeight:
                                        "700",
                                    fontSize: 16,
                                }}
                            >
                                NPR {displayAmount}
                            </Text>
                        </View>
                    </View>

                    {/* Actions */}
                    <View
                        style={{
                            flexDirection:
                                "row",
                            gap: 12,
                            width: "100%",
                        }}
                    >
                        <TouchableOpacity
                            onPress={
                                handleClose
                            }
                            style={{
                                flex: 1,
                                paddingVertical:
                                    14,
                                borderRadius:
                                    12,
                                borderWidth: 1,
                                borderColor:
                                    "#CBD5E1",
                                alignItems:
                                    "center",
                            }}
                        >
                            <Text
                                style={{
                                    color:
                                        "#475569",
                                    fontWeight:
                                        "600",
                                }}
                            >
                                Close
                            </Text>
                        </TouchableOpacity>

                        {hasError && (
                            <TouchableOpacity
                                onPress={
                                    handleRetry
                                }
                                disabled={
                                    isLoading
                                }
                                style={{
                                    flex: 1,
                                    paddingVertical:
                                        14,
                                    borderRadius:
                                        12,
                                    backgroundColor:
                                        "#2563EB",
                                    alignItems:
                                        "center",
                                    opacity:
                                        isLoading
                                            ? 0.7
                                            : 1,
                                }}
                            >
                                <Text
                                    style={{
                                        color:
                                            "#FFFFFF",
                                        fontWeight:
                                            "600",
                                    }}
                                >
                                    Retry
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}
