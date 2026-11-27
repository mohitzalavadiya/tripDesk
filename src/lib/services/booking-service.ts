import { prisma } from "@/lib/prisma";
import { communicationService } from "@/lib/services/communication-service";
import { customerNotificationService } from "@/lib/services/customer-notification-service";
import { financeService } from "@/lib/services/finance-service";
import { internalNotificationService } from "@/lib/services/internal-notification-service";
import {
operationsService,
ReadinessSummary,
} from "@/lib/services/operations-service";
import {
BookingQueryInput,
ConvertQuotationToBookingInput,
CreateBookingInput,
UpdateBookingInput,
} from "@/lib/validation/booking-schema";
import {
ActivityConfirmation,
Booking,
BookingPaymentStatus,
BookingStatus,
EnquiryStatus,
HotelConfirmation,
InvoiceStatus,
OperationalIssue,
OperationEvent,
Payment,
Prisma,
QuotationStatus,
TripStatus,
UserNotificationType,
VehicleDispatch,
} from "@prisma/client";
import { agencyAuditService } from "./agency-audit-service";
import { entitlementService } from "./entitlement-service";
import { PAYMENT_SCALAR_SELECT } from "./payment-service";

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
      vehicleId?: string | null;
      vehicle?: { id: string; name: string; type: string; capacity: number } | null;
      vehicleName: string;
      vehicleType: string;
      startDate?: Date | null;
      endDate?: Date | null;
      pickupLocation?: string | null;
      dropLocation?: string | null;
      driverName?: string | null;
      driverPhone?: string | null;
      capacity?: number | null;
    }>;
    tripActivities?: Array<{
      id: string;
      activityId?: string | null;
      activity?: { id: string; name: string; location: string | null } | null;
      name: string;
      date?: Date | null;
      time?: string | null;
      location?: string | null;
      numberOfParticipants?: number | null;
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
  invoices?: Array<{
    id: string;
    invoiceNumber: string | null;
    status: InvoiceStatus;
    invoiceDate: Date;
    dueDate: Date;
    totalAmount: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    balanceAmount: Prisma.Decimal;
    currency: string;
    cancelledAt?: Date | null;
    createdAt: Date;
  }>;
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
  attributionDiagnostic?: {
    isAmbiguous: boolean;
    candidateEnquiries: string[];
    message: string;
  } | null;
};

/**
 * Authoritative scalar fields that physically exist on the PostgreSQL 'bookings' table (33 columns).
 * Excludes 'enquiryId' which is defined in prisma/schema.prisma but not yet migrated in physical database.
 */
