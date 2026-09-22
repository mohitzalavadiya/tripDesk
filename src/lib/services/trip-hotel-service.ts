import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/api";
import {
  CreateTripHotelInput,
  UpdateTripHotelInput,
} from "@/lib/validation/trip-hotel-schema";
import { TripHotel, Hotel, TripDestination, Destination } from "@prisma/client";

export interface TripHotelWithHotel extends TripHotel {
  hotel: Hotel;
  tripDestination?: (TripDestination & { destination: Destination }) | null;
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
      return [];
    }

    return prisma.tripHotel.findMany({
      where: {
        tripId,
      },
      include: {
        hotel: true,
        tripDestination: {
          include: {
            destination: true,
          },
        },
      },
      orderBy: {
        checkIn: "asc",
      },
    });
  },

  /**
   * Retrieves a single Trip-Hotel assignment by ID, verifying agency ownership through Trip.
   */
  async getTripHotelById(
    agencyId: string,
    tripIdOrHotelId: string,
    tripHotelId?: string
  ): Promise<TripHotelWithHotel | null> {
    const actualHotelId = tripHotelId || tripIdOrHotelId;
    const actualTripId = tripHotelId ? tripIdOrHotelId : undefined;

    return prisma.tripHotel.findFirst({
      where: {
        id: actualHotelId,
        ...(actualTripId ? { tripId: actualTripId } : {}),
        trip: {
          agencyId,
          archivedAt: null,
        },
      },
      include: {
        hotel: true,
        tripDestination: {
          include: {
            destination: true,
          },
        },
      },
    });
  },

  /**
   * Creates a new Trip-Hotel assignment.
   * Verifies both Trip and Hotel belong to the authenticated agency and are not archived.
   * If tripDestinationId is provided, verifies that it belongs to the trip and agency,
   * and that the Hotel destination matches the selected TripDestination.
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
        include: {
          tripDestinations: true,
        },
      }),
      prisma.hotel.findFirst({
        where: {
          id: data.hotelId,
          agencyId,
          archivedAt: null,
        },
        select: { id: true, destinationId: true },
      }),
    ]);

    if (!trip) {
      throw new NotFoundError("Trip not found or does not belong to your agency.");
    }

    if (!hotel) {
      throw new NotFoundError("Selected hotel not found or does not belong to your agency.");
    }

    // Validate that hotel belongs to the Trip's configured destination set (if destinations exist)
    if (trip.tripDestinations.length > 0) {
      const tripDestIds = trip.tripDestinations.map((td) => td.destinationId);
      if (!hotel.destinationId || !tripDestIds.includes(hotel.destinationId)) {
        throw new ValidationError("Selected hotel does not belong to any destination configured for this Trip.");
      }
    }

    let tripDestinationId: string | null = null;
    if (data.tripDestinationId && data.tripDestinationId.trim() !== "") {
      const tripDest = await prisma.tripDestination.findFirst({
        where: {
          id: data.tripDestinationId,
          tripId,
          destination: {
            agencyId,
            status: "ACTIVE",
          },
        },
        include: { destination: true },
      });

      if (!tripDest) {
        throw new ValidationError("Trip destination leg not found or does not belong to this Trip.");
      }

      if (hotel.destinationId && hotel.destinationId !== tripDest.destinationId) {
        throw new ValidationError("Selected hotel does not belong to the selected Trip Destination leg.");
      }

      tripDestinationId = tripDest.id;
    }

    return prisma.tripHotel.create({
      data: {
        tripId,
        hotelId: data.hotelId,
        tripDestinationId,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        roomType: data.roomType,
        rooms: data.rooms ?? 1,
        mealPlan: data.mealPlan || null,
        nightlyRate: data.nightlyRate !== undefined && data.nightlyRate !== null ? data.nightlyRate : null,
        totalAmount: data.totalAmount !== undefined && data.totalAmount !== null ? data.totalAmount : null,
        notes: data.notes || null,
      },
      include: {
        hotel: true,
        tripDestination: {
          include: {
            destination: true,
          },
        },
      },
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
      include: {
        hotel: true,
        tripDestination: true,
        trip: {
          include: {
            tripDestinations: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError("Trip hotel assignment not found.");
    }

    let targetHotel = existing.hotel;
    if (data.hotelId && data.hotelId !== existing.hotelId) {
      const foundHotel = await prisma.hotel.findFirst({
        where: {
          id: data.hotelId,
          agencyId,
          archivedAt: null,
        },
      });

      if (!foundHotel) {
        throw new NotFoundError("Target hotel not found or does not belong to your agency.");
      }
      targetHotel = foundHotel;
    }

    // Validate that target hotel belongs to the Trip's configured destination set
    if (existing.trip.tripDestinations.length > 0) {
      const tripDestIds = existing.trip.tripDestinations.map((td) => td.destinationId);
      if (!targetHotel.destinationId || !tripDestIds.includes(targetHotel.destinationId)) {
        throw new ValidationError("Selected hotel does not belong to any destination configured for this Trip.");
      }
    }

    let targetTripDestinationId = existing.tripDestinationId;
    if (data.tripDestinationId !== undefined) {
      if (data.tripDestinationId && data.tripDestinationId.trim() !== "") {
        const tripDest = await prisma.tripDestination.findFirst({
          where: {
            id: data.tripDestinationId,
            tripId,
            destination: {
              agencyId,
              status: "ACTIVE",
            },
          },
        });

        if (!tripDest) {
          throw new ValidationError("Trip destination leg not found or does not belong to this Trip.");
        }

        if (targetHotel.destinationId && targetHotel.destinationId !== tripDest.destinationId) {
          throw new ValidationError("Selected hotel does not belong to the selected Trip Destination leg.");
        }

        targetTripDestinationId = tripDest.id;
      } else {
        targetTripDestinationId = null;
      }
    } else if (data.hotelId && data.hotelId !== existing.hotelId && existing.tripDestinationId) {
      const existingTripDest = await prisma.tripDestination.findUnique({
        where: { id: existing.tripDestinationId },
      });
      if (existingTripDest && targetHotel.destinationId && targetHotel.destinationId !== existingTripDest.destinationId) {
        // If changed hotel doesn't match old leg, clear leg association safely
        targetTripDestinationId = null;
      }
    }

    return prisma.tripHotel.update({
      where: { id: tripHotelId },
      data: {
        ...(data.hotelId !== undefined && { hotelId: data.hotelId }),
        ...(data.tripDestinationId !== undefined && { tripDestinationId: targetTripDestinationId }),
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
      include: {
        hotel: true,
        tripDestination: {
          include: {
            destination: true,
          },
        },
      },
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
