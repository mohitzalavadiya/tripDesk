import "server-only";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/api";
import {
  CreateRateSheetInput,
  UpdateRateSheetInput,
  RateSheetQueryParams,
} from "@/lib/validation/rate-sheet-schema";
import { RateSheet, Prisma, RateInventoryType } from "@prisma/client";

export interface RateSheetWithRelations extends RateSheet {
  supplier?: { id: string; name: string; supplierCode?: string | null } | null;
  hotel?: { id: string; name: string; city?: string | null } | null;
  vehicle?: { id: string; name: string; type: string } | null;
  activity?: { id: string; name: string; location?: string | null } | null;
}

export interface MatchedRateResult {
  matched: boolean;
  rateSheetId?: string;
  rateSheetNumber?: string | null;
  rateName?: string;
  seasonName?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  currency: string;
  costPrice: number;
  extraAdultRate?: number | null;
  extraChildRate?: number | null;
  ratePerKm?: number | null;
  minimumKm?: number | null;
  totalRate?: number | null;
  extraKmRate?: number | null;
  driverAllowance?: number | null;
  nightAllowance?: number | null;
  adultCost?: number | null;
  childCost?: number | null;
  infantCost?: number | null;
  taxPercentage?: number | null;
  priority: number;
  validFrom?: Date;
  validTo?: Date;
}

