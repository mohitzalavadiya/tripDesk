import "server-only";
import { prisma } from "@/lib/prisma";
import {
  Booking,
  BookingStatus,
  BookingPaymentStatus,
  QuotationStatus,
  TripStatus,
  Payment,
  Prisma,
  HotelConfirmation,
  VehicleDispatch,
  ActivityConfirmation,
  OperationalIssue,
  OperationEvent,
} from "@prisma/client";
import {
  CreateBookingInput,
  UpdateBookingInput,
  BookingQueryInput,
  ConvertQuotationToBookingInput,
} from "@/lib/validation/booking-schema";
import {
  operationsService,
  ReadinessSummary,
} from "@/lib/services/operations-service";
import { customerNotificationService } from "@/lib/services/customer-notification-service";
import { communicationService } from "@/lib/services/communication-service";

export type BookingWithRelations = Booking & {
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  };
  trip: {
    id: string;
    title: string;
    tripNumber: string;
    startDate: Date;
    endDate: Date;
    status: string;
    travelers: Array<{
      id: string;
      name: string;
      type: string;
    }>;
    tripHotels?: Array<{
      id: string;
      hotel: { id: string; name: string; city: string | null; category: string | null };
      checkIn: Date;
      checkOut: Date;
      roomType: string;
      mealPlan?: string | null;
      rooms: number;
    }>;
    tripVehicles?: Array<{
      id: string;
      vehicle?: { id: string; name: string; type: string; capacity: number } | null;
      vehicleName: string;
      vehicleType: string;
      startDate?: Date | null;
      endDate?: Date | null;
      pickupLocation?: string | null;
      dropLocation?: string | null;
    }>;
    tripActivities?: Array<{
      id: string;
      activity?: { id: string; name: string; location: string | null } | null;
      name: string;
      date?: Date | null;
      time?: string | null;
      location?: string | null;
    }>;
  };
  quotation?: {
    id: string;
    quotationNumber: string;
    version: number;
    title?: string | null;
    finalAmount: Prisma.Decimal;
    status: QuotationStatus;
  } | null;
  payments: Payment[];
  tripOperation?: {
    id: string;
    status: string;
    operationStartDate?: Date | null;
    operationEndDate?: Date | null;
    hotelConfirmations: Array<HotelConfirmation & { supplier?: { id: string; name: string } | null; tripHotel?: any }>;
    vehicleDispatches: Array<VehicleDispatch & { vehicle?: any }>;
    activityConfirmations: Array<ActivityConfirmation & { supplier?: { id: string; name: string } | null; activity?: any; tripActivity?: any }>;
    issues: OperationalIssue[];
    events: OperationEvent[];
  } | null;
  operationalReadiness?: ReadinessSummary | null;
};

