import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/api";
import {
  CreateActivityInput,
  UpdateActivityInput,
  ActivityListQueryInput,
} from "@/lib/validation/activity-schema";
import { Activity } from "@prisma/client";

export type ActivityWithRelations = Activity & {
  destination?: {
    id: string;
    name: string;
    state: string | null;
    country: string;
    status: string;
  } | null;
};

export interface PaginatedActivitiesResult {
  items: ActivityWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const activityService = {
  /**
   * Retrieves a paginated list of activity master records strictly scoped to the authenticated agency.
   * Excludes archived activities by default.
   */
  async listActivities(
    agencyId: string,
    params: ActivityListQueryInput
  ): Promise<PaginatedActivitiesResult> {
    const { page = 1, limit = 50, search, location, destinationId, type, includeArchived } = params;
    const skip = (page - 1) * limit;

    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { location: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
            { duration: { contains: search, mode: "insensitive" as const } },
            { destination: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {};

    const locationFilter = location
      ? { location: { contains: location, mode: "insensitive" as const } }
      : {};

    const destinationFilter = destinationId
      ? { destinationId }
      : {};

    const typeFilter = type ? { type } : {};

    const where = {
      agencyId,
      ...(includeArchived ? {} : { archivedAt: null }),
      ...searchFilter,
      ...locationFilter,
      ...destinationFilter,
      ...typeFilter,
    };

    const [items, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          destination: {
            select: {
              id: true,
              name: true,
              state: true,
              country: true,
              status: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      prisma.activity.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  },

  /**
   * Retrieves a single activity record by ID, strictly enforcing agency tenancy.
   */
  async getActivityById(agencyId: string, activityId: string): Promise<ActivityWithRelations | null> {
    return prisma.activity.findFirst({
      where: {
        id: activityId,
        agencyId,
      },
      include: {
        destination: {
          select: {
            id: true,
            name: true,
            state: true,
            country: true,
            status: true,
          },
        },
      },
    });
  },

  /**
   * Creates a new activity master record under the authenticated agency.
   * Validates destinationId server-side to guarantee strict tenant isolation.
   */
  async createActivity(agencyId: string, data: CreateActivityInput): Promise<ActivityWithRelations> {
    const cleanDestinationId = data.destinationId?.trim() || null;
    if (cleanDestinationId) {
      const destination = await prisma.destination.findFirst({
        where: {
          id: cleanDestinationId,
          agencyId,
        },
      });

      if (!destination) {
        throw new NotFoundError("Destination not found or does not belong to your agency.");
      }
    }

    return prisma.activity.create({
      data: {
        agencyId,
        destinationId: cleanDestinationId,
        name: data.name,
        location: data.location || null,
        description: data.description || null,
        duration: data.duration || null,
        type: data.type,
        adultPrice: data.adultPrice !== undefined && data.adultPrice !== null ? data.adultPrice : null,
        childPrice: data.childPrice !== undefined && data.childPrice !== null ? data.childPrice : null,
        price: data.price !== undefined && data.price !== null ? data.price : null,
        notes: data.notes || null,
      },
      include: {
        destination: {
          select: {
            id: true,
            name: true,
            state: true,
            country: true,
            status: true,
          },
        },
      },
    });
  },

  /**
   * Updates an existing activity master record, strictly verifying agency tenancy.
   * Validates destinationId server-side to guarantee strict tenant isolation.
   */
  async updateActivity(
    agencyId: string,
    activityId: string,
    data: UpdateActivityInput
  ): Promise<ActivityWithRelations> {
    const existing = await prisma.activity.findFirst({
      where: {
        id: activityId,
        agencyId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Activity not found or does not belong to your agency.");
    }

    if (data.destinationId !== undefined) {
      const cleanDestinationId = data.destinationId?.trim() || null;
      if (cleanDestinationId) {
        const destination = await prisma.destination.findFirst({
          where: {
            id: cleanDestinationId,
            agencyId,
          },
        });

        if (!destination) {
          throw new NotFoundError("Destination not found or does not belong to your agency.");
        }
      }
    }

    return prisma.activity.update({
      where: { id: activityId },
      data: {
        ...(data.destinationId !== undefined && { destinationId: data.destinationId?.trim() || null }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.location !== undefined && { location: data.location || null }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.duration !== undefined && { duration: data.duration || null }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.adultPrice !== undefined && {
          adultPrice: data.adultPrice !== null ? data.adultPrice : null,
        }),
        ...(data.childPrice !== undefined && {
          childPrice: data.childPrice !== null ? data.childPrice : null,
        }),
        ...(data.price !== undefined && {
          price: data.price !== null ? data.price : null,
        }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
      include: {
        destination: {
          select: {
            id: true,
            name: true,
            state: true,
            country: true,
            status: true,
          },
        },
      },
    });
  },

  /**
   * Soft-deletes (archives) an existing activity master record.
   * Ensures historical Trip relationships remain intact.
   */
  async archiveActivity(agencyId: string, activityId: string): Promise<Activity> {
    const existing = await prisma.activity.findFirst({
      where: {
        id: activityId,
        agencyId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Activity not found or does not belong to your agency.");
    }

    return prisma.activity.update({
      where: { id: activityId },
      data: {
        archivedAt: new Date(),
      },
    });
  },
};
