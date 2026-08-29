import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/api";
import {
  CreateHotelInput,
  UpdateHotelInput,
  HotelListQueryInput,
} from "@/lib/validation/hotel-schema";
import { Hotel } from "@prisma/client";

export interface PaginatedHotelsResult {
  items: Hotel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const hotelService = {
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
        orderBy: { name: "asc" },
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
  async getHotelById(agencyId: string, hotelId: string): Promise<Hotel | null> {
    return prisma.hotel.findFirst({
      where: {
        id: hotelId,
        agencyId,
      },
    });
  },

  /**
   * Creates a new hotel master record under the authenticated agency.
   */
  async createHotel(agencyId: string, data: CreateHotelInput): Promise<Hotel> {
    return prisma.hotel.create({
      data: {
        agencyId,
        name: data.name,
        category: data.category || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || "India",
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        notes: data.notes || null,
      },
    });
  },

  /**
   * Updates an existing hotel master record, strictly verifying agency tenancy.
   */
  async updateHotel(
    agencyId: string,
    hotelId: string,
    data: UpdateHotelInput
  ): Promise<Hotel> {
    const existing = await prisma.hotel.findFirst({
      where: {
        id: hotelId,
        agencyId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Hotel not found or does not belong to your agency.");
    }

    return prisma.hotel.update({
      where: { id: hotelId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.city !== undefined && { city: data.city || null }),
        ...(data.state !== undefined && { state: data.state || null }),
        ...(data.country !== undefined && { country: data.country || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.website !== undefined && { website: data.website || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
    });
  },

  /**
   * Soft-deletes (archives) an existing hotel master record.
   * Ensures historical Trip relationships remain intact.
   */
  async archiveHotel(agencyId: string, hotelId: string): Promise<Hotel> {
    const existing = await prisma.hotel.findFirst({
      where: {
        id: hotelId,
        agencyId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Hotel not found or does not belong to your agency.");
    }

    return prisma.hotel.update({
      where: { id: hotelId },
      data: {
        archivedAt: new Date(),
      },
    });
  },
};
