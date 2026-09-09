import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/api";
import {
  CreateHotelInput,
  CreateHotelPayload,
  UpdateHotelInput,
  HotelListQueryInput,
} from "@/lib/validation/hotel-schema";
import { Hotel, Prisma } from "@prisma/client";

export interface PaginatedHotelsResult {
  items: Hotel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const hotelService = {
  /**
   * Generates a collision-resistant sequential Hotel Code per agency (e.g. HTL-0001, HTL-0002).
   */
  async generateNextHotelCode(agencyId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const db = tx || prisma;
    const prefix = "HTL-";

    const lastHotel = await db.hotel.findFirst({
      where: {
        agencyId,
        hotelCode: { startsWith: prefix },
      },
      orderBy: { hotelCode: "desc" },
      select: { hotelCode: true },
    });

    let nextNum = 1;
    if (lastHotel?.hotelCode) {
      const match = lastHotel.hotelCode.match(/^HTL-(\d+)$/i);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed)) {
          nextNum = parsed + 1;
        }
      }
    }

    return `${prefix}${String(nextNum).padStart(4, "0")}`;
  },

  /**
   * Retrieves a paginated list of hotel master records strictly scoped to the authenticated agency.
   * Excludes archived hotels by default unless includeArchived is set to true.
   */
  async listHotels(
    agencyId: string,
    params: HotelListQueryInput
  ): Promise<PaginatedHotelsResult> {
    const { page, limit, search, city, includeArchived } = params;
    const skip = (page - 1) * limit;

    const searchFilter = search
      ? {
          OR: [
            { hotelCode: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
            { state: { contains: search, mode: "insensitive" as const } },
            { category: { contains: search, mode: "insensitive" as const } },
            { address: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const cityFilter = city
      ? { city: { contains: city, mode: "insensitive" as const } }
      : {};

    const where = {
      agencyId,
      ...(includeArchived ? {} : { archivedAt: null }),
      ...searchFilter,
      ...cityFilter,
    };

    const [items, total] = await Promise.all([
      prisma.hotel.findMany({
        where,
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.hotel.count({ where }),
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
   * Retrieves a single hotel record by ID, strictly enforcing agency tenancy.
   */
  async getHotelById(agencyId: string, hotelId: string, tx?: Prisma.TransactionClient): Promise<Hotel | null> {
    const db = tx || prisma;
    return db.hotel.findFirst({
      where: {
        id: hotelId,
        agencyId,
      },
    });
  },

  /**
   * Retrieves a single hotel record by Hotel Code, strictly enforcing agency tenancy.
   */
  async getHotelByCode(agencyId: string, hotelCode: string, tx?: Prisma.TransactionClient): Promise<Hotel | null> {
    const db = tx || prisma;
    const normalizedCode = hotelCode.trim().toUpperCase();
    return db.hotel.findFirst({
      where: {
        agencyId,
        hotelCode: { equals: normalizedCode, mode: "insensitive" },
        archivedAt: null,
      },
    });
  },

  /**
   * Finds an existing non-archived hotel matching normalized Name and City under the agency.
   */
  async findExistingHotelByNameAndCity(
    agencyId: string,
    name: string,
    city?: string | null,
    tx?: Prisma.TransactionClient
  ): Promise<Hotel | null> {
    const db = tx || prisma;
    const cleanName = name.trim().toLowerCase();
    const cleanCity = city?.trim().toLowerCase() || null;

    const candidates = await db.hotel.findMany({
      where: {
        agencyId,
        archivedAt: null,
      },
      select: {
        id: true,
        agencyId: true,
        hotelCode: true,
        name: true,
        category: true,
        address: true,
        city: true,
        state: true,
        country: true,
        phone: true,
        email: true,
        website: true,
        notes: true,
        supplierId: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const match = candidates.find((h) => {
      const matchName = h.name.trim().toLowerCase() === cleanName;
      if (!matchName) return false;

      const hCity = h.city?.trim().toLowerCase() || null;
      if (cleanCity && hCity) {
        return hCity === cleanCity;
      }
      if (!cleanCity && !hCity) {
        return true;
      }
      // If one has city and the other doesn't, treat as different
      return false;
    });

    return match || null;
  },

  /**
   * Checks for potential duplicate hotels under the same agency.
   */
  async checkDuplicateHotel(
    agencyId: string,
    params: {
      name: string;
      city?: string | null;
      phone?: string | null;
      email?: string | null;
      excludeId?: string;
    }
  ): Promise<{
    isDuplicate: boolean;
    matches: Array<{
      id: string;
      hotelCode: string | null;
      name: string;
      city: string | null;
      phone: string | null;
      email: string | null;
    }>;
  }> {
    const targetName = params.name.trim().toLowerCase();
    const targetCity = params.city?.trim().toLowerCase() || null;
    const targetPhoneDigits = params.phone?.replace(/\D/g, "");
    const targetEmail = params.email?.trim().toLowerCase();

    const candidates = await prisma.hotel.findMany({
      where: {
        agencyId,
        archivedAt: null,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
      select: {
        id: true,
        hotelCode: true,
        name: true,
        city: true,
        phone: true,
        email: true,
      },
      take: 200,
    });

    const matches = candidates.filter((h) => {
      const matchName = h.name.trim().toLowerCase() === targetName;
      const hCity = h.city?.trim().toLowerCase() || null;
      const matchCity = (!targetCity && !hCity) || (targetCity && hCity && targetCity === hCity);

      if (matchName && matchCity) return true;
      if (targetEmail && h.email?.trim().toLowerCase() === targetEmail) return true;
      if (targetPhoneDigits && targetPhoneDigits.length >= 6) {
        const candidateDigits = (h.phone || "").replace(/\D/g, "");
        if (
          candidateDigits.length >= 6 &&
          (candidateDigits.endsWith(targetPhoneDigits.slice(-10)) ||
            targetPhoneDigits.endsWith(candidateDigits.slice(-10)))
        ) {
          return true;
        }
      }
      return false;
    }).slice(0, 5);

    return {
      isDuplicate: matches.length > 0,
      matches,
    };
  },

  /**
   * Creates a new hotel master record under the authenticated agency with concurrency-safe Hotel Code generation.
   */
  async createHotel(
    agencyId: string,
    data: CreateHotelPayload & { hotelCode?: string | null },
    tx?: Prisma.TransactionClient
  ): Promise<Hotel> {
    const db = tx || prisma;
    const maxRetries = 5;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const code = data.hotelCode || (await this.generateNextHotelCode(agencyId, db));

        return await db.hotel.create({
          data: {
            agencyId,
            hotelCode: code,
            name: data.name.trim(),
            category: data.category?.trim() || null,
            address: data.address?.trim() || null,
            city: data.city?.trim() || null,
            state: data.state?.trim() || null,
            country: data.country?.trim() || "India",
            phone: data.phone?.trim() || null,
            email: data.email?.trim() || null,
            website: data.website?.trim() || null,
            notes: data.notes?.trim() || null,
          },
        });
      } catch (err: any) {
        // Retry on unique constraint violation on (agencyId, hotelCode)
        if (err?.code === "P2002" && attempt < maxRetries) {
          continue;
        }
        throw err;
      }
    }

    throw new Error("Failed to allocate a unique Hotel Code after multiple attempts.");
  },

  /**
   * Updates an existing hotel master record, strictly verifying agency tenancy and preserving immutable hotelCode.
   */
  async updateHotel(
    agencyId: string,
    hotelId: string,
    data: UpdateHotelInput,
    tx?: Prisma.TransactionClient
  ): Promise<Hotel> {
    const db = tx || prisma;
    const existing = await db.hotel.findFirst({
      where: {
        id: hotelId,
        agencyId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Hotel not found or does not belong to your agency.");
    }

    return db.hotel.update({
      where: { id: hotelId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.category !== undefined && { category: data.category?.trim() || null }),
        ...(data.address !== undefined && { address: data.address?.trim() || null }),
        ...(data.city !== undefined && { city: data.city?.trim() || null }),
        ...(data.state !== undefined && { state: data.state?.trim() || null }),
        ...(data.country !== undefined && { country: data.country?.trim() || null }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.website !== undefined && { website: data.website?.trim() || null }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
      },
    });
  },

  /**
   * Soft-deletes (archives) an existing hotel master record.
   * Ensures historical Trip relationships remain intact.
   */
  async archiveHotel(agencyId: string, hotelId: string, tx?: Prisma.TransactionClient): Promise<Hotel> {
    const db = tx || prisma;
    const existing = await db.hotel.findFirst({
      where: {
        id: hotelId,
        agencyId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Hotel not found or does not belong to your agency.");
    }

    return db.hotel.update({
      where: { id: hotelId },
      data: {
        archivedAt: new Date(),
      },
    });
  },
};
