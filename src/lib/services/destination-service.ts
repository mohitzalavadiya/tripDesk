import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/api";
import {
  CreateDestinationInput,
  UpdateDestinationInput,
  DestinationListQueryInput,
} from "@/lib/validation/destination-schema";
import { Destination, DestinationStatus, Prisma } from "@prisma/client";

export interface StarterDestination {
  name: string;
  state: string;
  country: string;
}

/**
 * Locked TripDesk Starter Destination Catalog (Exact 32 India Destinations).
 */
export const STARTER_DESTINATIONS: StarterDestination[] = [
  { name: "Goa", state: "Goa", country: "India" },
  { name: "Mumbai", state: "Maharashtra", country: "India" },
  { name: "Mahabaleshwar", state: "Maharashtra", country: "India" },
  { name: "Pune", state: "Maharashtra", country: "India" },
  { name: "Jaipur", state: "Rajasthan", country: "India" },
  { name: "Udaipur", state: "Rajasthan", country: "India" },
  { name: "Jodhpur", state: "Rajasthan", country: "India" },
  { name: "Jaisalmer", state: "Rajasthan", country: "India" },
  { name: "Mount Abu", state: "Rajasthan", country: "India" },
  { name: "Delhi", state: "Delhi", country: "India" },
  { name: "Agra", state: "Uttar Pradesh", country: "India" },
  { name: "Varanasi", state: "Uttar Pradesh", country: "India" },
  { name: "Lucknow", state: "Uttar Pradesh", country: "India" },
  { name: "Amritsar", state: "Punjab", country: "India" },
  { name: "Srinagar", state: "Jammu & Kashmir", country: "India" },
  { name: "Gulmarg", state: "Jammu & Kashmir", country: "India" },
  { name: "Pahalgam", state: "Jammu & Kashmir", country: "India" },
  { name: "Manali", state: "Himachal Pradesh", country: "India" },
  { name: "Shimla", state: "Himachal Pradesh", country: "India" },
  { name: "Dharamshala", state: "Himachal Pradesh", country: "India" },
  { name: "Leh", state: "Ladakh", country: "India" },
  { name: "Rishikesh", state: "Uttarakhand", country: "India" },
  { name: "Nainital", state: "Uttarakhand", country: "India" },
  { name: "Kochi", state: "Kerala", country: "India" },
  { name: "Munnar", state: "Kerala", country: "India" },
  { name: "Alappuzha", state: "Kerala", country: "India" },
  { name: "Bengaluru", state: "Karnataka", country: "India" },
  { name: "Mysuru", state: "Karnataka", country: "India" },
  { name: "Hampi", state: "Karnataka", country: "India" },
  { name: "Chennai", state: "Tamil Nadu", country: "India" },
  { name: "Ahmedabad", state: "Gujarat", country: "India" },
  { name: "Dwarka", state: "Gujarat", country: "India" },
];

