import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/api";
import {
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleListQueryInput,
} from "@/lib/validation/vehicle-schema";
import { Vehicle } from "@prisma/client";

export interface PaginatedVehiclesResult {
  items: Vehicle[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const vehicleService = {
  /**
   * Retrieves a paginated list of vehicle master records strictly scoped to the authenticated agency.
   * Excludes archived vehicles by default.
   */
  async listVehicles(
    agencyId: string,
    params: VehicleListQueryInput
  ): Promise<PaginatedVehiclesResult> {
    const { page, limit, search, type, includeArchived } = params;
    const skip = (page - 1) * limit;

    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { type: { contains: search, mode: "insensitive" as const } },
            { registrationNumber: { contains: search, mode: "insensitive" as const } },
            { driverName: { contains: search, mode: "insensitive" as const } },
            { driverPhone: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const typeFilter = type
      ? { type: { contains: type, mode: "insensitive" as const } }
      : {};

    const where = {
      agencyId,
      ...(includeArchived ? {} : { archivedAt: null }),
      ...searchFilter,
      ...typeFilter,
    };

    const [items, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.vehicle.count({ where }),
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
   * Retrieves a single vehicle record by ID, strictly enforcing agency tenancy.
   */
  async getVehicleById(agencyId: string, vehicleId: string): Promise<Vehicle | null> {
    return prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        agencyId,
      },
    });
  },

  /**
   * Creates a new vehicle master record under the authenticated agency.
   */
  async createVehicle(agencyId: string, data: CreateVehicleInput): Promise<Vehicle> {
    return prisma.vehicle.create({
      data: {
        agencyId,
        name: data.name,
        type: data.type,
        capacity: data.capacity ?? 4,
        registrationNumber: data.registrationNumber || null,
        driverName: data.driverName || null,
        driverPhone: data.driverPhone || null,
        pricingType: data.pricingType,
        baseRate: data.baseRate !== undefined && data.baseRate !== null ? data.baseRate : null,
        ratePerKm: data.ratePerKm !== undefined && data.ratePerKm !== null ? data.ratePerKm : null,
        notes: data.notes || null,
      },
    });
  },

  /**
   * Updates an existing vehicle master record, strictly verifying agency tenancy.
   */
  async updateVehicle(
    agencyId: string,
    vehicleId: string,
    data: UpdateVehicleInput
  ): Promise<Vehicle> {
    const existing = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        agencyId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Vehicle not found or does not belong to your agency.");
    }

    return prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.registrationNumber !== undefined && {
          registrationNumber: data.registrationNumber || null,
        }),
        ...(data.driverName !== undefined && { driverName: data.driverName || null }),
        ...(data.driverPhone !== undefined && { driverPhone: data.driverPhone || null }),
        ...(data.pricingType !== undefined && { pricingType: data.pricingType }),
        ...(data.baseRate !== undefined && {
          baseRate: data.baseRate !== null ? data.baseRate : null,
        }),
        ...(data.ratePerKm !== undefined && {
          ratePerKm: data.ratePerKm !== null ? data.ratePerKm : null,
        }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
    });
  },

  /**
   * Soft-deletes (archives) an existing vehicle master record.
   * Ensures historical Trip relationships remain intact.
   */
  async archiveVehicle(agencyId: string, vehicleId: string): Promise<Vehicle> {
    const existing = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        agencyId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Vehicle not found or does not belong to your agency.");
    }

    return prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        archivedAt: new Date(),
      },
    });
  },
};
