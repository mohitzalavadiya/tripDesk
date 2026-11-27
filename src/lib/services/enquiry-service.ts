import { prisma } from "@/lib/prisma";
import {
  AssignLeadInput,
  CheckDuplicateEnquiryQuery,
  ConvertEnquiryToTripInput,
  CreateEnquiryInput,
  CreateFollowUpInput,
  EnquiryQueryInput,
  QuickLogInteractionInput,
  MarkEnquiryLostInput,
  MarkEnquiryWonInput,
  TransitionStageInput,
  UpdateEnquiryInput,
  UpdateFollowUpInput,
} from "@/lib/validation/enquiry-schema";
import {
  Enquiry,
  EnquiryFollowUp,
  EnquiryPriority,
  EnquirySource,
  EnquiryStatus,
  FollowUpStatus,
  FollowUpType,
  Prisma,
} from "@prisma/client";
import { getTodayBoundaries } from "@/lib/utils/timezone";
import {
  ALL_CANONICAL_STRUCTURED_OUTCOMES,
  getStaleCutoffDate,
  isQualifyingCustomerContact,
  isValidOutcomeFormat,
  QUALIFYING_CUSTOMER_CONTACT_TYPES,
  STALE_THRESHOLD_DAYS,
  stripIdempotencyMarker,
} from "@/lib/utils/crm-urgency";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import "server-only";
import { communicationService } from "./communication-service";
import { evaluateRepeatCustomerStatus } from "./customer-service";
import { followUpService } from "./follow-up-service";
import { internalNotificationService } from "./internal-notification-service";
import { tripService } from "./trip-service";
import { agencyAuditService } from "./agency-audit-service";

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
  isRepeatCustomer?: boolean;
};

export interface CrmTimelineEvent {
  id: string;
  type:
    | "ENQUIRY_CREATED"
    | "STAGE_CHANGED"
    | "FIELD_UPDATED"
    | "FOLLOW_UP_SCHEDULED"
    | "FOLLOW_UP_COMPLETED"
    | "FOLLOW_UP_RESCHEDULED"
    | "FOLLOW_UP_CANCELLED"
    | "QUOTATION_CREATED"
    | "QUOTATION_ACCEPTED"
    | "BOOKING_CREATED"
    | "ENQUIRY_CONVERTED"
    | "ENQUIRY_LOST"
    | "LEAD_REASSIGNED"
    | "INTERACTION_LOGGED";
  title: string;
  description: string;
  timestamp: Date;
  referenceId?: string;
  referenceUrl?: string;
  statusBadge?: string;
  actorName?: string;
  actorRole?: string;
  changes?: Array<{ field: string; label: string; oldValue?: any; newValue?: any }>;
  metadata?: Record<string, any>;
}

export interface EnquiryAssignee {
  id?: string;
  name: string;
  email?: string;
  role?: string;
  isUser: boolean;
}

export interface EnquiryDetails360 extends EnquiryWithRelations {
  isRepeatCustomer: boolean;
  timeline: CrmTimelineEvent[];
}