export interface PaginatedDestinationsResult {
  items: Destination[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const destinationService = {
  /**
   * Idempotently seeds the 32 starter destinations for an agency.
   * Safe to run multiple times without creating duplicate records.
   */
  async seedStarterDestinations(agencyId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const db = tx || prisma;

    const existingDestinations = await db.destination.findMany({
      where: { agencyId },
      select: { name: true },
    });

    const existingSet = new Set(existingDestinations.map((d) => d.name.trim().toLowerCase()));

    const missingDestinations = STARTER_DESTINATIONS.filter(
      (d) => !existingSet.has(d.name.trim().toLowerCase())
    );

    if (missingDestinations.length === 0) {
      return 0;
    }

    const created = await db.destination.createMany({
      data: missingDestinations.map((d) => ({
        agencyId,
        name: d.name,
        state: d.state,
        country: d.country,
        status: "ACTIVE" as DestinationStatus,
      })),
      skipDuplicates: true,
    });

    return created.count;
  },

  /**
   * Lists agency-scoped destinations with filtering, search, and pagination.
   */
  async listDestinations(
    agencyId: string,
    params: DestinationListQueryInput
  ): Promise<PaginatedDestinationsResult> {
    const { page, limit, search, status, state } = params;
    const skip = (page - 1) * limit;

    const searchFilter: Prisma.DestinationWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { state: { contains: search, mode: "insensitive" } },
            { cityArea: { contains: search, mode: "insensitive" } },
            { country: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const statusFilter: Prisma.DestinationWhereInput =
      status && status !== "ALL"
        ? { status: status as DestinationStatus }
        : {};

    const stateFilter: Prisma.DestinationWhereInput = state
      ? { state: { contains: state, mode: "insensitive" } }
      : {};

    const where: Prisma.DestinationWhereInput = {
      agencyId,
      ...searchFilter,
      ...statusFilter,
      ...stateFilter,
    };

    const [items, total] = await Promise.all([
      prisma.destination.findMany({
        where,
        orderBy: [{ name: "asc" }],
        skip,
        take: limit,
      }),
      prisma.destination.count({ where }),
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
   * Retrieves a single destination record strictly scoped to the authenticated agency.
   */
  async getDestinationById(
    agencyId: string,
    destinationId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Destination | null> {
    const db = tx || prisma;
    return db.destination.findFirst({
      where: {
        id: destinationId,
        agencyId,
      },
    });
  },

  /**
   * Creates a new agency-scoped destination.
   * Enforces agency-level unique destination name.
   */
  async createDestination(
    agencyId: string,
    data: CreateDestinationInput,
    tx?: Prisma.TransactionClient
  ): Promise<Destination> {
    const db = tx || prisma;
    const cleanName = data.name.trim();

    const existing = await db.destination.findFirst({
      where: {
        agencyId,
        name: { equals: cleanName, mode: "insensitive" },
      },
    });

    if (existing) {
      throw new ConflictError(`A destination named "${cleanName}" already exists in your agency catalog.`);
    }

    return db.destination.create({
      data: {
        agencyId,
        name: cleanName,
        country: data.country?.trim() || "India",
        state: data.state?.trim() || null,
        cityArea: data.cityArea?.trim() || null,
        status: (data.status as DestinationStatus) || "ACTIVE",
      },
    });
  },

  /**
   * Updates an existing destination record under the agency.
   */
  async updateDestination(
    agencyId: string,
    destinationId: string,
    data: UpdateDestinationInput,
    tx?: Prisma.TransactionClient
  ): Promise<Destination> {
    const db = tx || prisma;

    const existing = await db.destination.findFirst({
      where: {
        id: destinationId,
        agencyId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Destination not found or does not belong to your agency.");
    }

    if (data.name) {
      const cleanName = data.name.trim();
      if (cleanName.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicate = await db.destination.findFirst({
          where: {
            agencyId,
            name: { equals: cleanName, mode: "insensitive" },
            NOT: { id: destinationId },
          },
        });

        if (duplicate) {
          throw new ConflictError(`Another destination named "${cleanName}" already exists in your agency catalog.`);
        }
      }
    }

    return db.destination.update({
      where: { id: destinationId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.country !== undefined && { country: data.country.trim() }),
        ...(data.state !== undefined && { state: data.state?.trim() || null }),
        ...(data.cityArea !== undefined && { cityArea: data.cityArea?.trim() || null }),
        ...(data.status !== undefined && { status: data.status as DestinationStatus }),
      },
    });
  },

  /**
   * Sets destination status to INACTIVE.
   * Preserves historical relationships while hiding from new selection.
   */
  async deactivateDestination(
    agencyId: string,
    destinationId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Destination> {
    return this.updateDestination(agencyId, destinationId, { status: "INACTIVE" }, tx);
  },

  /**
   * Deletes a destination only if no active references (Hotels, Activities, TripDestinations) exist.
   */
  async deleteDestination(
    agencyId: string,
    destinationId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Destination> {
    const db = tx || prisma;

    const destination = await db.destination.findFirst({
      where: {
        id: destinationId,
        agencyId,
      },
      include: {
        _count: {
          select: {
            hotels: true,
            activities: true,
            tripDestinations: true,
          },
        },
      },
    });

    if (!destination) {
      throw new NotFoundError("Destination not found or does not belong to your agency.");
    }

    const { hotels, activities, tripDestinations } = destination._count;
    if (hotels > 0 || activities > 0 || tripDestinations > 0) {
      const usageList: string[] = [];
      if (hotels > 0) usageList.push(`${hotels} hotel(s)`);
      if (activities > 0) usageList.push(`${activities} activity(ies)`);
      if (tripDestinations > 0) usageList.push(`${tripDestinations} trip itinerary leg(s)`);

      throw new ValidationError(
        `Cannot delete destination "${destination.name}": It is referenced by ${usageList.join(", ")}. Change status to Inactive instead.`
      );
    }

    return db.destination.delete({
      where: { id: destinationId },
    });
  },
};
