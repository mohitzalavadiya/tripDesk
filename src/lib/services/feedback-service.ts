import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  FeedbackFilterInput,
  FeedbackCreateInput,
  FeedbackUpdateRecoveryInput,
  CustomerPublicFeedbackInput,
} from "@/lib/validation/feedback-schema";

export interface CustomerPublicFeedbackView {
  id: string;
  rating: number;
  serviceRating?: number | null;
  hotelRating?: number | null;
  driverRating?: number | null;
  vehicleRating?: number | null;
  activityRating?: number | null;
  supportRating?: number | null;
  positiveComment?: string | null;
  improvementComment?: string | null;
  travelAgain?: string | null;
  comments?: string | null;
  createdAt: string;
}

export interface PublicFeedbackStatusResponse {
  isEligible: boolean;
  reason?: string;
  hasFeedback: boolean;
  feedback: CustomerPublicFeedbackView | null;
  trip: {
    id: string;
    title: string;
    tripNumber: string;
    status: string;
  } | null;
  customer: {
    name: string;
  } | null;
  agency: {
    name: string;
  } | null;
}

export interface FeedbackStats {
  totalFeedbacks: number;
  averageRating: number;
  hotelRating: number;
  driverRating: number;
  vehicleRating: number;
  activityRating: number;
  supportRating: number;
  positivePercentage: number;
  attentionCount: number;
}

