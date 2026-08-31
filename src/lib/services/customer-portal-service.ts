import "server-only";
import { prisma } from "@/lib/prisma";
import {
  BookingStatus,
  BookingPaymentStatus,
  PaymentMethod,
  TripStatus,
  OperationStatus,
} from "@prisma/client";
import { operationsDocumentService } from "@/lib/services/operations-document-service";

// ═════════════════════════════════════════════════════════════════════
// CUSTOMER-SAFE DTOs / VIEW MODELS (STRICT WHITELIST)
// ═════════════════════════════════════════════════════════════════════

export interface CustomerBookingSummaryView {
  id: string;
  bookingNumber: string;
  tripId: string;
  tripNumber: string;
  tripTitle: string;
  destination?: string;
  packageOptionName?: string | null;
  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
  totalAmount: string;
  paidAmount: string;
  balanceAmount: string;
  currency: string;
  category: "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  agency: {
    name: string;
    phone: string;
    email: string;
    logoUrl?: string | null;
  };
}

export interface CustomerTripDetailView {
  id: string;
  tripNumber: string;
  title: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  customerStatusLabel: string;
  bookingSummary?: {
    id: string;
    bookingNumber: string;
    status: BookingStatus;
    paymentStatus: BookingPaymentStatus;
    packageOptionName?: string | null;
    currency: string;
    totalAmount: string;
    paidAmount: string;
    balanceAmount: string;
  } | null;
  agency: {
    name: string;
    phone: string;
    email: string;
    address?: string | null;
    logoUrl?: string | null;
  };
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  };
  travelers: Array<{
    id: string;
    name: string;
    type: string;
    specialRequirements?: string | null;
  }>;
  itinerary: Array<{
    id: string;
    dayNumber: number;
    title: string;
    description: string;
    location?: string | null;
    visitTime?: string | null;
  }>;
  accommodations: Array<{
    id: string;
    hotelName: string;
    city?: string | null;
    category?: string | null;
    roomType: string;
    mealPlan?: string | null;
    checkIn: string;
    checkOut: string;
    nights: number;
    roomsCount: number;
    status: string;
    confirmationNumber?: string | null;
    hotelPhone?: string | null;
    hotelAddress?: string | null;
  }>;
  transfers: Array<{
    id: string;
    vehicleName: string;
    category: string;
    pickupDate?: string | null;
    pickupTime?: string | null;
    pickupLocation?: string | null;
    dropLocation?: string | null;
    driverName?: string | null;
    driverPhone?: string | null;
    vehicleNumber?: string | null;
    status: string;
  }>;
  activities: Array<{
    id: string;
    activityName: string;
    type: string;
    location?: string | null;
    date: string;
    participantsCount: number;
    status: string;
    ticketNumber?: string | null;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    description: string;
    date: string;
  }>;
}

export interface CustomerDocumentItemView {
  id: string;
  type: "BOOKING_CONFIRMATION" | "HOTEL_VOUCHER" | "VEHICLE_VOUCHER" | "ACTIVITY_PASS" | "TRAVEL_KIT";
  title: string;
  subtitle: string;
  documentNumber: string;
  isReady: boolean;
  downloadUrl: string;
  generatedDate?: string;
}

export interface CustomerPaymentSummaryView {
  bookingId: string;
  bookingNumber: string;
  currency: string;
  totalAmount: string;
  paidAmount: string;
  balanceAmount: string;
  paymentStatus: BookingPaymentStatus;
  payments: Array<{
    id: string;
    paymentNumber: string;
    amount: string;
    paymentMethod: PaymentMethod;
    paymentDate: string;
    receiptNumber?: string | null;
    status: string;
  }>;
  refunds: Array<{
    id: string;
    amount: string;
    date: string;
    receiptNumber?: string | null;
  }>;
}

export interface CustomerProfileView {
  id: string;
  customerNumber?: string | null;
  name: string;
  phone: string;
  alternatePhone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
}

export interface CustomerFeedbackInput {
  rating: number;
  serviceRating?: number;
  hotelRating?: number;
  driverRating?: number;
  comments?: string;
}

// ═════════════════════════════════════════════════════════════════════
// CUSTOMER PORTAL AUTHORITATIVE SERVICE
// ═════════════════════════════════════════════════════════════════════

