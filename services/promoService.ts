import api from "./api";

export interface PromoCode {
    id: number;
    code: string;
    description: string;
    discountPercent: number;
    maxUses: number;
    currentUses: number;
    minOrderAmount: number;
    maxDiscountAmount: number;
    validFrom: string;
    validUntil: string;
    status: "ACTIVE" | "INACTIVE" | "EXPIRED"
}

export const fetchPromoCodesApi = async (tenantSlug: string): Promise<PromoCode[]> => {
    const response = await api.get(`/public/${tenantSlug}/promo-code/list`)
    return response.data?.data?.content || []
}