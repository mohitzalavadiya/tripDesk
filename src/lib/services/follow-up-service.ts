import { prisma } from "@/lib/prisma";
import {
CancelFollowUpInput,
CompleteFollowUpInput,
CreateGlobalFollowUpInput,
FollowUpSummaryQueryInput,
GlobalFollowUpQueryInput,
RescheduleFollowUpInput,
} from "@/lib/validation/follow-up-schema";
import {
EnquiryFollowUp,
EnquiryPriority,
FollowUpStatus,
FollowUpType,
Prisma,
} from "@prisma/client";
import { getTodayBoundaries } from "@/lib/utils/timezone";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/api/errors";
import {
  ALL_CANONICAL_STRUCTURED_OUTCOMES,
  isValidOutcomeFormat,
  stripIdempotencyMarker,
} from "@/lib/utils/crm-urgency";
import "server-only";

export type FollowUpWithRelations = EnquiryFollowUp & {
  enquiry: {
    id: string;
    enquiryNumber: string;
    title: string;
    destination: string;
    status: string;
    priority: string;
    budget?: Prisma.Decimal | number | null;
    startDate?: Date | null;
    endDate?: Date | null;
    assignedTo?: string | null;
    assignedToUserId?: string | null;
    assignedToUser?: {
      id: string;
      name: string;
      email: string;
    } | null;
    customer: {
      id: string;
      name: string;
      phone: string;
      email?: string | null;
    };
  };
};

export interface FollowUpSummaryStats {
  overdueCount: number;
  todayCount: number;
  upcomingCount: number;
  completedCount: number;
  totalPending: number;
}