export interface CrmDashboardStats {
  pipelineSummary: Record<string, { count: number; totalBudget: number }>;
  followUpSummary: {
    overdueCount: number;
    todayCount: number;
    upcomingCount: number;
    completedCount: number;
    totalPending: number;
  };
  salesSummary: {
    totalLeads: number;
    activeLeads: number;
    wonLeads: number;
    lostLeads: number;
    conversionRate: number;
  };
  sourcesSummary: { source: string; count: number }[];
}

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
    query: Partial<EnquiryQueryInput> = {},
    authenticatedUser?: { userId: string; userName?: string | null }
  ): Promise<{ data: EnquiryWithRelations[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { search, status, priority, source, customerId, urgency, assignedTo, sortBy = "createdAt", sortOrder = "desc" } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.EnquiryWhereInput = {
      agencyId,
      archivedAt: null,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(source ? { source } : {}),
      ...(customerId ? { customerId } : {}),
      ...(assignedTo
        ? assignedTo.toLowerCase() === "unassigned"
          ? { assignedTo: null }
          : assignedTo.toLowerCase() === "assigned"
          ? { assignedTo: { not: null } }
          : { assignedTo: { equals: assignedTo, mode: "insensitive" } }
        : {}),
      ...(search
        ? {
            OR: [
              { enquiryNumber: { contains: search, mode: "insensitive" } },
              { title: { contains: search, mode: "insensitive" } },
              { destination: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { customer: { phone: { contains: search, mode: "insensitive" } } },
              { customer: { email: { contains: search, mode: "insensitive" } } },
              { assignedTo: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    if ((query.scope === "my" || (query as any).myEnquiries === true) && authenticatedUser?.userId) {
      const myUid = authenticatedUser.userId;
      const myName = authenticatedUser.userName?.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { assignedToUserId: myUid },
            ...(myName ? [{ assignedTo: { equals: myName, mode: "insensitive" as const } }] : []),
            { assignedTo: myUid },
          ],
        },
        {
          NOT: [
            { assignedTo: null, assignedToUserId: null },
          ],
        },
      ];
    }

    if (urgency && urgency !== "all") {
      const { start: todayStart, end: todayEnd } = getTodayBoundaries();
      if (urgency === "overdue") {
        where.followUps = {
          some: {
            archivedAt: null,
            status: FollowUpStatus.PENDING,
            scheduledAt: { lt: todayStart },
          },
        };
      } else if (urgency === "due_today" || urgency === "today") {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          {
            followUps: {
              some: {
                archivedAt: null,
                status: FollowUpStatus.PENDING,
                scheduledAt: { gte: todayStart, lte: todayEnd },
              },
            },
          },
          {
            followUps: {
              none: {
                archivedAt: null,
                status: FollowUpStatus.PENDING,
                scheduledAt: { lt: todayStart },
              },
            },
          },
        ];
      } else if (urgency === "upcoming") {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          {
            followUps: {
              some: {
                archivedAt: null,
                status: FollowUpStatus.PENDING,
                scheduledAt: { gt: todayEnd },
              },
            },
          },
          {
            followUps: {
              none: {
                archivedAt: null,
                status: FollowUpStatus.PENDING,
                scheduledAt: { lte: todayEnd },
              },
            },
          },
        ];
      } else if (urgency === "no_next_action") {
        where.followUps = {
          none: {
            archivedAt: null,
            status: FollowUpStatus.PENDING,
          },
        };
      } else if (urgency === "stale") {
        const todayBounds = getTodayBoundaries();
        const staleCutoff = getStaleCutoffDate(todayBounds, STALE_THRESHOLD_DAYS);
        const candidateFollowUps = await prisma.enquiryFollowUp.findMany({
          where: {
            agencyId,
            archivedAt: null,
            status: FollowUpStatus.COMPLETED,
            completedAt: { gte: staleCutoff },
            type: { in: QUALIFYING_CUSTOMER_CONTACT_TYPES },
          },
          select: {
            enquiryId: true,
            type: true,
            outcome: true,
            notes: true,
          },
        });

        const activeEnquiryIds = new Set<string>();
        for (const f of candidateFollowUps) {
          if (isQualifyingCustomerContact(f as EnquiryFollowUp)) {
            activeEnquiryIds.add(f.enquiryId);
          }
        }

        where.status = {
          in: [
            EnquiryStatus.NEW,
            EnquiryStatus.CONTACTED,
            EnquiryStatus.QUALIFIED,
            EnquiryStatus.FOLLOW_UP,
            EnquiryStatus.QUOTATION_SENT,
            EnquiryStatus.NEGOTIATION,
          ],
        };

        where.createdAt = { lt: staleCutoff };
        if (activeEnquiryIds.size > 0) {
          Object.assign(where, { id: { notIn: Array.from(activeEnquiryIds) } });
        }
      }
    }

    const orderBy: Prisma.EnquiryOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [total, enquiries] = await Promise.all([
      prisma.enquiry.count({ where }),
      prisma.enquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              address: true,
            },
          },
          convertedTrip: {
            select: {
              id: true,
              title: true,
              tripNumber: true,
              startDate: true,
              endDate: true,
              status: true,
            },
          },
          convertedQuotation: {
            select: {
              id: true,
              quotationNumber: true,
              version: true,
              finalAmount: true,
              status: true,
            },
          },
          followUps: {
            where: { archivedAt: null },
            orderBy: { scheduledAt: "desc" },
          },
          _count: {
            select: { followUps: true },
          },
        },
      }),
    ]);

    return {
      data: enquiries as EnquiryWithRelations[],
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
      where: {
        id: enquiryId,
        agencyId,
        archivedAt: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        convertedTrip: {
          select: {
            id: true,
            title: true,
            tripNumber: true,
            startDate: true,
            endDate: true,
            status: true,
            bookings: {
              where: { archivedAt: null },
              select: {
                id: true,
                bookingNumber: true,
                totalAmount: true,
                paidAmount: true,
                balanceAmount: true,
                status: true,
              },
            },
          },
        },
        convertedQuotation: {
          select: {
            id: true,
            quotationNumber: true,
            version: true,
            finalAmount: true,
            status: true,
          },
        },
        followUps: {
          where: { archivedAt: null },
          orderBy: { scheduledAt: "desc" },
        },
      },
    });

    if (!enquiry) {
      return null;
    }

    const isRepeatCustomer = await this.isCustomerRepeat(agencyId, enquiry.customerId);

    return {
      ...enquiry,
      isRepeatCustomer,
    } as EnquiryWithRelations;
  },

  /**
   * Create a new Enquiry
   */
  async createEnquiry(
    agencyId: string,
    data: CreateEnquiryInput,
    actor?: { userId?: string; userName?: string; role?: string }
  ): Promise<EnquiryWithRelations> {
    if (data.status === EnquiryStatus.CONVERTED) {
      throw new ValidationError("New enquiries cannot be created with CONVERTED status. Conversion occurs only upon booking confirmation.");
    }
    if (data.status === EnquiryStatus.LOST || data.status === EnquiryStatus.CANCELLED) {
      throw new ValidationError("Initial enquiries must begin in an active stage (e.g., NEW, CONTACTED). Mark as LOST or CANCELLED only through explicit lifecycle progression.");
    }

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, agencyId, archivedAt: null },
    });

    if (!customer) {
      throw new NotFoundError("Customer not found or does not belong to this agency.");
    }

    const enquiryNumber = await this.generateNextEnquiryNumber(agencyId);

    const enquiry = await prisma.enquiry.create({
      data: {
        agencyId,
        customerId: data.customerId,
        enquiryNumber,
        title: data.title || `${data.destination} Trip`,
        destination: data.destination,
        origin: data.origin,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        adults: data.adults,
        children: data.children,
        infants: data.infants,
        budget: data.budget ? new Prisma.Decimal(data.budget) : null,
        budgetType: data.budgetType,
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
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        followUps: true,
      },
    });

    if (data.nextFollowUpAt) {
      await prisma.enquiryFollowUp.create({
        data: {
          agencyId,
          enquiryId: enquiry.id,
          type: FollowUpType.CALL,
          status: FollowUpStatus.PENDING,
          scheduledAt: new Date(data.nextFollowUpAt),
          notes: "Initial follow-up scheduled automatically",
        },
      });
    }

    internalNotificationService.notifyAgencyOwner(agencyId, {
      type: "ENQUIRY_CREATED" as any,
      title: "New Travel Enquiry Received",
      message: `Enquiry ${enquiry.enquiryNumber} from ${customer.name} for ${enquiry.destination}.`,
      linkUrl: `/enquiries/${enquiry.id}`,
      metadata: {
        enquiryId: enquiry.id,
        enquiryNumber: enquiry.enquiryNumber,
        destination: enquiry.destination,
      },
    }).catch((err) => {
      console.warn("[EnquiryService] Failed to notify agency owner of enquiry creation:", err);
    });

    if (actor?.userId) {
      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor.userId,
        action: "ENQUIRY_CREATED",
        entityType: "ENQUIRY",
        entityId: enquiry.id,
        metadata: {
          actorName: actor.userName || "Team Member",
          actorRole: actor.role,
          summary: `Lead ${enquiry.enquiryNumber} captured for ${enquiry.destination}`,
        },
      }).catch(() => {});
    }

    return enquiry as EnquiryWithRelations;
  },

  /**
   * Update an existing Enquiry
   */
  async updateEnquiry(
    agencyId: string,
    enquiryId: string,
    data: UpdateEnquiryInput,
    actor?: { userId?: string; userName?: string; role?: string }
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
      if (data.status === EnquiryStatus.CONVERTED) {
        throw new ValidationError(
          "Direct transition to CONVERTED is restricted. Enquiries are automatically converted only when an authorized booking is confirmed."
        );
      }
      if (enquiry.status === EnquiryStatus.CONVERTED) {
        throw new ValidationError(
          "A converted enquiry cannot transition to another stage. It is permanently won by confirmed booking."
        );
      }
      if (data.status === EnquiryStatus.LOST) {
        const effectiveLostReason = data.lostReason ?? enquiry.lostReason;
        if (!effectiveLostReason || !effectiveLostReason.trim()) {
          throw new ValidationError("A structured lost reason is mandatory when marking a lead as LOST.");
        }
        updateData.status = data.status;
        updateData.lostReason = effectiveLostReason.trim();
        updateData.lostExplanation = data.lostExplanation ?? enquiry.lostExplanation ?? null;
        updateData.closedAt = enquiry.closedAt || new Date();
      } else if (data.status === EnquiryStatus.CANCELLED) {
        updateData.status = data.status;
        updateData.closedAt = enquiry.closedAt || new Date();
        updateData.lostReason = null;
        updateData.lostExplanation = null;
      } else if (enquiry.status === EnquiryStatus.LOST || enquiry.status === EnquiryStatus.CANCELLED) {
        // Reopening an enquiry from LOST or CANCELLED to an active stage
        updateData.status = data.status;
        updateData.closedAt = null;
        updateData.lostReason = null;
        updateData.lostExplanation = null;
      } else {
        updateData.status = data.status;
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

    // Detect changed fields and record audit history
    const changes: Array<{ field: string; label: string; oldValue?: any; newValue?: any }> = [];
    const fieldMap: Record<string, string> = {
      title: "Title",
      destination: "Destination",
      origin: "Origin",
      startDate: "Start Date",
      endDate: "End Date",
      adults: "Adults",
      children: "Children",
      infants: "Infants",
      budget: "Budget",
      budgetType: "Budget Type",
      currency: "Currency",
      hotelCategory: "Hotel Category",
      mealPlan: "Meal Plan",
      vehiclePreference: "Vehicle Preference",
      transportRequired: "Transport Required",
      source: "Source",
      priority: "Priority",
      status: "Stage",
      specialRequirements: "Special Requirements",
      notes: "Notes",
      internalNotes: "Internal Notes",
      assignedTo: "Assignee",
      lostReason: "Lost Reason",
    };
    for (const [key, label] of Object.entries(fieldMap)) {
      if ((data as any)[key] !== undefined) {
        const oldVal = (enquiry as any)[key];
        const newVal = (data as any)[key];
        const oldStr = oldVal instanceof Date ? oldVal.toISOString().split("T")[0] : String(oldVal ?? "");
        const newStr = newVal instanceof Date ? newVal.toISOString().split("T")[0] : String(newVal ?? "");
        if (oldStr !== newStr) {
          changes.push({
            field: key,
            label,
            oldValue: oldVal instanceof Prisma.Decimal ? Number(oldVal) : oldVal,
            newValue: newVal,
          });
        }
      }
    }

    if (changes.length > 0 && (actor?.userId || actor?.userName)) {
      const isStageChange = changes.some((c) => c.field === "status");
      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor?.userId || "SYSTEM",
        action: isStageChange ? "STAGE_CHANGED" : "ENQUIRY_UPDATED",
        entityType: "ENQUIRY",
        entityId: enquiry.id,
        previousState: enquiry,
        newState: data,
        metadata: {
          actorName: actor?.userName || (actor?.userId ? "Team Member" : "System"),
          actorRole: actor?.role,
          changes,
          summary: isStageChange
            ? `Stage changed from ${(enquiry as any).status} to ${data.status}`
            : `${changes.length} field(s) updated: ${changes.map((c) => c.label).join(", ")}`,
          previousStatus: (enquiry as any).status,
          newStatus: data.status,
        },
      }).catch(() => {});
    }

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
    data?: ConvertEnquiryToTripInput,
    actor?: { userId?: string; userName?: string; role?: string }
  ): Promise<{ tripId: string; enquiry: EnquiryWithRelations }> {
    return await prisma.$transaction(async (tx) => {
      // 1. Lock the enquiry row FOR UPDATE to strictly serialize concurrent conversion requests
      const lockedEnquiries = await tx.$queryRaw<Array<{
        id: string;
        agencyId: string;
        convertedTripId: string | null;
        customerId: string;
        status: EnquiryStatus;
        title: string | null;
        destination: string | null;
        enquiryNumber: string;
        notes: string | null;
        startDate: Date | null;
        endDate: Date | null;
        adults: number;
        children: number;
        infants: number;
      }>>`
        SELECT "id", "agencyId", "convertedTripId", "customerId", "status", "title", "destination", "enquiryNumber", "notes", "startDate", "endDate", "adults", "children", "infants"
        FROM "enquiries"
        WHERE "id" = ${enquiryId} AND "agencyId" = ${agencyId} AND "archivedAt" IS NULL
        FOR UPDATE
      `;

      const lockedEnquiry = lockedEnquiries[0];
      if (!lockedEnquiry) {
        throw new Error("Enquiry not found.");
      }

      // Prohibit converting a lost or cancelled enquiry to a trip workspace without explicit reopening
      if (lockedEnquiry.status === EnquiryStatus.LOST || lockedEnquiry.status === EnquiryStatus.CANCELLED) {
        throw new ValidationError("Cannot convert a lost or cancelled enquiry to a trip workspace without reopening it first.");
      }

      // 2. Idempotency guard: If already converted, return existing trip
      if (lockedEnquiry.convertedTripId) {
        const existingFullEnquiry = await tx.enquiry.findFirst({
          where: { id: enquiryId, agencyId, archivedAt: null },
          include: {
            customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
            convertedTrip: { select: { id: true, title: true, tripNumber: true, startDate: true, endDate: true, status: true } },
            convertedQuotation: { select: { id: true, quotationNumber: true, version: true, finalAmount: true, status: true } },
            followUps: { where: { archivedAt: null }, orderBy: { scheduledAt: "desc" } },
          },
        });
        return { tripId: lockedEnquiry.convertedTripId, enquiry: existingFullEnquiry as EnquiryWithRelations };
      }

      const tripTitle = data?.title?.trim() || lockedEnquiry.title || `${lockedEnquiry.destination || "Custom"} Trip`;
      const startDate = lockedEnquiry.startDate || new Date();
      const endDate = lockedEnquiry.endDate || new Date(Date.now() + 86400000 * 5); // 5 days default

      // 3. Create Trip within the SAME transaction tx
      const createdTrip = await tripService.createTrip(
        agencyId,
        {
          customerId: lockedEnquiry.customerId,
          title: tripTitle,
          startDate: startDate,
          endDate: endDate,
          status: "DRAFT",
          notes: data?.notes || lockedEnquiry.notes || `Created from Enquiry ${lockedEnquiry.enquiryNumber}.`,
        },
        tx
      );

      // 4. Add extra traveler records if needed
      const totalPax = lockedEnquiry.adults + lockedEnquiry.children + lockedEnquiry.infants;
      if (totalPax > 1) {
        for (let i = 2; i <= lockedEnquiry.adults; i++) {
          await tx.traveler.create({
            data: {
              tripId: createdTrip.id,
              name: `Adult Guest ${i}`,
              type: "ADULT",
            },
          });
        }
        for (let i = 1; i <= lockedEnquiry.children; i++) {
          await tx.traveler.create({
            data: {
              tripId: createdTrip.id,
              name: `Child ${i}`,
              type: "CHILD",
            },
          });
        }
        for (let i = 1; i <= lockedEnquiry.infants; i++) {
          await tx.traveler.create({
            data: {
              tripId: createdTrip.id,
              name: `Infant ${i}`,
              type: "CHILD",
            },
          });
        }
      }

      // 5. Update Enquiry: advance to QUALIFIED if was NEW or CONTACTED, preserve active status and do NOT close
      const newStatus =
        lockedEnquiry.status === EnquiryStatus.NEW || lockedEnquiry.status === EnquiryStatus.CONTACTED
          ? EnquiryStatus.QUALIFIED
          : lockedEnquiry.status;

      const updatedEnquiry = await tx.enquiry.update({
        where: { id: enquiryId },
        data: {
          status: newStatus,
          convertedTripId: createdTrip.id,
          closedAt: null,
        },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
          convertedTrip: { select: { id: true, title: true, tripNumber: true, startDate: true, endDate: true, status: true } },
          convertedQuotation: { select: { id: true, quotationNumber: true, version: true, finalAmount: true, status: true } },
          followUps: { where: { archivedAt: null }, orderBy: { scheduledAt: "desc" } },
        },
      });

      // 6. Record conversion audit history
      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor?.userId || "SYSTEM",
        action: "ENQUIRY_CONVERTED_TO_TRIP",
        entityType: "ENQUIRY",
        entityId: enquiryId,
        metadata: {
          actorName: actor?.userName || "Team Member",
          actorRole: actor?.role,
          tripId: createdTrip.id,
          tripNumber: createdTrip.tripNumber,
          changes: [
            { field: "convertedTripId", label: "Trip Workspace", oldValue: null, newValue: createdTrip.tripNumber },
            ...(newStatus !== lockedEnquiry.status ? [{ field: "status", label: "Stage", oldValue: lockedEnquiry.status, newValue: newStatus }] : []),
          ],
          summary: `Converted to Trip Workspace ${createdTrip.tripNumber} (${tripTitle})`,
        },
      }, tx).catch(() => {});

      return {
        tripId: createdTrip.id,
        enquiry: updatedEnquiry as EnquiryWithRelations,
      };
    });
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
   * Create a follow-up
   */
  async createFollowUp(
    agencyId: string,
    enquiryId: string,
    data: CreateFollowUpInput,
    actor?: { userId?: string; userName?: string; role?: string }
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

      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor?.userId || "SYSTEM",
        action: "FOLLOW_UP_SCHEDULED",
        entityType: "ENQUIRY",
        entityId: enquiryId,
        metadata: {
          actorName: actor?.userName || "Team Member",
          actorRole: actor?.role,
          followUpId: f.id,
          type: f.type,
          scheduledAt: f.scheduledAt,
          notes: f.notes,
          summary: `${f.type} follow-up scheduled for ${new Date(f.scheduledAt).toLocaleString("en-IN")}`,
        },
      }, tx).catch(() => {});

      return f;
    });
  },

  /**
   * Update a follow-up
   */
  async updateFollowUp(
    agencyId: string,
    followUpId: string,
    data: UpdateFollowUpInput,
    actor?: { userId?: string; userName?: string; role?: string }
  ): Promise<EnquiryFollowUp> {
    const followUp = await prisma.enquiryFollowUp.findFirst({
      where: { id: followUpId, agencyId, archivedAt: null },
    });

    if (!followUp) {
      throw new Error("Follow-up not found.");
    }

    if (data.outcome && !isValidOutcomeFormat(data.outcome)) {
      throw new ValidationError(
        `Invalid structured outcome code: '${data.outcome}'. Supported outcomes are: ${ALL_CANONICAL_STRUCTURED_OUTCOMES.join(", ")}`
      );
    }

    if (data.status === FollowUpStatus.COMPLETED) {
      if (followUp.status !== FollowUpStatus.PENDING) {
        throw new ValidationError(`Cannot complete follow-up: task is already ${followUp.status.toLowerCase()}.`);
      }

      const cleanExistingNotes = stripIdempotencyMarker(followUp.notes);
      const cleanNewNotes =
        data.notes !== undefined
          ? (data.notes ? stripIdempotencyMarker(data.notes) : null)
          : cleanExistingNotes;

      const updateResult = await prisma.enquiryFollowUp.updateMany({
        where: {
          id: followUpId,
          agencyId,
          archivedAt: null,
          status: FollowUpStatus.PENDING,
        },
        data: {
          status: FollowUpStatus.COMPLETED,
          completedAt: new Date(),
          outcome: data.outcome || followUp.outcome || null,
          notes: cleanNewNotes || null,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictError(
          "Follow-up task could not be completed. It may have already been completed or modified by another request."
        );
      }

      const completed = (await prisma.enquiryFollowUp.findUnique({
        where: { id: followUpId },
      }))!;

      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor?.userId || "SYSTEM",
        action: "FOLLOW_UP_COMPLETED",
        entityType: "ENQUIRY",
        entityId: followUp.enquiryId,
        metadata: {
          actorName: actor?.userName || "Team Member",
          actorRole: actor?.role,
          followUpId,
          outcome: data.outcome || followUp.outcome || null,
          notes: cleanNewNotes || null,
          summary: `${followUp.type} follow-up completed${data.outcome ? ` • ${data.outcome}` : ""}`,
        },
      }).catch(() => {});

      return {
        ...completed,
        notes: stripIdempotencyMarker(completed.notes) || null,
      };
    }

    const updateData: Prisma.EnquiryFollowUpUpdateInput = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.scheduledAt !== undefined) updateData.scheduledAt = new Date(data.scheduledAt);
    if (data.notes !== undefined) updateData.notes = data.notes ? stripIdempotencyMarker(data.notes) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.completedAt !== undefined) {
      updateData.completedAt = data.completedAt ? new Date(data.completedAt) : null;
    }

    const updated = await prisma.enquiryFollowUp.update({
      where: { id: followUpId },
      data: updateData,
    });

    return {
      ...updated,
      notes: stripIdempotencyMarker(updated.notes) || null,
    };
  },

  /**
   * Soft delete / archive a follow-up
   */
  async deleteFollowUp(
    agencyId: string,
    followUpId: string,
    actor?: { userId?: string; userName?: string; role?: string }
  ): Promise<EnquiryFollowUp> {
    const followUp = await prisma.enquiryFollowUp.findFirst({
      where: { id: followUpId, agencyId, archivedAt: null },
    });

    if (!followUp) {
      throw new Error("Follow-up not found.");
    }

    const archived = await prisma.enquiryFollowUp.update({
      where: { id: followUpId },
      data: { archivedAt: new Date() },
    });

    await agencyAuditService.logEvent({
      agencyId,
      actorUserId: actor?.userId || "SYSTEM",
      action: "FOLLOW_UP_CANCELLED",
      entityType: "ENQUIRY",
      entityId: followUp.enquiryId,
      metadata: {
        actorName: actor?.userName || "Team Member",
        actorRole: actor?.role,
        followUpId,
        summary: `${followUp.type} follow-up cancelled / archived`,
      },
    }).catch(() => {});

    return archived;
  },

  /**
   * Get basic aggregated stats for enquiries
   */
  async getEnquiryStats(agencyId: string) {
    const [total, byStatus, byPriority] = await Promise.all([
      prisma.enquiry.count({
        where: { agencyId, archivedAt: null },
      }),
      prisma.enquiry.groupBy({
        by: ["status"],
        where: { agencyId, archivedAt: null },
        _count: { _all: true },
      }),
      prisma.enquiry.groupBy({
        by: ["priority"],
        where: { agencyId, archivedAt: null },
        _count: { _all: true },
      }),
    ]);

    const activeStatuses: EnquiryStatus[] = [
      EnquiryStatus.NEW,
      EnquiryStatus.CONTACTED,
      EnquiryStatus.QUALIFIED,
      EnquiryStatus.FOLLOW_UP,
      EnquiryStatus.QUOTATION_SENT,
      EnquiryStatus.NEGOTIATION,
    ];

    const activeCount = byStatus
      .filter((s) => activeStatuses.includes(s.status))
      .reduce((acc, curr) => acc + curr._count._all, 0);

    const convertedCount =
      byStatus.find((s) => s.status === EnquiryStatus.CONVERTED)?._count._all || 0;

    return {
      total,
      active: activeCount,
      converted: convertedCount,
      byStatus: byStatus.reduce((acc, curr) => {
        acc[curr.status] = curr._count._all;
        return acc;
      }, {} as Record<string, number>),
      byPriority: byPriority.reduce((acc, curr) => {
        acc[curr.priority] = curr._count._all;
        return acc;
      }, {} as Record<string, number>),
    };
  },

  /**
   * Check for duplicate active enquiries for the same customer
   */
  async checkDuplicateEnquiry(
    agencyId: string,
    query: CheckDuplicateEnquiryQuery
  ): Promise<{ hasDuplicate: boolean; duplicate?: EnquiryWithRelations | null }> {
    const { customerId, destination, startDate, endDate, excludeId } = query;

    const where: Prisma.EnquiryWhereInput = {
      agencyId,
      customerId,
      archivedAt: null,
      status: {
        in: [
          EnquiryStatus.NEW,
          EnquiryStatus.CONTACTED,
          EnquiryStatus.QUALIFIED,
          EnquiryStatus.FOLLOW_UP,
          EnquiryStatus.QUOTATION_SENT,
          EnquiryStatus.NEGOTIATION,
        ],
      },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      ...(destination ? { destination: { equals: destination, mode: "insensitive" } } : {}),
      ...(startDate && endDate
        ? {
            startDate: { lte: new Date(endDate) },
            endDate: { gte: new Date(startDate) },
          }
        : {}),
    };

    const duplicate = await prisma.enquiry.findFirst({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        followUps: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      hasDuplicate: Boolean(duplicate),
      duplicate: duplicate as EnquiryWithRelations | null,
    };
  },

  /**
   * Transition pipeline stage with strict guardrails
   */
  async transitionStage(
    agencyId: string,
    enquiryId: string,
    data: TransitionStageInput,
    actor?: { userId?: string; userName?: string; role?: string }
  ): Promise<EnquiryWithRelations> {
    const enquiry = await prisma.enquiry.findFirst({
      where: { id: enquiryId, agencyId, archivedAt: null },
    });

    if (!enquiry) {
      throw new Error("Enquiry not found.");
    }

    if (data.status === EnquiryStatus.CONVERTED) {
      throw new ValidationError(
        "Direct transition to CONVERTED is restricted. Enquiries are automatically converted only when an authorized booking is confirmed."
      );
    }

    if (enquiry.status === EnquiryStatus.CONVERTED) {
      throw new ValidationError(
        "A converted enquiry cannot transition to another stage. It is permanently won by confirmed booking."
      );
    }

    if (data.status === EnquiryStatus.LOST && !data.lostReason) {
      throw new ValidationError("A structured lostReason is required when marking an enquiry as LOST.");
    }

    const updateData: Prisma.EnquiryUpdateInput = {
      status: data.status,
    };

    if (data.status === EnquiryStatus.LOST) {
      updateData.lostReason = data.lostReason;
      updateData.lostExplanation = data.lostExplanation || null;
      updateData.closedAt = enquiry.closedAt || new Date();
    } else if (data.status === EnquiryStatus.CANCELLED) {
      updateData.closedAt = enquiry.closedAt || new Date();
      updateData.lostReason = null;
      updateData.lostExplanation = null;
    } else {
      // Reopening an enquiry from LOST or CANCELLED to an active stage
      if (enquiry.status === EnquiryStatus.LOST || enquiry.status === EnquiryStatus.CANCELLED) {
        updateData.closedAt = null;
        updateData.lostReason = null;
        updateData.lostExplanation = null;
      }
    }

    if (data.convertedTripId) updateData.convertedTrip = { connect: { id: data.convertedTripId } };
    if (data.convertedQuotationId) updateData.convertedQuotation = { connect: { id: data.convertedQuotationId } };

    if (data.notes) {
      const existingNotes = enquiry.notes ? `${enquiry.notes}\n` : "";
      updateData.notes = `${existingNotes}[Stage changed to ${data.status}]: ${data.notes}`;
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

    if (actor?.userId || actor?.userName) {
      const isLost = data.status === EnquiryStatus.LOST;
      const changes = [
        { field: "status", label: "Stage", oldValue: enquiry.status, newValue: data.status },
        ...(isLost && data.lostReason ? [{ field: "lostReason", label: "Lost Reason", oldValue: enquiry.lostReason, newValue: data.lostReason }] : []),
      ];
      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor?.userId || "SYSTEM",
        action: isLost ? "ENQUIRY_LOST" : "STAGE_CHANGED",
        entityType: "ENQUIRY",
        entityId: enquiry.id,
        metadata: {
          actorName: actor?.userName || (actor?.userId ? "Team Member" : "System"),
          actorRole: actor?.role,
          changes,
          previousStatus: enquiry.status,
          newStatus: data.status,
          lostReason: data.lostReason,
          lostExplanation: data.lostExplanation,
          summary: isLost
            ? `Marked as LOST: ${data.lostReason || "Unspecified"}`
            : `Stage changed from ${enquiry.status} to ${data.status}`,
        },
      }).catch(() => {});
    }

    return updated as EnquiryWithRelations;
  },

  /**
   * Mark lead as LOST with mandatory structured reason
   */
  async markEnquiryLost(
    agencyId: string,
    enquiryId: string,
    data: MarkEnquiryLostInput,
    actor?: { userId?: string; userName?: string; role?: string }
  ): Promise<EnquiryWithRelations> {
    return this.transitionStage(agencyId, enquiryId, {
      status: EnquiryStatus.LOST,
      lostReason: data.lostReason,
      lostExplanation: data.lostExplanation,
      notes: data.notes,
    }, actor);
  },

  /**
   * Mark lead as WON / CONVERTED (Prohibited legacy mutation helper)
   * Enforces invariant: enquiries can only transition to CONVERTED via authorized booking confirmation.
   */
  async markEnquiryWon(
    agencyId: string,
    enquiryId: string,
    data?: MarkEnquiryWonInput
  ): Promise<EnquiryWithRelations> {
    throw new ValidationError(
      "Manual conversion via markEnquiryWon is prohibited. Enquiries are converted only through the authorized booking-confirmation workflow."
    );
  },

  /**
   * Check if customer is a repeat customer based on authoritative records (V3 Section 265)
   * Requires >= 1 genuinely COMPLETED trip, OR >= 2 distinct eligible confirmed bookings.
   * Single bookings, converted enquiries, draft/cancelled records do not qualify.
   */
  async isCustomerRepeat(agencyId: string, customerId: string): Promise<boolean> {
    const [completedTrip, bookings] = await Promise.all([
      prisma.trip.findFirst({
        where: {
          agencyId,
          customerId,
          archivedAt: null,
          status: "COMPLETED",
        },
        select: { id: true },
      }),
      prisma.booking.findMany({
        where: {
          agencyId,
          customerId,
          archivedAt: null,
          status: { in: ["CONFIRMED", "COMPLETED", "ONGOING"] },
        },
        select: { id: true, status: true },
      }),
    ]);

    return evaluateRepeatCustomerStatus({
      trips: completedTrip ? [{ id: completedTrip.id, status: "COMPLETED" }] : [],
      bookings,
    });
  },

  /**
   * Extract chronological CRM Activity Timeline for an Enquiry
   */
  async getEnquiryTimeline(agencyId: string, enquiryId: string): Promise<CrmTimelineEvent[]> {
    const enquiry = await prisma.enquiry.findFirst({
      where: { id: enquiryId, agencyId, archivedAt: null },
      include: {
        customer: true,
        followUps: { where: { archivedAt: null }, orderBy: { createdAt: "asc" } },
        convertedTrip: {
          include: {
            quotations: { where: { archivedAt: null } },
            bookings: {
              where: { archivedAt: null },
              select: {
                id: true,
                bookingNumber: true,
                totalAmount: true,
                createdAt: true,
                status: true,
              },
            },
          },
        },
        convertedQuotation: true,
      },
    });

    if (!enquiry) {
      return [];
    }

    const events: CrmTimelineEvent[] = [];

    // 1. Lead Created
    events.push({
      id: `enq-create-${enquiry.id}`,
      type: "ENQUIRY_CREATED",
      title: `Lead ${enquiry.enquiryNumber} Captured`,
      description: `Inquiry registered for ${enquiry.destination} via ${enquiry.source} (${enquiry.adults} Adults, ${enquiry.children} Children).`,
      timestamp: enquiry.createdAt,
      statusBadge: enquiry.status,
      metadata: { source: enquiry.source, priority: enquiry.priority },
    });

    // 2. Follow-ups
    for (const f of enquiry.followUps) {
      const cleanNotes = stripIdempotencyMarker(f.notes);
      events.push({
        id: `fu-sched-${f.id}`,
        type: "FOLLOW_UP_SCHEDULED",
        title: `${f.type} Follow-up Scheduled`,
        description: `Target: ${new Date(f.scheduledAt).toLocaleString("en-IN")}${cleanNotes ? ` • "${cleanNotes}"` : ""}`,
        timestamp: f.createdAt,
        statusBadge: f.status,
      });

      if (f.status === FollowUpStatus.COMPLETED && f.completedAt) {
        const isHandoff = f.outcome === "LEAD_REASSIGNED";
        const compDesc = f.outcome
          ? `Outcome: ${f.outcome}${cleanNotes ? ` • "${cleanNotes}"` : ""}`
          : cleanNotes
          ? `Notes: ${cleanNotes}`
          : `Completed interaction on ${new Date(f.completedAt).toLocaleDateString("en-IN")}`;

        events.push({
          id: `fu-comp-${f.id}`,
          type: isHandoff ? "LEAD_REASSIGNED" : "FOLLOW_UP_COMPLETED",
          title: isHandoff ? "Lead Ownership Transferred" : `${f.type} Follow-up Completed`,
          description: isHandoff && cleanNotes ? cleanNotes : compDesc,
          timestamp: f.completedAt,
          statusBadge: isHandoff ? "HANDOFF" : "COMPLETED",
        });
      }
    }

    // 3. Converted Trip & Quotations
    if (enquiry.convertedTrip) {
      const trip = enquiry.convertedTrip;
      events.push({
        id: `trip-conv-${trip.id}`,
        type: "STAGE_CHANGED",
        title: `Converted to Trip Workspace: ${trip.title}`,
        description: `Trip Number: ${trip.tripNumber} (${new Date(trip.startDate).toLocaleDateString("en-IN")} - ${new Date(trip.endDate).toLocaleDateString("en-IN")}).`,
        timestamp: trip.createdAt,
        referenceId: trip.id,
        referenceUrl: `/trips/${trip.id}`,
        statusBadge: trip.status,
      });

      for (const q of trip.quotations) {
        events.push({
          id: `quot-${q.id}`,
          type: q.status === "ACCEPTED" ? "QUOTATION_ACCEPTED" : "QUOTATION_CREATED",
          title: `Proposal ${q.quotationNumber} (V${q.version}) ${q.status}`,
          description: `Quoted Amount: ₹${Number(q.finalAmount).toLocaleString("en-IN")}.`,
          timestamp: q.createdAt,
          referenceId: q.id,
          referenceUrl: `/trips/${trip.id}/quotation`,
          statusBadge: q.status,
        });
      }

      for (const b of trip.bookings) {
        let bookingTitle = `Booking ${b.bookingNumber} Confirmed (Lead WON)`;
        let bookingDesc = `Total contract value: ₹${Number(b.totalAmount).toLocaleString("en-IN")}.`;

        if (b.status === "DRAFT") {
          bookingTitle = `Booking ${b.bookingNumber} Draft Created`;
          bookingDesc = `Draft booking value: ₹${Number(b.totalAmount).toLocaleString("en-IN")}.`;
        } else if (b.status === "CANCELLED") {
          bookingTitle = `Booking ${b.bookingNumber} Cancelled`;
          bookingDesc = `Cancelled booking value: ₹${Number(b.totalAmount).toLocaleString("en-IN")}.`;
        } else if (b.status === "COMPLETED") {
          bookingTitle = `Booking ${b.bookingNumber} Completed`;
          bookingDesc = `Completed tour contract value: ₹${Number(b.totalAmount).toLocaleString("en-IN")}.`;
        }

        events.push({
          id: `book-${b.id}`,
          type: "BOOKING_CREATED",
          title: bookingTitle,
          description: bookingDesc,
          timestamp: b.createdAt,
          referenceId: b.id,
          referenceUrl: `/bookings/${b.id}`,
          statusBadge: b.status,
        });
      }
    }

    // 4. Lost / Won final closure events
    if (enquiry.status === EnquiryStatus.LOST && enquiry.closedAt) {
      events.push({
        id: `enq-lost-${enquiry.id}`,
        type: "ENQUIRY_LOST",
        title: `Lead Closed as LOST`,
        description: `Reason: ${enquiry.lostReason || "Unspecified"}${enquiry.lostExplanation ? ` • ${enquiry.lostExplanation}` : ""}`,
        timestamp: enquiry.closedAt,
        statusBadge: "LOST",
      });
    } else if (enquiry.status === EnquiryStatus.CONVERTED && enquiry.closedAt) {
      events.push({
        id: `enq-won-${enquiry.id}`,
        type: "ENQUIRY_CONVERTED",
        title: `Lead Successfully CONVERTED (WON)`,
        description: `Lead closed as won and transitioned to active booking.`,
        timestamp: enquiry.closedAt,
        statusBadge: "WON",
      });
    }

    // 5. Query persisted agency audit logs for detailed ticket change history
    const auditLogs = await prisma.agencyAuditLog.findMany({
      where: {
        agencyId,
        entityType: "ENQUIRY",
        entityId: enquiryId,
      },
      orderBy: { createdAt: "desc" },
    }).catch(() => []);

    for (const log of auditLogs) {
      const meta = (log.metadata as any) || {};
      let title = "Ticket Updated";
      let description = meta.summary || "Enquiry ticket modified.";
      let type: CrmTimelineEvent["type"] = "FIELD_UPDATED";
      let statusBadge: string | undefined = undefined;

      if (log.action === "STAGE_CHANGED") {
        type = "STAGE_CHANGED";
        title = `Stage changed to ${meta.newStatus || "New Stage"}`;
        description = meta.summary || `Stage updated by ${meta.actorName || "Team Member"}`;
        statusBadge = meta.newStatus;
      } else if (log.action === "ENQUIRY_LOST") {
        type = "ENQUIRY_LOST";
        title = "Lead Closed as LOST";
        description = meta.summary || `Marked as LOST: ${meta.lostReason || "Unspecified"}`;
        statusBadge = "LOST";
      } else if (log.action === "LEAD_REASSIGNED") {
        type = "LEAD_REASSIGNED";
        title = "Lead Ownership Transferred";
        description = meta.summary || `Ownership reassigned by ${meta.actorName || "Team Member"}`;
        statusBadge = "REASSIGNED";
      } else if (log.action === "ENQUIRY_CONVERTED_TO_TRIP") {
        type = "STAGE_CHANGED";
        title = `Converted to Trip Workspace: ${meta.tripNumber || ""}`;
        description = meta.summary || "Converted from enquiry to active trip.";
        statusBadge = "TRIP_WORKSPACE";
      } else if (log.action === "INTERACTION_LOGGED") {
        type = "INTERACTION_LOGGED";
        title = `Interaction: ${meta.type || "Contact"}`;
        description = meta.summary || "Interaction quick-logged.";
        statusBadge = meta.outcome || "INTERACTION";
      } else if (log.action === "FOLLOW_UP_SCHEDULED") {
        type = "FOLLOW_UP_SCHEDULED";
        title = `Follow-up Scheduled: ${meta.type || "Task"}`;
        description = meta.summary || "Follow-up scheduled.";
        statusBadge = "SCHEDULED";
      } else if (log.action === "FOLLOW_UP_COMPLETED") {
        type = "FOLLOW_UP_COMPLETED";
        title = "Follow-up Completed";
        description = meta.summary || "Follow-up task completed.";
        statusBadge = "COMPLETED";
      } else if (log.action === "FOLLOW_UP_CANCELLED") {
        type = "FOLLOW_UP_CANCELLED";
        title = "Follow-up Cancelled";
        description = meta.summary || "Follow-up task cancelled.";
        statusBadge = "CANCELLED";
      } else if (log.action === "ENQUIRY_CREATED") {
        continue;
      } else {
        title = `${meta.actorName || "Team Member"} updated Enquiry Details`;
        description = meta.summary || `${meta.changes?.length || 1} fields updated.`;
      }

      events.push({
        id: `audit-${log.id}`,
        type,
        title,
        description,
        timestamp: log.createdAt,
        actorName: meta.actorName || undefined,
        actorRole: meta.actorRole || undefined,
        statusBadge,
        changes: meta.changes || undefined,
        metadata: meta,
      });
    }

    // Sort descending by timestamp
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return events;
  },

  /**
   * Get 360-degree enquiry details with repeat customer identification and CRM timeline
   */
  async getEnquiryDetails360(agencyId: string, enquiryId: string): Promise<EnquiryDetails360 | null> {
    const enquiry = await this.getEnquiry(agencyId, enquiryId);
    if (!enquiry) {
      return null;
    }

    const [isRepeatCustomer, timeline] = await Promise.all([
      this.isCustomerRepeat(agencyId, enquiry.customerId),
      this.getEnquiryTimeline(agencyId, enquiryId),
    ]);

    return {
      ...enquiry,
      isRepeatCustomer,
      timeline,
    };
  },

  /**
   * Get comprehensive CRM Dashboard statistics
   */
  async getCrmDashboardStats(agencyId: string): Promise<CrmDashboardStats> {
    const [enquiries, followUpSummary] = await Promise.all([
      prisma.enquiry.findMany({
        where: { agencyId, archivedAt: null },
        select: {
          id: true,
          status: true,
          source: true,
          budget: true,
        },
      }),
      followUpService.getFollowUpSummary(agencyId),
    ]);

    const pipelineSummary: Record<string, { count: number; totalBudget: number }> = {
      NEW: { count: 0, totalBudget: 0 },
      CONTACTED: { count: 0, totalBudget: 0 },
      QUALIFIED: { count: 0, totalBudget: 0 },
      FOLLOW_UP: { count: 0, totalBudget: 0 },
      QUOTATION_SENT: { count: 0, totalBudget: 0 },
      NEGOTIATION: { count: 0, totalBudget: 0 },
      CONVERTED: { count: 0, totalBudget: 0 },
      LOST: { count: 0, totalBudget: 0 },
      CANCELLED: { count: 0, totalBudget: 0 },
    };

    const sourcesCount: Record<string, number> = {};
    let wonLeads = 0;
    let lostLeads = 0;

    for (const e of enquiries) {
      const budgetNum = Number(e.budget || 0);
      if (pipelineSummary[e.status]) {
        pipelineSummary[e.status].count++;
        pipelineSummary[e.status].totalBudget += budgetNum;
      }
      if (e.status === EnquiryStatus.CONVERTED) wonLeads++;
      if (e.status === EnquiryStatus.LOST) lostLeads++;

      sourcesCount[e.source] = (sourcesCount[e.source] || 0) + 1;
    }

    const totalLeads = enquiries.length;
    const activeLeads =
      pipelineSummary.NEW.count +
      pipelineSummary.CONTACTED.count +
      pipelineSummary.QUALIFIED.count +
      pipelineSummary.FOLLOW_UP.count +
      pipelineSummary.QUOTATION_SENT.count +
      pipelineSummary.NEGOTIATION.count;

    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 1000) / 10 : 0;

    const sourcesSummary = Object.entries(sourcesCount)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    return {
      pipelineSummary,
      followUpSummary,
      salesSummary: {
        totalLeads,
        activeLeads,
        wonLeads,
        lostLeads,
        conversionRate,
      },
      sourcesSummary,
    };
  },

  /**
   * Get authorized assignees for lead management and assignment workflows
   */
  async getEnquiryAssignees(agencyId: string, prismaClient: any = prisma): Promise<EnquiryAssignee[]> {
    const [users, distinctHistorical] = await Promise.all([
      prismaClient.user.findMany({
        where: {
          agencyId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
      prismaClient.enquiry.findMany({
        where: {
          agencyId,
          archivedAt: null,
          assignedTo: { not: null },
        },
        distinct: ["assignedTo"],
        select: {
          assignedTo: true,
        },
      }),
    ]);

    const activeUserNames = new Set(
      users.map((u: any) => (u.name || u.email || "").trim().toLowerCase())
    );

    const assignees: EnquiryAssignee[] = users.map((u: any) => ({
      id: u.id,
      name: u.name || u.email,
      email: u.email,
      role: u.role,
      isUser: true,
    }));

    for (const h of distinctHistorical) {
      const trimmed = (h.assignedTo || "").trim();
      if (trimmed.length > 0 && !activeUserNames.has(trimmed.toLowerCase())) {
        assignees.push({
          name: trimmed,
          isUser: false,
        });
      }
    }

    return assignees;
  },

  /**
   * Reassign lead ownership with concurrency and tenant protection
   */
  async reassignEnquiry(
    agencyId: string,
    enquiryId: string,
    input: AssignLeadInput,
    actor: { userId: string; userName: string },
    prismaClient: any = prisma
  ): Promise<EnquiryWithRelations> {
    const enquiry = await prismaClient.enquiry.findFirst({
      where: { id: enquiryId, agencyId, archivedAt: null },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
        convertedTrip: { select: { id: true, title: true, tripNumber: true, startDate: true, endDate: true, status: true } },
        convertedQuotation: { select: { id: true, quotationNumber: true, version: true, finalAmount: true, status: true } },
        followUps: { where: { archivedAt: null }, orderBy: { scheduledAt: "asc" } },
      },
    });

    if (!enquiry) {
      throw new NotFoundError("Enquiry not found or does not belong to this agency.");
    }

    // 1. Concurrency Check: prevent silent overwrite of concurrent reassignments
    if (input.currentAssignedTo !== undefined) {
      const existingCurrent = (enquiry.assignedTo || "").trim();
      const expectedCurrent = (input.currentAssignedTo || "").trim();
      if (existingCurrent !== expectedCurrent) {
        throw new ConflictError(
          `Lead ownership was modified concurrently (current assignee: "${enquiry.assignedTo || "Unassigned"}"). Please refresh and review before reassigning.`
        );
      }
    }

    // 2. Validate destination assignee
    let targetAssigneeName: string | null = null;
    if (input.assignedToUserId) {
      const targetUser = await prismaClient.user.findFirst({
        where: { id: input.assignedToUserId, agencyId },
        select: { id: true, name: true, email: true },
      });
      if (!targetUser) {
        // Distinguish cross-agency vs nonexistent user without leaking foreign tenant identity data
        const userExistsGlobally = await prismaClient.user.findUnique({
          where: { id: input.assignedToUserId },
          select: { id: true },
        });
        if (userExistsGlobally) {
          throw new ForbiddenError(
            "The destination assignee does not belong to your agency or is not authorized."
          );
        }
        throw new NotFoundError("Destination user not found.");
      }

      const userDisplay = (targetUser.name || targetUser.email || "").trim();
      const userEmail = (targetUser.email || "").trim();

      // Ensure input.assignedTo does not contradict authenticated destination user identity
      if (input.assignedTo && input.assignedTo.trim().length > 0) {
        const normalizedAssignedTo = input.assignedTo.trim().toLowerCase();
        if (
          normalizedAssignedTo !== userDisplay.toLowerCase() &&
          normalizedAssignedTo !== userEmail.toLowerCase()
        ) {
          throw new ValidationError(
            `Conflicting assignee input: assignedTo ("${input.assignedTo.trim()}") does not match destination user ("${userDisplay}").`
          );
        }
      }

      targetAssigneeName = userDisplay;
    } else if (input.assignedTo && input.assignedTo.trim().length > 0) {
      targetAssigneeName = input.assignedTo.trim();
    } else {
      targetAssigneeName = null;
    }

    // 3. Idempotent check: if unchanged, return existing record without duplicate audit writes
    const prevClean = (enquiry.assignedTo || "").trim();
    const targetClean = (targetAssigneeName || "").trim();
    if (prevClean === targetClean) {
      return enquiry;
    }

    // 4. Atomic transaction with conditional update concurrency protection & handoff audit event
    return await prismaClient.$transaction(async (tx: any) => {
      // Re-read current enquiry within transaction to verify latest state under lock
      const currentEnquiry = await tx.enquiry.findFirst({
        where: { id: enquiry.id, agencyId, archivedAt: null },
        select: { id: true, assignedTo: true },
      });

      if (!currentEnquiry) {
        throw new NotFoundError("Enquiry not found or does not belong to this agency.");
      }

      // In-transaction concurrency validation
      if (input.currentAssignedTo !== undefined) {
        const txExisting = (currentEnquiry.assignedTo || "").trim();
        const txExpected = (input.currentAssignedTo || "").trim();
        if (txExisting !== txExpected) {
          throw new ConflictError(
            `Lead ownership was modified concurrently (current assignee: "${currentEnquiry.assignedTo || "Unassigned"}"). Please refresh and review before reassigning.`
          );
        }
      }

      // In-transaction idempotency validation
      const txCurrentClean = (currentEnquiry.assignedTo || "").trim();
      if (txCurrentClean === targetClean) {
        return enquiry;
      }

      const prevOwner = currentEnquiry.assignedTo !== undefined ? currentEnquiry.assignedTo : enquiry.assignedTo;
      const prevLabel = prevOwner ? `"${prevOwner}"` : "Unassigned";
      const newLabel = targetAssigneeName ? `"${targetAssigneeName}"` : "Unassigned";
      const reasonSuffix = input.reason ? ` Reason: ${input.reason}` : "";

      // Atomic conditional update: only matches if assignedTo exactly matches the state read
      const updateResult = await tx.enquiry.updateMany({
        where: {
          id: enquiry.id,
          agencyId,
          archivedAt: null,
          assignedTo: currentEnquiry.assignedTo,
        },
        data: {
          assignedTo: targetAssigneeName,
          assignedToUserId: input.assignedToUserId || null,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictError(
          `Lead ownership was modified concurrently (current assignee: "${currentEnquiry.assignedTo || "Unassigned"}"). Please refresh and review before reassigning.`
        );
      }

      await tx.enquiryFollowUp.create({
        data: {
          agencyId,
          enquiryId: enquiry.id,
          type: FollowUpType.OTHER,
          status: FollowUpStatus.COMPLETED,
          scheduledAt: new Date(),
          completedAt: new Date(),
          completedBy: actor.userId,
          outcome: "LEAD_REASSIGNED",
          notes: `[Lead Handoff] Ownership transferred from ${prevLabel} to ${newLabel} by ${actor.userName}.${reasonSuffix}`,
        },
      });

      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor.userId,
        targetUserId: input.assignedToUserId || null,
        action: "LEAD_REASSIGNED",
        entityType: "ENQUIRY",
        entityId: enquiry.id,
        metadata: {
          actorName: actor.userName,
          changes: [
            { field: "assignedTo", label: "Assigned To", oldValue: prevOwner || "Unassigned", newValue: targetAssigneeName || "Unassigned" },
          ],
          reason: input.reason,
          summary: `Transferred ownership from ${prevLabel} to ${newLabel}`,
        },
      }, tx).catch(() => {});

      const updated = await tx.enquiry.findUnique({
        where: { id: enquiry.id },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
          convertedTrip: { select: { id: true, title: true, tripNumber: true, startDate: true, endDate: true, status: true } },
          convertedQuotation: { select: { id: true, quotationNumber: true, version: true, finalAmount: true, status: true } },
          followUps: { where: { archivedAt: null }, orderBy: { scheduledAt: "asc" } },
        },
      });

      return updated as EnquiryWithRelations;
    });
  },

  /**
   * Log an interaction against an enquiry (Call, WhatsApp, Email, Meeting)
   */
  async logInteraction(
    agencyId: string,
    enquiryId: string,
    data: QuickLogInteractionInput,
    userId?: string,
    actor?: { userId?: string; userName?: string; role?: string }
  ): Promise<{ interaction: EnquiryFollowUp; nextFollowUp?: EnquiryFollowUp | null }> {
    const enquiry = await prisma.enquiry.findFirst({
      where: { id: enquiryId, agencyId, archivedAt: null },
    });

    if (!enquiry) {
      throw new NotFoundError("Enquiry not found or does not belong to this agency.");
    }

    // Verify customer ownership if customerId is specified
    if (data.customerId && enquiry.customerId !== data.customerId) {
      throw new ValidationError("Target enquiry does not belong to the specified customer.");
    }

    // 1. Idempotency Check: if idempotencyKey provided, prevent double creation
    if (data.idempotencyKey) {
      const idempotencyTag = `[idempotency:${data.idempotencyKey}]`;
      const existingInteraction = await prisma.enquiryFollowUp.findFirst({
        where: {
          agencyId,
          enquiryId,
          archivedAt: null,
          notes: { contains: idempotencyTag },
        },
      });

      if (existingInteraction) {
        const existingNext = await prisma.enquiryFollowUp.findFirst({
          where: {
            agencyId,
            enquiryId,
            archivedAt: null,
            status: FollowUpStatus.PENDING,
            createdAt: { gte: existingInteraction.createdAt },
          },
          orderBy: { scheduledAt: "asc" },
        });

        return {
          interaction: {
            ...existingInteraction,
            notes: stripIdempotencyMarker(existingInteraction.notes) || null,
          },
          nextFollowUp: existingNext
            ? {
                ...existingNext,
                notes: stripIdempotencyMarker(existingNext.notes) || null,
              }
            : null,
        };
      }
    }

    // 2. Validate completion task if specified (supporting canonical aliases)
    const targetFollowUpId = data.completeFollowUpId || data.completePendingFollowUpId;
    let pendingTask: EnquiryFollowUp | null = null;
    if (targetFollowUpId) {
      pendingTask = await prisma.enquiryFollowUp.findFirst({
        where: {
          id: targetFollowUpId,
          agencyId,
          enquiryId,
          archivedAt: null,
        },
      });

      if (!pendingTask) {
        throw new NotFoundError("Selected follow-up task not found for this enquiry.");
      }

      if (pendingTask.status !== FollowUpStatus.PENDING) {
        throw new ValidationError(`Cannot complete follow-up: task is already ${pendingTask.status.toLowerCase()}.`);
      }
    }

    const interactionType = data.type as unknown as FollowUpType;
    const interactionDate = data.interactionAt ? new Date(data.interactionAt) : new Date();
    const idempotencySuffix = data.idempotencyKey ? ` [idempotency:${data.idempotencyKey}]` : "";
    const notesWithIdempotency = data.notes
      ? `${stripIdempotencyMarker(data.notes)}${idempotencySuffix}`
      : idempotencySuffix.trim();
    const interactionNotes = notesWithIdempotency || null;

    return await prisma.$transaction(async (tx) => {
      // 3. Mark existing follow-up as completed if requested
      if (targetFollowUpId && pendingTask) {
        const cleanExistingNotes = stripIdempotencyMarker(pendingTask.notes);
        const combinedNotes = [cleanExistingNotes, notesWithIdempotency].filter(Boolean).join("\n---\n");

        const updateResult = await tx.enquiryFollowUp.updateMany({
          where: {
            id: targetFollowUpId,
            agencyId,
            enquiryId,
            archivedAt: null,
            status: FollowUpStatus.PENDING,
          },
          data: {
            status: FollowUpStatus.COMPLETED,
            completedAt: interactionDate,
            completedBy: userId || null,
            outcome: data.outcome,
            notes: combinedNotes || null,
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictError("Follow-up task could not be completed. It may have already been completed or modified by another request.");
        }
      }

      // 4. Create completed interaction log record
      const interaction = await tx.enquiryFollowUp.create({
        data: {
          agencyId,
          enquiryId,
          type: interactionType,
          status: FollowUpStatus.COMPLETED,
          scheduledAt: interactionDate,
          completedAt: interactionDate,
          completedBy: userId || null,
          outcome: data.outcome,
          notes: interactionNotes,
        },
      });

      // 5. Optionally schedule next follow-up (supporting canonical aliases)
      const targetNextAt = data.nextFollowUpAt || data.nextScheduledAt;
      const targetNextType =
        (data.nextFollowUpType as unknown as FollowUpType) ||
        (data.nextType as unknown as FollowUpType) ||
        FollowUpType.CALL;
      const targetNextPriority =
        (data.nextPriority as unknown as EnquiryPriority) || EnquiryPriority.MEDIUM;
      const targetNextNotes = data.nextFollowUpNotes || data.nextNotes;

      let nextFollowUp: EnquiryFollowUp | null = null;
      if (targetNextAt) {
        const nextScheduledDate = new Date(targetNextAt);
        nextFollowUp = await tx.enquiryFollowUp.create({
          data: {
            agencyId,
            enquiryId,
            type: targetNextType,
            status: FollowUpStatus.PENDING,
            priority: targetNextPriority,
            scheduledAt: nextScheduledDate,
            notes: targetNextNotes ? stripIdempotencyMarker(targetNextNotes) : null,
          },
        });

        // Update nextFollowUpAt on the parent enquiry
        await tx.enquiry.update({
          where: { id: enquiryId },
          data: { nextFollowUpAt: nextScheduledDate },
        });
      }

      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor?.userId || userId || "SYSTEM",
        action: "INTERACTION_LOGGED",
        entityType: "ENQUIRY",
        entityId: enquiryId,
        metadata: {
          actorName: actor?.userName || (userId ? "Team Member" : "System"),
          actorRole: actor?.role,
          type: data.type,
          outcome: data.outcome,
          notes: data.notes,
          nextFollowUpAt: data.nextFollowUpAt,
          summary: `Interaction logged: ${data.type}${data.outcome ? ` (${data.outcome})` : ""}`,
        },
      }, tx).catch(() => {});

      return {
        interaction: {
          ...interaction,
          notes: stripIdempotencyMarker(interaction.notes) || null,
        },
        nextFollowUp: nextFollowUp
          ? {
              ...nextFollowUp,
              notes: stripIdempotencyMarker(nextFollowUp.notes) || null,
            }
          : null,
      };
    });
  },
};