export const bookingService = {
  /**
   * Generates sequential agency-scoped booking numbers (BK-YYYY-XXXXX)
   */
  async generateNextBookingNumber(agencyId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const db = tx || prisma;
    const currentYear = new Date().getFullYear();
    const prefix = `BK-${currentYear}-`;

    const lastBooking = await db.booking.findFirst({
      where: {
        agencyId,
        bookingNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        bookingNumber: "desc",
      },
      select: {
        bookingNumber: true,
      },
    });

    let nextSeq = 1;
    if (lastBooking?.bookingNumber) {
      const parts = lastBooking.bookingNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(5, "0")}`;
  },

  /**
   * List bookings with search, status filters, and pagination
   */
  async getBookings(
    agencyId: string,
    query: Partial<BookingQueryInput> = {}
  ): Promise<{ data: BookingWithRelations[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { search, status, paymentStatus, customerId, tripId, sortBy = "createdAt", sortOrder = "desc" } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {
      agencyId,
      archivedAt: null,
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(customerId ? { customerId } : {}),
      ...(tripId ? { tripId } : {}),
      ...(search
        ? {
            OR: [
              { bookingNumber: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { customer: { phone: { contains: search, mode: "insensitive" } } },
              { trip: { title: { contains: search, mode: "insensitive" } } },
              { trip: { tripNumber: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: {
            select: { id: true, name: true, phone: true, email: true },
          },
          trip: {
            select: {
              id: true,
              title: true,
              tripNumber: true,
              startDate: true,
              endDate: true,
              status: true,
              travelers: { select: { id: true, name: true, type: true } },
            },
          },
          quotation: {
            select: {
              id: true,
              quotationNumber: true,
              version: true,
              title: true,
              finalAmount: true,
              status: true,
            },
          },
          payments: {
            where: { archivedAt: null },
            orderBy: { paymentDate: "desc" },
          },
        },
      }),
    ]);

    return {
      data: data as BookingWithRelations[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Get single booking by ID with full operational relations and readiness score
   */
  async getBooking(agencyId: string, bookingId: string): Promise<BookingWithRelations | null> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, agencyId, archivedAt: null },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        trip: {
          select: {
            id: true,
            title: true,
            tripNumber: true,
            startDate: true,
            endDate: true,
            status: true,
            travelers: { select: { id: true, name: true, type: true } },
            tripHotels: {
              include: { hotel: { select: { id: true, name: true, city: true, category: true } } },
              orderBy: { checkIn: "asc" },
            },
            tripVehicles: {
              include: { vehicle: { select: { id: true, name: true, type: true, capacity: true } } },
              orderBy: { startDate: "asc" },
            },
            tripActivities: {
              include: { activity: { select: { id: true, name: true, location: true } } },
              orderBy: { date: "asc" },
            },
          },
        },
        quotation: {
          select: {
            id: true,
            quotationNumber: true,
            version: true,
            title: true,
            finalAmount: true,
            status: true,
          },
        },
        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "desc" },
        },
        tripOperation: {
          include: {
            hotelConfirmations: {
              include: {
                supplier: { select: { id: true, name: true } },
                tripHotel: { include: { hotel: true } },
              },
              orderBy: { createdAt: "asc" },
            },
            vehicleDispatches: {
              include: {
                vehicle: true,
              },
              orderBy: { createdAt: "asc" },
            },
            activityConfirmations: {
              include: {
                activity: true,
                tripActivity: true,
              },
              orderBy: { createdAt: "asc" },
            },
            issues: {
              orderBy: { createdAt: "desc" },
            },
            events: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!booking) return null;

    // Attach calculated readiness summary if tripOperation exists
    let operationalReadiness: ReadinessSummary | null = null;
    if (booking.tripOperation?.id) {
      try {
        operationalReadiness = await operationsService.calculateReadiness(
          agencyId,
          booking.tripOperation.id
        );
      } catch {
        // Safe fallback if readiness computation is unavailable
        operationalReadiness = null;
      }
    }

    return {
      ...booking,
      operationalReadiness,
    } as BookingWithRelations;
  },

  /**
   * Create a new booking
   */
  async createBooking(agencyId: string, data: CreateBookingInput): Promise<BookingWithRelations> {
    const trip = await prisma.trip.findFirst({
      where: { id: data.tripId, agencyId, archivedAt: null },
    });
    if (!trip) {
      throw new Error("Trip not found or does not belong to this agency.");
    }

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, agencyId, archivedAt: null },
    });
    if (!customer) {
      throw new Error("Customer not found or does not belong to this agency.");
    }

    if (data.quotationId) {
      const quotation = await prisma.quotation.findFirst({
        where: { id: data.quotationId, agencyId, archivedAt: null },
      });
      if (!quotation) {
        throw new Error("Quotation not found or does not belong to this agency.");
      }
    }

    const bookingNumber = await this.generateNextBookingNumber(agencyId);
    const totalAmount = data.totalAmount;
    const paidAmount = data.paidAmount || 0;
    const balanceAmount = Math.max(0, totalAmount - paidAmount);

    let paymentStatus: BookingPaymentStatus = BookingPaymentStatus.UNPAID;
    if (paidAmount >= totalAmount && totalAmount > 0) {
      paymentStatus = BookingPaymentStatus.PAID;
    } else if (paidAmount > 0) {
      paymentStatus = BookingPaymentStatus.PARTIALLY_PAID;
    }

    const booking = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: {
          agencyId,
          tripId: data.tripId,
          customerId: data.customerId,
          quotationId: data.quotationId || null,
          bookingNumber,
          status: data.status || BookingStatus.CONFIRMED,
          paymentStatus,
          bookingDate: data.bookingDate ? new Date(data.bookingDate) : new Date(),
          travelStartDate: data.travelStartDate ? new Date(data.travelStartDate) : trip.startDate,
          travelEndDate: data.travelEndDate ? new Date(data.travelEndDate) : trip.endDate,
          currency: data.currency || "INR",
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(paidAmount),
          balanceAmount: new Prisma.Decimal(balanceAmount),
          notes: data.notes,
          internalNotes: data.internalNotes,
        },
      });

      // Update Trip status to BOOKED if not already in execution
      if (trip.status === "DRAFT" || trip.status === "PLANNING" || trip.status === "QUOTED") {
        await tx.trip.update({
          where: { id: data.tripId },
          data: { status: TripStatus.BOOKED },
        });
      }

      // If initial paidAmount provided, create matching payment record
      if (paidAmount > 0) {
        const currentYear = new Date().getFullYear();
        const payPrefix = `PAY-${currentYear}-`;
        const lastPay = await tx.payment.findFirst({
          where: { agencyId, paymentNumber: { startsWith: payPrefix } },
          orderBy: { paymentNumber: "desc" },
          select: { paymentNumber: true },
        });

        let nextSeq = 1;
        if (lastPay?.paymentNumber) {
          const parts = lastPay.paymentNumber.split("-");
          const lastSeq = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
        }
        const paymentNumber = `${payPrefix}${String(nextSeq).padStart(5, "0")}`;

        await tx.payment.create({
          data: {
            agencyId,
            bookingId: b.id,
            tripId: data.tripId,
            customerId: data.customerId,
            paymentNumber,
            amount: new Prisma.Decimal(paidAmount),
            currency: data.currency || "INR",
            paymentDate: new Date(),
            status: "COMPLETED",
            notes: "Initial advance logged on booking creation.",
          },
        });
      }

      return b;
    });

    // Auto-initialize operations and dispatch notifications outside transaction
    try {
      const operation = await operationsService.initializeOperation(agencyId, {
        tripId: data.tripId,
        bookingId: booking.id,
      });

      await operationsService.logEvent(agencyId, operation.id, {
        eventType: "BOOKING_CREATED",
        description: `Booking ${booking.bookingNumber} created for trip ${trip.title}. Initial status: ${booking.status}.`,
      });

      await customerNotificationService.notifyTripStatusChange(
        agencyId,
        data.tripId,
        "CONFIRMED"
      );

      communicationService.notifyBookingConfirmed(agencyId, booking.id).catch((err) => {
        console.warn("[Communication Non-blocking Notice] Failed to notify booking confirmed:", err?.message || err);
      });
    } catch {
      // Non-blocking operations synchronization
    }

    return (await this.getBooking(agencyId, booking.id))!;
  },

  /**
   * Convert an accepted Quotation into a Booking (Idempotent & Transaction-Safe)
   */
  async convertQuotationToBooking(
    agencyId: string,
    quotationId: string,
    data?: ConvertQuotationToBookingInput
  ): Promise<BookingWithRelations> {
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId, archivedAt: null },
      include: {
        trip: true,
        customer: true,
        selectedPackageOption: true,
      },
    });

    if (!quotation) {
      throw new Error("Quotation not found or does not belong to this agency.");
    }

    // Idempotent duplicate check: If booking already exists, return it cleanly
    const existingBooking = await prisma.booking.findFirst({
      where: { agencyId, quotationId, archivedAt: null },
    });
    if (existingBooking) {
      // Ensure operations are linked
      try {
        await operationsService.initializeOperation(agencyId, {
          tripId: quotation.tripId,
          bookingId: existingBooking.id,
        });
      } catch {
        // Safe fallback
      }
      return (await this.getBooking(agencyId, existingBooking.id))!;
    }

    const bookingNumber = await this.generateNextBookingNumber(agencyId);
    const totalAmount = quotation.selectedPackageOption
      ? Number(quotation.selectedPackageOption.finalAmount)
      : Number(quotation.finalAmount);
    const packageOptionName = quotation.selectedPackageOption?.name || null;

    const booking = await prisma.$transaction(async (tx) => {
      // 1. Create Booking
      const b = await tx.booking.create({
        data: {
          agencyId,
          tripId: quotation.tripId,
          customerId: quotation.customerId,
          quotationId: quotation.id,
          packageOptionName,
          bookingNumber,
          status: BookingStatus.CONFIRMED,
          paymentStatus: BookingPaymentStatus.UNPAID,
          bookingDate: new Date(),
          travelStartDate: quotation.trip.startDate,
          travelEndDate: quotation.trip.endDate,
          currency: quotation.currency || "INR",
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(0),
          balanceAmount: new Prisma.Decimal(totalAmount),
          notes:
            data?.notes ||
            (packageOptionName
              ? `Converted from Proposal ${quotation.quotationNumber} (${packageOptionName}).`
              : `Converted from Proposal ${quotation.quotationNumber}.`),
          internalNotes: data?.internalNotes,
          confirmedAt: new Date(),
        },
      });

      // 2. Mark Quotation as ACCEPTED if not already
      if (quotation.status !== QuotationStatus.ACCEPTED) {
        await tx.quotation.update({
          where: { id: quotationId },
          data: {
            status: QuotationStatus.ACCEPTED,
            acceptedAt: quotation.acceptedAt || new Date(),
          },
        });
      }

      // 3. Update Trip status to BOOKED
      await tx.trip.update({
        where: { id: quotation.tripId },
        data: {
          status: TripStatus.BOOKED,
        },
      });

      return b;
    });

    // 4. Initialize Operations & Timeline Events outside tx
    try {
      const operation = await operationsService.initializeOperation(agencyId, {
        tripId: quotation.tripId,
        bookingId: booking.id,
      });

      await operationsService.logEvent(agencyId, operation.id, {
        eventType: "BOOKING_CREATED",
        description: `Booking ${booking.bookingNumber} confirmed from proposal ${quotation.quotationNumber} (${packageOptionName || "Standard"}).`,
      });

      await customerNotificationService.notifyTripStatusChange(
        agencyId,
        quotation.tripId,
        "CONFIRMED"
      );

      communicationService.notifyBookingConfirmed(agencyId, booking.id).catch((err) => {
        console.warn("[Communication Non-blocking Notice] Failed to notify booking confirmed:", err?.message || err);
      });
    } catch {
      // Non-blocking operations sync
    }

    return (await this.getBooking(agencyId, booking.id))!;
  },

  /**
   * Recalculates booking paidAmount and balanceAmount from completed payments
   */
  async recalculateBookingPaymentTotals(
    bookingId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Booking> {
    const db = tx || prisma;

    const booking = await db.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: {
        payments: {
          where: { archivedAt: null, status: "COMPLETED" },
        },
      },
    });

    let paid = 0;
    for (const p of booking.payments) {
      const net = Number(p.amount) - Number(p.refundedAmount || 0);
      paid += Math.max(0, net);
    }
    paid = Math.round(paid * 100) / 100;

    const total = Number(booking.totalAmount);
    const balance = Math.max(0, Math.round((total - paid) * 100) / 100);

    let paymentStatus: BookingPaymentStatus = BookingPaymentStatus.UNPAID;
    if (paid >= total && total > 0) {
      paymentStatus = BookingPaymentStatus.PAID;
    } else if (paid > 0) {
      paymentStatus = BookingPaymentStatus.PARTIALLY_PAID;
    }

    return db.booking.update({
      where: { id: bookingId },
      data: {
        paidAmount: new Prisma.Decimal(paid),
        balanceAmount: new Prisma.Decimal(balance),
        paymentStatus,
      },
    });
  },

  /**
   * Update booking fields with state machine validation and immutability protection
   */
  async updateBooking(
    agencyId: string,
    bookingId: string,
    data: UpdateBookingInput
  ): Promise<BookingWithRelations> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, agencyId, archivedAt: null },
      include: {
        tripOperation: {
          include: {
            events: {
              where: { eventType: "OPERATION_FINALIZED" },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new Error("Booking not found.");
    }

    // Verify operations finalization lock
    if (
      booking.tripOperation?.status === "COMPLETED" &&
      booking.tripOperation.events.length > 0
    ) {
      throw new Error("Cannot modify booking: Tour operation is financially finalized and locked.");
    }

    // State machine transitions validation
    if (data.status !== undefined && data.status !== booking.status) {
      if (booking.status === BookingStatus.COMPLETED && data.status !== BookingStatus.COMPLETED) {
        throw new Error("Completed booking cannot be reverted without formal reopening.");
      }
      if (booking.status === BookingStatus.CANCELLED && data.status !== BookingStatus.CANCELLED) {
        throw new Error("Cancelled booking cannot be directly reactivated.");
      }
    }

    const updateData: Prisma.BookingUpdateInput = {};

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === BookingStatus.CONFIRMED && !booking.confirmedAt) {
        updateData.confirmedAt = new Date();
      }
      if (data.status === BookingStatus.COMPLETED && !booking.completedAt) {
        updateData.completedAt = new Date();
      }
      if (data.status === BookingStatus.CANCELLED) {
        updateData.cancelledAt = new Date();
        if (data.cancellationReason !== undefined) {
          updateData.cancellationReason = data.cancellationReason;
        }
      }
    }

    if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
    if (data.travelStartDate !== undefined) updateData.travelStartDate = data.travelStartDate ? new Date(data.travelStartDate) : null;
    if (data.travelEndDate !== undefined) updateData.travelEndDate = data.travelEndDate ? new Date(data.travelEndDate) : null;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes;
    if (data.cancellationReason !== undefined) updateData.cancellationReason = data.cancellationReason;

    if (data.totalAmount !== undefined) {
      const newTotal = Number(data.totalAmount);
      const paid = Number(booking.paidAmount);
      const newBalance = Math.max(0, Math.round((newTotal - paid) * 100) / 100);

      updateData.totalAmount = new Prisma.Decimal(newTotal);
      updateData.balanceAmount = new Prisma.Decimal(newBalance);

      if (paid >= newTotal && newTotal > 0) {
        updateData.paymentStatus = BookingPaymentStatus.PAID;
      } else if (paid > 0) {
        updateData.paymentStatus = BookingPaymentStatus.PARTIALLY_PAID;
      } else {
        updateData.paymentStatus = BookingPaymentStatus.UNPAID;
      }
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    // Record audit event and notifications on status change
    if (data.status && data.status !== booking.status && booking.tripOperation?.id) {
      try {
        await operationsService.logEvent(agencyId, booking.tripOperation.id, {
          eventType: "BOOKING_STATUS_CHANGED",
          description: `Booking status transitioned from ${booking.status} to ${data.status}.`,
        });

        await customerNotificationService.notifyTripStatusChange(
          agencyId,
          booking.tripId,
          data.status
        );
      } catch {
        // Non-blocking event logging
      }
    }

    return (await this.getBooking(agencyId, bookingId))!;
  },

  /**
   * Controlled Booking Cancellation
   */
  async cancelBooking(
    agencyId: string,
    bookingId: string,
    reason: string
  ): Promise<BookingWithRelations> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, agencyId, archivedAt: null },
      include: {
        tripOperation: {
          include: {
            events: { where: { eventType: "OPERATION_FINALIZED" } },
          },
        },
      },
    });

    if (!booking) {
      throw new Error("Booking not found.");
    }

    if (
      booking.tripOperation?.status === "COMPLETED" &&
      booking.tripOperation.events.length > 0
    ) {
      throw new Error("Cannot cancel booking: Tour operation is finalized.");
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason.trim() || "Cancelled by agency coordinator.",
      },
    });

    if (booking.tripOperation?.id) {
      try {
        await operationsService.logEvent(agencyId, booking.tripOperation.id, {
          eventType: "BOOKING_CANCELLED",
          description: `Booking was cancelled. Reason: ${reason}`,
        });

        await customerNotificationService.notifyTripStatusChange(
          agencyId,
          booking.tripId,
          "CANCELLED"
        );
      } catch {
        // Non-blocking
      }
    }

    return (await this.getBooking(agencyId, bookingId))!;
  },

  /**
   * Initialize or sync Operations for an existing Booking
   */
  async initializeOperationsForBooking(
    agencyId: string,
    bookingId: string
  ): Promise<BookingWithRelations> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, agencyId, archivedAt: null },
    });

    if (!booking) {
      throw new Error("Booking not found.");
    }

    await operationsService.initializeOperation(agencyId, {
      tripId: booking.tripId,
      bookingId: booking.id,
    });

    return (await this.getBooking(agencyId, bookingId))!;
  },

  /**
   * Soft delete / archive booking
   */
  async archiveBooking(agencyId: string, bookingId: string): Promise<Booking> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, agencyId, archivedAt: null },
    });

    if (!booking) {
      throw new Error("Booking not found.");
    }

    return prisma.booking.update({
      where: { id: bookingId },
      data: { archivedAt: new Date() },
    });
  },
};
