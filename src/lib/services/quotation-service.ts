import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  Quotation,
  QuotationItem,
  QuotationProposalItem,
  QuotationPaymentMilestone,
  QuotationStatus,
  ProposalItemType,
  TaxMode,
  GstTreatment,
  Prisma,
} from "@prisma/client";
import { tripCostingService } from "./trip-costing-service";
import { communicationService } from "./communication-service";
import { taxService } from "./tax-service";
import { taxProfileService } from "./tax-profile-service";
import { internalNotificationService } from "./internal-notification-service";
import {
  CreateQuotationInput,
  UpdateQuotationInput,
  QuotationQueryInput,
  GenerateTripQuotationInput,
  AcceptQuotationInput,
  RequestChangesInput,
  QuotationTier,
} from "@/lib/validation/quotation-schema";
import {
  CreateQuotationItemInput,
  UpdateQuotationItemInput,
} from "@/lib/validation/quotation-item-schema";
import {
  CreateProposalItemInput,
  UpdateProposalItemInput,
  ReorderProposalItemsInput,
} from "@/lib/validation/proposal-item-schema";
import {
  CreatePaymentMilestoneInput,
  UpdatePaymentMilestoneInput,
  GeneratePaymentScheduleInput,
} from "@/lib/validation/payment-milestone-schema";

export type QuotationWithRelations = Quotation & {
  agency?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    logo?: string | null;
    address?: string | null;
  } | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  };
  trip: {
    id: string;
    title: string;
    tripNumber: string;
    startDate: Date;
    endDate: Date;
    status: string;
    travelers: Array<{
      id: string;
      name: string;
      type: string;
    }>;
    itineraryItems: Array<{
      id: string;
      dayNumber: number;
      date?: Date | null;
      title: string;
      description?: string | null;
      location?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      sortOrder: number;
    }>;
    tripDestinations?: Array<{
      id: string;
      sequence: number;
      destination: {
        id: string;
        name: string;
        cityArea?: string | null;
        state?: string | null;
        country?: string | null;
      };
    }>;
    tripHotels?: Array<{
      id: string;
      checkIn: Date;
      checkOut: Date;
      roomType: string;
      mealPlan?: string | null;
      rooms: number;
      notes?: string | null;
      hotel?: {
        id: string;
        name: string;
        city?: string | null;
        category?: string | null;
      } | null;
    }>;
    tripVehicles?: Array<{
      id: string;
      vehicleName: string;
      vehicleType?: string | null;
      startDate?: Date | null;
      endDate?: Date | null;
      notes?: string | null;
      vehicle?: {
        id: string;
        name: string;
        type: string;
        capacity?: number | null;
      } | null;
    }>;
    tripActivities?: Array<{
      id: string;
      name: string;
      date?: Date | null;
      description?: string | null;
      notes?: string | null;
      activity?: {
        id: string;
        name: string;
        location?: string | null;
      } | null;
    }>;
  };
  items: QuotationItem[];
  proposalItems: QuotationProposalItem[];
  paymentMilestones: QuotationPaymentMilestone[];
};

