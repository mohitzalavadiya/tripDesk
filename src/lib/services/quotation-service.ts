import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  Quotation,
  QuotationItem,
  QuotationProposalItem,
  QuotationPaymentMilestone,
  QuotationPackageOption,
  QuotationStatus,
  ProposalItemType,
  Prisma,
} from "@prisma/client";
import { tripCostingService } from "./trip-costing-service";
import { communicationService } from "./communication-service";
import {
  CreateQuotationInput,
  UpdateQuotationInput,
  QuotationQueryInput,
  GenerateTripQuotationInput,
  AcceptQuotationInput,
  RequestChangesInput,
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
import {
  CreatePackageOptionInput,
  UpdatePackageOptionInput,
  ReorderPackageOptionsInput,
} from "@/lib/validation/package-option-schema";

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
  packageOptions: QuotationPackageOption[];
  selectedPackageOption?: QuotationPackageOption | null;
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
          packageOptions: {
            orderBy: { sortOrder: "asc" },
          },
          selectedPackageOption: true,
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
        packageOptions: {
          orderBy: { sortOrder: "asc" },
        },
        selectedPackageOption: true,
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
        packageOptions: {
          orderBy: { sortOrder: "asc" },
        },
        selectedPackageOption: true,
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

    const subtotal = Number(data.subtotal || 0);
    const markupPct = Number(data.markupPercentage || 0);
    const markupAmount = data.markupAmount !== undefined ? Number(data.markupAmount) : Math.round((subtotal * markupPct) / 100);
    const baseWithMarkup = subtotal + markupAmount;

    const discountPct = Number(data.discountPercentage || 0);
    const discountAmount = data.discountAmount !== undefined ? Number(data.discountAmount) : Math.round((baseWithMarkup * discountPct) / 100);
    const afterDiscount = Math.max(0, baseWithMarkup - discountAmount);

    const taxPct = Number(data.taxPercentage || 0);
    const taxAmount = data.taxAmount !== undefined ? Number(data.taxAmount) : Math.round((afterDiscount * taxPct) / 100);
    const finalAmount = data.finalAmount !== undefined ? Number(data.finalAmount) : Math.round(afterDiscount + taxAmount);

    const quote = await prisma.quotation.create({
      data: {
        agencyId,
        tripId: data.tripId,
        customerId: data.customerId,
        quotationNumber,
        version: 1,
        title: data.title,
        status: data.status || QuotationStatus.DRAFT,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        currency: data.currency || "INR",
        subtotal: new Prisma.Decimal(subtotal),
        markupPercentage: new Prisma.Decimal(markupPct),
        markupAmount: new Prisma.Decimal(markupAmount),
        discountPercentage: new Prisma.Decimal(discountPct),
        discountAmount: new Prisma.Decimal(discountAmount),
        taxPercentage: new Prisma.Decimal(taxPct),
        taxAmount: new Prisma.Decimal(taxAmount),
        finalAmount: new Prisma.Decimal(finalAmount),
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
        packageOptions: {
          orderBy: { sortOrder: "asc" },
        },
        selectedPackageOption: true,
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

    const subtotal = data.subtotal !== undefined ? Number(data.subtotal) : Number(existing.subtotal);
    const markupPct = data.markupPercentage !== undefined ? Number(data.markupPercentage) : Number(existing.markupPercentage);
    const markupAmount = data.markupAmount !== undefined ? Number(data.markupAmount) : Math.round((subtotal * markupPct) / 100);
    const baseWithMarkup = subtotal + markupAmount;

    const discountPct = data.discountPercentage !== undefined ? Number(data.discountPercentage) : Number(existing.discountPercentage);
    const discountAmount = data.discountAmount !== undefined ? Number(data.discountAmount) : Math.round((baseWithMarkup * discountPct) / 100);
    const afterDiscount = Math.max(0, baseWithMarkup - discountAmount);

    const taxPct = data.taxPercentage !== undefined ? Number(data.taxPercentage) : Number(existing.taxPercentage);
    const taxAmount = data.taxAmount !== undefined ? Number(data.taxAmount) : Math.round((afterDiscount * taxPct) / 100);
    const finalAmount = data.finalAmount !== undefined ? Number(data.finalAmount) : Math.round(afterDiscount + taxAmount);

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.validUntil !== undefined ? { validUntil: data.validUntil ? new Date(data.validUntil) : null } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        subtotal: new Prisma.Decimal(subtotal),
        markupPercentage: new Prisma.Decimal(markupPct),
        markupAmount: new Prisma.Decimal(markupAmount),
        discountPercentage: new Prisma.Decimal(discountPct),
        discountAmount: new Prisma.Decimal(discountAmount),
        taxPercentage: new Prisma.Decimal(taxPct),
        taxAmount: new Prisma.Decimal(taxAmount),
        finalAmount: new Prisma.Decimal(finalAmount),
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
        ...(data.selectedPackageOptionId !== undefined ? { selectedPackageOptionId: data.selectedPackageOptionId } : {}),
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
        packageOptions: {
          orderBy: { sortOrder: "asc" },
        },
        selectedPackageOption: true,
      },
    });

    return updated as QuotationWithRelations;
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

    const subtotal = costing.subtotal;
    const markupPct = options?.markupPercentage ?? 10;
    const markupAmount = Math.round((subtotal * markupPct) / 100);
    const baseWithMarkup = subtotal + markupAmount;

    const discountPct = options?.discountPercentage ?? 0;
    const discountAmount = Math.round((baseWithMarkup * discountPct) / 100);
    const afterDiscount = Math.max(0, baseWithMarkup - discountAmount);

    const taxPct = options?.taxPercentage ?? 5;
    const taxAmount = Math.round((afterDiscount * taxPct) / 100);
    const finalAmount = Math.round(afterDiscount + taxAmount);

    // Build itemized snapshot
    const itemsToCreate: Array<Prisma.QuotationItemCreateWithoutQuotationInput> = [];
    let sortIdx = 0;

    for (const h of costing.hotels) {
      const itemCost = Number(h.totalCost);
      const itemSelling = Math.round(itemCost * (1 + markupPct / 100));
      itemsToCreate.push({
        type: "HOTEL",
        sourceType: "TRIP_HOTEL",
        sourceId: h.id,
        name: `${h.hotelName} (${h.roomType})`,
        description: `${h.rooms} room(s), ${h.nights} night(s) stay${h.mealPlan ? ` • ${h.mealPlan}` : ""}`,
        quantity: h.rooms,
        unit: "rooms",
        unitPrice: new Prisma.Decimal(Math.round(itemSelling / (h.rooms || 1))),
        costPrice: new Prisma.Decimal(itemCost),
        markupPercentage: new Prisma.Decimal(markupPct),
        sellingPrice: new Prisma.Decimal(itemSelling),
        totalPrice: new Prisma.Decimal(itemSelling),
        sortOrder: sortIdx++,
      });
    }

    for (const v of costing.vehicles) {
      const itemCost = Number(v.totalCost);
      const itemSelling = Math.round(itemCost * (1 + markupPct / 100));
      itemsToCreate.push({
        type: "VEHICLE",
        sourceType: "TRIP_VEHICLE",
        sourceId: v.id,
        name: `${v.vehicleName} (${v.vehicleType})`,
        description: `Dedicated transport • ${v.pricingType} pricing (${v.estimatedKm} km estimated)`,
        quantity: 1,
        unit: "vehicle",
        unitPrice: new Prisma.Decimal(itemSelling),
        costPrice: new Prisma.Decimal(itemCost),
        markupPercentage: new Prisma.Decimal(markupPct),
        sellingPrice: new Prisma.Decimal(itemSelling),
        totalPrice: new Prisma.Decimal(itemSelling),
        sortOrder: sortIdx++,
      });
    }

    for (const a of costing.activities) {
      const itemCost = Number(a.totalCost);
      const itemSelling = Math.round(itemCost * (1 + markupPct / 100));
      itemsToCreate.push({
        type: "ACTIVITY",
        sourceType: "TRIP_ACTIVITY",
        sourceId: a.id,
        name: a.activityName,
        description: `${a.type} Activity for ${a.numberOfParticipants} participant(s)`,
        quantity: a.numberOfParticipants,
        unit: "pax",
        unitPrice: new Prisma.Decimal(Math.round(itemSelling / (a.numberOfParticipants || 1))),
        costPrice: new Prisma.Decimal(itemCost),
        markupPercentage: new Prisma.Decimal(markupPct),
        sellingPrice: new Prisma.Decimal(itemSelling),
        totalPrice: new Prisma.Decimal(itemSelling),
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

    const quotation = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.create({
        data: {
          agencyId,
          tripId,
          customerId: costing.customer.id,
          quotationNumber,
          version: 1,
          title: `Proposal for ${costing.tripTitle}`,
          proposalSubtitle: options?.proposalSubtitle,
          status: QuotationStatus.DRAFT,
          validUntil: options?.validUntil ? new Date(options.validUntil) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          currency: "INR",
          subtotal: new Prisma.Decimal(subtotal),
          markupPercentage: new Prisma.Decimal(markupPct),
          markupAmount: new Prisma.Decimal(markupAmount),
          discountPercentage: new Prisma.Decimal(discountPct),
          discountAmount: new Prisma.Decimal(discountAmount),
          taxPercentage: new Prisma.Decimal(taxPct),
          taxAmount: new Prisma.Decimal(taxAmount),
          finalAmount: new Prisma.Decimal(finalAmount),
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
          packageOptions: {
            orderBy: { sortOrder: "asc" },
          },
          selectedPackageOption: true,
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
        packageOptions: true,
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
          packageOptions: {
            create: existing.packageOptions.map((opt) => ({
              name: opt.name,
              subtitle: opt.subtitle,
              description: opt.description,
              isRecommended: opt.isRecommended,
              subtotal: opt.subtotal,
              markupPercentage: opt.markupPercentage,
              markupAmount: opt.markupAmount,
              discountPercentage: opt.discountPercentage,
              discountAmount: opt.discountAmount,
              taxPercentage: opt.taxPercentage,
              taxAmount: opt.taxAmount,
              finalAmount: opt.finalAmount,
              hotelNotes: opt.hotelNotes,
              vehicleNotes: opt.vehicleNotes,
              activityNotes: opt.activityNotes,
              inclusions: opt.inclusions,
              exclusions: opt.exclusions,
              sortOrder: opt.sortOrder,
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
          packageOptions: {
            orderBy: { sortOrder: "asc" },
          },
          selectedPackageOption: true,
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
    const unitPrice = Number(data.unitPrice || 0);
    const costPrice = Number(data.costPrice ?? unitPrice * qty);
    const markupPct = Number(data.markupPercentage || 0);
    const sellingPrice = data.sellingPrice !== undefined ? Number(data.sellingPrice) : Math.round(unitPrice * qty);
    const discount = Number(data.discount || 0);
    const tax = Number(data.tax || 0);
    const totalPrice = data.totalPrice !== undefined ? Number(data.totalPrice) : Math.max(0, sellingPrice - discount + tax);

    const item = await prisma.$transaction(async (tx) => {
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
          unitPrice: new Prisma.Decimal(unitPrice),
          costPrice: new Prisma.Decimal(costPrice),
          markupPercentage: new Prisma.Decimal(markupPct),
          sellingPrice: new Prisma.Decimal(sellingPrice),
          totalPrice: new Prisma.Decimal(totalPrice),
          discount: new Prisma.Decimal(discount),
          tax: new Prisma.Decimal(tax),
          isOptional: data.isOptional || false,
          sortOrder: data.sortOrder || 0,
          notes: data.notes,
        },
      });

      // Recalculate quotation subtotal & grand total
      await this.recalculateQuotationTotals(quotationId, tx);

      return created;
    });

    return item;
  },

  /**
   * Update a line item & recalculate totals
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
    const unitPrice = data.unitPrice !== undefined ? Number(data.unitPrice) : Number(existing.unitPrice);
    const costPrice = data.costPrice !== undefined ? Number(data.costPrice) : Number(existing.costPrice);
    const markupPct = data.markupPercentage !== undefined ? Number(data.markupPercentage) : Number(existing.markupPercentage);
    const sellingPrice = data.sellingPrice !== undefined ? Number(data.sellingPrice) : Math.round(unitPrice * qty);
    const discount = data.discount !== undefined ? Number(data.discount) : Number(existing.discount);
    const tax = data.tax !== undefined ? Number(data.tax) : Number(existing.tax);
    const totalPrice = data.totalPrice !== undefined ? Number(data.totalPrice) : Math.max(0, sellingPrice - discount + tax);

    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.quotationItem.update({
        where: { id: itemId },
        data: {
          ...(data.type !== undefined ? { type: data.type } : {}),
          ...(data.category !== undefined ? { category: data.category } : {}),
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          quantity: qty,
          ...(data.unit !== undefined ? { unit: data.unit } : {}),
          unitPrice: new Prisma.Decimal(unitPrice),
          costPrice: new Prisma.Decimal(costPrice),
          markupPercentage: new Prisma.Decimal(markupPct),
          sellingPrice: new Prisma.Decimal(sellingPrice),
          totalPrice: new Prisma.Decimal(totalPrice),
          discount: new Prisma.Decimal(discount),
          tax: new Prisma.Decimal(tax),
          ...(data.isOptional !== undefined ? { isOptional: data.isOptional } : {}),
          ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
        },
      });

      await this.recalculateQuotationTotals(quotationId, tx);

      return updated;
    });

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

    await prisma.$transaction(async (tx) => {
      await tx.quotationItem.delete({
        where: { id: itemId },
      });

      await this.recalculateQuotationTotals(quotationId, tx);
    });

    return true;
  },

  /**
   * Internal helper: Recalculates Quotation subtotal and finalAmount from line items
   */
  async recalculateQuotationTotals(quotationId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    const items = await db.quotationItem.findMany({
      where: { quotationId, isOptional: false },
    });

    const quote = await db.quotation.findUniqueOrThrow({
      where: { id: quotationId },
    });

    const subtotal = items.reduce((acc, i) => acc + Number(i.costPrice || 0), 0);
    const markupPct = Number(quote.markupPercentage || 0);
    const markupAmount = Math.round((subtotal * markupPct) / 100);
    const baseWithMarkup = subtotal + markupAmount;

    const discountPct = Number(quote.discountPercentage || 0);
    const discountAmount = Math.round((baseWithMarkup * discountPct) / 100);
    const afterDiscount = Math.max(0, baseWithMarkup - discountAmount);

    const taxPct = Number(quote.taxPercentage || 0);
    const taxAmount = Math.round((afterDiscount * taxPct) / 100);
    const finalAmount = Math.round(afterDiscount + taxAmount);

    await db.quotation.update({
      where: { id: quotationId },
      data: {
        subtotal: new Prisma.Decimal(subtotal),
        markupAmount: new Prisma.Decimal(markupAmount),
        discountAmount: new Prisma.Decimal(discountAmount),
        taxAmount: new Prisma.Decimal(taxAmount),
        finalAmount: new Prisma.Decimal(finalAmount),
      },
    });
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

  // ──────────────────────── PACKAGE OPTIONS (PHASE 10.11B TIERED PRICING) ─────────────────────────

  /**
   * List package options for a quotation
   */
  async getPackageOptions(agencyId: string, quotationId: string): Promise<QuotationPackageOption[]> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    return prisma.quotationPackageOption.findMany({
      where: { quotationId },
      orderBy: { sortOrder: "asc" },
    });
  },

  /**
   * Create a package option (Tier) for a quotation
   */
  async createPackageOption(
    agencyId: string,
    quotationId: string,
    data: CreatePackageOptionInput
  ): Promise<QuotationPackageOption> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    // Limit check: Maximum 4 package options allowed per quotation
    const count = await prisma.quotationPackageOption.count({
      where: { quotationId },
    });
    if (count >= 4) {
      throw new Error("A maximum of 4 package options are allowed per quotation proposal.");
    }

    // Duplicate name check
    const existingName = await prisma.quotationPackageOption.findUnique({
      where: {
        quotationId_name: {
          quotationId,
          name: data.name.trim(),
        },
      },
    });
    if (existingName) {
      throw new Error(`A package option named "${data.name.trim()}" already exists on this quotation.`);
    }

    // Pricing calculations
    const subtotal = Number(data.subtotal || 0);
    const markupPct = Number(data.markupPercentage || 0);
    const markupAmount = data.markupAmount !== undefined && data.markupAmount > 0
      ? Number(data.markupAmount)
      : Math.round((subtotal * markupPct) / 100);
    const baseWithMarkup = subtotal + markupAmount;

    const discountPct = Number(data.discountPercentage || 0);
    const discountAmount = data.discountAmount !== undefined && data.discountAmount > 0
      ? Number(data.discountAmount)
      : Math.round((baseWithMarkup * discountPct) / 100);
    const afterDiscount = Math.max(0, baseWithMarkup - discountAmount);

    const taxPct = Number(data.taxPercentage || 0);
    const taxAmount = data.taxAmount !== undefined && data.taxAmount > 0
      ? Number(data.taxAmount)
      : Math.round((afterDiscount * taxPct) / 100);
    const finalAmount = data.finalAmount !== undefined && data.finalAmount > 0
      ? Number(data.finalAmount)
      : Math.round(afterDiscount + taxAmount);

    const option = await prisma.$transaction(async (tx) => {
      // If setting this option as recommended, unset recommended flag on all other options
      if (data.isRecommended) {
        await tx.quotationPackageOption.updateMany({
          where: { quotationId },
          data: { isRecommended: false },
        });
      }

      const created = await tx.quotationPackageOption.create({
        data: {
          quotationId,
          name: data.name.trim(),
          subtitle: data.subtitle?.trim() || null,
          description: data.description?.trim() || null,
          isRecommended: data.isRecommended || false,
          subtotal: new Prisma.Decimal(subtotal),
          markupPercentage: new Prisma.Decimal(markupPct),
          markupAmount: new Prisma.Decimal(markupAmount),
          discountPercentage: new Prisma.Decimal(discountPct),
          discountAmount: new Prisma.Decimal(discountAmount),
          taxPercentage: new Prisma.Decimal(taxPct),
          taxAmount: new Prisma.Decimal(taxAmount),
          finalAmount: new Prisma.Decimal(finalAmount),
          hotelNotes: data.hotelNotes?.trim() || null,
          vehicleNotes: data.vehicleNotes?.trim() || null,
          activityNotes: data.activityNotes?.trim() || null,
          inclusions: data.inclusions || [],
          exclusions: data.exclusions || [],
          sortOrder: data.sortOrder ?? count,
        },
      });

      return created;
    });

    return option;
  },

  /**
   * Update an existing package option
   */
  async updatePackageOption(
    agencyId: string,
    quotationId: string,
    optionId: string,
    data: UpdatePackageOptionInput
  ): Promise<QuotationPackageOption> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    const existing = await prisma.quotationPackageOption.findUnique({
      where: { id: optionId },
    });

    if (!existing || existing.quotationId !== quotationId) {
      throw new Error("Package option not found on this quotation.");
    }

    // Name uniqueness check if changing name
    if (data.name && data.name.trim() !== existing.name) {
      const duplicate = await prisma.quotationPackageOption.findUnique({
        where: {
          quotationId_name: {
            quotationId,
            name: data.name.trim(),
          },
        },
      });
      if (duplicate) {
        throw new Error(`A package option named "${data.name.trim()}" already exists on this quotation.`);
      }
    }

    // Pricing calculation
    const subtotal = data.subtotal !== undefined ? Number(data.subtotal) : Number(existing.subtotal);
    const markupPct = data.markupPercentage !== undefined ? Number(data.markupPercentage) : Number(existing.markupPercentage);
    const markupAmount = data.markupAmount !== undefined ? Number(data.markupAmount) : Math.round((subtotal * markupPct) / 100);
    const baseWithMarkup = subtotal + markupAmount;

    const discountPct = data.discountPercentage !== undefined ? Number(data.discountPercentage) : Number(existing.discountPercentage);
    const discountAmount = data.discountAmount !== undefined ? Number(data.discountAmount) : Math.round((baseWithMarkup * discountPct) / 100);
    const afterDiscount = Math.max(0, baseWithMarkup - discountAmount);

    const taxPct = data.taxPercentage !== undefined ? Number(data.taxPercentage) : Number(existing.taxPercentage);
    const taxAmount = data.taxAmount !== undefined ? Number(data.taxAmount) : Math.round((afterDiscount * taxPct) / 100);
    const finalAmount = data.finalAmount !== undefined ? Number(data.finalAmount) : Math.round(afterDiscount + taxAmount);

    const updated = await prisma.$transaction(async (tx) => {
      if (data.isRecommended) {
        await tx.quotationPackageOption.updateMany({
          where: { quotationId },
          data: { isRecommended: false },
        });
      }

      const opt = await tx.quotationPackageOption.update({
        where: { id: optionId },
        data: {
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.subtitle !== undefined ? { subtitle: data.subtitle?.trim() || null } : {}),
          ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
          ...(data.isRecommended !== undefined ? { isRecommended: data.isRecommended } : {}),
          subtotal: new Prisma.Decimal(subtotal),
          markupPercentage: new Prisma.Decimal(markupPct),
          markupAmount: new Prisma.Decimal(markupAmount),
          discountPercentage: new Prisma.Decimal(discountPct),
          discountAmount: new Prisma.Decimal(discountAmount),
          taxPercentage: new Prisma.Decimal(taxPct),
          taxAmount: new Prisma.Decimal(taxAmount),
          finalAmount: new Prisma.Decimal(finalAmount),
          ...(data.hotelNotes !== undefined ? { hotelNotes: data.hotelNotes?.trim() || null } : {}),
          ...(data.vehicleNotes !== undefined ? { vehicleNotes: data.vehicleNotes?.trim() || null } : {}),
          ...(data.activityNotes !== undefined ? { activityNotes: data.activityNotes?.trim() || null } : {}),
          ...(data.inclusions !== undefined ? { inclusions: data.inclusions } : {}),
          ...(data.exclusions !== undefined ? { exclusions: data.exclusions } : {}),
          ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        },
      });

      // If this option is currently selected on the quotation, sync Quotation finalAmount
      if (quotation.selectedPackageOptionId === optionId) {
        await tx.quotation.update({
          where: { id: quotationId },
          data: { finalAmount: new Prisma.Decimal(finalAmount) },
        });
      }

      return opt;
    });

    return updated;
  },

  /**
   * Delete a package option
   */
  async deletePackageOption(agencyId: string, quotationId: string, optionId: string): Promise<boolean> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    const existing = await prisma.quotationPackageOption.findUnique({
      where: { id: optionId },
    });

    if (!existing || existing.quotationId !== quotationId) {
      throw new Error("Package option not found on this quotation.");
    }

    await prisma.$transaction(async (tx) => {
      // If deleted option was selected, clear selected option on quotation
      if (quotation.selectedPackageOptionId === optionId) {
        await tx.quotation.update({
          where: { id: quotationId },
          data: { selectedPackageOptionId: null },
        });
      }

      await tx.quotationPackageOption.delete({
        where: { id: optionId },
      });
    });

    return true;
  },

  /**
   * Batch reorder package options
   */
  async reorderPackageOptions(
    agencyId: string,
    quotationId: string,
    data: ReorderPackageOptionsInput
  ): Promise<boolean> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    await prisma.$transaction(
      data.items.map((item) =>
        prisma.quotationPackageOption.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    return true;
  },

  /**
   * Select a package option on a quotation (Agency selection)
   */
  async selectPackageOption(
    agencyId: string,
    quotationId: string,
    optionId: string
  ): Promise<QuotationWithRelations> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    const option = await prisma.quotationPackageOption.findUnique({
      where: { id: optionId },
    });

    if (!option || option.quotationId !== quotationId) {
      throw new Error("Package option not found on this quotation.");
    }

    const updated = await prisma.quotation.update({
      where: { id: quotationId },
      data: {
        selectedPackageOptionId: optionId,
        finalAmount: option.finalAmount,
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
          },
        },
        items: { orderBy: { sortOrder: "asc" } },
        proposalItems: { orderBy: { sortOrder: "asc" } },
        paymentMilestones: { orderBy: { sortOrder: "asc" } },
        packageOptions: { orderBy: { sortOrder: "asc" } },
        selectedPackageOption: true,
      },
    });

    return updated as QuotationWithRelations;
  },

  /**
   * Generate 3 Standard Default Package Tiers (Standard, Deluxe, Luxury)
   */
  async generateDefaultPackageTiers(agencyId: string, quotationId: string): Promise<QuotationPackageOption[]> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
    });

    if (!quotation) {
      throw new Error("Quotation not found.");
    }

    const baseCost = Number(quotation.subtotal || 30000);

    // Delete existing package options
    await prisma.quotationPackageOption.deleteMany({
      where: { quotationId },
    });

    // 1. Standard Tier (10% markup)
    const stdSub = baseCost;
    const stdMarkup = Math.round(stdSub * 0.1);
    const stdTax = Math.round((stdSub + stdMarkup) * 0.05);
    const stdFinal = stdSub + stdMarkup + stdTax;

    // 2. Deluxe Tier (22% markup)
    const dlxSub = Math.round(baseCost * 1.25);
    const dlxMarkup = Math.round(dlxSub * 0.15);
    const dlxTax = Math.round((dlxSub + dlxMarkup) * 0.05);
    const dlxFinal = dlxSub + dlxMarkup + dlxTax;

    // 3. Luxury Tier (40% markup)
    const luxSub = Math.round(baseCost * 1.6);
    const luxMarkup = Math.round(luxSub * 0.2);
    const luxTax = Math.round((luxSub + luxMarkup) * 0.05);
    const luxFinal = luxSub + luxMarkup + luxTax;

    await prisma.quotationPackageOption.createMany({
      data: [
        {
          quotationId,
          name: "Standard (3-Star)",
          subtitle: "Comfortable stays with essential sightseeing",
          description: "Standard package featuring handpicked 3-star hotels and private transport for budget-conscious travelers.",
          isRecommended: false,
          subtotal: new Prisma.Decimal(stdSub),
          markupPercentage: new Prisma.Decimal(10),
          markupAmount: new Prisma.Decimal(stdMarkup),
          taxPercentage: new Prisma.Decimal(5),
          taxAmount: new Prisma.Decimal(stdTax),
          finalAmount: new Prisma.Decimal(stdFinal),
          hotelNotes: "3-Star Standard City Center Hotels (AC Deluxe Rooms)",
          vehicleNotes: "Dedicated AC Sedan (Dzire / Etios)",
          activityNotes: "Standard sightseeing with entry tickets",
          inclusions: ["Daily Buffet Breakfast", "AC Sedan with dedicated driver", "All Tolls & Driver Allowances"],
          exclusions: ["Lunch & Dinner", "Personal Expenses", "Flight Tickets"],
          sortOrder: 0,
        },
        {
          quotationId,
          name: "Deluxe (4-Star)",
          subtitle: "Premium resorts, upgraded vehicles & full meals",
          description: "Our most popular choice. Relax in luxury 4-star boutique properties with upgraded SUV transport.",
          isRecommended: true,
          subtotal: new Prisma.Decimal(dlxSub),
          markupPercentage: new Prisma.Decimal(15),
          markupAmount: new Prisma.Decimal(dlxMarkup),
          taxPercentage: new Prisma.Decimal(5),
          taxAmount: new Prisma.Decimal(dlxTax),
          finalAmount: new Prisma.Decimal(dlxFinal),
          hotelNotes: "4-Star Deluxe Resorts & Boutique Lake/Hill View Properties",
          vehicleNotes: "Dedicated AC Innova / Ertiga SUV",
          activityNotes: "Guided sightseeing + Boat Cruise / Safari Pass",
          inclusions: ["Breakfast & Dinner (MAP Plan)", "Dedicated AC Innova SUV", "Priority entry passes & cruise vouchers", "Complimentary welcome drink on arrival"],
          exclusions: ["Lunch", "Flight Tickets", "Optional Adventure Activities"],
          sortOrder: 1,
        },
        {
          quotationId,
          name: "Luxury (5-Star & Heritage)",
          subtitle: "Ultra-luxury suites, private chauffeur & VIP treatment",
          description: "Indulge in 5-star palace suites and luxury private villas with dedicated concierge and all meals included.",
          isRecommended: false,
          subtotal: new Prisma.Decimal(luxSub),
          markupPercentage: new Prisma.Decimal(20),
          markupAmount: new Prisma.Decimal(luxMarkup),
          taxPercentage: new Prisma.Decimal(5),
          taxAmount: new Prisma.Decimal(luxTax),
          finalAmount: new Prisma.Decimal(luxFinal),
          hotelNotes: "5-Star Luxury Heritage Properties / Private Pool Villas",
          vehicleNotes: "Private Luxury SUV (Innova Crysta / Fortuner)",
          activityNotes: "Exclusive VIP tours, private guide & sunset yacht cruise",
          inclusions: ["All Meals (Breakfast, Lunch & Gourmet Dinner)", "Chauffeur-driven Luxury SUV", "Private Speedboat / Yacht Excursion", "Complimentary 60-min Couple Spa Voucher", "24/7 Dedicated Concierge Support"],
          exclusions: ["International Flight Tickets", "Visa Fees"],
          sortOrder: 2,
        },
      ],
    });

    // Automatically set Deluxe as the default selected option
    const deluxe = await prisma.quotationPackageOption.findFirst({
      where: { quotationId, name: "Deluxe (4-Star)" },
    });

    if (deluxe) {
      await prisma.quotation.update({
        where: { id: quotationId },
        data: {
          selectedPackageOptionId: deluxe.id,
          finalAmount: deluxe.finalAmount,
        },
      });
    }

    return prisma.quotationPackageOption.findMany({
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
            unitPrice: true,
            totalPrice: true,
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
            amount: true,
            dueDate: true,
            sortOrder: true,
          },
        },
        packageOptions: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            subtitle: true,
            description: true,
            isRecommended: true,
            finalAmount: true,
            hotelNotes: true,
            vehicleNotes: true,
            activityNotes: true,
            inclusions: true,
            exclusions: true,
            sortOrder: true,
          },
        },
        selectedPackageOption: {
          select: {
            id: true,
            name: true,
            subtitle: true,
            description: true,
            isRecommended: true,
            finalAmount: true,
            hotelNotes: true,
            vehicleNotes: true,
            activityNotes: true,
            inclusions: true,
            exclusions: true,
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
      title: quotation.title || `Proposal for ${quotation.trip.title}`,
      proposalSubtitle: quotation.proposalSubtitle,
      status: quotation.status,
      currency: quotation.currency,
      validUntil: quotation.validUntil,
      isExpired,
      discountAmount: Number(quotation.discountAmount),
      taxAmount: Number(quotation.taxAmount),
      finalAmount: Number(quotation.finalAmount),
      selectedPackageOptionId: quotation.selectedPackageOptionId,
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
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
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
        amount: m.amount ? Number(m.amount) : null,
        dueDate: m.dueDate,
        sortOrder: m.sortOrder,
      })),
      packageOptions: quotation.packageOptions.map((opt) => ({
        id: opt.id,
        name: opt.name,
        subtitle: opt.subtitle,
        description: opt.description,
        isRecommended: opt.isRecommended,
        finalAmount: Number(opt.finalAmount),
        hotelNotes: opt.hotelNotes,
        vehicleNotes: opt.vehicleNotes,
        activityNotes: opt.activityNotes,
        inclusions: opt.inclusions,
        exclusions: opt.exclusions,
        sortOrder: opt.sortOrder,
      })),
      selectedPackageOption: quotation.selectedPackageOption ? {
        id: quotation.selectedPackageOption.id,
        name: quotation.selectedPackageOption.name,
        subtitle: quotation.selectedPackageOption.subtitle,
        description: quotation.selectedPackageOption.description,
        isRecommended: quotation.selectedPackageOption.isRecommended,
        finalAmount: Number(quotation.selectedPackageOption.finalAmount),
        hotelNotes: quotation.selectedPackageOption.hotelNotes,
        vehicleNotes: quotation.selectedPackageOption.vehicleNotes,
        activityNotes: quotation.selectedPackageOption.activityNotes,
        inclusions: quotation.selectedPackageOption.inclusions,
        exclusions: quotation.selectedPackageOption.exclusions,
        sortOrder: quotation.selectedPackageOption.sortOrder,
      } : null,
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
   * Customer Action: Select Package Option from public view
   */
  async selectPublicPackageOption(shareToken: string, optionId: string) {
    const quotation = await prisma.quotation.findFirst({
      where: { shareToken, archivedAt: null },
      include: { bookings: true },
    });

    if (!quotation) {
      throw new Error("Quotation proposal not found or link has expired.");
    }

    if (quotation.validUntil && new Date() > new Date(quotation.validUntil)) {
      throw new Error("This quotation proposal has expired. Package options can no longer be modified.");
    }

    if (quotation.status === QuotationStatus.REJECTED || quotation.status === QuotationStatus.EXPIRED) {
      throw new Error(`This quotation has been ${quotation.status.toLowerCase()} and cannot be modified.`);
    }

    if (quotation.bookings.length > 0) {
      throw new Error("This proposal has already been confirmed as a booking and its package tier cannot be changed.");
    }

    const option = await prisma.quotationPackageOption.findUnique({
      where: { id: optionId },
    });

    if (!option || option.quotationId !== quotation.id) {
      throw new Error("Invalid package option selected for this proposal.");
    }

    const updated = await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        selectedPackageOptionId: optionId,
        finalAmount: option.finalAmount,
      },
    });

    return {
      success: true,
      message: `Selected package option "${option.name}".`,
      selectedPackageOptionId: optionId,
      finalAmount: Number(option.finalAmount),
    };
  },

  /**
   * Customer Action: Accept Proposal
   */
  async acceptPublicQuotation(shareToken: string, input?: AcceptQuotationInput) {
    const quotation = await prisma.quotation.findFirst({
      where: { shareToken, archivedAt: null },
      include: { bookings: true, packageOptions: true },
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

    let selectedOptionId = quotation.selectedPackageOptionId;
    let finalAmount = quotation.finalAmount;

    // If an option was selected during acceptance
    if (input?.selectedOptionId) {
      const chosen = quotation.packageOptions.find((p) => p.id === input.selectedOptionId);
      if (!chosen) {
        throw new Error("Selected package option is not valid for this proposal.");
      }
      selectedOptionId = chosen.id;
      finalAmount = chosen.finalAmount;
    }

    const updated = await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        status: QuotationStatus.ACCEPTED,
        acceptedAt: new Date(),
        selectedPackageOptionId: selectedOptionId,
        finalAmount,
      },
    });

    return {
      success: true,
      message: "Thank you! You have accepted the quotation proposal. Our travel specialist will be in touch shortly.",
      quotationId: updated.id,
      status: updated.status,
      selectedPackageOptionId: updated.selectedPackageOptionId,
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

    return {
      success: true,
      message: "Your feedback and revision request have been submitted to your travel advisor.",
      quotationId: updated.id,
    };
  },
};
