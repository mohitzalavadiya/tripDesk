import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/api";
import {
  CreateTripInput,
  UpdateTripInput,
  TripQueryParams,
} from "@/lib/validation/trip-schema";
import { Trip, Customer, Traveler, ItineraryItem } from "@prisma/client";

export interface TripWithRelations extends Trip {
  customer: Customer;
  travelers?: Traveler[];
  itineraryItems?: ItineraryItem[];
  quotations?: any[];
  tripHotels?: any[];
  tripVehicles?: any[];
  tripActivities?: any[];
  _count?: {
    travelers: number;
    itineraryItems: number;
    quotations: number;
    bookings: number;
  };
}

export interface PaginatedTripsResult {
  items: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Generates a unique trip number for an agency (e.g. TRP-202608-1234).
 */
async function generateUniqueTripNumber(agencyId: string): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 7).replace("-", ""); // YYYYMM
  for (let attempt = 0; attempt < 5; attempt++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidate = `TRP-${dateStr}-${randomSuffix}`;
    const existing = await prisma.trip.findUnique({
      where: {
        agencyId_tripNumber: {
          agencyId,
          tripNumber: candidate,
        },
      },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }
  return `TRP-${Date.now()}`;
}

export const tripService = {
  /**
   * Retrieves a paginated list of trips strictly scoped to the authenticated agency.
   * Excludes soft-deleted/archived trips by default.
   */
  async listTrips(
    agencyId: string,
    params: TripQueryParams
  ): Promise<PaginatedTripsResult> {
    const { page, limit, search, status, customerId, startDate, endDate, includeArchived } = params;
    const skip = (page - 1) * limit;

    // Search filter across trip title, trip number, or associated customer name/phone
    const searchFilter = search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { tripNumber: { contains: search, mode: "insensitive" as const } },
            { notes: { contains: search, mode: "insensitive" as const } },
            {
              customer: {
                name: { contains: search, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {};

    const where: any = {
      agencyId,
      ...(includeArchived ? {} : { archivedAt: null }),
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(startDate || endDate
        ? {
            startDate: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
      ...searchFilter,
    };

    const [items, total] = await Promise.all([
      prisma.trip.findMany({
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
          _count: {
            select: {
              travelers: true,
              itineraryItems: true,
              quotations: true,
              bookings: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.trip.count({ where }),
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
   * Retrieves a single trip record by ID, strictly enforcing agency tenancy.
   * Returns null if not found or if the record belongs to another agency.
   */
  async getTripById(agencyId: string, tripId: string): Promise<TripWithRelations | null> {
    return prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
      include: {
        customer: true,
        travelers: {
          orderBy: { createdAt: "asc" },
        },
        itineraryItems: {
          orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        },
        _count: {
          select: {
            travelers: true,
            itineraryItems: true,
            quotations: true,
            bookings: true,
          },
        },
      },
    });
  },

  /**
   * Creates a new trip record under the authenticated agency.
   * Verifies the referenced customer belongs to the same agency and is active.
   */
  async createTrip(agencyId: string, data: CreateTripInput): Promise<Trip> {
    // 1. Verify customer exists under this agency and is not archived
    const customer = await prisma.customer.findFirst({
      where: {
        id: data.customerId,
        agencyId,
        archivedAt: null,
      },
    });

    if (!customer) {
      throw new NotFoundError("Customer");
    }

    // 2. Determine or generate unique trip number
    const tripNumber = data.tripNumber?.trim() || (await generateUniqueTripNumber(agencyId));

    // 3. Create trip
    return prisma.trip.create({
      data: {
        agencyId,
        customerId: data.customerId,
        tripNumber,
        title: data.title,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status || "DRAFT",
        notes: data.notes || null,
      },
      include: {
        customer: true,
      },
    });
  },

  /**
   * Updates an existing trip record after verifying agency ownership.
   * Prevents modifying archived records or attaching foreign/archived customers.
   */
  async updateTrip(agencyId: string, tripId: string, data: UpdateTripInput): Promise<Trip> {
    // 1. Verify trip exists and belongs to agency
    const existing = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Trip");
    }

    if (existing.archivedAt) {
      throw new NotFoundError("Active trip");
    }

    // 2. If customerId is changing, verify new customer belongs to agency and is active
    if (data.customerId && data.customerId !== existing.customerId) {
      const newCustomer = await prisma.customer.findFirst({
        where: {
          id: data.customerId,
          agencyId,
          archivedAt: null,
        },
      });

      if (!newCustomer) {
        throw new NotFoundError("Customer");
      }
    }

    // 3. Perform scoped update
    return prisma.trip.update({
      where: { id: tripId },
      data: {
        ...(data.customerId !== undefined ? { customerId: data.customerId } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.tripNumber !== undefined ? { tripNumber: data.tripNumber } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      },
      include: {
        customer: true,
      },
    });
  },

  /**
   * Performs a soft delete by marking archivedAt with the current timestamp.
   * Preserves historical references for quotations, bookings, and operations.
   */
  async archiveTrip(agencyId: string, tripId: string): Promise<Trip> {
    // 1. Verify existence and tenant ownership
    const existing = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Trip");
    }

    if (existing.archivedAt) {
      return existing;
    }

    // 2. Perform soft delete
    return prisma.trip.update({
      where: { id: tripId },
      data: {
        archivedAt: new Date(),
      },
    });
  },
};