export const BOOKING_SCALAR_SELECT = {
  id: true,
  agencyId: true,
  tripId: true,
  customerId: true,
  quotationId: true,
  packageOptionName: true,
  bookingNumber: true,
  status: true,
  paymentStatus: true,
  bookingDate: true,
  travelStartDate: true,
  travelEndDate: true,
  currency: true,
  totalAmount: true,
  paidAmount: true,
  balanceAmount: true,
  taxableAmount: true,
  taxAmount: true,
  taxRate: true,
  taxMode: true,
  gstTreatment: true,
  cgstAmount: true,
  sgstAmount: true,
  igstAmount: true,
  notes: true,
  internalNotes: true,
  cancellationReason: true,
  confirmedAt: true,
  completedAt: true,
  cancelledAt: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

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
        select: {
          ...BOOKING_SCALAR_SELECT,
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
            select: PAYMENT_SCALAR_SELECT,
          },
        },
      }),
    ]);

    const sanitizedData = data.map((b) => ({
      ...b,
      enquiryId: (b as any).enquiryId ?? null,
    })) as unknown as BookingWithRelations[];

    return {
      data: sanitizedData,
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
      select: {
        ...BOOKING_SCALAR_SELECT,
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
            travelers: {
              select: {
                id: true,
                name: true,
                type: true,
                isPrimary: true,
                phone: true,
                email: true,
                specialRequirements: true,
                notes: true,
              },
            },
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
          select: PAYMENT_SCALAR_SELECT,
        },
        invoices: {
          where: { archivedAt: null },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            invoiceDate: true,
            dueDate: true,
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
            currency: true,
            cancelledAt: true,
            createdAt: true,
          },
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
                tripVehicle: true,
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

    // Check if an ambiguous attribution event was recorded on this booking's trip operation
    let attributionDiagnostic: { isAmbiguous: boolean; candidateEnquiries: string[]; message: string } | null = null;
    const ambiguousEvent = booking.tripOperation?.events?.find(
      (ev) => ev.eventType === "ENQUIRY_ATTRIBUTION_AMBIGUOUS"
    );
    if (ambiguousEvent) {
      const meta = (ambiguousEvent.metadata as any) || {};
      const candidateList: string[] = Array.isArray(meta.candidateEnquiries) ? meta.candidateEnquiries : [];
      attributionDiagnostic = {
        isAmbiguous: true,
        candidateEnquiries: candidateList,
        message: ambiguousEvent.description,
      };
    }

    return {
      ...booking,
      enquiryId: (booking as any).enquiryId ?? null,
      operationalReadiness,
      attributionDiagnostic,
    } as unknown as BookingWithRelations;
  },

  /**
   * Create a new booking
   */
  async createBooking(agencyId: string, data: CreateBookingInput): Promise<BookingWithRelations> {
    const { createdBooking, tripTitle, isAmbiguousEnquiryMatch, candidateEnquiryNumbers } = await prisma.$transaction(async (tx) => {
      // Verify Trip exists under this agency and is active
      const trip = await tx.trip.findFirst({
        where: { id: data.tripId, agencyId, archivedAt: null },
      });
      if (!trip) {
        throw new Error("Trip not found or does not belong to this agency.");
      }

      // 4. Verify Customer exists under this agency and is active
      const customer = await tx.customer.findFirst({
        where: { id: data.customerId, agencyId, archivedAt: null },
      });
      if (!customer) {
        throw new Error("Customer not found or does not belong to this agency.");
      }

      let quoteTax: {
        taxableAmount: Prisma.Decimal | null;
        taxAmount: Prisma.Decimal | null;
        taxRate: Prisma.Decimal | null;
        taxMode: any;
        gstTreatment: any;
        cgstAmount: Prisma.Decimal | null;
        sgstAmount: Prisma.Decimal | null;
        igstAmount: Prisma.Decimal | null;
        packageOptionName?: string | null;
      } | null = null;

      if (data.quotationId) {
        const quotation = await tx.quotation.findFirst({
          where: { id: data.quotationId, agencyId, archivedAt: null },
        });
        if (!quotation) {
          throw new Error("Quotation not found or does not belong to this agency.");
        }
        const existingQuoteBooking = await tx.booking.findFirst({
          where: { agencyId, quotationId: data.quotationId, archivedAt: null },
          select: { id: true, bookingNumber: true },
        });
        if (existingQuoteBooking) {
          throw new Error(`Quotation already has an active booking (${existingQuoteBooking.bookingNumber}).`);
        }
        quoteTax = {
          taxableAmount: quotation.taxableAmount !== null ? new Prisma.Decimal(quotation.taxableAmount) : null,
          taxAmount: quotation.taxAmount !== null ? new Prisma.Decimal(quotation.taxAmount) : null,
          taxRate: quotation.taxRate !== null ? new Prisma.Decimal(quotation.taxRate) : null,
          taxMode: quotation.taxMode ?? null,
          gstTreatment: quotation.gstTreatment ?? null,
          cgstAmount: quotation.cgstAmount !== null ? new Prisma.Decimal(quotation.cgstAmount) : null,
          sgstAmount: quotation.sgstAmount !== null ? new Prisma.Decimal(quotation.sgstAmount) : null,
          igstAmount: quotation.igstAmount !== null ? new Prisma.Decimal(quotation.igstAmount) : null,
          packageOptionName: quotation.tier || null,
        };
      }

      const bookingNumber = await this.generateNextBookingNumber(agencyId, tx);
      const totalAmount = data.totalAmount;
      const paidAmount = data.paidAmount || 0;
      const balanceAmount = Math.max(0, totalAmount - paidAmount);

      let paymentStatus: BookingPaymentStatus = BookingPaymentStatus.UNPAID;
      if (paidAmount >= totalAmount && totalAmount > 0) {
        paymentStatus = BookingPaymentStatus.PAID;
      } else if (paidAmount > 0) {
        paymentStatus = BookingPaymentStatus.PARTIALLY_PAID;
      }

      // Resolve originating enquiry for this booking strictly through authoritative trip or quotation linkage.
      // Customer-only matching, destination/date inference, or arbitrary client-supplied IDs are prohibited.
      let originatingEnquiryId: string | null = null;
      let isAmbiguousEnquiryMatch = false;
      let candidateEnquiryNumbers: string[] = [];

      if (data.enquiryId) {
        const candidateEnquiries = await tx.enquiry.findMany({
          where: {
            id: data.enquiryId,
            agencyId,
            archivedAt: null,
            status: { notIn: [EnquiryStatus.CONVERTED, EnquiryStatus.LOST, EnquiryStatus.CANCELLED] },
            OR: [
              { convertedTripId: data.tripId },
              ...(data.quotationId ? [{ convertedQuotationId: data.quotationId }] : []),
            ],
          },
          select: { id: true, enquiryNumber: true },
        });
        if (candidateEnquiries.length === 1) {
          originatingEnquiryId = candidateEnquiries[0].id;
        } else if (candidateEnquiries.length > 1) {
          isAmbiguousEnquiryMatch = true;
          candidateEnquiryNumbers = candidateEnquiries.map((e) => e.enquiryNumber);
        }
      }
      if (!originatingEnquiryId && !isAmbiguousEnquiryMatch) {
        const tripEnquiries = await tx.enquiry.findMany({
          where: {
            agencyId,
            archivedAt: null,
            status: { notIn: [EnquiryStatus.CONVERTED, EnquiryStatus.LOST, EnquiryStatus.CANCELLED] },
            OR: [
              { convertedTripId: data.tripId },
              ...(data.quotationId ? [{ convertedQuotationId: data.quotationId }] : []),
            ],
          },
          select: { id: true, enquiryNumber: true },
        });
        // Require unambiguous 1-to-1 linkage: if 0 or multiple matching enquiries exist, do not convert
        if (tripEnquiries.length === 1) {
          originatingEnquiryId = tripEnquiries[0].id;
        } else if (tripEnquiries.length > 1) {
          isAmbiguousEnquiryMatch = true;
          candidateEnquiryNumbers = tripEnquiries.map((e) => e.enquiryNumber);
        }
      }

      const bookingStatus = data.status || BookingStatus.CONFIRMED;

      const b = await tx.booking.create({
        data: {
          agencyId,
          tripId: data.tripId,
          customerId: data.customerId || trip.customerId,
          quotationId: data.quotationId || null,
          packageOptionName: quoteTax?.packageOptionName || null,
          bookingNumber,
          status: bookingStatus,
          paymentStatus,
          bookingDate: data.bookingDate ? new Date(data.bookingDate) : new Date(),
          travelStartDate: data.travelStartDate ? new Date(data.travelStartDate) : trip.startDate,
          travelEndDate: data.travelEndDate ? new Date(data.travelEndDate) : trip.endDate,
          currency: data.currency || "INR",
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(paidAmount),
          balanceAmount: new Prisma.Decimal(balanceAmount),
          taxableAmount: quoteTax?.taxableAmount ?? null,
          taxAmount: quoteTax?.taxAmount ?? null,
          taxRate: quoteTax?.taxRate ?? null,
          taxMode: quoteTax?.taxMode ?? null,
          gstTreatment: quoteTax?.gstTreatment ?? null,
          cgstAmount: quoteTax?.cgstAmount ?? null,
          sgstAmount: quoteTax?.sgstAmount ?? null,
          igstAmount: quoteTax?.igstAmount ?? null,
          notes: data.notes,
          internalNotes: data.internalNotes,
        },
        select: BOOKING_SCALAR_SELECT,
      });

      // Update Trip status to BOOKED if not already in execution
      if (trip.status === "DRAFT" || trip.status === "PLANNING" || trip.status === "QUOTED") {
        await tx.trip.update({
          where: { id: data.tripId },
          data: { status: TripStatus.BOOKED },
        });
      }

      // If booking is confirmed and has an unambiguous originating enquiry, mark enquiry CONVERTED (Won)
      if (bookingStatus === BookingStatus.CONFIRMED && originatingEnquiryId) {
        await tx.enquiry.updateMany({
          where: {
            id: originatingEnquiryId,
            agencyId,
            status: { notIn: [EnquiryStatus.CONVERTED, EnquiryStatus.LOST, EnquiryStatus.CANCELLED] },
          },
          data: {
            status: EnquiryStatus.CONVERTED,
            closedAt: new Date(),
            convertedQuotationId: data.quotationId || undefined,
          },
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
          select: { id: true },
        });
      }

      return {
        createdBooking: b,
        tripTitle: trip.title,
        isAmbiguousEnquiryMatch,
        candidateEnquiryNumbers,
      };
    });

    // Auto-initialize operations and dispatch notifications outside transaction
    try {
      const operation = await operationsService.initializeOperation(agencyId, {
        tripId: data.tripId,
        bookingId: createdBooking.id,
      });

      await operationsService.logEvent(agencyId, operation.id, {
        eventType: "BOOKING_CREATED",
        description: `Booking ${createdBooking.bookingNumber} created for trip ${tripTitle}. Initial status: ${createdBooking.status}.`,
      });

      if (isAmbiguousEnquiryMatch && candidateEnquiryNumbers.length > 0) {
        await operationsService.logEvent(agencyId, operation.id, {
          eventType: "ENQUIRY_ATTRIBUTION_AMBIGUOUS",
          description: `Booking ${createdBooking.bookingNumber} confirmed, but multiple eligible originating enquiries exist (${candidateEnquiryNumbers.join(", ")}). Automatic conversion was withheld; manual CRM attribution is required.`,
          metadata: {
            bookingId: createdBooking.id,
            bookingNumber: createdBooking.bookingNumber,
            candidateEnquiries: candidateEnquiryNumbers,
            requiresManualResolution: true,
          },
        });

        internalNotificationService.notifyAgencyOwner(agencyId, {
          type: UserNotificationType.BOOKING_CREATED,
          title: "Ambiguous Enquiry Attribution",
          message: `Booking #${createdBooking.bookingNumber} was confirmed, but multiple eligible enquiries were found (${candidateEnquiryNumbers.join(", ")}). Automatic conversion was withheld; please resolve manually in CRM.`,
          linkUrl: `/enquiries?search=${encodeURIComponent(candidateEnquiryNumbers[0])}`,
          metadata: {
            bookingId: createdBooking.id,
            bookingNumber: createdBooking.bookingNumber,
            candidateEnquiries: candidateEnquiryNumbers,
          },
          idempotencyKey: `ambiguous-attribution-${createdBooking.id}`,
        }).catch((err) => {
          console.warn("[BookingService] Failed to notify agency owner of ambiguous attribution:", err);
        });
      }

      await customerNotificationService.notifyTripStatusChange(
        agencyId,
        data.tripId,
        "CONFIRMED"
      );

      communicationService.notifyBookingConfirmed(agencyId, createdBooking.id).catch((err) => {
        console.warn("[Communication Non-blocking Notice] Failed to notify booking confirmed:", err?.message || err);
      });

      internalNotificationService.notifyAgencyOwner(agencyId, {
        type: "BOOKING_CREATED",
        title: "New Booking Created",
        message: `Booking #${createdBooking.bookingNumber} created for ₹${Number(createdBooking.totalAmount).toLocaleString("en-IN")}.`,
        linkUrl: `/bookings/${createdBooking.id}`,
        metadata: {
          bookingId: createdBooking.id,
          bookingNumber: createdBooking.bookingNumber,
          totalAmount: Number(createdBooking.totalAmount),
        },
      }).catch((err) => {
        console.warn("[BookingService] Failed to notify agency owner:", err);
      });

      // Auto-generate service payables (Hotels, Vehicles) for the booking
      await financeService.generateBookingServicePayables(agencyId, createdBooking.id).catch((err) => {
        console.warn("[BookingService] Failed to auto-generate booking service payables:", err);
      });
    } catch {
      // Non-blocking operations synchronization
    }

    return (await this.getBooking(agencyId, createdBooking.id))!;
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
      },
    });

    if (!quotation) {
      throw new Error("Quotation not found or does not belong to this agency.");
    }

    // Eligibility: Must be explicitly ACCEPTED by customer with recorded timestamp
    if (quotation.status !== QuotationStatus.ACCEPTED) {
      throw new Error(
        `Only accepted quotations can be converted to a booking. Current quotation status is ${quotation.status}.`
      );
    }

    if (!quotation.acceptedAt) {
      throw new Error("Quotation must have a recorded customer acceptance timestamp before conversion.");
    }

    // Idempotent duplicate check: If booking already exists, return it cleanly
    const existingBooking = await prisma.booking.findFirst({
      where: { agencyId, quotationId, archivedAt: null },
      select: { id: true },
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

    const totalAmount = Number(quotation.finalAmount);
    const packageOptionName = quotation.tier || null;

    // Resolve authoritative tax snapshot from quotation
    const taxableAmount = quotation.taxableAmount ?? null;
    const taxAmount = quotation.taxAmount ?? null;
    const taxRate = quotation.taxRate ?? null;
    const taxMode = quotation.taxMode ?? null;
    const gstTreatment = quotation.gstTreatment ?? null;
    const cgstAmount = quotation.cgstAmount ?? null;
    const sgstAmount = quotation.sgstAmount ?? null;
    const igstAmount = quotation.igstAmount ?? null;

    const txResult = await prisma.$transaction(async (tx) => {
      // Lock the quotation row FOR UPDATE to serialize concurrent booking conversions
      await tx.$queryRaw`
        SELECT "id" FROM "quotations"
        WHERE "id" = ${quotationId} AND "agencyId" = ${agencyId} AND "archivedAt" IS NULL
        FOR UPDATE
      `;

      // Check inside transaction if a booking was created concurrently
      const concurrentBooking = await tx.booking.findFirst({
        where: { agencyId, quotationId, archivedAt: null },
        select: { id: true, bookingNumber: true },
      });
      if (concurrentBooking) {
        return { ...concurrentBooking, isExisting: true } as any;
      }

      // Resolve originating enquiry if an unambiguous link exists for the trip or quotation
      // 1. Prioritize explicit direct quotation linkage (convertedQuotationId)
      const directQuoteEnquiries = await tx.enquiry.findMany({
        where: {
          agencyId,
          archivedAt: null,
          convertedQuotationId: quotation.id,
          status: { notIn: [EnquiryStatus.CONVERTED, EnquiryStatus.LOST, EnquiryStatus.CANCELLED] },
        },
        select: { id: true, enquiryNumber: true },
      });

      let originatingEnquiry: { id: string; enquiryNumber: string } | null = null;
      let isAmbiguousEnquiryMatch = false;
      let candidateEnquiryNumbers: string[] = [];

      if (directQuoteEnquiries.length === 1) {
        originatingEnquiry = directQuoteEnquiries[0];
      } else if (directQuoteEnquiries.length > 1) {
        isAmbiguousEnquiryMatch = true;
        candidateEnquiryNumbers = directQuoteEnquiries.map((e) => e.enquiryNumber);
      } else {
        // 2. Fall back to unambiguous 1-to-1 trip-level enquiries
        const tripEnquiries = await tx.enquiry.findMany({
          where: {
            agencyId,
            archivedAt: null,
            convertedTripId: quotation.tripId,
            status: { notIn: [EnquiryStatus.CONVERTED, EnquiryStatus.LOST, EnquiryStatus.CANCELLED] },
          },
          select: { id: true, enquiryNumber: true },
        });

        if (tripEnquiries.length === 1) {
          originatingEnquiry = tripEnquiries[0];
        } else if (tripEnquiries.length > 1) {
          isAmbiguousEnquiryMatch = true;
          candidateEnquiryNumbers = tripEnquiries.map((e) => e.enquiryNumber);
        }
      }

      // 3. Generate sequential booking number inside transaction under agency subscription lock
      const bookingNumber = await this.generateNextBookingNumber(agencyId, tx);

      // 4. Create Booking with full Tax V1 snapshot and DRAFT status (Quotation acceptance is NOT booking confirmation)
      const b = await tx.booking.create({
        data: {
          agencyId,
          tripId: quotation.tripId,
          customerId: quotation.customerId,
          quotationId: quotation.id,
          enquiryId: originatingEnquiry?.id || null,
          packageOptionName,
          bookingNumber,
          status: BookingStatus.DRAFT,
          paymentStatus: BookingPaymentStatus.UNPAID,
          bookingDate: new Date(),
          travelStartDate: quotation.trip.startDate,
          travelEndDate: quotation.trip.endDate,
          currency: quotation.currency || "INR",
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(0),
          balanceAmount: new Prisma.Decimal(totalAmount),
          taxableAmount: taxableAmount !== null ? new Prisma.Decimal(taxableAmount) : null,
          taxAmount: taxAmount !== null ? new Prisma.Decimal(taxAmount) : null,
          taxRate: taxRate !== null ? new Prisma.Decimal(taxRate) : null,
          taxMode,
          gstTreatment,
          cgstAmount: cgstAmount !== null ? new Prisma.Decimal(cgstAmount) : null,
          sgstAmount: sgstAmount !== null ? new Prisma.Decimal(sgstAmount) : null,
          igstAmount: igstAmount !== null ? new Prisma.Decimal(igstAmount) : null,
          notes:
            data?.notes ||
            (packageOptionName
              ? `Converted from Proposal ${quotation.quotationNumber} (${packageOptionName}).`
              : `Converted from Proposal ${quotation.quotationNumber}.`),
          internalNotes: data?.internalNotes,
          confirmedAt: null,
        },
        select: BOOKING_SCALAR_SELECT,
      });

      // 5. Update Trip status to BOOKED
      await tx.trip.update({
        where: { id: quotation.tripId },
        data: {
          status: TripStatus.BOOKED,
        },
      });

      // Note: CRM Pass A invariant — Originating enquiry is linked via enquiryId but remains in
      // active negotiation until the booking is explicitly confirmed by agency staff/owner.

      return {
        booking: b,
        isAmbiguousEnquiryMatch,
        candidateEnquiryNumbers,
      };
    });

    const isExisting = (txResult as any).isExisting;
    const booking = isExisting ? (txResult as any) : txResult.booking;
    const isAmbiguousEnquiryMatch = !isExisting && txResult.isAmbiguousEnquiryMatch;
    const candidateEnquiryNumbers = !isExisting ? (txResult.candidateEnquiryNumbers || []) : [];

    if ((booking as any).isExisting) {
      try {
        await operationsService.initializeOperation(agencyId, {
          tripId: quotation.tripId,
          bookingId: booking.id,
        });
      } catch {
        // Safe fallback
      }
      return (await this.getBooking(agencyId, booking.id))!;
    }

    // 4. Initialize Operations & Timeline Events outside tx
    try {
      const operation = await operationsService.initializeOperation(agencyId, {
        tripId: quotation.tripId,
        bookingId: booking.id,
      });

      await operationsService.logEvent(agencyId, operation.id, {
        eventType: "BOOKING_CREATED",
        description: `Booking ${booking.bookingNumber} draft created from accepted proposal ${quotation.quotationNumber} (${packageOptionName || "Standard"}).`,
      });

      // Immutable Agency Audit Log for booking conversion
      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: (data as any)?.userId || "AGENCY_USER",
        action: "QUOTATION_CONVERTED_TO_BOOKING",
        entityType: "BOOKING",
        entityId: booking.id,
        newState: {
          bookingNumber: booking.bookingNumber,
          quotationId: quotation.id,
          quotationNumber: quotation.quotationNumber,
          version: quotation.version,
          totalAmount: Number(booking.totalAmount),
          status: booking.status,
        },
        metadata: {
          quotationId: quotation.id,
          quotationNumber: quotation.quotationNumber,
          version: quotation.version,
          bookingNumber: booking.bookingNumber,
          tripId: quotation.tripId,
          customerId: quotation.customerId,
        },
      }).catch((err) => {
        console.warn("[BookingService] Failed to record quotation conversion audit log:", err);
      });

      if (isAmbiguousEnquiryMatch && candidateEnquiryNumbers.length > 0) {
        await operationsService.logEvent(agencyId, operation.id, {
          eventType: "ENQUIRY_ATTRIBUTION_AMBIGUOUS",
          description: `Booking ${booking.bookingNumber} created, but multiple eligible originating enquiries exist (${candidateEnquiryNumbers.join(", ")}). Automatic conversion was withheld; manual CRM attribution is required upon confirmation.`,
          metadata: {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            candidateEnquiries: candidateEnquiryNumbers,
            requiresManualResolution: true,
          },
        });

        internalNotificationService.notifyAgencyOwner(agencyId, {
          type: UserNotificationType.BOOKING_CREATED,
          title: "Ambiguous Enquiry Attribution",
          message: `Booking #${booking.bookingNumber} was created from Quotation #${quotation.quotationNumber}, but multiple eligible enquiries were found (${candidateEnquiryNumbers.join(", ")}). Please review in CRM before confirming.`,
          linkUrl: `/enquiries?search=${encodeURIComponent(candidateEnquiryNumbers[0])}`,
          metadata: {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            quotationId: quotation.id,
            candidateEnquiries: candidateEnquiryNumbers,
          },
          idempotencyKey: `ambiguous-attribution-${booking.id}`,
        }).catch((err) => {
          console.warn("[BookingService] Failed to notify agency owner of ambiguous attribution:", err);
        });
      }

      internalNotificationService.notifyAgencyOwner(agencyId, {
        type: "BOOKING_CREATED",
        title: "Quotation Converted to Booking",
        message: `Booking #${booking.bookingNumber} draft created from Quotation #${quotation.quotationNumber}. Pending agency confirmation.`,
        linkUrl: `/bookings/${booking.id}`,
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          quotationId: quotation.id,
          totalAmount: Number(booking.totalAmount),
        },
        idempotencyKey: `booking-created-${booking.id}`,
      }).catch((err) => {
        console.warn("[BookingService] Failed to notify agency owner of booking conversion:", err);
      });

      // Auto-generate service payables (Hotels, Vehicles) for the booking
      await financeService.generateBookingServicePayables(agencyId, booking.id).catch((err) => {
        console.warn("[BookingService] Failed to auto-generate booking service payables:", err);
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
      select: {
        id: true,
        totalAmount: true,
        payments: {
          where: { archivedAt: null, status: { in: ["COMPLETED", "REFUNDED"] } },
          select: {
            id: true,
            amount: true,
            refundedAmount: true,
          },
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

    const updatedBooking = await db.booking.update({
      where: { id: bookingId },
      data: {
        paidAmount: new Prisma.Decimal(paid),
        balanceAmount: new Prisma.Decimal(balance),
        paymentStatus,
      },
      select: BOOKING_SCALAR_SELECT,
    });

    // Synchronize active (non-cancelled) Invoice if present
    const activeInvoice = await db.invoice.findFirst({
      where: {
        bookingId,
        status: { not: InvoiceStatus.CANCELLED },
        archivedAt: null,
      },
    });

    if (activeInvoice) {
      const invTotal = Number(activeInvoice.totalAmount);
      const invBalance = Math.max(0, Math.round((invTotal - paid) * 100) / 100);
      let newInvStatus: InvoiceStatus = InvoiceStatus.ISSUED;
      if (invBalance <= 0 && invTotal > 0) {
        newInvStatus = InvoiceStatus.PAID;
      } else if (paid > 0) {
        newInvStatus = InvoiceStatus.PARTIALLY_PAID;
      }

      await db.invoice.update({
        where: { id: activeInvoice.id },
        data: {
          paidAmount: new Prisma.Decimal(paid),
          balanceAmount: new Prisma.Decimal(invBalance),
          status: newInvStatus,
        },
      });
    }

    return {
      ...updatedBooking,
      enquiryId: null,
    } as Booking;
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
      select: {
        ...BOOKING_SCALAR_SELECT,
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
      if (newTotal < paid) {
        throw new Error(
          `Cannot reduce booking total (₹${newTotal}) below verified received payments (₹${paid}). Price reductions below paid amounts require an approved refund procedure.`
        );
      }
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


    // Execute booking update, enquiry conversion, and invoice sync in ONE atomic transaction
    const txResult = await prisma.$transaction(async (tx) => {
      let isAmbiguousEnquiryMatch = false;
      let candidateEnquiryNumbers: string[] = [];

      // 1. If transitioning to CONFIRMED, mark linked enquiry as CONVERTED inside transaction
      if (data.status === BookingStatus.CONFIRMED && !booking.confirmedAt) {
        let linkedEnquiryId = (booking as any).enquiryId;

        if (linkedEnquiryId) {
          // Verify that pre-recorded enquiryId authoritatively links to this booking's trip or quotation within the agency
          const verified = await tx.enquiry.findFirst({
            where: {
              id: linkedEnquiryId,
              agencyId,
              archivedAt: null,
              OR: [
                { convertedTripId: booking.tripId },
                ...(booking.quotationId ? [{ convertedQuotationId: booking.quotationId }] : []),
              ],
            },
            select: { id: true, enquiryNumber: true },
          });
          if (!verified) {
            linkedEnquiryId = null;
          }
        }
        if (!linkedEnquiryId) {
          // 1. Prioritize explicit direct quotation linkage if booking has quotationId
          if (booking.quotationId) {
            const directQuoteEnquiries = await tx.enquiry.findMany({
              where: {
                agencyId,
                archivedAt: null,
                convertedQuotationId: booking.quotationId,
                status: { notIn: [EnquiryStatus.CONVERTED, EnquiryStatus.LOST, EnquiryStatus.CANCELLED] },
              },
              select: { id: true, enquiryNumber: true },
            });
            if (directQuoteEnquiries.length === 1) {
              linkedEnquiryId = directQuoteEnquiries[0].id;
            } else if (directQuoteEnquiries.length > 1) {
              isAmbiguousEnquiryMatch = true;
              candidateEnquiryNumbers = directQuoteEnquiries.map((e) => e.enquiryNumber);
            }
          }

          // 2. Fall back to unambiguous 1-to-1 trip-level enquiries
          if (!linkedEnquiryId && !isAmbiguousEnquiryMatch) {
            const tripEnquiries = await tx.enquiry.findMany({
              where: {
                agencyId,
                archivedAt: null,
                convertedTripId: booking.tripId,
                status: { notIn: [EnquiryStatus.CONVERTED, EnquiryStatus.LOST, EnquiryStatus.CANCELLED] },
              },
              select: { id: true, enquiryNumber: true },
            });
            if (tripEnquiries.length === 1) {
              linkedEnquiryId = tripEnquiries[0].id;
            } else if (tripEnquiries.length > 1) {
              isAmbiguousEnquiryMatch = true;
              candidateEnquiryNumbers = tripEnquiries.map((e) => e.enquiryNumber);
            }
          }
        }
        if (linkedEnquiryId) {
          await tx.enquiry.updateMany({
            where: {
              id: linkedEnquiryId,
              agencyId,
              status: { notIn: [EnquiryStatus.CONVERTED, EnquiryStatus.LOST, EnquiryStatus.CANCELLED] },
            },
            data: {
              status: EnquiryStatus.CONVERTED,
              closedAt: new Date(),
            },
          });
        }
      }

      // 2. Update booking record
      await tx.booking.update({
        where: { id: bookingId },
        data: updateData,
        select: { id: true },
      });

      // 3. Synchronize active invoice if total amount changed or booking cancelled
      const activeInvoice = await tx.invoice.findFirst({
        where: {
          bookingId,
          status: { not: InvoiceStatus.CANCELLED },
          archivedAt: null,
        },
      });

      if (activeInvoice) {
        if (data.status === BookingStatus.CANCELLED) {
          await tx.invoice.update({
            where: { id: activeInvoice.id },
            data: {
              status: InvoiceStatus.CANCELLED,
              cancelledAt: new Date(),
              cancellationReason: data.cancellationReason || "Booking was cancelled.",
            },
          });
        }
        // Note on Invoice Immutability:
        // An issued tax invoice is a historical accounting document. When booking totalAmount
        // is amended, the issued invoice is NOT mutated in place, preserving accounting integrity.
      }


      return { isAmbiguousEnquiryMatch, candidateEnquiryNumbers };
    });

    if (txResult.isAmbiguousEnquiryMatch && txResult.candidateEnquiryNumbers.length > 0 && booking.tripOperation?.id) {
      try {
        await operationsService.logEvent(agencyId, booking.tripOperation.id, {
          eventType: "ENQUIRY_ATTRIBUTION_AMBIGUOUS",
          description: `Booking ${booking.bookingNumber} confirmed, but multiple eligible originating enquiries exist (${txResult.candidateEnquiryNumbers.join(", ")}). Automatic conversion was withheld; manual CRM attribution is required.`,
          metadata: {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            candidateEnquiries: txResult.candidateEnquiryNumbers,
            requiresManualResolution: true,
          },
        });

        internalNotificationService.notifyAgencyOwner(agencyId, {
          type: UserNotificationType.BOOKING_CREATED,
          title: "Ambiguous Enquiry Attribution",
          message: `Booking #${booking.bookingNumber} was confirmed, but multiple eligible enquiries were found (${txResult.candidateEnquiryNumbers.join(", ")}). Automatic conversion was withheld; please resolve manually in CRM.`,
          linkUrl: `/enquiries?search=${encodeURIComponent(txResult.candidateEnquiryNumbers[0])}`,
          metadata: {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            candidateEnquiries: txResult.candidateEnquiryNumbers,
          },
          idempotencyKey: `ambiguous-attribution-${booking.id}`,
        }).catch((err) => {
          console.warn("[BookingService] Failed to notify agency owner of ambiguous attribution:", err);
        });
      } catch {
        // Non-blocking
      }
    }

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

    // Record audit event for financial amendment
    if (data.totalAmount !== undefined && Number(data.totalAmount) !== Number(booking.totalAmount)) {

      try {
        const newTotal = Number(data.totalAmount);
        const prevTotal = Number(booking.totalAmount);
        await agencyAuditService.logEvent({
          agencyId,
          actorUserId: (data as any)?.userId || "AGENCY_USER",
          action: "BOOKING_AMENDED",
          entityType: "BOOKING",
          entityId: bookingId,
          previousState: {
            totalAmount: prevTotal,
            balanceAmount: Number(booking.balanceAmount),
            paymentStatus: booking.paymentStatus,
          },
          newState: {
            totalAmount: newTotal,
            balanceAmount: Math.max(0, newTotal - Number(booking.paidAmount)),
          },
          metadata: {
            previousTotal: prevTotal,
            newTotal,
            difference: newTotal - prevTotal,
            reason: data.notes || "Booking total amount modified",
            bookingNumber: booking.bookingNumber,
          },
        });
      } catch {
        // Non-blocking audit log
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
      select: {
        ...BOOKING_SCALAR_SELECT,
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
      select: { id: true },
    });

    // Auto-cancel active invoice if present
    const activeInvoice = await prisma.invoice.findFirst({
      where: {
        bookingId,
        status: { not: InvoiceStatus.CANCELLED },
        archivedAt: null,
      },
    });

    if (activeInvoice) {
      await prisma.invoice.update({
        where: { id: activeInvoice.id },
        data: {
          status: InvoiceStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: reason.trim() || "Booking was cancelled.",
        },
      });
    }

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
      select: { id: true, tripId: true },
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
      select: { id: true },
    });

    if (!booking) {
      throw new Error("Booking not found.");
    }

    const archived = await prisma.booking.update({
      where: { id: bookingId },
      data: { archivedAt: new Date() },
      select: BOOKING_SCALAR_SELECT,
    });

    return {
      ...archived,
      enquiryId: null,
    } as Booking;
  },
};