export const followUpService = {
  /**
   * List global agency follow-ups with scope, search, filter, and pagination
   */
  async getGlobalFollowUps(
    agencyId: string,
    query: Partial<GlobalFollowUpQueryInput> = {}
  ): Promise<{ data: FollowUpWithRelations[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;
    const {
      scope = "all",
      status,
      type,
      priority,
      search,
      enquiryId,
      customerId,
      assignedToUserId,
      startDate,
      endDate,
      sortBy = "scheduledAt",
      sortOrder = "asc",
    } = query;

    const { start: todayStart, end: todayEnd } = getTodayBoundaries("Asia/Kolkata");

    const where: Prisma.EnquiryFollowUpWhereInput = {
      agencyId,
      archivedAt: null,
      enquiry: {
        archivedAt: null,
        ...(customerId ? { customerId } : {}),
        ...(assignedToUserId ? { assignedToUserId } : {}),
      },
      ...(enquiryId ? { enquiryId } : {}),
      ...(type ? { type } : {}),
      ...(priority ? { priority } : {}),
    };

    // Apply Scope Filter
    if (scope === "overdue") {
      where.status = FollowUpStatus.PENDING;
      where.scheduledAt = {
        lt: todayStart,
        ...(startDate ? { gte: new Date(startDate) } : {}),
      };
    } else if (scope === "today") {
      where.status = FollowUpStatus.PENDING;
      where.scheduledAt = { gte: todayStart, lte: todayEnd };
    } else if (scope === "upcoming") {
      where.status = FollowUpStatus.PENDING;
      where.scheduledAt = {
        gt: todayEnd,
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    } else if (scope === "completed") {
      where.status = FollowUpStatus.COMPLETED;
      if (startDate || endDate) {
        where.scheduledAt = {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        };
      }
    } else if (status) {
      where.status = status;
      if (startDate || endDate) {
        where.scheduledAt = {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        };
      }
    } else if (startDate || endDate) {
      where.scheduledAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    // Apply Search Filter across customer name, phone, destination, enquiryNumber, notes
    if (search) {
      where.OR = [
        { notes: { contains: search, mode: "insensitive" } },
        { outcome: { contains: search, mode: "insensitive" } },
        {
          enquiry: {
            OR: [
              { enquiryNumber: { contains: search, mode: "insensitive" } },
              { title: { contains: search, mode: "insensitive" } },
              { destination: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { customer: { phone: { contains: search, mode: "insensitive" } } },
              { customer: { email: { contains: search, mode: "insensitive" } } },
            ],
          },
        },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.enquiryFollowUp.count({ where }),
      prisma.enquiryFollowUp.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          enquiry: {
            select: {
              id: true,
              enquiryNumber: true,
              title: true,
              destination: true,
              status: true,
              priority: true,
              budget: true,
              startDate: true,
              endDate: true,
              assignedTo: true,
              assignedToUserId: true,
              assignedToUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              customer: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: data as FollowUpWithRelations[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Get telemetry summary counts for follow-ups (overdue, today, upcoming, completed)
   * Supports active filters (type, priority, search, assignedToUserId, date range) across the full authorized dataset.
   */
  async getFollowUpSummary(
    agencyId: string,
    filters?: Partial<FollowUpSummaryQueryInput>
  ): Promise<FollowUpSummaryStats> {
    const { start: todayStart, end: todayEnd } = getTodayBoundaries("Asia/Kolkata");

    const baseWhere: Prisma.EnquiryFollowUpWhereInput = {
      agencyId,
      archivedAt: null,
      enquiry: {
        archivedAt: null,
        ...(filters?.assignedToUserId ? { assignedToUserId: filters.assignedToUserId } : {}),
      },
      ...(filters?.type ? { type: filters.type } : {}),
      ...(filters?.priority ? { priority: filters.priority } : {}),
    };

    if (filters?.search?.trim()) {
      const searchTerm = filters.search.trim();
      baseWhere.OR = [
        { notes: { contains: searchTerm, mode: "insensitive" } },
        { outcome: { contains: searchTerm, mode: "insensitive" } },
        {
          enquiry: {
            OR: [
              { enquiryNumber: { contains: searchTerm, mode: "insensitive" } },
              { title: { contains: searchTerm, mode: "insensitive" } },
              { destination: { contains: searchTerm, mode: "insensitive" } },
              { customer: { name: { contains: searchTerm, mode: "insensitive" } } },
              { customer: { phone: { contains: searchTerm, mode: "insensitive" } } },
              { customer: { email: { contains: searchTerm, mode: "insensitive" } } },
            ],
          },
        },
      ];
    }

    const dateFilter =
      filters?.startDate || filters?.endDate
        ? {
            ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
            ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
          }
        : null;

    const [overdueCount, todayCount, upcomingCount, completedCount, totalPending] = await Promise.all([
      prisma.enquiryFollowUp.count({
        where: {
          ...baseWhere,
          status: FollowUpStatus.PENDING,
          scheduledAt: { lt: todayStart },
        },
      }),
      prisma.enquiryFollowUp.count({
        where: {
          ...baseWhere,
          status: FollowUpStatus.PENDING,
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.enquiryFollowUp.count({
        where: {
          ...baseWhere,
          status: FollowUpStatus.PENDING,
          scheduledAt: { gt: todayEnd },
        },
      }),
      prisma.enquiryFollowUp.count({
        where: {
          ...baseWhere,
          status: FollowUpStatus.COMPLETED,
          ...(dateFilter ? { scheduledAt: dateFilter } : {}),
        },
      }),
      prisma.enquiryFollowUp.count({
        where: {
          ...baseWhere,
          status: FollowUpStatus.PENDING,
          ...(dateFilter ? { scheduledAt: dateFilter } : {}),
        },
      }),
    ]);

    return {
      overdueCount,
      todayCount,
      upcomingCount,
      completedCount,
      totalPending,
    };
  },

  /**
   * Get single follow-up by ID
   */
  async getFollowUp(agencyId: string, id: string): Promise<FollowUpWithRelations | null> {
    const followUp = await prisma.enquiryFollowUp.findFirst({
      where: { id, agencyId, archivedAt: null },
      include: {
        enquiry: {
          select: {
            id: true,
            enquiryNumber: true,
            title: true,
            destination: true,
            status: true,
            priority: true,
            budget: true,
            startDate: true,
            endDate: true,
            assignedTo: true,
            assignedToUserId: true,
            assignedToUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return followUp as FollowUpWithRelations | null;
  },

  /**
   * Create a new follow-up
   */
  async createFollowUp(agencyId: string, data: CreateGlobalFollowUpInput): Promise<EnquiryFollowUp> {
    if (data.outcome && !isValidOutcomeFormat(data.outcome)) {
      throw new ValidationError(
        `Invalid structured outcome code: '${data.outcome}'. Supported outcomes are: ${ALL_CANONICAL_STRUCTURED_OUTCOMES.join(", ")}`
      );
    }

    const enquiry = await prisma.enquiry.findFirst({
      where: { id: data.enquiryId, agencyId, archivedAt: null },
    });

    if (!enquiry) {
      throw new Error("Enquiry not found or does not belong to this agency.");
    }

    const scheduledDate = new Date(data.scheduledAt);

    return prisma.$transaction(async (tx) => {
      const followUp = await tx.enquiryFollowUp.create({
        data: {
          agencyId,
          enquiryId: data.enquiryId,
          type: data.type || FollowUpType.CALL,
          priority: data.priority || EnquiryPriority.MEDIUM,
          status: data.status || FollowUpStatus.PENDING,
          scheduledAt: scheduledDate,
          outcome: data.outcome,
          notes: data.notes,
        },
      });

      // Update nextFollowUpAt on the enquiry if this follow-up is pending and earlier than existing
      if (data.status === FollowUpStatus.PENDING || !data.status) {
        if (!enquiry.nextFollowUpAt || scheduledDate < enquiry.nextFollowUpAt || enquiry.nextFollowUpAt < new Date()) {
          await tx.enquiry.update({
            where: { id: data.enquiryId },
            data: { nextFollowUpAt: scheduledDate },
          });
        }
      }

      return followUp;
    });
  },

  /**
   * Complete a follow-up with outcome notes, and optionally schedule the next follow-up atomically.
   * Guarantees atomic conditional concurrency protection, tenant isolation, and status integrity.
   */
  async completeFollowUp(
    agencyId: string,
    followUpId: string,
    data: CompleteFollowUpInput,
    completedBy?: string
  ): Promise<{ completed: EnquiryFollowUp; nextFollowUp?: EnquiryFollowUp | null }> {
    const followUp = await prisma.enquiryFollowUp.findFirst({
      where: { id: followUpId, agencyId, archivedAt: null },
      include: { enquiry: true },
    });

    if (!followUp || followUp.enquiry?.archivedAt) {
      throw new NotFoundError("Follow-up not found or does not belong to this agency.");
    }

    if (followUp.status !== FollowUpStatus.PENDING) {
      throw new ValidationError(`Cannot complete follow-up: task is already ${followUp.status.toLowerCase()}.`);
    }

    if (data.outcome && !isValidOutcomeFormat(data.outcome)) {
      throw new ValidationError(
        `Invalid structured outcome code: '${data.outcome}'. Supported outcomes are: ${ALL_CANONICAL_STRUCTURED_OUTCOMES.join(", ")}`
      );
    }

    return prisma.$transaction(async (tx) => {
      // 1. Mark current follow-up completed with atomic conditional update
      const cleanExistingNotes = stripIdempotencyMarker(followUp.notes);
      const cleanNewNotes = data.notes?.trim() || "";
      const combinedNotes = [cleanExistingNotes, cleanNewNotes].filter(Boolean).join("\n---\n");

      const updateResult = await tx.enquiryFollowUp.updateMany({
        where: {
          id: followUpId,
          agencyId,
          archivedAt: null,
          status: FollowUpStatus.PENDING,
        },
        data: {
          status: FollowUpStatus.COMPLETED,
          outcome: data.outcome || followUp.outcome || null,
          notes: combinedNotes || null,
          completedAt: new Date(),
          completedBy: completedBy || followUp.completedBy || null,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictError(
          "Follow-up task could not be completed. It may have already been completed or modified by another request."
        );
      }

      const completed = (await tx.enquiryFollowUp.findUnique({
        where: { id: followUpId },
      }))!;

      // 2. Schedule next follow-up if requested
      let nextFollowUpRecord: EnquiryFollowUp | null = null;
      if (data.scheduleNext && data.nextFollowUp) {
        const nextScheduledDate = new Date(data.nextFollowUp.scheduledAt);
        nextFollowUpRecord = await tx.enquiryFollowUp.create({
          data: {
            agencyId,
            enquiryId: followUp.enquiryId,
            type: data.nextFollowUp.type || FollowUpType.CALL,
            priority: data.nextFollowUp.priority || EnquiryPriority.MEDIUM,
            status: FollowUpStatus.PENDING,
            scheduledAt: nextScheduledDate,
            notes: data.nextFollowUp.notes?.trim() || null,
          },
        });
      }

      // 3. Recalculate nextFollowUpAt on the enquiry
      const nextPending = await tx.enquiryFollowUp.findFirst({
        where: {
          agencyId,
          enquiryId: followUp.enquiryId,
          archivedAt: null,
          status: FollowUpStatus.PENDING,
        },
        orderBy: { scheduledAt: "asc" },
      });

      await tx.enquiry.update({
        where: { id: followUp.enquiryId },
        data: {
          nextFollowUpAt: nextPending ? nextPending.scheduledAt : null,
          updatedAt: new Date(),
        },
      });

      return {
        completed: {
          ...completed,
          notes: stripIdempotencyMarker(completed.notes) || null,
        },
        nextFollowUp: nextFollowUpRecord
          ? {
              ...nextFollowUpRecord,
              notes: stripIdempotencyMarker(nextFollowUpRecord.notes) || null,
            }
          : null,
      };
    });
  },

  /**
   * Reschedule a follow-up
   */
  async rescheduleFollowUp(
    agencyId: string,
    followUpId: string,
    data: RescheduleFollowUpInput
  ): Promise<EnquiryFollowUp> {
    const followUp = await prisma.enquiryFollowUp.findFirst({
      where: { id: followUpId, agencyId, archivedAt: null },
    });

    if (!followUp) {
      throw new Error("Follow-up not found.");
    }

    const newDate = new Date(data.scheduledAt);
    const updatedNotes = [followUp.notes, data.notes ? `[Rescheduled to ${newDate.toLocaleDateString("en-IN")}]: ${data.notes}` : null]
      .filter(Boolean)
      .join("\n");

    return prisma.$transaction(async (tx) => {
      const updated = await tx.enquiryFollowUp.update({
        where: { id: followUpId },
        data: {
          scheduledAt: newDate,
          notes: updatedNotes || null,
          status: FollowUpStatus.PENDING,
        },
      });

      // Recalculate next pending follow-up on enquiry
      const nextPending = await tx.enquiryFollowUp.findFirst({
        where: {
          agencyId,
          enquiryId: followUp.enquiryId,
          archivedAt: null,
          status: FollowUpStatus.PENDING,
        },
        orderBy: { scheduledAt: "asc" },
      });

      await tx.enquiry.update({
        where: { id: followUp.enquiryId },
        data: {
          nextFollowUpAt: nextPending ? nextPending.scheduledAt : null,
        },
      });

      return updated;
    });
  },

  /**
   * Cancel a follow-up
   */
  async cancelFollowUp(
    agencyId: string,
    followUpId: string,
    data: CancelFollowUpInput
  ): Promise<EnquiryFollowUp> {
    const followUp = await prisma.enquiryFollowUp.findFirst({
      where: { id: followUpId, agencyId, archivedAt: null },
    });

    if (!followUp) {
      throw new Error("Follow-up not found.");
    }

    const updatedNotes = [followUp.notes, data.reason ? `[Cancelled]: ${data.reason}` : null]
      .filter(Boolean)
      .join("\n");

    return prisma.$transaction(async (tx) => {
      const updated = await tx.enquiryFollowUp.update({
        where: { id: followUpId },
        data: {
          status: FollowUpStatus.CANCELLED,
          notes: updatedNotes || null,
        },
      });

      // Recalculate next pending follow-up on enquiry
      const nextPending = await tx.enquiryFollowUp.findFirst({
        where: {
          agencyId,
          enquiryId: followUp.enquiryId,
          archivedAt: null,
          status: FollowUpStatus.PENDING,
        },
        orderBy: { scheduledAt: "asc" },
      });

      await tx.enquiry.update({
        where: { id: followUp.enquiryId },
        data: {
          nextFollowUpAt: nextPending ? nextPending.scheduledAt : null,
        },
      });

      return updated;
    });
  },

  /**
   * Soft-delete a follow-up
   */
  async deleteFollowUp(agencyId: string, followUpId: string): Promise<EnquiryFollowUp> {
    const followUp = await prisma.enquiryFollowUp.findFirst({
      where: { id: followUpId, agencyId, archivedAt: null },
    });

    if (!followUp) {
      throw new Error("Follow-up not found.");
    }

    return prisma.$transaction(async (tx) => {
      const deleted = await tx.enquiryFollowUp.update({
        where: { id: followUpId },
        data: { archivedAt: new Date() },
      });

      // Recalculate next pending follow-up on enquiry
      const nextPending = await tx.enquiryFollowUp.findFirst({
        where: {
          agencyId,
          enquiryId: followUp.enquiryId,
          archivedAt: null,
          status: FollowUpStatus.PENDING,
        },
        orderBy: { scheduledAt: "asc" },
      });

      await tx.enquiry.update({
        where: { id: followUp.enquiryId },
        data: {
          nextFollowUpAt: nextPending ? nextPending.scheduledAt : null,
        },
      });

      return deleted;
    });
  },
};
