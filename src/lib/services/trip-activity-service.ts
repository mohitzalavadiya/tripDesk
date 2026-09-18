import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/api";
import {
  CreateTripActivityInput,
  UpdateTripActivityInput,
} from "@/lib/validation/trip-activity-schema";
import { TripActivity, Activity, TripDestination, Destination } from "@prisma/client";

export interface TripActivityWithActivity extends TripActivity {
  activity: Activity | null;
  tripDestination?: (TripDestination & { destination: Destination }) | null;
}

export const tripActivityService = {
  /**
   * Retrieves all activity assignments for a specific Trip.
   * Strictly enforces agency tenancy.
   */
  async listTripActivities(
    agencyId: string,
    tripId: string
  ): Promise<TripActivityWithActivity[]> {
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

    return prisma.tripActivity.findMany({
      where: { tripId },
      include: {
        activity: true,
        tripDestination: {
          include: {
            destination: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  /**
   * Retrieves a single Trip-Activity assignment by ID.
   */
  async getTripActivityById(
    agencyId: string,
    tripId: string,
    tripActivityId: string
  ): Promise<TripActivityWithActivity | null> {
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

    return prisma.tripActivity.findFirst({
      where: {
        id: tripActivityId,
        tripId,
      },
      include: {
        activity: true,
        tripDestination: {
          include: {
            destination: true,
          },
        },
      },
    });
  },

  /**
   * Creates a new Trip-Activity assignment.
   * If activityId is provided, verifies ownership and active state.
   * If tripDestinationId is provided, validates leg and destination match.
   */
  async createTripActivity(
    agencyId: string,
    tripId: string,
    data: CreateTripActivityInput
  ): Promise<TripActivityWithActivity> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
        archivedAt: null,
      },
      include: {
        tripDestinations: true,
      },
    });

    if (!trip) {
      throw new NotFoundError("Trip not found or does not belong to your agency.");
    }

    let activityRecord: Activity | null = null;
    if (data.activityId && data.activityId.trim() !== "") {
      activityRecord = await prisma.activity.findFirst({
        where: {
          id: data.activityId,
          agencyId,
          archivedAt: null,
        },
      });

      if (!activityRecord) {
        throw new NotFoundError("Selected activity not found or does not belong to your agency.");
      }

      // Validate that activity belongs to the Trip's configured destination set (if destinations exist)
      if (trip.tripDestinations.length > 0) {
        const tripDestIds = trip.tripDestinations.map((td) => td.destinationId);
        if (!activityRecord.destinationId || !tripDestIds.includes(activityRecord.destinationId)) {
          throw new ValidationError("Selected activity does not belong to any destination configured for this Trip.");
        }
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
      });

      if (!tripDest) {
        throw new ValidationError("Trip destination leg not found or does not belong to this Trip.");
      }

      if (activityRecord?.destinationId && activityRecord.destinationId !== tripDest.destinationId) {
        throw new ValidationError("Selected activity does not belong to the selected Trip Destination leg.");
      }

      tripDestinationId = tripDest.id;
    }

    return prisma.tripActivity.create({
      data: {
        tripId,
        activityId: data.activityId || null,
        tripDestinationId,
        name: data.name,
        description: data.description || null,
        date: data.date || null,
        time: data.time || null,
        location: data.location || null,
        numberOfParticipants: data.numberOfParticipants ?? 1,
        type: data.type,
        adultPrice: data.adultPrice !== undefined && data.adultPrice !== null ? data.adultPrice : null,
        childPrice: data.childPrice !== undefined && data.childPrice !== null ? data.childPrice : null,
        totalPrice: data.totalPrice !== undefined && data.totalPrice !== null ? data.totalPrice : null,
        notes: data.notes || null,
      },
      include: {
        activity: true,
        tripDestination: {
          include: {
            destination: true,
          },
        },
      },
    });
  },

  /**
   * Updates an existing Trip-Activity assignment.
   */
  async updateTripActivity(
    agencyId: string,
    tripId: string,
    tripActivityId: string,
    data: UpdateTripActivityInput
  ): Promise<TripActivityWithActivity> {
    const existing = await prisma.tripActivity.findFirst({
      where: {
        id: tripActivityId,
        tripId,
        trip: {
          agencyId,
          archivedAt: null,
        },
      },
      include: {
        activity: true,
        tripDestination: true,
        trip: {
          include: {
            tripDestinations: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError("Trip activity assignment not found.");
    }

    let targetActivity = existing.activity;
    if (data.activityId !== undefined) {
      if (data.activityId && data.activityId.trim() !== "") {
        const foundActivity = await prisma.activity.findFirst({
          where: {
            id: data.activityId,
            agencyId,
            archivedAt: null,
          },
        });

        if (!foundActivity) {
          throw new NotFoundError("Target activity not found or does not belong to your agency.");
        }
        targetActivity = foundActivity;
      } else {
        targetActivity = null;
      }
    }

    // Validate that target activity belongs to the Trip's configured destination set
    if (targetActivity && existing.trip.tripDestinations.length > 0) {
      const tripDestIds = existing.trip.tripDestinations.map((td) => td.destinationId);
      if (!targetActivity.destinationId || !tripDestIds.includes(targetActivity.destinationId)) {
        throw new ValidationError("Selected activity does not belong to any destination configured for this Trip.");
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

        if (targetActivity?.destinationId && targetActivity.destinationId !== tripDest.destinationId) {
          throw new ValidationError("Selected activity does not belong to the selected Trip Destination leg.");
        }

        targetTripDestinationId = tripDest.id;
      } else {
        targetTripDestinationId = null;
      }
    } else if (data.activityId && targetActivity && existing.tripDestinationId) {
      const existingTripDest = await prisma.tripDestination.findUnique({
        where: { id: existing.tripDestinationId },
      });
      if (existingTripDest && targetActivity.destinationId && targetActivity.destinationId !== existingTripDest.destinationId) {
        targetTripDestinationId = null;
      }
    }

    return prisma.tripActivity.update({
      where: { id: tripActivityId },
      data: {
        ...(data.activityId !== undefined && { activityId: data.activityId || null }),
        ...(data.tripDestinationId !== undefined && { tripDestinationId: targetTripDestinationId }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.date !== undefined && { date: data.date || null }),
        ...(data.time !== undefined && { time: data.time || null }),
        ...(data.location !== undefined && { location: data.location || null }),
        ...(data.numberOfParticipants !== undefined && {
          numberOfParticipants: data.numberOfParticipants,
        }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.adultPrice !== undefined && {
          adultPrice: data.adultPrice !== null ? data.adultPrice : null,
        }),
        ...(data.childPrice !== undefined && {
          childPrice: data.childPrice !== null ? data.childPrice : null,
        }),
        ...(data.totalPrice !== undefined && {
          totalPrice: data.totalPrice !== null ? data.totalPrice : null,
        }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
      include: {
        activity: true,
        tripDestination: {
          include: {
            destination: true,
          },
        },
      },
    });
  },

  /**
   * Deletes a Trip-Activity assignment.
   */
  async deleteTripActivity(
    agencyId: string,
    tripId: string,
    tripActivityId: string
  ): Promise<TripActivity> {
    const existing = await prisma.tripActivity.findFirst({
      where: {
        id: tripActivityId,
        tripId,
        trip: {
          agencyId,
          archivedAt: null,
        },
      },
    });

    if (!existing) {
      throw new NotFoundError("Trip activity assignment not found.");
    }

    return prisma.tripActivity.delete({
      where: { id: tripActivityId },
    });
  },
};
