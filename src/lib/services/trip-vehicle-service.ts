import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/api";
import {
  CreateTripVehicleInput,
  UpdateTripVehicleInput,
} from "@/lib/validation/trip-vehicle-schema";
import { TripVehicle, Vehicle } from "@prisma/client";

export interface TripVehicleWithVehicle extends TripVehicle {
  vehicle: Vehicle | null;
}

export const tripVehicleService = {
  /**
   * Retrieves all vehicle assignments for a specific Trip.
   * Strictly enforces agency tenancy.
   */
  async listTripVehicles(
    agencyId: string,
    tripId: string
  ): Promise<TripVehicleWithVehicle[]> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
        archivedAt: null,
      },
      select: { id: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip not found or does not belong to your agency.");
    }

    return prisma.tripVehicle.findMany({
      where: { tripId },
      include: { vehicle: true },
      orderBy: { createdAt: "asc" },
    });
  },

  /**
   * Retrieves a single Trip-Vehicle assignment by ID.
   */
  async getTripVehicleById(
    agencyId: string,
    tripId: string,
    tripVehicleId: string
  ): Promise<TripVehicleWithVehicle | null> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
        archivedAt: null,
      },
      select: { id: true },
    });

    if (!trip) {
      return null;
    }

    return prisma.tripVehicle.findFirst({
      where: {
        id: tripVehicleId,
        tripId,
      },
      include: { vehicle: true },
    });
  },

  /**
   * Creates a new Trip-Vehicle assignment.
   * Verifies Trip belongs to authenticated agency and is not archived.
   * If vehicleId is provided, verifies Vehicle belongs to authenticated agency and is active.
   */
  async createTripVehicle(
    agencyId: string,
    tripId: string,
    data: CreateTripVehicleInput
  ): Promise<TripVehicleWithVehicle> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
        archivedAt: null,
      },
      select: { id: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip not found or does not belong to your agency.");
    }

    if (data.vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id: data.vehicleId,
          agencyId,
          archivedAt: null,
        },
        select: { id: true },
      });

      if (!vehicle) {
        throw new NotFoundError("Selected vehicle not found or does not belong to your agency.");
      }
    }

    return prisma.tripVehicle.create({
      data: {
        tripId,
        vehicleId: data.vehicleId || null,
        vehicleName: data.vehicleName,
        vehicleType: data.vehicleType,
        capacity: data.capacity !== undefined && data.capacity !== null ? data.capacity : null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        pickupLocation: data.pickupLocation || null,
        dropLocation: data.dropLocation || null,
        driverName: data.driverName || null,
        driverPhone: data.driverPhone || null,
        pricingType: data.pricingType,
        ratePerKm: data.ratePerKm !== undefined && data.ratePerKm !== null ? data.ratePerKm : null,
        estimatedKm: data.estimatedKm !== undefined && data.estimatedKm !== null ? data.estimatedKm : null,
        totalRate: data.totalRate !== undefined && data.totalRate !== null ? data.totalRate : null,
        notes: data.notes || null,
      },
      include: { vehicle: true },
    });
  },

  /**
   * Updates an existing Trip-Vehicle assignment.
   */
  async updateTripVehicle(
    agencyId: string,
    tripId: string,
    tripVehicleId: string,
    data: UpdateTripVehicleInput
  ): Promise<TripVehicleWithVehicle> {
    const existing = await prisma.tripVehicle.findFirst({
      where: {
        id: tripVehicleId,
        tripId,
        trip: {
          agencyId,
          archivedAt: null,
        },
      },
    });

    if (!existing) {
      throw new NotFoundError("Trip vehicle assignment not found.");
    }

    if (data.vehicleId && data.vehicleId !== existing.vehicleId) {
      const targetVehicle = await prisma.vehicle.findFirst({
        where: {
          id: data.vehicleId,
          agencyId,
          archivedAt: null,
        },
        select: { id: true },
      });

      if (!targetVehicle) {
        throw new NotFoundError("Target vehicle not found or does not belong to your agency.");
      }
    }

    return prisma.tripVehicle.update({
      where: { id: tripVehicleId },
      data: {
        ...(data.vehicleId !== undefined && { vehicleId: data.vehicleId || null }),
        ...(data.vehicleName !== undefined && { vehicleName: data.vehicleName }),
        ...(data.vehicleType !== undefined && { vehicleType: data.vehicleType }),
        ...(data.capacity !== undefined && {
          capacity: data.capacity !== null ? data.capacity : null,
        }),
        ...(data.startDate !== undefined && { startDate: data.startDate || null }),
        ...(data.endDate !== undefined && { endDate: data.endDate || null }),
        ...(data.pickupLocation !== undefined && {
          pickupLocation: data.pickupLocation || null,
        }),
        ...(data.dropLocation !== undefined && { dropLocation: data.dropLocation || null }),
        ...(data.driverName !== undefined && { driverName: data.driverName || null }),
        ...(data.driverPhone !== undefined && { driverPhone: data.driverPhone || null }),
        ...(data.pricingType !== undefined && { pricingType: data.pricingType }),
        ...(data.ratePerKm !== undefined && {
          ratePerKm: data.ratePerKm !== null ? data.ratePerKm : null,
        }),
        ...(data.estimatedKm !== undefined && {
          estimatedKm: data.estimatedKm !== null ? data.estimatedKm : null,
        }),
        ...(data.totalRate !== undefined && {
          totalRate: data.totalRate !== null ? data.totalRate : null,
        }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
      include: { vehicle: true },
    });
  },

  /**
   * Deletes a Trip-Vehicle assignment.
   */
  async deleteTripVehicle(
    agencyId: string,
    tripId: string,
    tripVehicleId: string
  ): Promise<TripVehicle> {
    const existing = await prisma.tripVehicle.findFirst({
      where: {
        id: tripVehicleId,
        tripId,
        trip: {
          agencyId,
          archivedAt: null,
        },
      },
    });

    if (!existing) {
      throw new NotFoundError("Trip vehicle assignment not found.");
    }

    return prisma.tripVehicle.delete({
      where: { id: tripVehicleId },
    });
  },
};
