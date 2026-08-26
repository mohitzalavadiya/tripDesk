import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/api";
import {
  CreateTravelerInput,
  UpdateTravelerInput,
} from "@/lib/validation/traveler-schema";
import { Traveler } from "@prisma/client";

export const travelerService = {
  /**
   * Retrieves all travelers for a trip, verifying agency ownership of the trip.
   */
  async listTravelers(agencyId: string, tripId: string): Promise<Traveler[]> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
      select: { id: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    return prisma.traveler.findMany({
      where: { tripId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
  },

  /**
   * Retrieves a single traveler by ID, verifying trip and agency ownership.
   */
  async getTravelerById(
    agencyId: string,
    tripId: string,
    travelerId: string
  ): Promise<Traveler | null> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
      select: { id: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    return prisma.traveler.findFirst({
      where: {
        id: travelerId,
        tripId,
      },
    });
  },

  /**
   * Adds a new traveler to a trip after verifying agency ownership and trip status.
   */
  async createTraveler(
    agencyId: string,
    tripId: string,
    data: CreateTravelerInput
  ): Promise<Traveler> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
      select: { id: true, archivedAt: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    if (trip.archivedAt) {
      throw new NotFoundError("Active trip");
    }

    return prisma.$transaction(async (tx) => {
      // If marked as primary, demote any existing primary traveler on this trip
      if (data.isPrimary) {
        await tx.traveler.updateMany({
          where: { tripId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return tx.traveler.create({
        data: {
          tripId,
          name: data.name,
          type: data.type || "ADULT",
          isPrimary: data.isPrimary ?? false,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender || null,
          nationality: data.nationality || null,
          phone: data.phone || null,
          email: data.email || null,
          idPhotoUrl: data.idPhotoUrl || null,
          specialRequirements: data.specialRequirements || null,
          notes: data.notes || null,
        },
      });
    });
  },

  /**
   * Updates an existing traveler record under a trip after verifying tenancy.
   */
  async updateTraveler(
    agencyId: string,
    tripId: string,
    travelerId: string,
    data: UpdateTravelerInput
  ): Promise<Traveler> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
      select: { id: true, archivedAt: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    if (trip.archivedAt) {
      throw new NotFoundError("Active trip");
    }

    const existing = await prisma.traveler.findFirst({
      where: {
        id: travelerId,
        tripId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Traveler");
    }

    return prisma.$transaction(async (tx) => {
      // If marking as primary, demote other travelers
      if (data.isPrimary) {
        await tx.traveler.updateMany({
          where: { tripId, isPrimary: true, id: { not: travelerId } },
          data: { isPrimary: false },
        });
      }

      return tx.traveler.update({
        where: { id: travelerId },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.type !== undefined ? { type: data.type } : {}),
          ...(data.isPrimary !== undefined ? { isPrimary: data.isPrimary } : {}),
          ...(data.dateOfBirth !== undefined ? { dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null } : {}),
          ...(data.gender !== undefined ? { gender: data.gender || null } : {}),
          ...(data.nationality !== undefined ? { nationality: data.nationality || null } : {}),
          ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
          ...(data.email !== undefined ? { email: data.email || null } : {}),
          ...(data.idPhotoUrl !== undefined ? { idPhotoUrl: data.idPhotoUrl || null } : {}),
          ...(data.specialRequirements !== undefined ? { specialRequirements: data.specialRequirements || null } : {}),
          ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
        },
      });
    });
  },

  /**
   * Sets a traveler as the primary contact for a trip.
   */
  async setPrimaryTraveler(
    agencyId: string,
    tripId: string,
    travelerId: string
  ): Promise<Traveler> {
    return this.updateTraveler(agencyId, tripId, travelerId, { isPrimary: true });
  },

  /**
   * Deletes a traveler record from a trip after verifying tenancy.
   */
  async deleteTraveler(agencyId: string, tripId: string, travelerId: string): Promise<Traveler> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
      select: { id: true, archivedAt: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    if (trip.archivedAt) {
      throw new NotFoundError("Active trip");
    }

    const existing = await prisma.traveler.findFirst({
      where: {
        id: travelerId,
        tripId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Traveler");
    }

    return prisma.traveler.delete({
      where: { id: travelerId },
    });
  },
};