export class CustomerPortalService {
  /**
   * Helper to map internal status to customer-friendly label
   */
  private getCustomerStatusLabel(status: TripStatus | OperationStatus | string): string {
    switch (status) {
      case "PLANNING":
      case "QUOTED":
      case "DRAFT":
      case "PENDING":
        return "Preparing your trip";
      case "BOOKED":
      case "PREPARING":
      case "READY":
        return "Trip Confirmed & Ready";
      case "ONGOING":
        return "Trip in Progress";
      case "COMPLETED":
        return "Trip Completed";
      case "CANCELLED":
        return "Trip Cancelled";
      default:
        return String(status);
    }
  }

  /**
   * 1. Get all bookings for an authenticated customer
   */
  async getCustomerBookings(
    customerId: string,
    agencyId: string
  ): Promise<CustomerBookingSummaryView[]> {
    const bookings = await prisma.booking.findMany({
      where: {
        customerId,
        agencyId,
        archivedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        agency: {
          select: { name: true, phone: true, email: true, logo: true },
        },
        trip: {
          select: {
            id: true,
            tripNumber: true,
            title: true,
            startDate: true,
            endDate: true,
            status: true,
            tripOperation: {
              select: { status: true },
            },
          },
        },
      },
    });

    const now = new Date();

    return bookings.map((b) => {
      const start = b.travelStartDate || b.trip.startDate;
      const end = b.travelEndDate || b.trip.endDate;

      let category: "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED" = "UPCOMING";

      if (b.status === "CANCELLED" || b.trip.status === "CANCELLED") {
        category = "CANCELLED";
      } else if (b.status === "COMPLETED" || b.trip.status === "COMPLETED") {
        category = "COMPLETED";
      } else if (
        b.trip.tripOperation?.status === "ONGOING" ||
        (start && end && now >= new Date(start) && now <= new Date(end))
      ) {
        category = "ACTIVE";
      } else if (end && now > new Date(end)) {
        category = "COMPLETED";
      } else {
        category = "UPCOMING";
      }

      return {
        id: b.id,
        bookingNumber: b.bookingNumber,
        tripId: b.trip.id,
        tripNumber: b.trip.tripNumber,
        tripTitle: b.trip.title,
        packageOptionName: b.packageOptionName,
        status: b.status,
        paymentStatus: b.paymentStatus,
        travelStartDate: start ? new Date(start).toISOString() : null,
        travelEndDate: end ? new Date(end).toISOString() : null,
        totalAmount: Number(b.totalAmount).toFixed(2),
        paidAmount: Number(b.paidAmount).toFixed(2),
        balanceAmount: Number(b.balanceAmount).toFixed(2),
        currency: b.currency || "INR",
        category,
        agency: {
          name: b.agency.name,
          phone: b.agency.phone,
          email: b.agency.email,
          logoUrl: b.agency.logo,
        },
      };
    });
  }

