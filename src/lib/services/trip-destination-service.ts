import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/api";
import {
  AddTripDestinationInput,
  ReorderTripDestinationsInput,
} from "@/lib/validation/trip-destination-schema";
import { TripDestination, Destination } from "@prisma/client";

export interface TripDestinationWithDestination extends TripDestination {
  destination: Destination;
}

export const tripDestinationService = {
  /**
   * Retrieves all TripDestinations for a specific Trip.
   * Strictly enforces that the Trip belongs to the authenticated agency.
   */
  async listTripDestinations(
    agencyId: string,
    tripId: string
  ): Promise<TripDestinationWithDestination[]> {
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

    return prisma.tripDestination.findMany({
      where: { tripId },
      include: { destination: true },
      orderBy: { sequence: "asc" },
    });
  },

  /**
   * Retrieves a single TripDestination by ID.
   */
  async getTripDestinationById(
    agencyId: string,
    tripId: string,
    tripDestinationId: string
  ): Promise<TripDestinationWithDestination | null> {
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

    return prisma.tripDestination.findFirst({
      where: {
        id: tripDestinationId,
        tripId,
      },
      include: { destination: true },
    });
  },

  /**
   * Adds a Destination to a Trip.
   * Enforces:
   * 1. Trip belongs to authenticated agency.
   * 2. Destination belongs to same authenticated agency.
   * 3. Calculates next contiguous sequence.
   * 4. Allows repeated destinations.
   */
  async addTripDestination(
    agencyId: string,
    tripId: string,
    data: AddTripDestinationInput
  ): Promise<TripDestinationWithDestination> {
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

    const destination = await prisma.destination.findFirst({
      where: {
        id: data.destinationId,
        agencyId,
      },
    });

    if (!destination) {
      throw new NotFoundError("Destination not found or does not belong to your agency.");
    }

    // Determine the next sequence index
    const maxSeq = await prisma.tripDestination.aggregate({
      where: { tripId },
      _max: { sequence: true },
    });

    const nextSequence = (maxSeq._max.sequence ?? 0) + 1;

    return prisma.tripDestination.create({
      data: {
        tripId,
        destinationId: data.destinationId,
        sequence: nextSequence,
        notes: data.notes?.trim() || null,
      },
      include: {
        destination: true,
      },
    });
  },

  /**
   * Removes a TripDestination from a Trip.
   * Resequences remaining items deterministically to 1..N using a safe 2-phase transaction.
   */
  async removeTripDestination(
    agencyId: string,
    tripId: string,
    tripDestinationId: string
  ): Promise<TripDestination> {
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

    const existing = await prisma.tripDestination.findFirst({
      where: {
        id: tripDestinationId,
        tripId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Trip destination assignment not found.");
    }

    return prisma.$transaction(async (tx) => {
      // 1. Delete the record
      const deleted = await tx.tripDestination.delete({
        where: { id: tripDestinationId },
      });

      // 2. Fetch remaining records in order
      const remaining = await tx.tripDestination.findMany({
        where: { tripId },
        orderBy: { sequence: "asc" },
      });

      // 3. Two-phase resequencing to avoid @@unique([tripId, sequence]) collision
      // Phase A: Temporary negative sequences
      for (let i = 0; i < remaining.length; i++) {
        await tx.tripDestination.update({
          where: { id: remaining[i].id },
          data: { sequence: -(i + 1) },
        });
      }

      // Phase B: Final positive contiguous sequences (1..N)
      for (let i = 0; i < remaining.length; i++) {
        await tx.tripDestination.update({
          where: { id: remaining[i].id },
          data: { sequence: i + 1 },
        });
      }

      return deleted;
    });
  },

  /**
   * Reorders all TripDestinations for a Trip.
   * Validates:
   * - Trip belongs to authenticated agency.
   * - Exactly matches all existing TripDestination IDs for the trip.
   * - Uses a 2-phase negative-to-positive transaction for sequence safety.
   */
  async reorderTripDestinations(
    agencyId: string,
    tripId: string,
    data: ReorderTripDestinationsInput
  ): Promise<TripDestinationWithDestination[]> {
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

    const existingRecords = await prisma.tripDestination.findMany({
      where: { tripId },
    });

    const existingIds = new Set(existingRecords.map((r) => r.id));
    const submittedIds = data.tripDestinationIds;

    // Validate that submitted IDs do not contain duplicates
    if (new Set(submittedIds).size !== submittedIds.length) {
      throw new ValidationError("Duplicate TripDestination IDs are not allowed in reorder request.");
    }

    // Validate that submitted IDs match all existing records exactly
    if (submittedIds.length !== existingRecords.length) {
      throw new ValidationError(
        "Reorder request must include all destination items for this trip."
      );
    }

    for (const id of submittedIds) {
      if (!existingIds.has(id)) {
        throw new ValidationError(
          `Trip destination item '${id}' does not belong to this trip.`
        );
      }
    }

    // Two-phase resequencing transaction
    await prisma.$transaction(async (tx) => {
      // Phase 1: Set temporary negative sequences
      for (let i = 0; i < submittedIds.length; i++) {
        await tx.tripDestination.update({
          where: { id: submittedIds[i] },
          data: { sequence: -(i + 1) },
        });
      }

      // Phase 2: Set final positive contiguous sequences
      for (let i = 0; i < submittedIds.length; i++) {
        await tx.tripDestination.update({
          where: { id: submittedIds[i] },
          data: { sequence: i + 1 },
        });
      }
    });

    return prisma.tripDestination.findMany({
      where: { tripId },
      include: { destination: true },
      orderBy: { sequence: "asc" },
    });
  },
};
