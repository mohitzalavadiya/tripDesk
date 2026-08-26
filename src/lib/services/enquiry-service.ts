import "server-only";
import { prisma } from "@/lib/prisma";
import {
  Enquiry,
  EnquiryStatus,
  EnquiryPriority,
  EnquirySource,
  EnquiryFollowUp,
  FollowUpStatus,
  FollowUpType,
  Prisma,
} from "@prisma/client";
import {
  CreateEnquiryInput,
  UpdateEnquiryInput,
  EnquiryQueryInput,
  ConvertEnquiryToTripInput,
  CreateFollowUpInput,
  UpdateFollowUpInput,
} from "@/lib/validation/enquiry-schema";
import { tripService } from "./trip-service";

export type EnquiryWithRelations = Enquiry & {
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
  };
  convertedTrip?: {
    id: string;
    title: string;
    tripNumber: string;
    startDate: Date;
    endDate: Date;
    status: string;
  } | null;
  convertedQuotation?: {
    id: string;
    quotationNumber: string;
    version: number;
    finalAmount: Prisma.Decimal;
    status: string;
  } | null;
  followUps: EnquiryFollowUp[];
  _count?: {
    followUps: number;
  };
};

export const enquiryService = {
  /**
   * Generates sequential agency-scoped enquiry numbers (ENQ-YYYY-XXXXX)
   */
  async generateNextEnquiryNumber(agencyId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const db = tx || prisma;
    const currentYear = new Date().getFullYear();
    const prefix = `ENQ-${currentYear}-`;

    const lastEnquiry = await db.enquiry.findFirst({
      where: {
        agencyId,
        enquiryNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        enquiryNumber: "desc",
      },
      select: {
        enquiryNumber: true,
      },
    });

    let nextSeq = 1;
    if (lastEnquiry?.enquiryNumber) {
      const parts = lastEnquiry.enquiryNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(5, "0")}`;
  },

  /**
   * List enquiries with search, filters, sorting, and pagination
   */
  async getEnquiries(
    agencyId: string,
    query: Partial<EnquiryQueryInput> = {}
  ): Promise<{ data: EnquiryWithRelations[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { search, status, priority, source, customerId, sortBy = "createdAt", sortOrder = "desc" } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.EnquiryWhereInput = {
      agencyId,
      archivedAt: null,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(source ? { source } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { enquiryNumber: { contains: search, mode: "insensitive" } },
              { title: { contains: search, mode: "insensitive" } },
              { destination: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { customer: { phone: { contains: search, mode: "insensitive" } } },
              { customer: { email: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.enquiry.count({ where }),
      prisma.enquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: {
            select: { id: true, name: true, phone: true, email: true, address: true },
          },
          convertedTrip: {
            select: { id: true, title: true, tripNumber: true, startDate: true, endDate: true, status: true },
          },
          convertedQuotation: {
            select: { id: true, quotationNumber: true, version: true, finalAmount: true, status: true },
          },
          followUps: {
            where: { archivedAt: null },
            orderBy: { scheduledAt: "asc" },
          },
        },
      }),
    ]);

    return {
      data: data as EnquiryWithRelations[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Get single enquiry by ID
   */
  async getEnquiry(agencyId: string, enquiryId: string): Promise<EnquiryWithRelations | null> {
    const enquiry = await prisma.enquiry.findFirst({
      where: { id: enquiryId, agencyId, archivedAt: null },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true, address: true },
        },
        convertedTrip: {
          select: { id: true, title: true, tripNumber: true, startDate: true, endDate: true, status: true },
        },
        convertedQuotation: {
          select: { id: true, quotationNumber: true, version: true, finalAmount: true, status: true },
        },
        followUps: {
          where: { archivedAt: null },
          orderBy: { scheduledAt: "desc" },
        },
      },
    });

    return enquiry as EnquiryWithRelations | null;
  },

  /**
   * Create a new Enquiry
   */
  async createEnquiry(agencyId: string, data: CreateEnquiryInput): Promise<EnquiryWithRelations> {
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, agencyId, archivedAt: null },
    });

    if (!customer) {
      throw new Error("Customer not found or does not belong to this agency.");
    }

    const enquiryNumber = await this.generateNextEnquiryNumber(agencyId);
    const title = data.title?.trim() || `${data.destination} Trip - ${customer.name}`;

    const enquiry = await prisma.$transaction(async (tx) => {
      const e = await tx.enquiry.create({
        data: {
          agencyId,
          customerId: data.customerId,
          enquiryNumber,
          title,
          destination: data.destination,
          origin: data.origin,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          adults: data.adults,
          children: data.children,
          infants: data.infants,
          budget: data.budget !== undefined && data.budget !== null ? new Prisma.Decimal(data.budget) : null,
          budgetType: data.budgetType || "total",
          currency: data.currency || "INR",
          hotelCategory: data.hotelCategory,
          mealPlan: data.mealPlan,
          vehiclePreference: data.vehiclePreference,
          transportRequired: data.transportRequired ?? false,
          source: data.source || EnquirySource.WHATSAPP,
          priority: data.priority || EnquiryPriority.MEDIUM,
          status: data.status || EnquiryStatus.NEW,
          specialRequirements: data.specialRequirements,
          notes: data.notes,
          internalNotes: data.internalNotes,
          assignedTo: data.assignedTo,
          nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
        },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
          convertedTrip: { select: { id: true, title: true, tripNumber: true, startDate: true, endDate: true, status: true } },
          convertedQuotation: { select: { id: true, quotationNumber: true, version: true, finalAmount: true, status: true } },
          followUps: true,
        },
      });

      // If next follow-up is scheduled, create initial follow-up task
      if (data.nextFollowUpAt) {
        await tx.enquiryFollowUp.create({
          data: {
            agencyId,
            enquiryId: e.id,
            type: FollowUpType.CALL,
            status: FollowUpStatus.PENDING,
            scheduledAt: new Date(data.nextFollowUpAt),
            notes: "Initial follow-up scheduled on enquiry creation.",
          },
        });
      }

      return e;
    });

    return enquiry as EnquiryWithRelations;
  },

  /**
   * Update an existing Enquiry
   */
  async updateEnquiry(
    agencyId: string,
    enquiryId: string,
    data: UpdateEnquiryInput
  ): Promise<EnquiryWithRelations> {
    const enquiry = await prisma.enquiry.findFirst({
      where: { id: enquiryId, agencyId, archivedAt: null },
    });

    if (!enquiry) {
      throw new Error("Enquiry not found.");
    }

    if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, agencyId, archivedAt: null },
      });
      if (!customer) {
        throw new Error("Customer not found.");
      }
    }

    const updateData: Prisma.EnquiryUpdateInput = {};

    if (data.customerId !== undefined) updateData.customer = { connect: { id: data.customerId } };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.destination !== undefined) updateData.destination = data.destination;
    if (data.origin !== undefined) updateData.origin = data.origin;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.adults !== undefined) updateData.adults = data.adults;
    if (data.children !== undefined) updateData.children = data.children;
    if (data.infants !== undefined) updateData.infants = data.infants;
    if (data.budget !== undefined) {
      updateData.budget = data.budget !== null ? new Prisma.Decimal(data.budget) : null;
    }
    if (data.budgetType !== undefined) updateData.budgetType = data.budgetType;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.hotelCategory !== undefined) updateData.hotelCategory = data.hotelCategory;
    if (data.mealPlan !== undefined) updateData.mealPlan = data.mealPlan;
    if (data.vehiclePreference !== undefined) updateData.vehiclePreference = data.vehiclePreference;
    if (data.transportRequired !== undefined) updateData.transportRequired = data.transportRequired;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.specialRequirements !== undefined) updateData.specialRequirements = data.specialRequirements;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.nextFollowUpAt !== undefined) {
      updateData.nextFollowUpAt = data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null;
    }
    if (data.lostReason !== undefined) updateData.lostReason = data.lostReason;

    if (data.status !== undefined) {
      updateData.status = data.status;
      if ((data.status === EnquiryStatus.LOST || data.status === EnquiryStatus.CANCELLED) && !enquiry.closedAt) {
        updateData.closedAt = new Date();
      }
    }

    const updated = await prisma.enquiry.update({
      where: { id: enquiryId },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
        convertedTrip: { select: { id: true, title: true, tripNumber: true, startDate: true, endDate: true, status: true } },
        convertedQuotation: { select: { id: true, quotationNumber: true, version: true, finalAmount: true, status: true } },
        followUps: { where: { archivedAt: null }, orderBy: { scheduledAt: "desc" } },
      },
    });

    return updated as EnquiryWithRelations;
  },

  /**
   * Soft delete / archive enquiry
   */
  async archiveEnquiry(agencyId: string, enquiryId: string): Promise<Enquiry> {
    const enquiry = await prisma.enquiry.findFirst({
      where: { id: enquiryId, agencyId, archivedAt: null },
    });

    if (!enquiry) {
      throw new Error("Enquiry not found.");
    }

    return prisma.enquiry.update({
      where: { id: enquiryId },
      data: { archivedAt: new Date() },
    });
  },

  /**
   * Convert Enquiry to a Trip Workspace (Transactional & Idempotent)
   */
  async convertEnquiryToTrip(
    agencyId: string,
    enquiryId: string,
    data?: ConvertEnquiryToTripInput
  ): Promise<{ tripId: string; enquiry: EnquiryWithRelations }> {
    const enquiry = await prisma.enquiry.findFirst({
      where: { id: enquiryId, agencyId, archivedAt: null },
      include: { customer: true },
    });

    if (!enquiry) {
      throw new Error("Enquiry not found.");
    }

    // If already converted, return existing trip
    if (enquiry.convertedTripId) {
      const fullEnquiry = await this.getEnquiry(agencyId, enquiryId);
      return { tripId: enquiry.convertedTripId, enquiry: fullEnquiry! };
    }

    const tripTitle = data?.title?.trim() || enquiry.title || `${enquiry.destination} Trip`;
    const startDate = enquiry.startDate || new Date();
    const endDate = enquiry.endDate || new Date(Date.now() + 86400000 * 5); // 5 days default

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Trip
      const createdTrip = await tripService.createTrip(agencyId, {
        customerId: enquiry.customerId,
        title: tripTitle,
        startDate: startDate,
        endDate: endDate,
        status: "DRAFT",
        notes: data?.notes || enquiry.notes || `Created from Enquiry ${enquiry.enquiryNumber}.`,
      });

      // 2. Add extra traveler records if needed
      const totalPax = enquiry.adults + enquiry.children + enquiry.infants;
      if (totalPax > 1) {
        for (let i = 2; i <= enquiry.adults; i++) {
          await tx.traveler.create({
            data: {
              tripId: createdTrip.id,
              name: `Adult Guest ${i}`,
              type: "ADULT",
            },
          });
        }
        for (let i = 1; i <= enquiry.children; i++) {
          await tx.traveler.create({
            data: {
              tripId: createdTrip.id,
              name: `Child ${i}`,
              type: "CHILD",
            },
          });
        }
        for (let i = 1; i <= enquiry.infants; i++) {
          await tx.traveler.create({
            data: {
              tripId: createdTrip.id,
              name: `Infant ${i}`,
              type: "CHILD",
            },
          });
        }
      }

      // 3. Update Enquiry status to CONVERTED
      const updatedEnquiry = await tx.enquiry.update({
        where: { id: enquiryId },
        data: {
          status: EnquiryStatus.CONVERTED,
          convertedTripId: createdTrip.id,
          closedAt: new Date(),
        },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
          convertedTrip: { select: { id: true, title: true, tripNumber: true, startDate: true, endDate: true, status: true } },
          convertedQuotation: { select: { id: true, quotationNumber: true, version: true, finalAmount: true, status: true } },
          followUps: { where: { archivedAt: null }, orderBy: { scheduledAt: "desc" } },
        },
      });

      return {
        tripId: createdTrip.id,
        enquiry: updatedEnquiry as EnquiryWithRelations,
      };
    });

    return result;
  },

  /**
   * Get follow-ups for an enquiry
   */
  async getFollowUps(agencyId: string, enquiryId: string): Promise<EnquiryFollowUp[]> {
    return prisma.enquiryFollowUp.findMany({
      where: {
        agencyId,
        enquiryId,
        archivedAt: null,
      },
      orderBy: { scheduledAt: "desc" },
    });
  },

  /**
   * Add a follow-up to an enquiry
   */
  async createFollowUp(
    agencyId: string,
    enquiryId: string,
    data: CreateFollowUpInput
  ): Promise<EnquiryFollowUp> {
    const enquiry = await prisma.enquiry.findFirst({
      where: { id: enquiryId, agencyId, archivedAt: null },
    });

    if (!enquiry) {
      throw new Error("Enquiry not found.");
    }

    const scheduledDate = new Date(data.scheduledAt);

    return prisma.$transaction(async (tx) => {
      const f = await tx.enquiryFollowUp.create({
        data: {
          agencyId,
          enquiryId,
          type: data.type || FollowUpType.CALL,
          status: data.status || FollowUpStatus.PENDING,
          scheduledAt: scheduledDate,
          notes: data.notes,
        },
      });

      // Update nextFollowUpAt on the enquiry if this follow-up is in the future
      if (!enquiry.nextFollowUpAt || scheduledDate < enquiry.nextFollowUpAt || enquiry.nextFollowUpAt < new Date()) {
        await tx.enquiry.update({
          where: { id: enquiryId },
          data: { nextFollowUpAt: scheduledDate },
        });
      }

      return f;
    });
  },

  /**
   * Update a follow-up
   */
  async updateFollowUp(
    agencyId: string,
    followUpId: string,
    data: UpdateFollowUpInput
  ): Promise<EnquiryFollowUp> {
    const followUp = await prisma.enquiryFollowUp.findFirst({
      where: { id: followUpId, agencyId, archivedAt: null },
    });

    if (!followUp) {
      throw new Error("Follow-up not found.");
    }

    const updateData: Prisma.EnquiryFollowUpUpdateInput = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.scheduledAt !== undefined) updateData.scheduledAt = new Date(data.scheduledAt);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === FollowUpStatus.COMPLETED && !followUp.completedAt) {
        updateData.completedAt = new Date();
      }
    }
    if (data.completedAt !== undefined) {
      updateData.completedAt = data.completedAt ? new Date(data.completedAt) : null;
    }

    return prisma.enquiryFollowUp.update({
      where: { id: followUpId },
      data: updateData,
    });
  },

  /**
   * Soft delete / archive a follow-up
   */
  async deleteFollowUp(agencyId: string, followUpId: string): Promise<EnquiryFollowUp> {
    const followUp = await prisma.enquiryFollowUp.findFirst({
      where: { id: followUpId, agencyId, archivedAt: null },
    });

    if (!followUp) {
      throw new Error("Follow-up not found.");
    }

    return prisma.enquiryFollowUp.update({
      where: { id: followUpId },
      data: { archivedAt: new Date() },
    });
  },

  /**
   * Get high-level KPI stats for enquiries
   */
  async getEnquiryStats(agencyId: string) {
    const [total, newCount, contacted, qualified, quoted, negotiation, converted, lost, cancelled] =
      await Promise.all([
        prisma.enquiry.count({ where: { agencyId, archivedAt: null } }),
        prisma.enquiry.count({ where: { agencyId, archivedAt: null, status: EnquiryStatus.NEW } }),
        prisma.enquiry.count({ where: { agencyId, archivedAt: null, status: EnquiryStatus.CONTACTED } }),
        prisma.enquiry.count({ where: { agencyId, archivedAt: null, status: EnquiryStatus.QUALIFIED } }),
        prisma.enquiry.count({ where: { agencyId, archivedAt: null, status: EnquiryStatus.QUOTATION_SENT } }),
        prisma.enquiry.count({ where: { agencyId, archivedAt: null, status: EnquiryStatus.NEGOTIATION } }),
        prisma.enquiry.count({ where: { agencyId, archivedAt: null, status: EnquiryStatus.CONVERTED } }),
        prisma.enquiry.count({ where: { agencyId, archivedAt: null, status: EnquiryStatus.LOST } }),
        prisma.enquiry.count({ where: { agencyId, archivedAt: null, status: EnquiryStatus.CANCELLED } }),
      ]);

    const active = newCount + contacted + qualified + quoted + negotiation;

    return {
      total,
      active,
      newCount,
      contacted,
      qualified,
      quoted,
      negotiation,
      converted,
      lost,
      cancelled,
    };
  },
};
