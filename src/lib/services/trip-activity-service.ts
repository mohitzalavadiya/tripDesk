import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/api";
import {
  CreateTripActivityInput,
  UpdateTripActivityInput,
} from "@/lib/validation/trip-activity-schema";
import { TripActivity, Activity } from "@prisma/client";

export interface TripActivityWithActivity extends TripActivity {
  activity: Activity | null;
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
      include: { activity: true },
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
      include: { activity: true },
    });
  },

  /**
   * Creates a new Trip-Activity assignment.
   * Verifies Trip belongs to authenticated agency and is not archived.
   * If activityId is provided, verifies Activity belongs to authenticated agency and is active.
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
      select: { id: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip not found or does not belong to your agency.");
    }

    if (data.activityId) {
      const activity = await prisma.activity.findFirst({
        where: {
          id: data.activityId,
          agencyId,
          archivedAt: null,
        },
        select: { id: true },
      });

      if (!activity) {
        throw new NotFoundError("Selected activity not found or does not belong to your agency.");
      }
    }

    return prisma.tripActivity.create({
      data: {
        tripId,
        activityId: data.activityId || null,
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
      include: { activity: true },
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
    });

    if (!existing) {
      throw new NotFoundError("Trip activity assignment not found.");
    }

    if (data.activityId && data.activityId !== existing.activityId) {
      const targetActivity = await prisma.activity.findFirst({
        where: {
          id: data.activityId,
          agencyId,
          archivedAt: null,
        },
        select: { id: true },
      });

      if (!targetActivity) {
        throw new NotFoundError("Target activity not found or does not belong to your agency.");
      }
    }

    return prisma.tripActivity.update({
      where: { id: tripActivityId },
      data: {
        ...(data.activityId !== undefined && { activityId: data.activityId || null }),
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
      include: { activity: true },
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