export interface AgencyFeedbackItem {
  id: string;
  tripId: string;
  tripTitle: string;
  tripNumber: string;
  bookingId: string | null;
  bookingNumber: string | null;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  overallRating: number;
  hotelRating: number;
  vehicleRating: number;
  driverRating: number;
  activityRating: number;
  supportRating: number;
  positiveComment: string | null;
  improvementComment: string | null;
  travelAgain: string;
  serviceRecoveryStatus: string;
  serviceRecoveryNotes: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export const feedbackService = {
  /**
   * 1. List feedbacks with tenant isolation, filtering, and summary statistics
   */
  async listFeedbacks(agencyId: string, filter?: FeedbackFilterInput) {
    const where: Prisma.CustomerFeedbackWhereInput = {
      agencyId,
    };

    if (filter?.customerId) {
      where.customerId = filter.customerId;
    }
    if (filter?.tripId) {
      where.tripId = filter.tripId;
    }

    if (filter?.tab === "ATTENTION") {
      where.OR = [
        { rating: { lte: 3 } },
        { serviceRecoveryStatus: "Follow-up Required" },
      ];
    } else if (filter?.tab === "POSITIVE") {
      where.rating = { gte: 4 };
    }

    if (filter?.search) {
      const q = filter.search.trim();
      where.OR = [
        { customer: { name: { contains: q, mode: "insensitive" } } },
        { trip: { title: { contains: q, mode: "insensitive" } } },
        { positiveComment: { contains: q, mode: "insensitive" } },
        { improvementComment: { contains: q, mode: "insensitive" } },
        { comments: { contains: q, mode: "insensitive" } },
      ];
    }

    const page = Number(filter?.page) || 1;
    const limit = Number(filter?.limit) || 50;
    const skip = (page - 1) * limit;

    const [feedbacks, totalCount, allFeedbacks] = await Promise.all([
      prisma.customerFeedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          trip: { select: { id: true, title: true, tripNumber: true } },
          booking: { select: { id: true, bookingNumber: true } },
        },
      }),
      prisma.customerFeedback.count({ where }),
      prisma.customerFeedback.findMany({
        where: { agencyId },
        select: {
          rating: true,
          hotelRating: true,
          vehicleRating: true,
          driverRating: true,
          activityRating: true,
          supportRating: true,
          serviceRecoveryStatus: true,
        },
      }),
    ]);

    // Compute Summary Stats
    const totalAll = allFeedbacks.length;
    let sumRating = 0;
    let sumHotel = 0;
    let sumDriver = 0;
    let sumVehicle = 0;
    let sumActivity = 0;
    let sumSupport = 0;
    let positiveCount = 0;
    let attentionCount = 0;

    for (const f of allFeedbacks) {
      sumRating += f.rating;
      sumHotel += f.hotelRating ?? 5;
      sumDriver += f.driverRating ?? 5;
      sumVehicle += f.vehicleRating ?? 5;
      sumActivity += f.activityRating ?? 5;
      sumSupport += f.supportRating ?? 5;

      if (f.rating >= 4) {
        positiveCount += 1;
      }
      if (f.rating <= 3 || f.serviceRecoveryStatus === "Follow-up Required") {
        attentionCount += 1;
      }
    }

    const averageRating = totalAll > 0 ? Number((sumRating / totalAll).toFixed(1)) : 5.0;
    const hotelRating = totalAll > 0 ? Number((sumHotel / totalAll).toFixed(1)) : 5.0;
    const driverRating = totalAll > 0 ? Number((sumDriver / totalAll).toFixed(1)) : 5.0;
    const vehicleRating = totalAll > 0 ? Number((sumVehicle / totalAll).toFixed(1)) : 5.0;
    const activityRating = totalAll > 0 ? Number((sumActivity / totalAll).toFixed(1)) : 5.0;
    const supportRating = totalAll > 0 ? Number((sumSupport / totalAll).toFixed(1)) : 5.0;
    const positivePercentage = totalAll > 0 ? Math.round((positiveCount / totalAll) * 100) : 100;

    const items: AgencyFeedbackItem[] = feedbacks.map((f: any) => ({
      id: f.id,
      tripId: f.tripId,
      tripTitle: f.trip.title,
      tripNumber: f.trip.tripNumber,
      bookingId: f.bookingId,
      bookingNumber: f.booking?.bookingNumber || null,
      customerId: f.customerId,
      customerName: f.customer.name,
      customerPhone: f.customer.phone,
      customerEmail: f.customer.email,
      overallRating: f.rating,
      hotelRating: f.hotelRating ?? 5,
      vehicleRating: f.vehicleRating ?? 5,
      driverRating: f.driverRating ?? 5,
      activityRating: f.activityRating ?? 5,
      supportRating: f.supportRating ?? 5,
      positiveComment: f.positiveComment || f.comments,
      improvementComment: f.improvementComment,
      travelAgain: f.travelAgain || "Yes",
      serviceRecoveryStatus: f.serviceRecoveryStatus || "Not Needed",
      serviceRecoveryNotes: f.serviceRecoveryNotes,
      source: f.source,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));

    const stats: FeedbackStats = {
      totalFeedbacks: totalAll,
      averageRating,
      hotelRating,
      driverRating,
      vehicleRating,
      activityRating,
      supportRating,
      positivePercentage,
      attentionCount,
    };

    return {
      items,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats,
    };
  },

  /**
   * 2. Get single feedback with strict tenant isolation
   */
  async getFeedback(agencyId: string, feedbackId: string): Promise<AgencyFeedbackItem | null> {
    const f: any = await prisma.customerFeedback.findFirst({
      where: { id: feedbackId, agencyId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        trip: { select: { id: true, title: true, tripNumber: true } },
        booking: { select: { id: true, bookingNumber: true } },
      },
    });

    if (!f) return null;

    return {
      id: f.id,
      tripId: f.tripId,
      tripTitle: f.trip.title,
      tripNumber: f.trip.tripNumber,
      bookingId: f.bookingId,
      bookingNumber: f.booking?.bookingNumber || null,
      customerId: f.customerId,
      customerName: f.customer.name,
      customerPhone: f.customer.phone,
      customerEmail: f.customer.email,
      overallRating: f.rating,
      hotelRating: f.hotelRating ?? 5,
      vehicleRating: f.vehicleRating ?? 5,
      driverRating: f.driverRating ?? 5,
      activityRating: f.activityRating ?? 5,
      supportRating: f.supportRating ?? 5,
      positiveComment: f.positiveComment || f.comments,
      improvementComment: f.improvementComment,
      travelAgain: f.travelAgain || "Yes",
      serviceRecoveryStatus: f.serviceRecoveryStatus || "Not Needed",
      serviceRecoveryNotes: f.serviceRecoveryNotes,
      source: f.source,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    };
  },

  /**
   * 3. Create feedback manually on behalf of customer
   */
  async createFeedback(agencyId: string, input: FeedbackCreateInput) {
    // Validate customer and trip ownership
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, agencyId },
    });
    if (!customer) {
      throw new Error(`Customer with ID ${input.customerId} not found in this agency.`);
    }

    const trip = await prisma.trip.findFirst({
      where: { id: input.tripId, agencyId },
      include: { tripOperation: true },
    });
    if (!trip) {
      throw new Error(`Trip with ID ${input.tripId} not found in this agency.`);
    }

    const isAttention = input.rating <= 3;

    const feedback = await prisma.customerFeedback.create({
      data: {
        agencyId,
        customerId: input.customerId,
        tripId: input.tripId,
        bookingId: input.bookingId || null,
        rating: input.rating,
        serviceRating: input.serviceRating ?? input.rating,
        hotelRating: input.hotelRating ?? input.rating,
        driverRating: input.driverRating ?? input.rating,
        vehicleRating: input.vehicleRating ?? input.rating,
        activityRating: input.activityRating ?? input.rating,
        supportRating: input.supportRating ?? input.rating,
        positiveComment: input.positiveComment,
        improvementComment: input.improvementComment,
        travelAgain: input.travelAgain,
        serviceRecoveryStatus: isAttention ? "Follow-up Required" : "Not Needed",
        comments: input.comments || input.positiveComment,
        source: input.source || "MANUAL",
      },
      include: {
        customer: true,
        trip: true,
      },
    });

    if (trip.tripOperation) {
      await prisma.operationEvent.create({
        data: {
          agencyId,
          tripOperationId: trip.tripOperation.id,
          eventType: "CUSTOMER_FEEDBACK",
          description: `Customer feedback recorded (${input.rating}★) via ${input.source || "Agency"}.`,
          metadata: {
            feedbackId: feedback.id,
            rating: input.rating,
          },
        },
      });
    }

    return feedback;
  },

  /**
   * 4. Update service recovery workflow
   */
  async updateServiceRecovery(
    agencyId: string,
    feedbackId: string,
    input: FeedbackUpdateRecoveryInput
  ) {
    const feedback = await prisma.customerFeedback.findFirst({
      where: { id: feedbackId, agencyId },
    });

    if (!feedback) {
      throw new Error("Feedback record not found or access denied.");
    }

    const updated = await prisma.customerFeedback.update({
      where: { id: feedbackId },
      data: {
        serviceRecoveryStatus: input.serviceRecoveryStatus,
        serviceRecoveryNotes: input.serviceRecoveryNotes,
      },
      include: {
        customer: true,
        trip: true,
      },
    });

    return updated;
  },

  /**
   * Helper: Resolves a trip by PublicShareLink or tripId/tripNumber
   */
  async resolveTripByToken(token: string) {
    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return null;
    }
    const trimmed = token.trim();

    // 1. Try finding via active PublicShareLink
    const shareLink = await prisma.publicShareLink.findFirst({
      where: {
        tokenHash: trimmed,
        status: "ACTIVE",
        revokedAt: null,
      },
      include: {
        trip: {
          include: {
            agency: { select: { id: true, name: true, phone: true, email: true } },
            customer: { select: { id: true, name: true, phone: true, email: true } },
            tripOperation: true,
            bookings: {
              where: { status: { not: "CANCELLED" } },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (shareLink?.trip) {
      return shareLink.trip;
    }

    // 2. Direct lookup fallback (by tripId or tripNumber)
    const trip = await prisma.trip.findFirst({
      where: {
        OR: [{ id: trimmed }, { tripNumber: trimmed }],
        archivedAt: null,
      },
      include: {
        agency: { select: { id: true, name: true, phone: true, email: true } },
        customer: { select: { id: true, name: true, phone: true, email: true } },
        tripOperation: true,
        bookings: {
          where: { status: { not: "CANCELLED" } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return trip || null;
  },

  /**
   * 5. Get public feedback eligibility and existing submission
   */
  async getPublicFeedbackStatus(token: string): Promise<PublicFeedbackStatusResponse> {
    const trip = await this.resolveTripByToken(token);

    if (!trip) {
      return {
        isEligible: false,
        reason: "Invalid or expired travel portal link.",
        hasFeedback: false,
        feedback: null,
        trip: null,
        customer: null,
        agency: null,
      };
    }

    const isCompleted = trip.status === "COMPLETED";

    // Lookup existing feedback
    const existing = await prisma.customerFeedback.findFirst({
      where: {
        agencyId: trip.agencyId,
        tripId: trip.id,
        customerId: trip.customerId,
      },
      orderBy: { createdAt: "desc" },
    });

    const feedbackView: CustomerPublicFeedbackView | null = existing
      ? {
          id: existing.id,
          rating: existing.rating,
          serviceRating: existing.serviceRating,
          hotelRating: existing.hotelRating,
          driverRating: existing.driverRating,
          vehicleRating: existing.vehicleRating,
          activityRating: existing.activityRating,
          supportRating: existing.supportRating,
          positiveComment: existing.positiveComment,
          improvementComment: existing.improvementComment,
          travelAgain: existing.travelAgain,
          comments: existing.comments,
          createdAt: existing.createdAt.toISOString(),
        }
      : null;

    return {
      isEligible: isCompleted,
      reason: isCompleted
        ? "Tour completed. Feedback is open."
        : "Feedback will be available after your tour is completed.",
      hasFeedback: !!existing,
      feedback: feedbackView,
      trip: {
        id: trip.id,
        title: trip.title,
        tripNumber: trip.tripNumber,
        status: trip.status,
      },
      customer: {
        name: trip.customer.name,
      },
      agency: {
        name: trip.agency.name,
      },
    };
  },

  /**
   * 6. Submit customer feedback via public secure token
   */
  async submitPublicFeedback(token: string, input: CustomerPublicFeedbackInput) {
    const trip = await this.resolveTripByToken(token);

    if (!trip) {
      throw new Error("INVALID_TOKEN: Travel portal link is invalid or expired.");
    }

    if (trip.status !== "COMPLETED") {
      throw new Error("TRIP_NOT_COMPLETED: Feedback is only available after your tour is completed.");
    }

    const isAttention = input.rating <= 3;
    const bookingId = trip.bookings?.[0]?.id || null;

    // Check if existing feedback already exists for this trip + customer (idempotent duplicate prevention)
    const existing = await prisma.customerFeedback.findFirst({
      where: {
        agencyId: trip.agencyId,
        tripId: trip.id,
        customerId: trip.customerId,
      },
    });

    let feedbackRecord: any;

    if (existing) {
      // Update existing record safely
      feedbackRecord = await prisma.customerFeedback.update({
        where: { id: existing.id },
        data: {
          rating: input.rating,
          serviceRating: input.serviceRating ?? input.rating,
          hotelRating: input.hotelRating ?? input.rating,
          driverRating: input.driverRating ?? input.rating,
          vehicleRating: input.vehicleRating ?? input.rating,
          activityRating: input.activityRating ?? input.rating,
          supportRating: input.supportRating ?? input.rating,
          positiveComment: input.positiveComment?.trim() || null,
          improvementComment: input.improvementComment?.trim() || null,
          travelAgain: input.travelAgain || "Yes",
          serviceRecoveryStatus: isAttention
            ? "Follow-up Required"
            : existing.serviceRecoveryStatus === "Resolved"
            ? "Resolved"
            : "Not Needed",
          comments: input.comments?.trim() || input.positiveComment?.trim() || null,
          source: "PORTAL",
        },
      });
    } else {
      // Create new record
      feedbackRecord = await prisma.customerFeedback.create({
        data: {
          agencyId: trip.agencyId,
          customerId: trip.customerId,
          tripId: trip.id,
          bookingId,
          rating: input.rating,
          serviceRating: input.serviceRating ?? input.rating,
          hotelRating: input.hotelRating ?? input.rating,
          driverRating: input.driverRating ?? input.rating,
          vehicleRating: input.vehicleRating ?? input.rating,
          activityRating: input.activityRating ?? input.rating,
          supportRating: input.supportRating ?? input.rating,
          positiveComment: input.positiveComment?.trim() || null,
          improvementComment: input.improvementComment?.trim() || null,
          travelAgain: input.travelAgain || "Yes",
          serviceRecoveryStatus: isAttention ? "Follow-up Required" : "Not Needed",
          comments: input.comments?.trim() || input.positiveComment?.trim() || null,
          source: "PORTAL",
        },
      });
    }

    // Log Operational Event if TripOperation exists
    if (trip.tripOperation) {
      await prisma.operationEvent.create({
        data: {
          agencyId: trip.agencyId,
          tripOperationId: trip.tripOperation.id,
          eventType: "CUSTOMER_FEEDBACK",
          description: `Guest submitted post-tour feedback with ${input.rating}★ rating via Customer Portal.`,
          metadata: {
            feedbackId: feedbackRecord.id,
            rating: input.rating,
            isAttention,
          },
        },
      });
    }

    return {
      id: feedbackRecord.id,
      rating: feedbackRecord.rating,
      serviceRating: feedbackRecord.serviceRating,
      hotelRating: feedbackRecord.hotelRating,
      driverRating: feedbackRecord.driverRating,
      vehicleRating: feedbackRecord.vehicleRating,
      activityRating: feedbackRecord.activityRating,
      supportRating: feedbackRecord.supportRating,
      positiveComment: feedbackRecord.positiveComment,
      improvementComment: feedbackRecord.improvementComment,
      travelAgain: feedbackRecord.travelAgain,
      comments: feedbackRecord.comments,
      createdAt: feedbackRecord.createdAt.toISOString(),
    };
  },
};

