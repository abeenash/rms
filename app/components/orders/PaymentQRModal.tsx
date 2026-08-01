import React from "react"
import { Modal, Text, TouchableOpacity, View } from "react-native"
import QRCode from 'react-native-qrcode-svg'

import { Order } from "@/services/orderService"

interface PaymentQRModalProps {
    visible: boolean
    onClose: () => void
    orderData: Order | null
    orderId: string
    grandFinalTotal: number
    tenantSlug?: string | null
    onConfirmPaid: () => void
}

export function PaymentQRModal({
    visible,
    onClose,
    orderData,
    orderId,
    grandFinalTotal,
    tenantSlug,
    onConfirmPaid
}: PaymentQRModalProps) {
    const generateQRString = () => {
        const merchantId = tenantSlug?.toUpperCase() || "LEKALI_SEKUWA_POS01"
        const amount = grandFinalTotal || 0
        const billRef = orderData?.orderNumber || orderId || "ORD-REF"

        return `nepalqr://merchant?id=${merchantId}&amt=${amount}&ref=${billRef}&currency=NPR&name=${encodeURIComponent(tenantSlug || "Merchant")}`
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                <View style={{
                    backgroundColor: '#FFFFFF',
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    padding: 24,
                    alignItems: 'center'
                }}>
                    <View style={{ width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, marginBottom: 20 }} />

                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 2 }}>
                        Scan to Pay
                    </Text>
                    <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
                        {(tenantSlug || "Merchant").toUpperCase()} Terminal
                    </Text>

                    <View style={{
                        padding: 16,
                        backgroundColor: '#F8FAFC',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        marginBottom: 20
                    }}>
                        <QRCode
                            value={generateQRString()}
                            size={200}
                            backgroundColor='#F8FAFC'
                            color='#000000'
                        />
                    </View>

                    <View style={{ width: '100%', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text style={{ color: '#64748B', fontSize: 14 }}>Order ID</Text>
                            <Text style={{ color: '#0F172A', fontWeight: '600', fontSize: 14 }}>#{orderData?.orderNumber || orderId}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: '#64748B', fontSize: 14 }}>Amount Due</Text>
                            <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 16 }}>NPR {grandFinalTotal}</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={{
                                flex: 1,
                                paddingVertical: 14,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: '#CBD5E1',
                                alignItems: 'center'
                            }}
                        >
                            <Text style={{ color: '#475569', fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                onClose()
                                onConfirmPaid()
                            }}
                            style={{
                                flex: 1,
                                paddingVertical: 14,
                                borderRadius: 12,
                                backgroundColor: '#16A34A',
                                alignItems: 'center'
                            }}
                        >
                            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Confirm Paid</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )
}