export const rateSheetService = {
  /**
   * Generates sequential rate sheet number scoped per agency per calendar year: RAT-YYYY-XXXXX
   */
  async generateNextRateSheetNumber(agencyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RAT-${year}-`;

    const lastRate = await prisma.rateSheet.findFirst({
      where: {
        agencyId,
        rateSheetNumber: { startsWith: prefix },
      },
      orderBy: { rateSheetNumber: "desc" },
      select: { rateSheetNumber: true },
    });

    let nextNumber = 1;
    if (lastRate?.rateSheetNumber) {
      const parts = lastRate.rateSheetNumber.split("-");
      if (parts.length === 3) {
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) {
          nextNumber = lastNum + 1;
        }
      }
    }

    return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
  },

  /**
   * Lists rate sheets with multi-inventory filters and search.
   */
  async listRateSheets(
    agencyId: string,
    params: Partial<RateSheetQueryParams> = {}
  ): Promise<{
    items: RateSheetWithRelations[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.RateSheetWhereInput = {
      agencyId,
      ...(params.includeArchived ? {} : { archivedAt: null }),
      ...(params.inventoryType ? { inventoryType: params.inventoryType } : {}),
      ...(params.supplierId ? { supplierId: params.supplierId } : {}),
      ...(params.hotelId ? { hotelId: params.hotelId } : {}),
      ...(params.vehicleId ? { vehicleId: params.vehicleId } : {}),
      ...(params.activityId ? { activityId: params.activityId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.seasonName
        ? { seasonName: { contains: params.seasonName, mode: "insensitive" } }
        : {}),
    };

    if (params.validDate) {
      where.validFrom = { lte: new Date(params.validDate) };
      where.validTo = { gte: new Date(params.validDate) };
    }

    if (params.search?.trim()) {
      const term = params.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { rateSheetNumber: { contains: term, mode: "insensitive" } },
        { seasonName: { contains: term, mode: "insensitive" } },
        { roomType: { contains: term, mode: "insensitive" } },
        { mealPlan: { contains: term, mode: "insensitive" } },
        { hotel: { name: { contains: term, mode: "insensitive" } } },
        { vehicle: { name: { contains: term, mode: "insensitive" } } },
        { activity: { name: { contains: term, mode: "insensitive" } } },
        { supplier: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.rateSheet.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [params.sortBy || "createdAt"]: params.sortOrder || "desc",
        },
        include: {
          supplier: { select: { id: true, name: true, supplierCode: true } },
          hotel: { select: { id: true, name: true, city: true } },
          vehicle: { select: { id: true, name: true, type: true } },
          activity: { select: { id: true, name: true, location: true } },
        },
      }),
      prisma.rateSheet.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  /**
   * Retrieves single rate sheet with all inventory and supplier relations.
   */
  async getRateSheetById(agencyId: string, id: string): Promise<RateSheetWithRelations | null> {
    return prisma.rateSheet.findFirst({
      where: { id, agencyId },
      include: {
        supplier: { select: { id: true, name: true, supplierCode: true } },
        hotel: { select: { id: true, name: true, city: true } },
        vehicle: { select: { id: true, name: true, type: true } },
        activity: { select: { id: true, name: true, location: true } },
      },
    });
  },

  /**
   * Validates if there's any conflicting overlapping rate with identical priority.
   */
  async validateRateOverlap(
    agencyId: string,
    data: {
      inventoryType: RateInventoryType;
      hotelId?: string | null;
      vehicleId?: string | null;
      activityId?: string | null;
      roomType?: string | null;
      mealPlan?: string | null;
      validFrom: Date;
      validTo: Date;
      priority?: number;
    },
    excludeId?: string
  ): Promise<{ hasOverlap: boolean; overlappingRates: RateSheet[] }> {
    const where: Prisma.RateSheetWhereInput = {
      agencyId,
      inventoryType: data.inventoryType,
      archivedAt: null,
      status: "ACTIVE",
      ...(excludeId ? { id: { not: excludeId } } : {}),
      ...(data.hotelId ? { hotelId: data.hotelId } : {}),
      ...(data.vehicleId ? { vehicleId: data.vehicleId } : {}),
      ...(data.activityId ? { activityId: data.activityId } : {}),
      ...(data.roomType ? { roomType: data.roomType } : {}),
      ...(data.mealPlan ? { mealPlan: data.mealPlan } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      // Overlap condition: (StartA <= EndB) and (EndA >= StartB)
      validFrom: { lte: new Date(data.validTo) },
      validTo: { gte: new Date(data.validFrom) },
    };

    const overlappingRates = await prisma.rateSheet.findMany({
      where,
      take: 5,
    });

    return {
      hasOverlap: overlappingRates.length > 0,
      overlappingRates,
    };
  },

  /**
   * Creates a new Rate Sheet record.
   */
  async createRateSheet(agencyId: string, data: CreateRateSheetInput): Promise<RateSheet> {
    const rateSheetNumber = await this.generateNextRateSheetNumber(agencyId);

    return prisma.rateSheet.create({
      data: {
        agencyId,
        rateSheetNumber,
        name: data.name,
        inventoryType: data.inventoryType,
        supplierId: data.supplierId || null,
        hotelId: data.hotelId || null,
        vehicleId: data.vehicleId || null,
        activityId: data.activityId || null,
        roomType: data.roomType || null,
        mealPlan: data.mealPlan || null,
        seasonName: data.seasonName || null,
        validFrom: new Date(data.validFrom),
        validTo: new Date(data.validTo),
        currency: data.currency || "INR",
        costPrice: new Prisma.Decimal(data.costPrice ?? 0),
        extraAdultRate: data.extraAdultRate !== undefined && data.extraAdultRate !== null ? new Prisma.Decimal(data.extraAdultRate) : null,
        extraChildRate: data.extraChildRate !== undefined && data.extraChildRate !== null ? new Prisma.Decimal(data.extraChildRate) : null,
        vehiclePricingType: data.vehiclePricingType || null,
        ratePerKm: data.ratePerKm !== undefined && data.ratePerKm !== null ? new Prisma.Decimal(data.ratePerKm) : null,
        minimumKm: data.minimumKm !== undefined && data.minimumKm !== null ? new Prisma.Decimal(data.minimumKm) : null,
        totalRate: data.totalRate !== undefined && data.totalRate !== null ? new Prisma.Decimal(data.totalRate) : null,
        extraKmRate: data.extraKmRate !== undefined && data.extraKmRate !== null ? new Prisma.Decimal(data.extraKmRate) : null,
        driverAllowance: data.driverAllowance !== undefined && data.driverAllowance !== null ? new Prisma.Decimal(data.driverAllowance) : null,
        nightAllowance: data.nightAllowance !== undefined && data.nightAllowance !== null ? new Prisma.Decimal(data.nightAllowance) : null,
        tollIncluded: data.tollIncluded ?? false,
        parkingIncluded: data.parkingIncluded ?? false,
        adultCost: data.adultCost !== undefined && data.adultCost !== null ? new Prisma.Decimal(data.adultCost) : null,
        childCost: data.childCost !== undefined && data.childCost !== null ? new Prisma.Decimal(data.childCost) : null,
        infantCost: data.infantCost !== undefined && data.infantCost !== null ? new Prisma.Decimal(data.infantCost) : null,
        taxPercentage: data.taxPercentage !== undefined && data.taxPercentage !== null ? new Prisma.Decimal(data.taxPercentage) : new Prisma.Decimal(0),
        priority: data.priority ?? 0,
        status: data.status || "ACTIVE",
        sourceType: data.sourceType || "MANUAL",
        notes: data.notes || null,
        internalNotes: data.internalNotes || null,
      },
    });
  },

  /**
   * Updates an existing Rate Sheet.
   */
  async updateRateSheet(
    agencyId: string,
    id: string,
    data: UpdateRateSheetInput
  ): Promise<RateSheet> {
    const existing = await prisma.rateSheet.findFirst({
      where: { id, agencyId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError("Rate Sheet");
    }

    return prisma.rateSheet.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.inventoryType !== undefined ? { inventoryType: data.inventoryType } : {}),
        ...(data.supplierId !== undefined ? { supplierId: data.supplierId || null } : {}),
        ...(data.hotelId !== undefined ? { hotelId: data.hotelId || null } : {}),
        ...(data.vehicleId !== undefined ? { vehicleId: data.vehicleId || null } : {}),
        ...(data.activityId !== undefined ? { activityId: data.activityId || null } : {}),
        ...(data.roomType !== undefined ? { roomType: data.roomType || null } : {}),
        ...(data.mealPlan !== undefined ? { mealPlan: data.mealPlan || null } : {}),
        ...(data.seasonName !== undefined ? { seasonName: data.seasonName || null } : {}),
        ...(data.validFrom !== undefined ? { validFrom: new Date(data.validFrom) } : {}),
        ...(data.validTo !== undefined ? { validTo: new Date(data.validTo) } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.costPrice !== undefined ? { costPrice: new Prisma.Decimal(data.costPrice) } : {}),
        ...(data.extraAdultRate !== undefined ? { extraAdultRate: data.extraAdultRate !== null ? new Prisma.Decimal(data.extraAdultRate) : null } : {}),
        ...(data.extraChildRate !== undefined ? { extraChildRate: data.extraChildRate !== null ? new Prisma.Decimal(data.extraChildRate) : null } : {}),
        ...(data.vehiclePricingType !== undefined ? { vehiclePricingType: data.vehiclePricingType || null } : {}),
        ...(data.ratePerKm !== undefined ? { ratePerKm: data.ratePerKm !== null ? new Prisma.Decimal(data.ratePerKm) : null } : {}),
        ...(data.minimumKm !== undefined ? { minimumKm: data.minimumKm !== null ? new Prisma.Decimal(data.minimumKm) : null } : {}),
        ...(data.totalRate !== undefined ? { totalRate: data.totalRate !== null ? new Prisma.Decimal(data.totalRate) : null } : {}),
        ...(data.extraKmRate !== undefined ? { extraKmRate: data.extraKmRate !== null ? new Prisma.Decimal(data.extraKmRate) : null } : {}),
        ...(data.driverAllowance !== undefined ? { driverAllowance: data.driverAllowance !== null ? new Prisma.Decimal(data.driverAllowance) : null } : {}),
        ...(data.nightAllowance !== undefined ? { nightAllowance: data.nightAllowance !== null ? new Prisma.Decimal(data.nightAllowance) : null } : {}),
        ...(data.tollIncluded !== undefined ? { tollIncluded: data.tollIncluded } : {}),
        ...(data.parkingIncluded !== undefined ? { parkingIncluded: data.parkingIncluded } : {}),
        ...(data.adultCost !== undefined ? { adultCost: data.adultCost !== null ? new Prisma.Decimal(data.adultCost) : null } : {}),
        ...(data.childCost !== undefined ? { childCost: data.childCost !== null ? new Prisma.Decimal(data.childCost) : null } : {}),
        ...(data.infantCost !== undefined ? { infantCost: data.infantCost !== null ? new Prisma.Decimal(data.infantCost) : null } : {}),
        ...(data.taxPercentage !== undefined ? { taxPercentage: new Prisma.Decimal(data.taxPercentage) } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.sourceType !== undefined ? { sourceType: data.sourceType } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
        ...(data.internalNotes !== undefined ? { internalNotes: data.internalNotes || null } : {}),
      },
    });
  },

  /**
   * Soft archives a Rate Sheet.
   */
  async archiveRateSheet(agencyId: string, id: string): Promise<RateSheet> {
    const existing = await prisma.rateSheet.findFirst({
      where: { id, agencyId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError("Rate Sheet");
    }

    return prisma.rateSheet.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        status: "INACTIVE",
      },
    });
  },

  // ═════════════════════════════════════════════════════════════════════
  // RATE LOOKUP ENGINE (DETERMINISTIC PRIORITY RESOLUTION)
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Resolves the applicable Hotel purchase rate for a travel date.
   * Priority rule:
   * 1. Exact roomType + mealPlan match
   * 2. Highest priority number
   * 3. Narrowest validity window (validTo - validFrom)
   * 4. Most recently created
   */
  async getApplicableHotelRate(
    agencyId: string,
    hotelId: string,
    travelDate: Date | string,
    roomType?: string | null,
    mealPlan?: string | null
  ): Promise<MatchedRateResult> {
    const dateObj = new Date(travelDate);

    const candidates = await prisma.rateSheet.findMany({
      where: {
        agencyId,
        hotelId,
        inventoryType: "HOTEL",
        status: "ACTIVE",
        archivedAt: null,
        validFrom: { lte: dateObj },
        validTo: { gte: dateObj },
      },
      include: {
        supplier: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    if (candidates.length === 0) {
      return { matched: false, currency: "INR", costPrice: 0, priority: 0 };
    }

    // Deterministic ranking score:
    // +1000 points if roomType matches exactly
    // +500 points if mealPlan matches exactly
    // - (validity window in days) as tie-breaker (narrower window is preferred)
    const ranked = candidates.map((c) => {
      let score = (c.priority || 0) * 10000;
      if (roomType && c.roomType && c.roomType.toLowerCase() === roomType.toLowerCase()) {
        score += 2000;
      }
      if (mealPlan && c.mealPlan && c.mealPlan.toLowerCase() === mealPlan.toLowerCase()) {
        score += 1000;
      }
      const daysSpan = Math.max(
        1,
        (new Date(c.validTo).getTime() - new Date(c.validFrom).getTime()) / (1000 * 60 * 60 * 24)
      );
      // Small deduction for broader spans to favor narrow date promotions
      score -= Math.min(500, daysSpan);

      return { candidate: c, score };
    });

    ranked.sort((a, b) => b.score - a.score);
    const selected = ranked[0].candidate;

    return {
      matched: true,
      rateSheetId: selected.id,
      rateSheetNumber: selected.rateSheetNumber,
      rateName: selected.name,
      seasonName: selected.seasonName,
      supplierId: selected.supplierId,
      supplierName: selected.supplier?.name,
      currency: selected.currency,
      costPrice: Number(selected.costPrice),
      extraAdultRate: selected.extraAdultRate ? Number(selected.extraAdultRate) : null,
      extraChildRate: selected.extraChildRate ? Number(selected.extraChildRate) : null,
      taxPercentage: selected.taxPercentage ? Number(selected.taxPercentage) : null,
      priority: selected.priority,
      validFrom: selected.validFrom,
      validTo: selected.validTo,
    };
  },

  /**
   * Resolves the applicable Vehicle purchase rate for a travel date.
   */
  async getApplicableVehicleRate(
    agencyId: string,
    vehicleId: string,
    travelDate: Date | string,
    pricingType?: string | null
  ): Promise<MatchedRateResult> {
    const dateObj = new Date(travelDate);

    const candidates = await prisma.rateSheet.findMany({
      where: {
        agencyId,
        vehicleId,
        inventoryType: "VEHICLE",
        status: "ACTIVE",
        archivedAt: null,
        validFrom: { lte: dateObj },
        validTo: { gte: dateObj },
      },
      include: {
        supplier: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    if (candidates.length === 0) {
      return { matched: false, currency: "INR", costPrice: 0, priority: 0 };
    }

    const ranked = candidates.map((c) => {
      let score = (c.priority || 0) * 10000;
      if (pricingType && c.vehiclePricingType === pricingType) {
        score += 2000;
      }
      const daysSpan = Math.max(
        1,
        (new Date(c.validTo).getTime() - new Date(c.validFrom).getTime()) / (1000 * 60 * 60 * 24)
      );
      score -= Math.min(500, daysSpan);

      return { candidate: c, score };
    });

    ranked.sort((a, b) => b.score - a.score);
    const selected = ranked[0].candidate;

    return {
      matched: true,
      rateSheetId: selected.id,
      rateSheetNumber: selected.rateSheetNumber,
      rateName: selected.name,
      seasonName: selected.seasonName,
      supplierId: selected.supplierId,
      supplierName: selected.supplier?.name,
      currency: selected.currency,
      costPrice: Number(selected.costPrice),
      ratePerKm: selected.ratePerKm ? Number(selected.ratePerKm) : null,
      minimumKm: selected.minimumKm ? Number(selected.minimumKm) : null,
      totalRate: selected.totalRate ? Number(selected.totalRate) : null,
      extraKmRate: selected.extraKmRate ? Number(selected.extraKmRate) : null,
      driverAllowance: selected.driverAllowance ? Number(selected.driverAllowance) : null,
      nightAllowance: selected.nightAllowance ? Number(selected.nightAllowance) : null,
      taxPercentage: selected.taxPercentage ? Number(selected.taxPercentage) : null,
      priority: selected.priority,
      validFrom: selected.validFrom,
      validTo: selected.validTo,
    };
  },

  /**
   * Resolves the applicable Activity purchase rate for a travel date.
   */
  async getApplicableActivityRate(
    agencyId: string,
    activityId: string,
    travelDate: Date | string
  ): Promise<MatchedRateResult> {
    const dateObj = new Date(travelDate);

    const candidates = await prisma.rateSheet.findMany({
      where: {
        agencyId,
        activityId,
        inventoryType: "ACTIVITY",
        status: "ACTIVE",
        archivedAt: null,
        validFrom: { lte: dateObj },
        validTo: { gte: dateObj },
      },
      include: {
        supplier: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    if (candidates.length === 0) {
      return { matched: false, currency: "INR", costPrice: 0, priority: 0 };
    }

    const ranked = candidates.map((c) => {
      let score = (c.priority || 0) * 10000;
      const daysSpan = Math.max(
        1,
        (new Date(c.validTo).getTime() - new Date(c.validFrom).getTime()) / (1000 * 60 * 60 * 24)
      );
      score -= Math.min(500, daysSpan);

      return { candidate: c, score };
    });

    ranked.sort((a, b) => b.score - a.score);
    const selected = ranked[0].candidate;

    return {
      matched: true,
      rateSheetId: selected.id,
      rateSheetNumber: selected.rateSheetNumber,
      rateName: selected.name,
      seasonName: selected.seasonName,
      supplierId: selected.supplierId,
      supplierName: selected.supplier?.name,
      currency: selected.currency,
      costPrice: Number(selected.costPrice),
      adultCost: selected.adultCost ? Number(selected.adultCost) : null,
      childCost: selected.childCost ? Number(selected.childCost) : null,
      infantCost: selected.infantCost ? Number(selected.infantCost) : null,
      taxPercentage: selected.taxPercentage ? Number(selected.taxPercentage) : null,
      priority: selected.priority,
      validFrom: selected.validFrom,
      validTo: selected.validTo,
    };
  },
};