  /**
   * 2. Get customer trip details with day-by-day itinerary & confirmed services
   */
  async getCustomerTripDetail(
    customerId: string,
    agencyId: string,
    tripId: string
  ): Promise<CustomerTripDetailView | null> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        customerId,
        agencyId,
        archivedAt: null,
      },
      include: {
        agency: {
          select: { name: true, phone: true, email: true, address: true, logo: true },
        },
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        travelers: {
          select: { id: true, name: true, type: true, specialRequirements: true },
        },
        itineraryItems: {
          orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }],
        },
        tripHotels: {
          include: {
            hotel: {
              select: { name: true, city: true, category: true, phone: true, address: true },
            },
          },
          orderBy: { checkIn: "asc" },
        },
        tripVehicles: {
          include: {
            vehicle: {
              select: { name: true, type: true },
            },
          },
          orderBy: { startDate: "asc" },
        },
        tripActivities: {
          include: {
            activity: {
              select: { name: true, type: true, location: true },
            },
          },
          orderBy: { date: "asc" },
        },
        tripOperation: {
          include: {
            hotelConfirmations: true,
            vehicleDispatches: true,
            activityConfirmations: true,
            events: {
              where: {
                eventType: { in: ["DEPARTURE_HANDOVER", "OPERATIONAL_UPDATE", "TRIP_ALERT", "CUSTOMER_FEEDBACK"] },
              },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
        bookings: {
          where: { status: { not: "CANCELLED" } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!trip) {
      return null;
    }

    const booking = trip.bookings[0] || null;
    const op = trip.tripOperation;

    return {
      id: trip.id,
      tripNumber: trip.tripNumber,
      title: trip.title,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate.toISOString(),
      status: trip.status,
      customerStatusLabel: this.getCustomerStatusLabel(op?.status || trip.status),
      bookingSummary: booking
        ? {
            id: booking.id,
            bookingNumber: booking.bookingNumber,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            packageOptionName: booking.packageOptionName,
            currency: booking.currency || "INR",
            totalAmount: Number(booking.totalAmount).toFixed(2),
            paidAmount: Number(booking.paidAmount).toFixed(2),
            balanceAmount: Number(booking.balanceAmount).toFixed(2),
          }
        : null,
      agency: {
        name: trip.agency.name,
        phone: trip.agency.phone,
        email: trip.agency.email,
        address: trip.agency.address,
        logoUrl: trip.agency.logo,
      },
      customer: {
        id: trip.customer.id,
        name: trip.customer.name,
        phone: trip.customer.phone,
        email: trip.customer.email,
      },
      travelers: trip.travelers.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        specialRequirements: t.specialRequirements,
      })),
      itinerary: trip.itineraryItems.map((item) => ({
        id: item.id,
        dayNumber: item.dayNumber,
        title: item.title,
        description: item.description || "",
        location: item.location || null,
        visitTime: item.startTime ? (item.endTime ? `${item.startTime} - ${item.endTime}` : item.startTime) : null,
      })),
      accommodations: trip.tripHotels.map((th) => {
        const conf = op?.hotelConfirmations.find((h) => h.tripHotelId === th.id);
        const nights = Math.max(1, Math.ceil((new Date(th.checkOut).getTime() - new Date(th.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
        return {
          id: th.id,
          hotelName: th.hotel?.name || "Hotel",
          city: th.hotel?.city || null,
          category: th.hotel?.category || null,
          roomType: th.roomType || "Standard Room",
          mealPlan: th.mealPlan,
          checkIn: th.checkIn.toISOString(),
          checkOut: th.checkOut.toISOString(),
          nights,
          roomsCount: th.rooms || 1,
          status: conf?.status || "CONFIRMED",
          confirmationNumber: conf?.confirmationNumber,
          hotelPhone: th.hotel?.phone,
          hotelAddress: th.hotel?.address,
        };
      }),
      transfers: trip.tripVehicles.map((tv) => {
        const dispatch = op?.vehicleDispatches.find((v) => v.tripVehicleId === tv.id);
        return {
          id: tv.id,
          vehicleName: tv.vehicleName || tv.vehicle?.name || "Vehicle",
          category: tv.vehicleType || tv.vehicle?.type || "Standard",
          pickupDate: dispatch?.pickupDate?.toISOString() || (tv.startDate ? tv.startDate.toISOString() : null),
          pickupTime: dispatch?.pickupTime || null,
          pickupLocation: dispatch?.pickupLocation || tv.pickupLocation || null,
          dropLocation: dispatch?.dropLocation || tv.dropLocation || null,
          driverName: dispatch?.driverName || tv.driverName || null,
          driverPhone: dispatch?.driverPhone || tv.driverPhone || null,
          vehicleNumber: dispatch?.vehicleNumber || null,
          status: dispatch?.status || "ASSIGNED",
        };
      }),
      activities: trip.tripActivities.map((ta) => {
        const conf = op?.activityConfirmations.find((a) => a.tripActivityId === ta.id);
        return {
          id: ta.id,
          activityName: ta.name || ta.activity?.name || "Activity",
          type: ta.type || ta.activity?.type || "INCLUDED",
          location: ta.location || ta.activity?.location || null,
          date: ta.date ? ta.date.toISOString() : trip.startDate.toISOString(),
          participantsCount: ta.numberOfParticipants || 1,
          status: conf?.status || "CONFIRMED",
          ticketNumber: conf?.ticketNumber || conf?.confirmationNumber,
        };
      }),
      alerts: (op?.events || []).map((e) => ({
        id: e.id,
        title: e.eventType.replace(/_/g, " "),
        description: e.description,
        date: e.createdAt.toISOString(),
      })),
    };
  }

  /**
   * 3. Get customer travel documents for a trip
   */
  async getCustomerTripDocuments(
    customerId: string,
    agencyId: string,
    tripId: string
  ): Promise<CustomerDocumentItemView[]> {
    // 1. Verify trip ownership
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        customerId,
        agencyId,
        archivedAt: null,
      },
      include: {
        tripOperation: {
          include: {
            hotelConfirmations: {
              include: { tripHotel: { include: { hotel: true } } },
            },
            vehicleDispatches: {
              include: { tripVehicle: { include: { vehicle: true } } },
            },
            activityConfirmations: {
              include: { tripActivity: { include: { activity: true } } },
            },
          },
        },
        bookings: {
          where: { status: { not: "CANCELLED" } },
          take: 1,
        },
      },
    });

    if (!trip) {
      throw new Error("TRIP_NOT_FOUND: Access denied or trip does not exist.");
    }

    const docs: CustomerDocumentItemView[] = [];
    const op = trip.tripOperation;
    const booking = trip.bookings[0];

    // Booking Confirmation
    if (booking) {
      docs.push({
        id: booking.id,
        type: "BOOKING_CONFIRMATION",
        title: "Official Booking Confirmation",
        subtitle: `Booking Ref: ${booking.bookingNumber}`,
        documentNumber: booking.bookingNumber,
        isReady: true,
        downloadUrl: `/api/customer/trips/${trip.id}/documents/BOOKING_CONFIRMATION/${booking.id}/pdf`,
      });
    }

    // Final Travel Kit (if operation exists)
    if (op) {
      docs.push({
        id: op.id,
        type: "TRAVEL_KIT",
        title: "Complete Travel Kit & Voucher Pack",
        subtitle: "Consolidated itinerary, vouchers, and helpline details",
        documentNumber: `KIT-${trip.tripNumber}`,
        isReady: true,
        downloadUrl: `/api/customer/trips/${trip.id}/documents/TRAVEL_KIT/${op.id}/pdf`,
      });

      // Hotel Vouchers
      for (const h of op.hotelConfirmations) {
        const hotelName = h.tripHotel?.hotel?.name || "Hotel";
        docs.push({
          id: h.id,
          type: "HOTEL_VOUCHER",
          title: `Hotel Voucher: ${hotelName}`,
          subtitle: `Check-in: ${h.checkIn ? new Date(h.checkIn).toLocaleDateString("en-IN") : "TBD"}`,
          documentNumber: h.confirmationNumber || `HTL-${h.id.slice(-4)}`,
          isReady: true,
          downloadUrl: `/api/customer/trips/${trip.id}/documents/HOTEL_VOUCHER/${h.id}/pdf`,
        });
      }

      // Vehicle Vouchers
      for (const v of op.vehicleDispatches) {
        const vehicleName = v.tripVehicle?.vehicle?.name || "Transfer";
        docs.push({
          id: v.id,
          type: "VEHICLE_VOUCHER",
          title: `Transfer Voucher: ${vehicleName}`,
          subtitle: `Driver: ${v.driverName || "Assigned"} • Pickup: ${v.pickupLocation || "TBD"}`,
          documentNumber: `VHC-${v.id.slice(-4)}`,
          isReady: true,
          downloadUrl: `/api/customer/trips/${trip.id}/documents/VEHICLE_VOUCHER/${v.id}/pdf`,
        });
      }

      // Activity Passes
      for (const a of op.activityConfirmations) {
        const activityName = a.tripActivity?.activity?.name || "Activity Pass";
        docs.push({
          id: a.id,
          type: "ACTIVITY_PASS",
          title: `Activity Pass: ${activityName}`,
          subtitle: `Pass / Ref: ${a.ticketNumber || a.confirmationNumber || "Included"}`,
          documentNumber: a.ticketNumber || `ACT-${a.id.slice(-4)}`,
          isReady: true,
          downloadUrl: `/api/customer/trips/${trip.id}/documents/ACTIVITY_PASS/${a.id}/pdf`,
        });
      }
    }

    return docs;
  }

  /**
   * 4. Download customer PDF document with strict IDOR verification
   */
  async downloadCustomerDocument(
    customerId: string,
    agencyId: string,
    tripId: string,
    docType: string,
    docId: string
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    // 1. Verify trip ownership
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        customerId,
        agencyId,
        archivedAt: null,
      },
      include: {
        tripOperation: true,
        bookings: true,
      },
    });

    if (!trip) {
      throw new Error("ACCESS_DENIED: You do not have permission to access this document.");
    }

    const op = trip.tripOperation;

    if (docType === "BOOKING_CONFIRMATION") {
      const booking = trip.bookings.find((b) => b.id === docId);
      if (!booking) {
        throw new Error("DOCUMENT_NOT_FOUND: Booking record not found for this trip.");
      }
      if (!op) {
        throw new Error("OPERATION_NOT_FOUND: Operations pack not initialized for this booking.");
      }
      const res = await operationsDocumentService.generateBookingConfirmation(
        agencyId,
        op.id,
        "Customer Portal"
      );
      return { buffer: res.buffer, filename: res.filename, contentType: "application/pdf" };
    }

    if (docType === "TRAVEL_KIT") {
      if (!op || op.id !== docId) {
        throw new Error("DOCUMENT_NOT_FOUND: Travel kit not available.");
      }
      const res = await operationsDocumentService.generateTravelKit(
        agencyId,
        op.id,
        "Customer Portal"
      );
      return { buffer: res.buffer, filename: res.filename, contentType: "application/pdf" };
    }

    if (docType === "HOTEL_VOUCHER") {
      if (!op) throw new Error("OPERATION_NOT_FOUND");
      // Check confirmation belongs to this trip's operation
      const conf = await prisma.hotelConfirmation.findFirst({
        where: { id: docId, tripOperationId: op.id, agencyId },
      });
      if (!conf) {
        throw new Error("ACCESS_DENIED: Hotel confirmation does not belong to your trip.");
      }
      const res = await operationsDocumentService.generateHotelVoucher(
        agencyId,
        op.id,
        docId,
        "Customer Portal"
      );
      return { buffer: res.buffer, filename: res.filename, contentType: "application/pdf" };
    }

    if (docType === "VEHICLE_VOUCHER") {
      if (!op) throw new Error("OPERATION_NOT_FOUND");
      const dispatch = await prisma.vehicleDispatch.findFirst({
        where: { id: docId, tripOperationId: op.id, agencyId },
      });
      if (!dispatch) {
        throw new Error("ACCESS_DENIED: Vehicle dispatch does not belong to your trip.");
      }
      const res = await operationsDocumentService.generateVehicleVoucher(
        agencyId,
        op.id,
        docId,
        "Customer Portal"
      );
      return { buffer: res.buffer, filename: res.filename, contentType: "application/pdf" };
    }

    if (docType === "ACTIVITY_PASS") {
      if (!op) throw new Error("OPERATION_NOT_FOUND");
      const conf = await prisma.activityConfirmation.findFirst({
        where: { id: docId, tripOperationId: op.id, agencyId },
      });
      if (!conf) {
        throw new Error("ACCESS_DENIED: Activity confirmation does not belong to your trip.");
      }
      const res = await operationsDocumentService.generateActivityVoucher(
        agencyId,
        op.id,
        docId,
        "Customer Portal"
      );
      return { buffer: res.buffer, filename: res.filename, contentType: "application/pdf" };
    }

    throw new Error(`INVALID_DOCUMENT_TYPE: Unsupported document type "${docType}".`);
  }

  /**
   * 5. Get customer payment ledger for a trip
   */
  async getCustomerTripPayments(
    customerId: string,
    agencyId: string,
    tripId: string
  ): Promise<CustomerPaymentSummaryView | null> {
    const booking = await prisma.booking.findFirst({
      where: {
        tripId,
        customerId,
        agencyId,
        archivedAt: null,
      },
      include: {
        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!booking) {
      return null;
    }

    const completedPayments = booking.payments.filter((p) => p.status === "COMPLETED");
    const refunds: Array<{ id: string; amount: string; date: string; receiptNumber?: string | null }> = [];

    completedPayments.forEach((p) => {
      if (Number(p.refundedAmount) > 0 && p.refundedAt) {
        refunds.push({
          id: `${p.id}-refund`,
          amount: Number(p.refundedAmount).toFixed(2),
          date: p.refundedAt.toISOString(),
          receiptNumber: p.receiptNumber || undefined,
        });
      }
    });

    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      currency: booking.currency || "INR",
      totalAmount: Number(booking.totalAmount).toFixed(2),
      paidAmount: Number(booking.paidAmount).toFixed(2),
      balanceAmount: Number(booking.balanceAmount).toFixed(2),
      paymentStatus: booking.paymentStatus,
      payments: completedPayments.map((p) => ({
        id: p.id,
        paymentNumber: p.paymentNumber,
        amount: Number(p.amount).toFixed(2),
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate.toISOString(),
        receiptNumber: p.receiptNumber,
        status: p.status,
      })),
      refunds,
    };
  }

  /**
   * 6. Get customer profile
   */
  async getCustomerProfile(
    customerId: string,
    agencyId: string
  ): Promise<CustomerProfileView | null> {
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        agencyId,
        archivedAt: null,
      },
    });

    if (!customer) return null;

    return {
      id: customer.id,
      customerNumber: customer.customerNumber,
      name: customer.name,
      phone: customer.phone,
      alternatePhone: customer.alternatePhone,
      email: customer.email,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      country: customer.country,
      postalCode: customer.postalCode,
    };
  }

  /**
   * 7. Update customer profile contact details safely
   */
  async updateCustomerProfile(
    customerId: string,
    agencyId: string,
    data: Partial<CustomerProfileView>
  ): Promise<CustomerProfileView> {
    const updated = await prisma.customer.update({
      where: {
        id: customerId,
        agencyId,
      },
      data: {
        name: data.name?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        alternatePhone: data.alternatePhone?.trim() || undefined,
        email: data.email?.trim() || undefined,
        address: data.address?.trim() || undefined,
        city: data.city?.trim() || undefined,
        state: data.state?.trim() || undefined,
        country: data.country?.trim() || undefined,
        postalCode: data.postalCode?.trim() || undefined,
      },
    });

    return {
      id: updated.id,
      customerNumber: updated.customerNumber,
      name: updated.name,
      phone: updated.phone,
      alternatePhone: updated.alternatePhone,
      email: updated.email,
      address: updated.address,
      city: updated.city,
      state: updated.state,
      country: updated.country,
      postalCode: updated.postalCode,
    };
  }

  /**
   * 8. Submit customer trip feedback
   */
  async submitCustomerTripFeedback(
    customerId: string,
    agencyId: string,
    tripId: string,
    input: CustomerFeedbackInput
  ) {
    // 1. Verify trip ownership
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        customerId,
        agencyId,
        archivedAt: null,
      },
      include: {
        tripOperation: true,
        bookings: { take: 1 },
      },
    });

    if (!trip) {
      throw new Error("TRIP_NOT_FOUND: Access denied or trip not found.");
    }

    const bookingId = trip.bookings[0]?.id || null;

    // 2. Create customer feedback record
    const feedback = await prisma.customerFeedback.create({
      data: {
        agencyId,
        customerId,
        tripId,
        bookingId,
        rating: Math.max(1, Math.min(5, input.rating || 5)),
        serviceRating: input.serviceRating ? Math.max(1, Math.min(5, input.serviceRating)) : 5,
        hotelRating: input.hotelRating ? Math.max(1, Math.min(5, input.hotelRating)) : 5,
        driverRating: input.driverRating ? Math.max(1, Math.min(5, input.driverRating)) : 5,
        comments: input.comments?.trim() || null,
        source: "PORTAL",
      },
    });

    // 3. Log an operational audit event if tripOperation exists
    if (trip.tripOperation) {
      await prisma.operationEvent.create({
        data: {
          agencyId,
          tripOperationId: trip.tripOperation.id,
          eventType: "CUSTOMER_FEEDBACK",
          description: `Guest submitted post-tour feedback with ${input.rating}★ rating.`,
          metadata: {
            feedbackId: feedback.id,
            rating: input.rating,
            comments: input.comments,
          },
          createdBy: "Customer Portal",
        },
      });
    }

    return feedback;
  }

  /**
   * 9. Lookup Customer Portal Session by booking number and phone
   */
  async lookupCustomerAccess(
    bookingNumberOrToken: string,
    phoneOrEmail?: string
  ): Promise<{ customerId: string; agencyId: string; customerName: string } | null> {
    const trimmed = bookingNumberOrToken.trim();

    // 1. Direct booking lookup
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [{ id: trimmed }, { bookingNumber: trimmed }],
        archivedAt: null,
      },
      include: {
        customer: true,
      },
    });

    if (booking?.customer) {
      if (phoneOrEmail) {
        const cleanInput = phoneOrEmail.trim().toLowerCase();
        const custPhone = booking.customer.phone.trim().toLowerCase();
        const custEmail = (booking.customer.email || "").trim().toLowerCase();
        if (custPhone !== cleanInput && custEmail !== cleanInput) {
          return null; // Phone or email verification failed
        }
      }

      return {
        customerId: booking.customer.id,
        agencyId: booking.customer.agencyId,
        customerName: booking.customer.name,
      };
    }

    // 2. Public share link lookup
    const shareLink = await prisma.publicShareLink.findFirst({
      where: {
        tokenHash: trimmed,
        status: "ACTIVE",
        revokedAt: null,
      },
      include: {
        trip: {
          include: { customer: true },
        },
      },
    });

    if (shareLink?.trip?.customer) {
      return {
        customerId: shareLink.trip.customer.id,
        agencyId: shareLink.trip.customer.agencyId,
        customerName: shareLink.trip.customer.name,
      };
    }

    return null;
  }
}

export const customerPortalService = new CustomerPortalService();
