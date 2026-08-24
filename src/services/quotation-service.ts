import { Quotation, PublicQuotation } from "@/types";

export interface PricingCalculationResult {
  baseCost: number;
  markupPercent: number;
  markupAmount: number;
  sellingPrice: number;
  discountPercent: number;
  discountAmount: number;
  finalCustomerPrice: number;
}

export interface QuotationService {
  getQuotations: (agencyId?: string, tripId?: string) => Promise<Quotation[]>;
  getQuotation: (id: string) => Promise<Quotation | null>;
  getPublicQuotation: (shareToken: string) => Promise<PublicQuotation | null>;
  calculatePricing: (
    baseCost: number,
    markupPercent: number,
    discountPercent: number
  ) => PricingCalculationResult;
}

export const quotationService: QuotationService = {
  async getQuotations(agencyId?: string, tripId?: string): Promise<Quotation[]> {
    await new Promise((res) => setTimeout(res, 50));
    // In a real app, fetches from backend database
    return [];
  },

  async getQuotation(id: string): Promise<Quotation | null> {
    await new Promise((res) => setTimeout(res, 50));
    return null;
  },

  async getPublicQuotation(shareToken: string): Promise<PublicQuotation | null> {
    await new Promise((res) => setTimeout(res, 50));
    return null;
  },

  /**
   * V1 Pricing Engine (Strictly NO GST, NO TAX LINE)
   * Base Cost -> Markup % -> Selling Price -> Discount % -> Final Customer Price
   */
  calculatePricing(
    baseCost: number,
    markupPercent: number,
    discountPercent: number
  ): PricingCalculationResult {
    const safeBase = Math.max(0, baseCost || 0);
    const safeMarkupPct = Math.max(0, markupPercent || 0);
    const safeDiscountPct = Math.max(0, Math.min(100, discountPercent || 0));

    const markupAmount = Math.round((safeBase * safeMarkupPct) / 100);
    const sellingPrice = safeBase + markupAmount;
    const discountAmount = Math.round((sellingPrice * safeDiscountPct) / 100);
    const finalCustomerPrice = Math.max(0, sellingPrice - discountAmount);

    return {
      baseCost: safeBase,
      markupPercent: safeMarkupPct,
      markupAmount,
      sellingPrice,
      discountPercent: safeDiscountPct,
      discountAmount,
      finalCustomerPrice,
    };
  },
};
