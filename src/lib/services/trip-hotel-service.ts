import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/api";
import {
  CreateTripHotelInput,
  UpdateTripHotelInput,
} from "@/lib/validation/trip-hotel-schema";
import { TripHotel, Hotel } from "@prisma/client";

export interface TripHotelWithHotel extends TripHotel {
  hotel: Hotel;
}

export const tripHotelService = {
  /**
   * Retrieves all hotel assignments for a specific Trip.
   * Strictly enforces that the Trip belongs to the authenticated agency.
   */
  async listTripHotels(
    agencyId: string,
    tripId: string
  ): Promise<TripHotelWithHotel[]> {
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

    return prisma.tripHotel.findMany({
      where: { tripId },
      include: { hotel: true },
      orderBy: { checkIn: "asc" },
    });
  },

  /**
   * Retrieves a single Trip-Hotel assignment by ID.
   */
  async getTripHotelById(
    agencyId: string,
    tripId: string,
    tripHotelId: string
  ): Promise<TripHotelWithHotel | null> {
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

    return prisma.tripHotel.findFirst({
      where: {
        id: tripHotelId,
        tripId,
      },
      include: { hotel: true },
    });
  },

  /**
   * Creates a new Trip-Hotel assignment.
   * Verifies both Trip and Hotel belong to the authenticated agency and are not archived.
   */
  async createTripHotel(
    agencyId: string,
    tripId: string,
    data: CreateTripHotelInput
  ): Promise<TripHotelWithHotel> {
    const [trip, hotel] = await Promise.all([
      prisma.trip.findFirst({
        where: {
          id: tripId,
          agencyId,
          archivedAt: null,
        },
        select: { id: true },
      }),
      prisma.hotel.findFirst({
        where: {
          id: data.hotelId,
          agencyId,
          archivedAt: null,
        },
        select: { id: true },
      }),
    ]);

    if (!trip) {
      throw new NotFoundError("Trip not found or does not belong to your agency.");
    }

    if (!hotel) {
      throw new NotFoundError("Selected hotel not found or does not belong to your agency.");
    }

    return prisma.tripHotel.create({
      data: {
        tripId,
        hotelId: data.hotelId,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        roomType: data.roomType,
        rooms: data.rooms ?? 1,
        mealPlan: data.mealPlan || null,
        nightlyRate: data.nightlyRate !== undefined && data.nightlyRate !== null ? data.nightlyRate : null,
        totalAmount: data.totalAmount !== undefined && data.totalAmount !== null ? data.totalAmount : null,
        notes: data.notes || null,
      },
      include: { hotel: true },
    });
  },

  /**
   * Updates an existing Trip-Hotel assignment.
   */
  async updateTripHotel(
    agencyId: string,
    tripId: string,
    tripHotelId: string,
    data: UpdateTripHotelInput
  ): Promise<TripHotelWithHotel> {
    const existing = await prisma.tripHotel.findFirst({
      where: {
        id: tripHotelId,
        tripId,
        trip: {
          agencyId,
          archivedAt: null,
        },
      },
    });

    if (!existing) {
      throw new NotFoundError("Trip hotel assignment not found.");
    }

    if (data.hotelId && data.hotelId !== existing.hotelId) {
      const targetHotel = await prisma.hotel.findFirst({
        where: {
          id: data.hotelId,
          agencyId,
          archivedAt: null,
        },
        select: { id: true },
      });

      if (!targetHotel) {
        throw new NotFoundError("Target hotel not found or does not belong to your agency.");
      }
    }

    return prisma.tripHotel.update({
      where: { id: tripHotelId },
      data: {
        ...(data.hotelId !== undefined && { hotelId: data.hotelId }),
        ...(data.checkIn !== undefined && { checkIn: data.checkIn }),
        ...(data.checkOut !== undefined && { checkOut: data.checkOut }),
        ...(data.roomType !== undefined && { roomType: data.roomType }),
        ...(data.rooms !== undefined && { rooms: data.rooms }),
        ...(data.mealPlan !== undefined && { mealPlan: data.mealPlan || null }),
        ...(data.nightlyRate !== undefined && {
          nightlyRate: data.nightlyRate !== null ? data.nightlyRate : null,
        }),
        ...(data.totalAmount !== undefined && {
          totalAmount: data.totalAmount !== null ? data.totalAmount : null,
        }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
      include: { hotel: true },
    });
  },

  /**
   * Deletes a Trip-Hotel assignment.
   */
  async deleteTripHotel(
    agencyId: string,
    tripId: string,
    tripHotelId: string
  ): Promise<TripHotel> {
    const existing = await prisma.tripHotel.findFirst({
      where: {
        id: tripHotelId,
        tripId,
        trip: {
          agencyId,
          archivedAt: null,
        },
      },
    });

    if (!existing) {
      throw new NotFoundError("Trip hotel assignment not found.");
    }

    return prisma.tripHotel.delete({
      where: { id: tripHotelId },
    });
  },
};
