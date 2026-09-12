import { TaxMode, GstTreatment } from "@prisma/client";

export interface TaxRateItem {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface AgencyTaxProfileData {
  id?: string;
  agencyId: string;
  isGstRegistered: boolean;
  gstin: string | null;
  legalBusinessName: string | null;
  registeredAddress: string | null;
  state: string | null;
  stateCode: string | null;
  defaultTaxMode: TaxMode;
  defaultGstRate: number;
  defaultGstTreatment: GstTreatment;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateAgencyTaxProfilePayload {
  isGstRegistered: boolean;
  gstin?: string | null;
  legalBusinessName?: string | null;
  registeredAddress?: string | null;
  state?: string | null;
  stateCode?: string | null;
  defaultTaxMode: TaxMode;
  defaultGstRate: number;
  defaultGstTreatment: GstTreatment;
}

class TaxClient {
  /**
   * Fetch authenticated agency's tax profile
   */
  async getTaxProfile(): Promise<AgencyTaxProfileData> {
    const res = await fetch("/api/agency/tax-profile", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || "Failed to fetch tax profile.");
    }

    return json.data;
  }

  /**
   * Upsert agency's tax profile defaults
   */
  async updateTaxProfile(payload: UpdateAgencyTaxProfilePayload): Promise<AgencyTaxProfileData> {
    const res = await fetch("/api/agency/tax-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || "Failed to update tax profile.");
    }

    return json.data;
  }

  /**
   * List active tax rate catalog presets
   */
  async listTaxRates(): Promise<TaxRateItem[]> {
    const res = await fetch("/api/tax-rates", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || "Failed to fetch tax rates.");
    }

    return json.data;
  }
}

export const taxClient = new TaxClient();
