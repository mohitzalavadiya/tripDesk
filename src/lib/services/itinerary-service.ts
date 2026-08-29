import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/api";
import {
  CreateItineraryItemInput,
  UpdateItineraryItemInput,
} from "@/lib/validation/itinerary-schema";
import { ItineraryItem } from "@prisma/client";

export const itineraryService = {
  /**
   * Retrieves all itinerary items for a trip in chronological and sort order.
   */
  async listItineraryItems(agencyId: string, tripId: string): Promise<ItineraryItem[]> {
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

    return prisma.itineraryItem.findMany({
      where: { tripId },
      orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  /**
   * Retrieves a single itinerary item by ID, verifying trip and agency ownership.
   */
  async getItineraryItemById(
    agencyId: string,
    tripId: string,
    itemId: string
  ): Promise<ItineraryItem | null> {
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

    return prisma.itineraryItem.findFirst({
      where: {
        id: itemId,
        tripId,
      },
    });
  },

  /**
   * Adds a new itinerary item to a trip after verifying tenancy and active status.
   */
  async createItineraryItem(
    agencyId: string,
    tripId: string,
    data: CreateItineraryItemInput
  ): Promise<ItineraryItem> {
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

    return prisma.itineraryItem.create({
      data: {
        tripId,
        dayNumber: data.dayNumber,
        date: data.date || null,
        title: data.title,
        description: data.description || null,
        location: data.location || null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        sortOrder: data.sortOrder !== undefined ? data.sortOrder : 0,
      },
    });
  },

  /**
   * Updates an existing itinerary item under a trip after verifying tenancy.
   */
  async updateItineraryItem(
    agencyId: string,
    tripId: string,
    itemId: string,
    data: UpdateItineraryItemInput
  ): Promise<ItineraryItem> {
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

    const existing = await prisma.itineraryItem.findFirst({
      where: {
        id: itemId,
        tripId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Itinerary item");
    }

    return prisma.itineraryItem.update({
      where: { id: itemId },
      data: {
        ...(data.dayNumber !== undefined ? { dayNumber: data.dayNumber } : {}),
        ...(data.date !== undefined ? { date: data.date || null } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.location !== undefined ? { location: data.location || null } : {}),
        ...(data.startTime !== undefined ? { startTime: data.startTime || null } : {}),
        ...(data.endTime !== undefined ? { endTime: data.endTime || null } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
  },

  /**
   * Deletes an itinerary item from a trip after verifying tenancy.
   */
  async deleteItineraryItem(
    agencyId: string,
    tripId: string,
    itemId: string
  ): Promise<ItineraryItem> {
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

    const existing = await prisma.itineraryItem.findFirst({
      where: {
        id: itemId,
        tripId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Itinerary item");
    }

    return prisma.itineraryItem.delete({
      where: { id: itemId },
    });
  },
};
