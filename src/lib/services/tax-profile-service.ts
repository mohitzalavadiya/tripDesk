import "server-only";
import prisma from "@/lib/prisma";
import { Prisma, TaxMode, GstTreatment } from "@prisma/client";
import { UpdateAgencyTaxProfileInput } from "@/lib/validation/tax-schema";
import { ValidationError } from "@/lib/api/errors";

export interface TaxRateDto {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface AgencyTaxProfileDto {
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
  createdAt?: Date;
  updatedAt?: Date;
}

export class TaxProfileService {
  /**
   * Retrieves the Tax Profile for an agency.
   * If no profile exists yet, returns neutral default configuration.
   */
  async getAgencyTaxProfile(agencyId: string): Promise<AgencyTaxProfileDto> {
    const profile = await prisma.agencyTaxProfile.findUnique({
      where: { agencyId },
    });

    if (!profile) {
      return {
        agencyId,
        isGstRegistered: false,
        gstin: null,
        legalBusinessName: null,
        registeredAddress: null,
        state: null,
        stateCode: null,
        defaultTaxMode: TaxMode.EXCLUSIVE,
        defaultGstRate: 0,
        defaultGstTreatment: GstTreatment.INTRA_STATE,
      };
    }

    return {
      id: profile.id,
      agencyId: profile.agencyId,
      isGstRegistered: profile.isGstRegistered,
      gstin: profile.gstin,
      legalBusinessName: profile.legalBusinessName,
      registeredAddress: profile.registeredAddress,
      state: profile.state,
      stateCode: profile.stateCode,
      defaultTaxMode: profile.defaultTaxMode,
      defaultGstRate: Number(profile.defaultGstRate),
      defaultGstTreatment: profile.defaultGstTreatment,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Upserts the Tax Profile for an agency with referential integrity checks against the active tax rate catalog.
   */
  async updateAgencyTaxProfile(
    agencyId: string,
    data: UpdateAgencyTaxProfileInput
  ): Promise<AgencyTaxProfileDto> {
    const rateNumber = Number(data.defaultGstRate);

    // Validate that the chosen default rate exists in active catalog (unless 0 rate)
    if (rateNumber > 0) {
      const activeRate = await prisma.taxRate.findFirst({
        where: {
          rate: new Prisma.Decimal(rateNumber),
          isActive: true,
        },
      });

      if (!activeRate) {
        throw new ValidationError(
          `Selected default tax rate (${rateNumber}%) is not available in the active tax rate catalog.`
        );
      }
    }

    const updated = await prisma.agencyTaxProfile.upsert({
      where: { agencyId },
      update: {
        isGstRegistered: data.isGstRegistered,
        gstin: data.isGstRegistered ? data.gstin : null,
        legalBusinessName: data.legalBusinessName,
        registeredAddress: data.registeredAddress,
        state: data.state,
        stateCode: data.stateCode,
        defaultTaxMode: data.defaultTaxMode,
        defaultGstRate: new Prisma.Decimal(rateNumber),
        defaultGstTreatment: data.defaultGstTreatment,
      },
      create: {
        agencyId,
        isGstRegistered: data.isGstRegistered,
        gstin: data.isGstRegistered ? data.gstin : null,
        legalBusinessName: data.legalBusinessName,
        registeredAddress: data.registeredAddress,
        state: data.state,
        stateCode: data.stateCode,
        defaultTaxMode: data.defaultTaxMode,
        defaultGstRate: new Prisma.Decimal(rateNumber),
        defaultGstTreatment: data.defaultGstTreatment,
      },
    });

    return {
      id: updated.id,
      agencyId: updated.agencyId,
      isGstRegistered: updated.isGstRegistered,
      gstin: updated.gstin,
      legalBusinessName: updated.legalBusinessName,
      registeredAddress: updated.registeredAddress,
      state: updated.state,
      stateCode: updated.stateCode,
      defaultTaxMode: updated.defaultTaxMode,
      defaultGstRate: Number(updated.defaultGstRate),
      defaultGstTreatment: updated.defaultGstTreatment,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Lists all active rates from the DB-backed tax rate catalog.
   */
  async listActiveTaxRates(): Promise<TaxRateDto[]> {
    const rates = await prisma.taxRate.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { rate: "asc" }],
    });

    return rates.map((r) => ({
      id: r.id,
      name: r.name,
      rate: Number(r.rate),
      isDefault: r.isDefault,
      isActive: r.isActive,
      displayOrder: r.displayOrder,
    }));
  }
}

export const taxProfileService = new TaxProfileService();