export const quotationService = {
  /**
   * Helper to generate unique sequential Quotation Number per agency per year
   */
  async generateNextQuotationNumber(agencyId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const db = tx || prisma;
    const currentYear = new Date().getFullYear();
    const prefix = `QT-${currentYear}-`;

    const lastQuote = await db.quotation.findFirst({
      where: {
        agencyId,
        quotationNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        quotationNumber: "desc",
      },
      select: {
        quotationNumber: true,
      },
    });

    let nextSeq = 1;
    if (lastQuote?.quotationNumber) {
      const parts = lastQuote.quotationNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(5, "0")}`;
  },

  /**
   * Resolves and validates the effective tax configuration (taxRate, taxMode, gstTreatment)
   * for a quotation or package option against the active TaxRate catalog and Agency Tax Profile defaults.
   */
  async resolveQuotationTaxConfig(
    agencyId: string,
    input: {
      taxRate?: Prisma.Decimal | number | null;
      taxPercentage?: Prisma.Decimal | number | null;
      taxMode?: TaxMode | null;
      gstTreatment?: GstTreatment | null;
    },
    fallback?: {
      taxRate?: Prisma.Decimal | number | null;
      taxPercentage?: Prisma.Decimal | number | null;
      taxMode?: TaxMode | null;
      gstTreatment?: GstTreatment | null;
    }
  ): Promise<{ taxRate: number; taxMode: TaxMode; gstTreatment: GstTreatment }> {
    let rawTaxRate: number | undefined = undefined;
    if (input.taxRate !== undefined && input.taxRate !== null) {
      rawTaxRate = Number(input.taxRate);
    } else if (input.taxPercentage !== undefined && input.taxPercentage !== null) {
      rawTaxRate = Number(input.taxPercentage);
    }

    let taxMode = input.taxMode ?? undefined;
    let gstTreatment = input.gstTreatment ?? undefined;

    // If any tax setting is missing, check fallback or AgencyTaxProfile
    if (rawTaxRate === undefined || !taxMode || !gstTreatment) {
      if (fallback) {
        if (rawTaxRate === undefined) {
          rawTaxRate = Number(fallback.taxRate ?? fallback.taxPercentage ?? 0);
        }
        if (!taxMode && fallback.taxMode) {
          taxMode = fallback.taxMode;
        }
        if (!gstTreatment && fallback.gstTreatment) {
          gstTreatment = fallback.gstTreatment;
        }
      }

      // If still missing, load Agency Tax Profile defaults
      if (rawTaxRate === undefined || !taxMode || !gstTreatment) {
        const agencyProfile = await taxProfileService.getAgencyTaxProfile(agencyId);
        if (rawTaxRate === undefined) {
          rawTaxRate = agencyProfile.defaultGstRate ?? 0;
        }
        if (!taxMode) {
          taxMode = agencyProfile.defaultTaxMode ?? TaxMode.EXCLUSIVE;
        }
        if (!gstTreatment) {
          gstTreatment = agencyProfile.defaultGstTreatment ?? GstTreatment.INTRA_STATE;
        }
      }
    }

    const effectiveRate = Number(rawTaxRate || 0);
    const effectiveMode = taxMode || TaxMode.EXCLUSIVE;
    const effectiveTreatment = gstTreatment || GstTreatment.INTRA_STATE;

    // Validate rate against active catalog (unless 0% rate)
    if (effectiveRate > 0) {
      const activeRate = await prisma.taxRate.findFirst({
        where: {
          rate: new Prisma.Decimal(effectiveRate),
          isActive: true,
        },
      });
      if (!activeRate) {
        throw new Error(
          `Selected tax rate (${effectiveRate}%) is not available in the active tax rate catalog.`
        );
      }
    }

    return {
      taxRate: effectiveRate,
      taxMode: effectiveMode,
      gstTreatment: effectiveTreatment,
    };
  },

  /**
   * List Quotations with pagination and search
   */
  async getQuotations(
    agencyId: string,
    query: Partial<QuotationQueryInput> = {}
  ): Promise<{ data: QuotationWithRelations[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { search, status, customerId, tripId, sortBy = "createdAt", sortOrder = "desc" } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.QuotationWhereInput = {
      agencyId,
      archivedAt: null,
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(tripId ? { tripId } : {}),
      ...(search
        ? {
            OR: [
              { quotationNumber: { contains: search, mode: "insensitive" } },
              { title: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { customer: { phone: { contains: search, mode: "insensitive" } } },
              { trip: { title: { contains: search, mode: "insensitive" } } },
              { trip: { tripNumber: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          agency: {
            select: { id: true, name: true, phone: true, email: true, logo: true, address: true },
          },
          customer: {
            select: { id: true, name: true, phone: true, email: true },
          },
          trip: {
            select: {
              id: true,
              title: true,
              tripNumber: true,
              startDate: true,
              endDate: true,
              status: true,
              travelers: { select: { id: true, name: true, type: true } },
              tripDestinations: {
                select: {
                  id: true,
                  sequence: true,
                  destination: {
                    select: {
                      id: true,
                      name: true,
                      cityArea: true,
                      state: true,
                      country: true,
                    },
                  },
                },
                orderBy: { sequence: "asc" },
              },
              itineraryItems: {
                select: {
                  id: true,
                  dayNumber: true,
                  date: true,
                  title: true,
                  description: true,
                  location: true,
                  startTime: true,
                  endTime: true,
                  sortOrder: true,
                },
                orderBy: { sortOrder: "asc" },
              },
              tripHotels: {
                select: {
                  id: true,
                  checkIn: true,
                  checkOut: true,
                  roomType: true,
                  mealPlan: true,
                  rooms: true,
                  notes: true,
                  hotel: {
                    select: {
                      id: true,
                      name: true,
                      city: true,
                      category: true,
                    },
                  },
                },
                orderBy: { checkIn: "asc" },
              },
              tripVehicles: {
                select: {
                  id: true,
                  vehicleName: true,
                  vehicleType: true,
                  startDate: true,
                  endDate: true,
                  notes: true,
                  vehicle: {
                    select: {
                      id: true,
                      name: true,
                      type: true,
                      capacity: true,
                    },
                  },
                },
                orderBy: { startDate: "asc" },
              },
              tripActivities: {
                select: {
                  id: true,
                  name: true,
                  date: true,
                  description: true,
                  notes: true,
                  activity: {
                    select: {
                      id: true,
                      name: true,
                      location: true,
                    },
                  },
                },
                orderBy: { date: "asc" },
              },
            },
          },
          items: {
            orderBy: { sortOrder: "asc" },
          },
          proposalItems: {
            orderBy: { sortOrder: "asc" },
          },
          paymentMilestones: {
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
    ]);

    return {
      data: data as QuotationWithRelations[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get single Quotation by ID
   */
  async getQuotation(agencyId: string, id: string): Promise<QuotationWithRelations | null> {
    const quote = await prisma.quotation.findFirst({
      where: { id, agencyId, archivedAt: null },
      include: {
        agency: {
          select: { id: true, name: true, phone: true, email: true, logo: true, address: true },
        },
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        trip: {
          select: {
            id: true,
            title: true,
            tripNumber: true,
            startDate: true,
            endDate: true,
            status: true,
            travelers: { select: { id: true, name: true, type: true } },
            tripDestinations: {
              select: {
                id: true,
                sequence: true,
                destination: {
                  select: {
                    id: true,
                    name: true,
                    cityArea: true,
                    state: true,
                    country: true,
                  },
                },
              },
              orderBy: { sequence: "asc" },
            },
            itineraryItems: {
              select: {
                id: true,
                dayNumber: true,
                date: true,
                title: true,
                description: true,
                location: true,
                startTime: true,
                endTime: true,
                sortOrder: true,
              },
              orderBy: { sortOrder: "asc" },
            },
            tripHotels: {
              select: {
                id: true,
                checkIn: true,
                checkOut: true,
                roomType: true,
                mealPlan: true,
                rooms: true,
                notes: true,
                hotel: {
                  select: {
                    id: true,
                    name: true,
                    city: true,
                    category: true,
                  },
                },
              },
              orderBy: { checkIn: "asc" },
            },
            tripVehicles: {
              select: {
                id: true,
                vehicleName: true,
                vehicleType: true,
                startDate: true,
                endDate: true,
                notes: true,
                vehicle: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    capacity: true,
                  },
                },
              },
              orderBy: { startDate: "asc" },
            },
            tripActivities: {
              select: {
                id: true,
                name: true,
                date: true,
                description: true,
                notes: true,
                activity: {
                  select: {
                    id: true,
                    name: true,
                    location: true,
                  },
                },
              },
              orderBy: { date: "asc" },
            },
          },
        },
        items: {
          orderBy: { sortOrder: "asc" },
        },
        proposalItems: {
          orderBy: { sortOrder: "asc" },
        },
        paymentMilestones: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return quote as QuotationWithRelations | null;
  },

  /**
   * Get all Quotations for a specific trip
   */
  async getQuotationsByTripId(agencyId: string, tripId: string): Promise<QuotationWithRelations[]> {
    const quotations = await prisma.quotation.findMany({
      where: { agencyId, tripId, archivedAt: null },
      orderBy: { version: "desc" },
      include: {
        agency: {
          select: { id: true, name: true, phone: true, email: true, logo: true, address: true },
        },
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        trip: {
          select: {
            id: true,
            title: true,
            tripNumber: true,
            startDate: true,
            endDate: true,
            status: true,
            travelers: { select: { id: true, name: true, type: true } },
            tripDestinations: {
              select: {
                id: true,
                sequence: true,
                destination: {
                  select: {
                    id: true,
                    name: true,
                    cityArea: true,
                    state: true,
                    country: true,
                  },
                },
              },
              orderBy: { sequence: "asc" },
            },
            itineraryItems: {
              select: {
                id: true,
                dayNumber: true,
                date: true,
                title: true,
                description: true,
                location: true,
                startTime: true,
                endTime: true,
                sortOrder: true,
              },
              orderBy: { sortOrder: "asc" },
            },
            tripHotels: {
              select: {
                id: true,
                checkIn: true,
                checkOut: true,
                roomType: true,
                mealPlan: true,
                rooms: true,
                notes: true,
                hotel: {
                  select: {
                    id: true,
                    name: true,
                    city: true,
                    category: true,
                  },
                },
              },
              orderBy: { checkIn: "asc" },
            },
            tripVehicles: {
              select: {
                id: true,
                vehicleName: true,
                vehicleType: true,
                startDate: true,
                endDate: true,
                notes: true,
                vehicle: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    capacity: true,
                  },
                },
              },
              orderBy: { startDate: "asc" },
            },
            tripActivities: {
              select: {
                id: true,
                name: true,
                date: true,
                description: true,
                notes: true,
                activity: {
                  select: {
                    id: true,
                    name: true,
                    location: true,
                  },
                },
              },
              orderBy: { date: "asc" },
            },
          },
        },
        items: {
          orderBy: { sortOrder: "asc" },
        },
        proposalItems: {
          orderBy: { sortOrder: "asc" },
        },
        paymentMilestones: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return quotations as QuotationWithRelations[];
  },

  /**
   * Create a manual Quotation with calculated amounts
   */
  async createQuotation(agencyId: string, data: CreateQuotationInput): Promise<QuotationWithRelations> {
    const quotationNumber = await this.generateNextQuotationNumber(agencyId);
    const shareToken = crypto.randomBytes(16).toString("hex");

    const taxConfig = await this.resolveQuotationTaxConfig(agencyId, {
      taxRate: data.taxRate,
      taxPercentage: data.taxPercentage,
      taxMode: data.taxMode,
      gstTreatment: data.gstTreatment,
    });

    const subtotal = Number(data.subtotal || 0);
    const markupPct = Number(data.markupPercentage || 0);
    const markupAmount = data.markupAmount !== undefined ? Number(data.markupAmount) : Math.round((subtotal * markupPct) / 100);
    const baseWithMarkup = subtotal + markupAmount;

    const discountPct = Number(data.discountPercentage || 0);
    const discountAmount = data.discountAmount !== undefined ? Number(data.discountAmount) : Math.round((baseWithMarkup * discountPct) / 100);
    const afterDiscount = Math.max(0, baseWithMarkup - discountAmount);

    const taxResult = taxService.calculate({
      amount: afterDiscount,
      taxRate: taxConfig.taxRate,
      taxMode: taxConfig.taxMode,
      gstTreatment: taxConfig.gstTreatment,
    });

    const selectedTier = data.tier || "Deluxe";
    let quotationTitle = data.title;
    if (!quotationTitle) {
      quotationTitle = `Proposal for Trip - ${selectedTier}`;
    } else if (!quotationTitle.includes(selectedTier)) {
      quotationTitle = `${quotationTitle} - ${selectedTier}`;
    }

    const quote = await prisma.quotation.create({
      data: {
        agencyId,
        tripId: data.tripId,
        customerId: data.customerId,
        quotationNumber,
        version: 1,
        tier: selectedTier,
        title: quotationTitle,
        status: data.status || QuotationStatus.DRAFT,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        currency: data.currency || "INR",
        subtotal: new Prisma.Decimal(subtotal),
        markupPercentage: new Prisma.Decimal(markupPct),
        markupAmount: new Prisma.Decimal(markupAmount),
        discountPercentage: new Prisma.Decimal(discountPct),
        discountAmount: new Prisma.Decimal(discountAmount),
        taxPercentage: taxResult.taxRate,
        taxAmount: taxResult.taxAmount,
        taxableAmount: taxResult.taxableAmount,
        taxRate: taxResult.taxRate,
        taxMode: taxResult.taxMode,
        gstTreatment: taxResult.gstTreatment,
        cgstAmount: taxResult.cgstAmount,
        sgstAmount: taxResult.sgstAmount,
        igstAmount: taxResult.igstAmount,
        finalAmount: taxResult.finalAmount,
        proposalSubtitle: data.proposalSubtitle,
        customerMessage: data.customerMessage,
        inclusionsIntro: data.inclusionsIntro,
        exclusionsIntro: data.exclusionsIntro,
        paymentTerms: data.paymentTerms,
        cancellationPolicy: data.cancellationPolicy,
        importantNotes: data.importantNotes,
        internalNotes: data.internalNotes,
        terms: data.terms,
        shareToken,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        trip: {
          select: {
            id: true,
            title: true,
            tripNumber: true,
            startDate: true,
            endDate: true,
            status: true,
            travelers: { select: { id: true, name: true, type: true } },
            tripDestinations: {
              select: {
                id: true,
                sequence: true,
                destination: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: { sequence: "asc" },
            },
            itineraryItems: {
              select: {
                id: true,
                dayNumber: true,
                date: true,
                title: true,
                description: true,
                location: true,
                startTime: true,
                endTime: true,
                sortOrder: true,
              },
              orderBy: { sortOrder: "asc" },
            },
            tripHotels: {
              select: {
                id: true,
                roomType: true,
                mealPlan: true,
                checkIn: true,
                checkOut: true,
                rooms: true,
                notes: true,
                hotel: {
                  select: {
                    id: true,
                    name: true,
                    city: true,
                    category: true,
                  },
                },
              },
              orderBy: { checkIn: "asc" },
            },
            tripVehicles: {
              select: {
                id: true,
                vehicleName: true,
                vehicleType: true,
                startDate: true,
                endDate: true,
                notes: true,
                vehicle: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    capacity: true,
                  },
                },
              },
              orderBy: { startDate: "asc" },
            },
            tripActivities: {
              select: {
                id: true,
                name: true,
                date: true,
                description: true,
                notes: true,
                activity: {
                  select: {
                    id: true,
                    name: true,
                    location: true,
                  },
                },
              },
              orderBy: { date: "asc" },
            },
          },
        },
        items: {
          orderBy: { sortOrder: "asc" },
        },
        proposalItems: {
          orderBy: { sortOrder: "asc" },
        },
        paymentMilestones: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return quote as QuotationWithRelations;
  },

  /**
   * Update Quotation details & pricing rules
   */
  async updateQuotation(agencyId: string, id: string, data: UpdateQuotationInput): Promise<QuotationWithRelations> {
    const existing = await prisma.quotation.findFirst({
      where: { id, agencyId, archivedAt: null },
      include: { items: true },
    });

    if (!existing) {
      throw new Error("Quotation not found.");
    }

    const taxConfig = await this.resolveQuotationTaxConfig(
      agencyId,
      {
        taxRate: data.taxRate,
        taxPercentage: data.taxPercentage,
        taxMode: data.taxMode,
        gstTreatment: data.gstTreatment,
      },
      {
        taxRate: existing.taxRate,
        taxPercentage: existing.taxPercentage,
        taxMode: existing.taxMode,
        gstTreatment: existing.gstTreatment,
      }
    );

    const subtotal = data.subtotal !== undefined ? Number(data.subtotal) : Number(existing.subtotal);
    const markupPct = data.markupPercentage !== undefined ? Number(data.markupPercentage) : Number(existing.markupPercentage);
    const markupAmount = data.markupAmount !== undefined ? Number(data.markupAmount) : Math.round((subtotal * markupPct) / 100);
    const baseWithMarkup = subtotal + markupAmount;

    const discountPct = data.discountPercentage !== undefined ? Number(data.discountPercentage) : Number(existing.discountPercentage);
    const discountAmount = data.discountAmount !== undefined ? Number(data.discountAmount) : Math.round((baseWithMarkup * discountPct) / 100);
    const afterDiscount = Math.max(0, baseWithMarkup - discountAmount);

    const taxResult = taxService.calculate({
      amount: afterDiscount,
      taxRate: taxConfig.taxRate,
      taxMode: taxConfig.taxMode,
      gstTreatment: taxConfig.gstTreatment,
    });

    let titleToUpdate = data.title;
    if (data.tier !== undefined && data.title === undefined && existing.title) {
      const tierRegex = / - (Deluxe|Ultra Deluxe|Premium)$/i;
      if (tierRegex.test(existing.title)) {
        titleToUpdate = existing.title.replace(tierRegex, ` - ${data.tier}`);
      } else {
        titleToUpdate = `${existing.title} - ${data.tier}`;
      }
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        ...(titleToUpdate !== undefined ? { title: titleToUpdate } : {}),
        ...(data.tier !== undefined ? { tier: data.tier } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.validUntil !== undefined ? { validUntil: data.validUntil ? new Date(data.validUntil) : null } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        subtotal: new Prisma.Decimal(subtotal),
        markupPercentage: new Prisma.Decimal(markupPct),
        markupAmount: new Prisma.Decimal(markupAmount),
        discountPercentage: new Prisma.Decimal(discountPct),
        discountAmount: new Prisma.Decimal(discountAmount),
        taxPercentage: taxResult.taxRate,
        taxAmount: taxResult.taxAmount,
        taxableAmount: taxResult.taxableAmount,
        taxRate: taxResult.taxRate,
        taxMode: taxResult.taxMode,
        gstTreatment: taxResult.gstTreatment,
        cgstAmount: taxResult.cgstAmount,
        sgstAmount: taxResult.sgstAmount,
        igstAmount: taxResult.igstAmount,
        finalAmount: taxResult.finalAmount,
        ...(data.proposalSubtitle !== undefined ? { proposalSubtitle: data.proposalSubtitle } : {}),
        ...(data.customerMessage !== undefined ? { customerMessage: data.customerMessage } : {}),
        ...(data.inclusionsIntro !== undefined ? { inclusionsIntro: data.inclusionsIntro } : {}),
        ...(data.exclusionsIntro !== undefined ? { exclusionsIntro: data.exclusionsIntro } : {}),
        ...(data.paymentTerms !== undefined ? { paymentTerms: data.paymentTerms } : {}),
        ...(data.cancellationPolicy !== undefined ? { cancellationPolicy: data.cancellationPolicy } : {}),
        ...(data.importantNotes !== undefined ? { importantNotes: data.importantNotes } : {}),
        ...(data.customerFeedback !== undefined ? { customerFeedback: data.customerFeedback } : {}),
        ...(data.internalNotes !== undefined ? { internalNotes: data.internalNotes } : {}),
        ...(data.terms !== undefined ? { terms: data.terms } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        trip: {
          select: {
            id: true,
            title: true,
            tripNumber: true,
            startDate: true,
            endDate: true,
            status: true,
            travelers: { select: { id: true, name: true, type: true } },
            tripDestinations: {
              select: {
                id: true,
                sequence: true,
                destination: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: { sequence: "asc" },
            },
            itineraryItems: {
              select: {
                id: true,
                dayNumber: true,
                date: true,
                title: true,
                description: true,
                location: true,
                startTime: true,
                endTime: true,
                sortOrder: true,
              },
              orderBy: { sortOrder: "asc" },
            },
            tripHotels: {
              select: {
                id: true,
                roomType: true,
                mealPlan: true,
                checkIn: true,
                checkOut: true,
                rooms: true,
                notes: true,
                hotel: {
                  select: {
                    id: true,
                    name: true,
                    city: true,
                    category: true,
                  },
                },
              },
              orderBy: { checkIn: "asc" },
            },
            tripVehicles: {
              select: {
                id: true,
                vehicleName: true,
                vehicleType: true,
                startDate: true,
                endDate: true,
                notes: true,
                vehicle: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    capacity: true,
                  },
                },
              },
              orderBy: { startDate: "asc" },
            },
            tripActivities: {
              select: {
                id: true,
                name: true,
                date: true,
                description: true,
                notes: true,
                activity: {
                  select: {
                    id: true,
                    name: true,
                    location: true,
                  },
                },
              },
              orderBy: { date: "asc" },
            },
          },
        },
        items: {
          orderBy: { sortOrder: "asc" },
        },
        proposalItems: {
          orderBy: { sortOrder: "asc" },
        },
        paymentMilestones: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    // Synchronize percentage-based payment milestones with updated finalAmount
    await this.syncPaymentMilestones(id, Number(taxResult.finalAmount));

    const refreshed = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        trip: {
          select: {
            id: true,
            title: true,
            tripNumber: true,
            startDate: true,
            endDate: true,
            status: true,
            travelers: { select: { id: true, name: true, type: true } },
            tripDestinations: {
              select: {
                id: true,
                sequence: true,
                destination: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: { sequence: "asc" },
            },
            itineraryItems: {
              select: {
                id: true,
                dayNumber: true,
                date: true,
                title: true,
                description: true,
                location: true,
                startTime: true,
                endTime: true,
                sortOrder: true,
              },
              orderBy: { sortOrder: "asc" },
            },
            tripHotels: {
              select: {
                id: true,
                roomType: true,
                mealPlan: true,
                checkIn: true,
                checkOut: true,
                rooms: true,
                notes: true,
                hotel: {
                  select: {
                    id: true,
                    name: true,
                    city: true,
                    category: true,
                  },
                },
              },
              orderBy: { checkIn: "asc" },
            },
            tripVehicles: {
              select: {
                id: true,
                vehicleName: true,
                vehicleType: true,
                startDate: true,
                endDate: true,
                notes: true,
                vehicle: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    capacity: true,
                  },
                },
              },
              orderBy: { startDate: "asc" },
            },
            tripActivities: {
              select: {
                id: true,
                name: true,
                date: true,
                description: true,
                notes: true,
                activity: {
                  select: {
                    id: true,
                    name: true,
                    location: true,
                  },
                },
              },
              orderBy: { date: "asc" },
            },
          },
        },
        items: {
          orderBy: { sortOrder: "asc" },
        },
        proposalItems: {
          orderBy: { sortOrder: "asc" },
        },
        paymentMilestones: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return (refreshed || updated) as QuotationWithRelations;
  },

  /**
   * Soft delete / archive Quotation
   */
  async deleteQuotation(agencyId: string, id: string): Promise<boolean> {
    const existing = await prisma.quotation.findFirst({
      where: { id, agencyId, archivedAt: null },
    });

    if (!existing) {
      throw new Error("Quotation not found.");
    }

    await prisma.quotation.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    return true;
  },

  /**
   * Generate a Quotation Snapshot from Trip's current live items
   */
  async generateQuotationFromTrip(
    agencyId: string,
    tripId: string,
    options?: GenerateTripQuotationInput
  ): Promise<QuotationWithRelations> {
    const costing = await tripCostingService.calculateTripCosting(agencyId, tripId);
    if (!costing) {
      throw new Error("Trip costing could not be calculated or trip was not found.");
    }
    const quotationNumber = await this.generateNextQuotationNumber(agencyId);
    const shareToken = crypto.randomBytes(16).toString("hex");

    const taxConfig = await this.resolveQuotationTaxConfig(agencyId, {
      taxRate: options?.taxRate,
      taxPercentage: options?.taxPercentage,
      taxMode: options?.taxMode,
      gstTreatment: options?.gstTreatment,
    });

    const subtotal = costing.subtotal;
    const markupPct = options?.markupPercentage ?? 10;
    const markupAmount = Math.round((subtotal * markupPct) / 100);
    const grossPackageAmount = subtotal + markupAmount;

    const discountPct = options?.discountPercentage ?? 0;
    const discountAmount = Math.round((grossPackageAmount * discountPct) / 100);
    const afterDiscount = Math.max(0, grossPackageAmount - discountAmount);

    const taxResult = taxService.calculate({
      amount: afterDiscount,
      taxRate: taxConfig.taxRate,
      taxMode: taxConfig.taxMode,
      gstTreatment: taxConfig.gstTreatment,
    });
    const finalAmount = Number(taxResult.finalAmount);

    // Build itemized RateSheet base snapshot (without line-level markup)
    const itemsToCreate: Array<Prisma.QuotationItemCreateWithoutQuotationInput> = [];
    let sortIdx = 0;

    for (const h of costing.hotels) {
      const itemCost = Number(h.totalCost);
      const roomsQty = h.rooms || 1;
      const unitRate = Math.round(itemCost / roomsQty);
      itemsToCreate.push({
        type: "HOTEL",
        sourceType: "TRIP_HOTEL",
        sourceId: h.id,
        name: `${h.hotelName} (${h.roomType})`,
        description: `${h.rooms} room(s), ${h.nights} night(s) stay${h.mealPlan ? ` • ${h.mealPlan}` : ""}`,
        quantity: roomsQty,
        unit: "rooms",
        unitPrice: new Prisma.Decimal(unitRate),
        costPrice: new Prisma.Decimal(itemCost),
        markupPercentage: new Prisma.Decimal(0),
        sellingPrice: new Prisma.Decimal(itemCost),
        totalPrice: new Prisma.Decimal(itemCost),
        sortOrder: sortIdx++,
      });
    }

    for (const v of costing.vehicles) {
      const itemCost = Number(v.totalCost);
      itemsToCreate.push({
        type: "VEHICLE",
        sourceType: "TRIP_VEHICLE",
        sourceId: v.id,
        name: `${v.vehicleName} (${v.vehicleType})`,
        description: `Dedicated transport • ${v.pricingType} pricing (${v.estimatedKm} km estimated)`,
        quantity: 1,
        unit: "vehicle",
        unitPrice: new Prisma.Decimal(itemCost),
        costPrice: new Prisma.Decimal(itemCost),
        markupPercentage: new Prisma.Decimal(0),
        sellingPrice: new Prisma.Decimal(itemCost),
        totalPrice: new Prisma.Decimal(itemCost),
        sortOrder: sortIdx++,
      });
    }

    for (const a of costing.activities) {
      const itemCost = Number(a.totalCost);
      const paxQty = a.numberOfParticipants || 1;
      const unitRate = Math.round(itemCost / paxQty);
      itemsToCreate.push({
        type: "ACTIVITY",
        sourceType: "TRIP_ACTIVITY",
        sourceId: a.id,
        name: a.activityName,
        description: `${a.type} Activity for ${a.numberOfParticipants} participant(s)`,
        quantity: paxQty,
        unit: "pax",
        unitPrice: new Prisma.Decimal(unitRate),
        costPrice: new Prisma.Decimal(itemCost),
        markupPercentage: new Prisma.Decimal(0),
        sellingPrice: new Prisma.Decimal(itemCost),
        totalPrice: new Prisma.Decimal(itemCost),
        sortOrder: sortIdx++,
      });
    }

    // Auto-populate structured inclusions from live trip items
    const proposalItemsToCreate: Array<Prisma.QuotationProposalItemCreateWithoutQuotationInput> = [];
    if (options?.autoPopulateInclusions !== false) {
      let pIdx = 0;
      if (costing.hotels.length > 0) {
        proposalItemsToCreate.push({
          type: ProposalItemType.INCLUSION,
          title: `Hotel Accommodation (${costing.hotels.length} Property/Properties)`,
          description: costing.hotels.map((h) => `${h.hotelName} (${h.roomType}, ${h.nights}N)`).join(" • "),
          sortOrder: pIdx++,
        });
      }
      if (costing.vehicles.length > 0) {
        proposalItemsToCreate.push({
          type: ProposalItemType.INCLUSION,
          title: `Dedicated Vehicle & Transfers`,
          description: costing.vehicles.map((v) => `${v.vehicleName} (${v.vehicleType})`).join(" • "),
          sortOrder: pIdx++,
        });
      }
      if (costing.activities.length > 0) {
        proposalItemsToCreate.push({
          type: ProposalItemType.INCLUSION,
          title: `Sightseeing & Excursions`,
          description: costing.activities.map((a) => a.activityName).join(" • "),
          sortOrder: pIdx++,
        });
      }
      proposalItemsToCreate.push({
        type: ProposalItemType.INCLUSION,
        title: `All Applicable Tolls, Parking & Driver Allowances`,
        description: "No hidden local transport surcharges.",
        sortOrder: pIdx++,
      });
      // Standard exclusions
      proposalItemsToCreate.push({
        type: ProposalItemType.EXCLUSION,
        title: "Airfare / Train Tickets",
        description: "Flight tickets to/from destination are not included unless specified.",
        sortOrder: 0,
      });
      proposalItemsToCreate.push({
        type: ProposalItemType.EXCLUSION,
        title: "Personal Expenses & Optional Activities",
        description: "Laundry, telephone calls, room service, camera fees, and tips.",
        sortOrder: 1,
      });
      proposalItemsToCreate.push({
        type: ProposalItemType.EXCLUSION,
        title: "Early Check-in & Late Check-out Charges",
        description: "Subject to hotel availability and standard check-in timings.",
        sortOrder: 2,
      });
      // Important Notes
      proposalItemsToCreate.push({
        type: ProposalItemType.IMPORTANT_NOTE,
        title: "Government Identification",
        description: "Valid government-issued Photo ID (Aadhaar / Passport) is mandatory for all adult travelers at check-in.",
        sortOrder: 0,
      });
    }

    // Auto-generate payment milestones (Standard 30% / 50% / 20%)
    const milestonesToCreate: Array<Prisma.QuotationPaymentMilestoneCreateWithoutQuotationInput> = [];
    if (options?.generatePaymentSchedule !== false && finalAmount > 0) {
      const p1 = Math.round(finalAmount * 0.3);
      const p2 = Math.round(finalAmount * 0.5);
      const p3 = Math.max(0, finalAmount - p1 - p2);

      const tripObj = await prisma.trip.findUnique({ where: { id: tripId }, select: { startDate: true } });
      const travelStart = tripObj?.startDate ? new Date(tripObj.startDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      milestonesToCreate.push(
        {
          title: "30% Advance Booking Deposit",
          description: "Required upon confirmation to lock hotel rooms & transport arrangements.",
          percentage: new Prisma.Decimal(30),
          amount: new Prisma.Decimal(p1),
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          sortOrder: 0,
        },
        {
          title: "50% Pre-Travel Clearance",
          description: "Required 15 days before travel to finalize vouchers.",
          percentage: new Prisma.Decimal(50),
          amount: new Prisma.Decimal(p2),
          dueDate: new Date(travelStart.getTime() - 15 * 24 * 60 * 60 * 1000),
          sortOrder: 1,
        },
        {
          title: "20% Final Balance on Arrival",
          description: "Clearance upon arrival at destination.",
          percentage: new Prisma.Decimal(20),
          amount: new Prisma.Decimal(p3),
          dueDate: travelStart,
          sortOrder: 2,
        }
      );
    }

    const selectedTier = options?.tier || "Deluxe";
    const quotationTitle = options?.title || `Proposal for ${costing.tripTitle} - ${selectedTier}`;

    const quotation = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.create({
        data: {
          agencyId,
          tripId,
          customerId: costing.customer.id,
          quotationNumber,
          version: 1,
          tier: selectedTier,
          title: quotationTitle,
          proposalSubtitle: options?.proposalSubtitle,
          status: QuotationStatus.DRAFT,
          validUntil: options?.validUntil ? new Date(options.validUntil) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          currency: "INR",
          subtotal: new Prisma.Decimal(subtotal),
          markupPercentage: new Prisma.Decimal(markupPct),
          markupAmount: new Prisma.Decimal(markupAmount),
          discountPercentage: new Prisma.Decimal(discountPct),
          discountAmount: new Prisma.Decimal(discountAmount),
          taxPercentage: taxResult.taxRate,
          taxAmount: taxResult.taxAmount,
          taxableAmount: taxResult.taxableAmount,
          taxRate: taxResult.taxRate,
          taxMode: taxResult.taxMode,
          gstTreatment: taxResult.gstTreatment,
          cgstAmount: taxResult.cgstAmount,
          sgstAmount: taxResult.sgstAmount,
          igstAmount: taxResult.igstAmount,
          finalAmount: taxResult.finalAmount,
          customerMessage: options?.customerMessage || "Thank you for planning your holiday with us. Here is your customized itinerary proposal.",
          inclusionsIntro: options?.inclusionsIntro,
          exclusionsIntro: options?.exclusionsIntro,
          paymentTerms: options?.paymentTerms,
          cancellationPolicy: options?.cancellationPolicy,
          importantNotes: options?.importantNotes,
          terms: options?.terms,
          shareToken,
          items: {
            create: itemsToCreate,
          },
          proposalItems: {
            create: proposalItemsToCreate,
          },
          paymentMilestones: {
            create: milestonesToCreate,
          },
        },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          trip: {
            select: {
              id: true,
              title: true,
              tripNumber: true,
              startDate: true,
              endDate: true,
              status: true,
              travelers: { select: { id: true, name: true, type: true } },
              tripDestinations: {
                select: {
                  id: true,
                  sequence: true,
                  destination: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
                orderBy: { sequence: "asc" },
              },
              itineraryItems: {
                select: {
                  id: true,
                  dayNumber: true,
                  date: true,
                  title: true,
                  description: true,
                  location: true,
                  startTime: true,
                  endTime: true,
                  sortOrder: true,
                },
                orderBy: { sortOrder: "asc" },
              },
              tripHotels: {
                select: {
                  id: true,
                  roomType: true,
                  mealPlan: true,
                  checkIn: true,
                  checkOut: true,
                  rooms: true,
                  notes: true,
                  hotel: {
                    select: {
                      id: true,
                      name: true,
                      city: true,
                      category: true,
                    },
                  },
                },
                orderBy: { checkIn: "asc" },
              },
              tripVehicles: {
                select: {
                  id: true,
                  vehicleName: true,
                  vehicleType: true,
                  startDate: true,
                  endDate: true,
                  notes: true,
                  vehicle: {
                    select: {
                      id: true,
                      name: true,
                      type: true,
                      capacity: true,
                    },
                  },
                },
                orderBy: { startDate: "asc" },
              },
              tripActivities: {
                select: {
                  id: true,
                  name: true,
                  date: true,
                  description: true,
                  notes: true,
                  activity: {
                    select: {
                      id: true,
                      name: true,
                      location: true,
                    },
                  },
                },
                orderBy: { date: "asc" },
              },
            },
          },
          items: {
            orderBy: { sortOrder: "asc" },
          },
          proposalItems: {
            orderBy: { sortOrder: "asc" },
          },
          paymentMilestones: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      return q;
    });

    return quotation as QuotationWithRelations;
  },

  /**
   * Fork a new Quotation Version (v2, v3...) while keeping previous versions frozen
   */
  async createQuotationVersion(agencyId: string, quotationId: string): Promise<QuotationWithRelations> {
    const existing = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
      include: {
        items: true,
        proposalItems: true,
        paymentMilestones: true,
      },
    });

    if (!existing) {
      throw new Error("Quotation not found.");
    }

    // Find highest version for this quotationNumber
    const maxQuote = await prisma.quotation.findFirst({
      where: { agencyId, quotationNumber: existing.quotationNumber },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (maxQuote?.version || existing.version) + 1;
    const newShareToken = crypto.randomBytes(16).toString("hex");

    const newQuotation = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.create({
        data: {
          agencyId,
          tripId: existing.tripId,
          customerId: existing.customerId,
          quotationNumber: existing.quotationNumber,
          version: nextVersion,
          tier: existing.tier,
          title: `Proposal v${nextVersion} for ${existing.title?.replace(/Proposal v\d+ for /i, "") || "Trip"}`,
          proposalSubtitle: existing.proposalSubtitle,
          status: QuotationStatus.DRAFT,
          validUntil: existing.validUntil ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
          currency: existing.currency,
          subtotal: existing.subtotal,
          markupPercentage: existing.markupPercentage,
          markupAmount: existing.markupAmount,
          discountPercentage: existing.discountPercentage,
          discountAmount: existing.discountAmount,
          taxPercentage: existing.taxPercentage,
          taxAmount: existing.taxAmount,
          taxableAmount: existing.taxableAmount,
          taxRate: existing.taxRate,
          taxMode: existing.taxMode,
          gstTreatment: existing.gstTreatment,
          cgstAmount: existing.cgstAmount,
          sgstAmount: existing.sgstAmount,
          igstAmount: existing.igstAmount,
          finalAmount: existing.finalAmount,
          customerMessage: existing.customerMessage,
          inclusionsIntro: existing.inclusionsIntro,
          exclusionsIntro: existing.exclusionsIntro,
          paymentTerms: existing.paymentTerms,
          cancellationPolicy: existing.cancellationPolicy,
          importantNotes: existing.importantNotes,
          internalNotes: existing.internalNotes,
          terms: existing.terms,
          shareToken: newShareToken,
          items: {
            create: existing.items.map((i) => ({
              type: i.type,
              category: i.category,
              sourceType: i.sourceType,
              sourceId: i.sourceId,
              name: i.name,
              description: i.description,
              quantity: i.quantity,
              unit: i.unit,
              unitPrice: i.unitPrice,
              costPrice: i.costPrice,
              markupPercentage: i.markupPercentage,
              sellingPrice: i.sellingPrice,
              totalPrice: i.totalPrice,
              discount: i.discount,
              tax: i.tax,
              isOptional: i.isOptional,
              sortOrder: i.sortOrder,
              notes: i.notes,
            })),
          },
          proposalItems: {
            create: existing.proposalItems.map((p) => ({
              type: p.type,
              title: p.title,
              description: p.description,
              sortOrder: p.sortOrder,
            })),
          },
          paymentMilestones: {
            create: existing.paymentMilestones.map((m) => ({
              title: m.title,
              description: m.description,
              percentage: m.percentage,
              amount: m.amount,
              dueDate: m.dueDate,
              sortOrder: m.sortOrder,
            })),
          },
        },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          trip: {
            select: {
              id: true,
              title: true,
              tripNumber: true,
              startDate: true,
              endDate: true,
              status: true,
              travelers: { select: { id: true, name: true, type: true } },
              tripDestinations: {
                select: {
                  id: true,
                  sequence: true,
                  destination: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
                orderBy: { sequence: "asc" },
              },
              itineraryItems: {
                select: {
                  id: true,
                  dayNumber: true,
                  date: true,
                  title: true,
                  description: true,
                  location: true,
                  startTime: true,
                  endTime: true,
                  sortOrder: true,
                },
                orderBy: { sortOrder: "asc" },
              },
              tripHotels: {
                select: {
                  id: true,
                  roomType: true,
                  mealPlan: true,
                  checkIn: true,
                  checkOut: true,
                  rooms: true,
                  notes: true,
                  hotel: {
                    select: {
                      id: true,
                      name: true,
                      city: true,
                      category: true,
                    },
                  },
                },
                orderBy: { checkIn: "asc" },
              },
              tripVehicles: {
                select: {
                  id: true,
                  vehicleName: true,
                  vehicleType: true,
                  startDate: true,
                  endDate: true,
                  notes: true,
                  vehicle: {
                    select: {
                      id: true,
                      name: true,
                      type: true,
                      capacity: true,
                    },
                  },
                },
                orderBy: { startDate: "asc" },
              },
              tripActivities: {
                select: {
                  id: true,
                  name: true,
                  date: true,
                  description: true,
                  notes: true,
                  activity: {
                    select: {
                      id: true,
                      name: true,
                      location: true,
                    },
                  },
                },
                orderBy: { date: "asc" },
              },
            },
          },
          items: {
            orderBy: { sortOrder: "asc" },
          },
          proposalItems: {
            orderBy: { sortOrder: "asc" },
          },
          paymentMilestones: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      return q;
    });

    return newQuotation as QuotationWithRelations;
  },

  // ──────────────────────── LINE ITEMS ─────────────────────────

  /**
   * Get quotation line items
   */
  async getQuotationItems(agencyId: string, quotationId: string): Promise<QuotationItem[]> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    return prisma.quotationItem.findMany({
      where: { quotationId },
      orderBy: { sortOrder: "asc" },
    });
  },

  /**
   * Add a custom line item to quotation & recalculate totals
   */
  async createQuotationItem(
    agencyId: string,
    quotationId: string,
    data: CreateQuotationItemInput
  ): Promise<QuotationItem> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    const qty = data.quantity || 1;
    const rateSheetRate = Number(data.unitPrice || data.costPrice || 0);
    const lineBaseAmount = Math.round(rateSheetRate * qty);

    const item = await prisma.$transaction(
      async (tx) => {
        const created = await tx.quotationItem.create({
          data: {
            quotationId,
            type: data.type,
            category: data.category,
            sourceType: data.sourceType,
            sourceId: data.sourceId,
            name: data.name,
            description: data.description,
            quantity: qty,
            unit: data.unit,
            unitPrice: new Prisma.Decimal(rateSheetRate),
            costPrice: new Prisma.Decimal(lineBaseAmount),
            markupPercentage: new Prisma.Decimal(0),
            sellingPrice: new Prisma.Decimal(lineBaseAmount),
            totalPrice: new Prisma.Decimal(lineBaseAmount),
            discount: new Prisma.Decimal(0),
            tax: new Prisma.Decimal(0),
            isOptional: data.isOptional || false,
            sortOrder: data.sortOrder || 0,
            notes: data.notes,
          },
        });

        // Recalculate quotation subtotal & grand total
        await this.recalculateQuotationTotals(quotationId, tx);

        return created;
      },
      { timeout: 15000, maxWait: 10000 }
    );

    return item;
  },

  /**
   * Update a line item & recalculate totals (RateSheet Rate is read-only / fixed)
   */
  async updateQuotationItem(
    agencyId: string,
    quotationId: string,
    itemId: string,
    data: UpdateQuotationItemInput
  ): Promise<QuotationItem> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    const existing = await prisma.quotationItem.findUnique({
      where: { id: itemId },
    });

    if (!existing || existing.quotationId !== quotationId) {
      throw new Error("Line item not found on this quotation.");
    }

    const qty = data.quantity !== undefined ? data.quantity : existing.quantity;
    const rateSheetRate =
      existing.unitPrice && Number(existing.unitPrice) > 0
        ? Number(existing.unitPrice)
        : existing.quantity > 0
        ? Math.round(Number(existing.costPrice) / existing.quantity)
        : Number(existing.costPrice);
    const lineBaseAmount = Math.round(rateSheetRate * qty);

    const item = await prisma.$transaction(
      async (tx) => {
        const updated = await tx.quotationItem.update({
          where: { id: itemId },
          data: {
            ...(data.type !== undefined ? { type: data.type } : {}),
            ...(data.category !== undefined ? { category: data.category } : {}),
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.description !== undefined ? { description: data.description } : {}),
            quantity: qty,
            ...(data.unit !== undefined ? { unit: data.unit } : {}),
            unitPrice: new Prisma.Decimal(rateSheetRate),
            costPrice: new Prisma.Decimal(lineBaseAmount),
            markupPercentage: new Prisma.Decimal(0),
            sellingPrice: new Prisma.Decimal(lineBaseAmount),
            totalPrice: new Prisma.Decimal(lineBaseAmount),
            ...(data.isOptional !== undefined ? { isOptional: data.isOptional } : {}),
            ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
            ...(data.notes !== undefined ? { notes: data.notes } : {}),
          },
        });

        await this.recalculateQuotationTotals(quotationId, tx);

        return updated;
      },
      { timeout: 15000, maxWait: 10000 }
    );

    return item;
  },

  /**
   * Delete a line item & recalculate totals
   */
  async deleteQuotationItem(agencyId: string, quotationId: string, itemId: string): Promise<boolean> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    const existing = await prisma.quotationItem.findUnique({
      where: { id: itemId },
    });

    if (!existing || existing.quotationId !== quotationId) {
      throw new Error("Line item not found on this quotation.");
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.quotationItem.delete({
          where: { id: itemId },
        });

        await this.recalculateQuotationTotals(quotationId, tx);
      },
      { timeout: 15000, maxWait: 10000 }
    );

    return true;
  },

  /**
   * Synchronize percentage-based payment milestones with the latest quotation finalAmount
   */
  async syncPaymentMilestones(quotationId: string, finalAmount: number, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    const milestones = await db.quotationPaymentMilestone.findMany({
      where: { quotationId },
      orderBy: { sortOrder: "asc" },
    });

    const pctMilestones = milestones.filter((m) => m.percentage !== null && Number(m.percentage) > 0);
    if (pctMilestones.length === 0) return;

    let allocatedAmount = 0;
    const totalPct = pctMilestones.reduce((acc, curr) => acc + Number(curr.percentage || 0), 0);
    const isHundredPct = Math.abs(totalPct - 100) < 0.01;

    for (let i = 0; i < pctMilestones.length; i++) {
      const m = pctMilestones[i];
      const isLast = i === pctMilestones.length - 1;
      let amt = Math.round((finalAmount * Number(m.percentage)) / 100);
      if (isLast && isHundredPct) {
        // Assign rounding remainder to the final milestone
        amt = Math.max(0, finalAmount - allocatedAmount);
      }
      allocatedAmount += amt;

      await db.quotationPaymentMilestone.update({
        where: { id: m.id },
        data: {
          amount: new Prisma.Decimal(amt),
        },
      });
    }
  },

  /**
   * Internal helper: Recalculates Quotation subtotal and finalAmount from line items
   *
   * RateSheet Pricing Model:
   * 1. subtotal = aggregate of all quotation item RateSheet base amounts
   * 2. markupAmount = round(subtotal * markupPercentage / 100)  [APPLIED ONCE AT PACKAGE LEVEL]
   * 3. grossPackageAmount = subtotal + markupAmount
   * 4. discountAmount = round(grossPackageAmount * discountPercentage / 100)
   * 5. taxableAmount = max(0, grossPackageAmount - discountAmount)
   * 6. finalAmount = TaxService.calculate(...)
   */
  async recalculateQuotationTotals(quotationId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    const items = await db.quotationItem.findMany({
      where: { quotationId, isOptional: false },
    });

    const quote = await db.quotation.findUniqueOrThrow({
      where: { id: quotationId },
    });

    // 1. RateSheet Base Subtotal = Aggregate of all line item RateSheet base amounts
    const subtotal = items.reduce((acc, i) => {
      const lineBase = Number(i.costPrice || (Number(i.unitPrice || 0) * (i.quantity || 1)));
      return acc + lineBase;
    }, 0);

    // 2. Package-Level Agency Markup (Applied ONCE to the aggregate subtotal)
    const markupPct = Number(quote.markupPercentage || 0);
    const markupAmount = Math.round((subtotal * markupPct) / 100);
    const grossPackageAmount = subtotal + markupAmount;

    // 3. Discount applied before tax
    const discountPct = Number(quote.discountPercentage || 0);
    const discountAmount = Math.round((grossPackageAmount * discountPct) / 100);
    const afterDiscount = Math.max(0, grossPackageAmount - discountAmount);

    // 4. Tax calculation
    const { taxRate: effectiveTaxRate, taxMode: effectiveTaxMode, gstTreatment: effectiveGstTreatment } = await this.resolveQuotationTaxConfig(
      quote.agencyId,
      {
        taxRate: quote.taxRate ?? quote.taxPercentage,
        taxMode: quote.taxMode,
        gstTreatment: quote.gstTreatment,
      }
    );

    const taxCalc = taxService.calculate({
      amount: afterDiscount,
      taxRate: effectiveTaxRate,
      taxMode: effectiveTaxMode,
      gstTreatment: effectiveGstTreatment,
    });

    await db.quotation.update({
      where: { id: quotationId },
      data: {
        subtotal: new Prisma.Decimal(subtotal),
        markupPercentage: new Prisma.Decimal(markupPct.toFixed(2)),
        markupAmount: new Prisma.Decimal(markupAmount),
        discountAmount: new Prisma.Decimal(discountAmount),
        taxableAmount: new Prisma.Decimal(taxCalc.taxableAmount.toString()),
        taxRate: new Prisma.Decimal(effectiveTaxRate),
        taxMode: effectiveTaxMode,
        gstTreatment: effectiveGstTreatment,
        cgstAmount: new Prisma.Decimal(taxCalc.cgstAmount.toString()),
        sgstAmount: new Prisma.Decimal(taxCalc.sgstAmount.toString()),
        igstAmount: new Prisma.Decimal(taxCalc.igstAmount.toString()),
        taxAmount: new Prisma.Decimal(taxCalc.taxAmount.toString()),
        finalAmount: new Prisma.Decimal(taxCalc.finalAmount.toString()),
        taxPercentage: new Prisma.Decimal(effectiveTaxRate),
      },
    });

    // Synchronize percentage-based payment milestones with updated finalAmount
    await this.syncPaymentMilestones(quotationId, Number(taxCalc.finalAmount), db);
  },

  // ──────────────────────── PROPOSAL ITEMS (INCLUSIONS / EXCLUSIONS / NOTES) ─────────────────────────

  /**
   * List proposal items for quotation
   */
  async getProposalItems(
    agencyId: string,
    quotationId: string,
    type?: ProposalItemType
  ): Promise<QuotationProposalItem[]> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    return prisma.quotationProposalItem.findMany({
      where: {
        quotationId,
        ...(type ? { type } : {}),
      },
      orderBy: { sortOrder: "asc" },
    });
  },

  /**
   * Create a proposal item
   */
  async createProposalItem(
    agencyId: string,
    quotationId: string,
    data: CreateProposalItemInput
  ): Promise<QuotationProposalItem> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    return prisma.quotationProposalItem.create({
      data: {
        quotationId,
        type: data.type,
        title: data.title,
        description: data.description,
        sortOrder: data.sortOrder || 0,
      },
    });
  },

  /**
   * Update a proposal item
   */
  async updateProposalItem(
    agencyId: string,
    quotationId: string,
    itemId: string,
    data: UpdateProposalItemInput
  ): Promise<QuotationProposalItem> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    const existing = await prisma.quotationProposalItem.findUnique({
      where: { id: itemId },
    });

    if (!existing || existing.quotationId !== quotationId) {
      throw new Error("Proposal item not found on this quotation.");
    }

    return prisma.quotationProposalItem.update({
      where: { id: itemId },
      data: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
  },

  /**
   * Delete a proposal item
   */
  async deleteProposalItem(agencyId: string, quotationId: string, itemId: string): Promise<boolean> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    const existing = await prisma.quotationProposalItem.findUnique({
      where: { id: itemId },
    });

    if (!existing || existing.quotationId !== quotationId) {
      throw new Error("Proposal item not found on this quotation.");
    }

    await prisma.quotationProposalItem.delete({
      where: { id: itemId },
    });

    return true;
  },

  /**
   * Batch reorder proposal items
   */
  async reorderProposalItems(
    agencyId: string,
    quotationId: string,
    data: ReorderProposalItemsInput
  ): Promise<boolean> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    await prisma.$transaction(
      data.items.map((item) =>
        prisma.quotationProposalItem.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    return true;
  },

  // ──────────────────────── PAYMENT MILESTONES ─────────────────────────

  /**
   * List payment milestones for quotation
   */
  async getPaymentMilestones(agencyId: string, quotationId: string): Promise<QuotationPaymentMilestone[]> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    return prisma.quotationPaymentMilestone.findMany({
      where: { quotationId },
      orderBy: { sortOrder: "asc" },
    });
  },

  /**
   * Create a payment milestone
   */
  async createPaymentMilestone(
    agencyId: string,
    quotationId: string,
    data: CreatePaymentMilestoneInput
  ): Promise<QuotationPaymentMilestone> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    const finalAmount = Number(quotation.finalAmount || 0);
    let amount = data.amount !== undefined ? Number(data.amount) : 0;
    if (!amount && data.percentage !== undefined && finalAmount > 0) {
      amount = Math.round((finalAmount * Number(data.percentage)) / 100);
    }

    return prisma.quotationPaymentMilestone.create({
      data: {
        quotationId,
        title: data.title,
        description: data.description,
        percentage: data.percentage !== undefined && data.percentage !== null ? new Prisma.Decimal(data.percentage) : null,
        amount: new Prisma.Decimal(amount),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        sortOrder: data.sortOrder || 0,
      },
    });
  },

  /**
   * Update a payment milestone
   */
  async updatePaymentMilestone(
    agencyId: string,
    quotationId: string,
    milestoneId: string,
    data: UpdatePaymentMilestoneInput
  ): Promise<QuotationPaymentMilestone> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    const existing = await prisma.quotationPaymentMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!existing || existing.quotationId !== quotationId) {
      throw new Error("Payment milestone not found on this quotation.");
    }

    const finalAmount = Number(quotation.finalAmount || 0);
    let amount = data.amount !== undefined ? Number(data.amount) : Number(existing.amount || 0);
    if (data.percentage !== undefined && data.amount === undefined && finalAmount > 0) {
      amount = Math.round((finalAmount * Number(data.percentage)) / 100);
    }

    return prisma.quotationPaymentMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.percentage !== undefined ? { percentage: data.percentage !== null ? new Prisma.Decimal(data.percentage) : null } : {}),
        amount: new Prisma.Decimal(amount),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
  },

  /**
   * Delete a payment milestone
   */
  async deletePaymentMilestone(agencyId: string, quotationId: string, milestoneId: string): Promise<boolean> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    const existing = await prisma.quotationPaymentMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!existing || existing.quotationId !== quotationId) {
      throw new Error("Payment milestone not found on this quotation.");
    }

    await prisma.quotationPaymentMilestone.delete({
      where: { id: milestoneId },
    });

    return true;
  },

  /**
   * Generate default payment schedule template
   */
  async generateDefaultPaymentSchedule(
    agencyId: string,
    quotationId: string,
    template: GeneratePaymentScheduleInput["template"] = "STANDARD_3_TIER"
  ): Promise<QuotationPaymentMilestone[]> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
      include: { trip: true },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    const finalAmount = Number(quotation.finalAmount || 0);
    const travelStart = quotation.trip.startDate ? new Date(quotation.trip.startDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Delete existing milestones
    await prisma.quotationPaymentMilestone.deleteMany({
      where: { quotationId },
    });

    const milestonesToCreate: Array<Prisma.QuotationPaymentMilestoneCreateWithoutQuotationInput> = [];

    if (template === "STANDARD_3_TIER") {
      const p1 = Math.round(finalAmount * 0.3);
      const p2 = Math.round(finalAmount * 0.5);
      const p3 = Math.max(0, finalAmount - p1 - p2);

      milestonesToCreate.push(
        {
          title: "30% Advance Booking Deposit",
          description: "Required upon confirmation to lock hotels & flights.",
          percentage: new Prisma.Decimal(30),
          amount: new Prisma.Decimal(p1),
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          sortOrder: 0,
        },
        {
          title: "50% Pre-Travel Clearance",
          description: "Required 15 days before travel.",
          percentage: new Prisma.Decimal(50),
          amount: new Prisma.Decimal(p2),
          dueDate: new Date(travelStart.getTime() - 15 * 24 * 60 * 60 * 1000),
          sortOrder: 1,
        },
        {
          title: "20% Final Balance on Arrival",
          description: "Final clearance upon destination arrival.",
          percentage: new Prisma.Decimal(20),
          amount: new Prisma.Decimal(p3),
          dueDate: travelStart,
          sortOrder: 2,
        }
      );
    } else if (template === "ADVANCE_AND_BALANCE") {
      const p1 = Math.round(finalAmount * 0.5);
      const p2 = Math.max(0, finalAmount - p1);

      milestonesToCreate.push(
        {
          title: "50% Booking Confirmation Deposit",
          description: "Required upon proposal acceptance.",
          percentage: new Prisma.Decimal(50),
          amount: new Prisma.Decimal(p1),
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          sortOrder: 0,
        },
        {
          title: "50% Balance Prior to Departure",
          description: "Required 7 days prior to departure.",
          percentage: new Prisma.Decimal(50),
          amount: new Prisma.Decimal(p2),
          dueDate: new Date(travelStart.getTime() - 7 * 24 * 60 * 60 * 1000),
          sortOrder: 1,
        }
      );
    } else {
      milestonesToCreate.push({
        title: "100% Full Tour Payment",
        description: "Full advance required to confirm bespoke arrangements.",
        percentage: new Prisma.Decimal(100),
        amount: new Prisma.Decimal(finalAmount),
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        sortOrder: 0,
      });
    }

    await prisma.quotationPaymentMilestone.createMany({
      data: milestonesToCreate.map((m) => ({
        ...m,
        quotationId,
      })),
    });

    return prisma.quotationPaymentMilestone.findMany({
      where: { quotationId },
      orderBy: { sortOrder: "asc" },
    });
  },

  // ──────────────────────── PUBLIC SHARE & CUSTOMER ACTIONS ─────────────────────────

  /**
   * Get public sanitized quotation by share token (Zero supplier secrets or internal notes exposed)
   */
  async getPublicQuotationByToken(shareToken: string) {
    const quotation = await prisma.quotation.findFirst({
      where: { shareToken, archivedAt: null },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            logo: true,
            address: true,
          },
        },
        customer: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        trip: {
          select: {
            id: true,
            title: true,
            tripNumber: true,
            startDate: true,
            endDate: true,
            travelers: { select: { id: true, name: true, type: true } },
            tripDestinations: {
              select: {
                id: true,
                sequence: true,
                destination: {
                  select: {
                    id: true,
                    name: true,
                    cityArea: true,
                    state: true,
                    country: true,
                  },
                },
              },
              orderBy: { sequence: "asc" },
            },
            itineraryItems: {
              select: {
                id: true,
                dayNumber: true,
                date: true,
                title: true,
                description: true,
                location: true,
                startTime: true,
                endTime: true,
                sortOrder: true,
              },
              orderBy: { sortOrder: "asc" },
            },
            tripHotels: {
              select: {
                id: true,
                checkIn: true,
                checkOut: true,
                roomType: true,
                mealPlan: true,
                rooms: true,
                notes: true,
                hotel: {
                  select: {
                    id: true,
                    name: true,
                    city: true,
                    category: true,
                  },
                },
              },
              orderBy: { checkIn: "asc" },
            },
            tripVehicles: {
              select: {
                id: true,
                vehicleName: true,
                vehicleType: true,
                startDate: true,
                endDate: true,
                notes: true,
                vehicle: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    capacity: true,
                  },
                },
              },
              orderBy: { startDate: "asc" },
            },
            tripActivities: {
              select: {
                id: true,
                name: true,
                date: true,
                description: true,
                notes: true,
                activity: {
                  select: {
                    id: true,
                    name: true,
                    location: true,
                  },
                },
              },
              orderBy: { date: "asc" },
            },
          },
        },
        items: {
          where: { isOptional: false },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            type: true,
            category: true,
            name: true,
            description: true,
            quantity: true,
            unit: true,
            sortOrder: true,
          },
        },
        proposalItems: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            sortOrder: true,
          },
        },
        paymentMilestones: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            percentage: true,
            dueDate: true,
            sortOrder: true,
          },
        },
      },
    });

    if (!quotation) {
      return null;
    }

    const isExpired = quotation.validUntil ? new Date() > new Date(quotation.validUntil) : false;

    return {
      id: quotation.id,
      quotationNumber: quotation.quotationNumber,
      version: quotation.version,
      tier: quotation.tier || "Deluxe",
      title: quotation.title || `Proposal for ${quotation.trip.title} - ${quotation.tier || "Deluxe"}`,
      proposalSubtitle: quotation.proposalSubtitle,
      status: quotation.status,
      currency: quotation.currency,
      validUntil: quotation.validUntil,
      isExpired,
      finalAmount: Number(quotation.finalAmount || 0),
      customerMessage: quotation.customerMessage,
      inclusionsIntro: quotation.inclusionsIntro,
      exclusionsIntro: quotation.exclusionsIntro,
      paymentTerms: quotation.paymentTerms,
      cancellationPolicy: quotation.cancellationPolicy,
      importantNotes: quotation.importantNotes,
      terms: quotation.terms,
      customerFeedback: quotation.customerFeedback,
      customerFeedbackAt: quotation.customerFeedbackAt,
      agency: quotation.agency,
      customer: quotation.customer,
      trip: quotation.trip,
      items: quotation.items.map((i) => ({
        id: i.id,
        type: i.type,
        category: i.category,
        name: i.name,
        description: i.description,
        quantity: i.quantity,
        unit: i.unit,
        sortOrder: i.sortOrder,
      })),
      proposalItems: quotation.proposalItems.map((p) => ({
        id: p.id,
        type: p.type,
        title: p.title,
        description: p.description,
        sortOrder: p.sortOrder,
      })),
      paymentMilestones: quotation.paymentMilestones.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        percentage: m.percentage ? Number(m.percentage) : null,
        dueDate: m.dueDate,
        sortOrder: m.sortOrder,
      })),
      createdAt: quotation.createdAt,
    };
  },

  /**
   * Mark public quotation as viewed
   */
  async markQuotationViewed(shareToken: string): Promise<boolean> {
    const quotation = await prisma.quotation.findFirst({
      where: { shareToken, archivedAt: null },
    });

    if (!quotation) return false;

    await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        viewedAt: new Date(),
        status: quotation.status === QuotationStatus.SENT ? QuotationStatus.VIEWED : quotation.status,
      },
    });

    // Non-blocking communication trigger
    communicationService.notifyQuotationViewed(quotation.agencyId, quotation.id).catch((err) => {
      console.warn("[Communication Non-blocking Notice] Failed to notify quotation viewed:", err?.message || err);
    });

    return true;
  },

  /**
   * Customer Action: Accept Proposal
   */
  async acceptPublicQuotation(shareToken: string, _input?: AcceptQuotationInput) {
    const quotation = await prisma.quotation.findFirst({
      where: { shareToken, archivedAt: null },
      include: { bookings: true },
    });

    if (!quotation) {
      throw new Error("Quotation proposal not found or link has expired.");
    }

    if (quotation.validUntil && new Date() > new Date(quotation.validUntil)) {
      throw new Error("This quotation has expired. Please contact your travel advisor to refresh the proposal.");
    }

    if (quotation.status === QuotationStatus.REJECTED || quotation.status === QuotationStatus.EXPIRED) {
      throw new Error(`This quotation has been ${quotation.status.toLowerCase()} and cannot be accepted.`);
    }

    if (quotation.status === QuotationStatus.ACCEPTED) {
      return { success: true, message: "Quotation has already been accepted.", quotationId: quotation.id };
    }

    if (quotation.bookings.length > 0) {
      throw new Error("This proposal has already been confirmed as a booking.");
    }

    const updated = await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        status: QuotationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    internalNotificationService.notifyAgencyOwner(quotation.agencyId, {
      type: "QUOTATION_ACCEPTED",
      title: "Quotation Accepted",
      message: `Quotation #${quotation.quotationNumber} (${quotation.title}) was accepted by the client.`,
      linkUrl: `/quotations/${quotation.id}`,
      metadata: {
        quotationId: quotation.id,
        quotationNumber: quotation.quotationNumber,
        finalAmount: Number(quotation.finalAmount),
      },
      idempotencyKey: `quote-accept-${quotation.id}`,
    }).catch((err) => {
      console.warn("[QuotationService] Failed to notify agency owner of quotation acceptance:", err);
    });

    return {
      success: true,
      message: "Thank you! You have accepted the quotation proposal. Our travel specialist will be in touch shortly.",
      quotationId: updated.id,
      status: updated.status,
      finalAmount: Number(updated.finalAmount),
    };
  },

  /**
   * Customer Action: Request Changes / Feedback
   */
  async requestChangesPublicQuotation(shareToken: string, input: RequestChangesInput) {
    const quotation = await prisma.quotation.findFirst({
      where: { shareToken, archivedAt: null },
      include: { bookings: true },
    });

    if (!quotation) {
      throw new Error("Quotation proposal not found or link has expired.");
    }

    if (quotation.validUntil && new Date() > new Date(quotation.validUntil)) {
      throw new Error("This quotation has expired. Please contact your travel advisor to refresh the proposal.");
    }

    if (quotation.bookings.length > 0) {
      throw new Error("This proposal has already been confirmed as a booking.");
    }

    const updated = await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        customerFeedback: input.message,
        customerFeedbackAt: new Date(),
      },
    });

    internalNotificationService.notifyAgencyOwner(quotation.agencyId, {
      type: "QUOTATION_CHANGE_REQUESTED",
      title: "Quotation Revision Requested",
      message: `Client requested changes for Quotation #${quotation.quotationNumber}: "${input.message.slice(0, 100)}"`,
      linkUrl: `/quotations/${quotation.id}`,
      metadata: {
        quotationId: quotation.id,
        quotationNumber: quotation.quotationNumber,
        message: input.message,
      },
      idempotencyKey: `quote-changes-${quotation.id}-${Date.now()}`,
    }).catch((err) => {
      console.warn("[QuotationService] Failed to notify agency owner of quotation change request:", err);
    });

    return {
      success: true,
      message: "Your feedback and revision request have been submitted to your travel advisor.",
      quotationId: updated.id,
    };
  },
};
