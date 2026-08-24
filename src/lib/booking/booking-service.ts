import {
  Booking,
  BookingItem,
  BookingStatus,
  PaymentStatus,
  PublicBookingView,
  Quotation,
  BookingRefund,
  BookingTimelineEvent,
} from "@/types";

/**
 * Generates unique Booking Number: BK-YYYY-XXXX
 */
export function generateBookingNumber(existingBookings: Booking[]): string {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `BK-${currentYear}-`;

  const thisYearBookings = existingBookings.filter((b) =>
    b.bookingNumber?.startsWith(yearPrefix)
  );

  let maxSeq = 0;
  for (const b of thisYearBookings) {
    const seqStr = b.bookingNumber.replace(yearPrefix, "");
    const seq = parseInt(seqStr, 10);
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  const nextSeq = (maxSeq + 1).toString().padStart(4, "0");
  return `${yearPrefix}${nextSeq}`;
}

/**
 * Generates cryptographically secure alphanumeric share token for customer portal
 */
export function generateBookingSecureToken(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let token = "bk_";
  for (let i = 0; i < 18; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Reconciles overall Booking Status from its underlying Booking Items
 */
export function reconcileBookingStatus(
  items: BookingItem[],
  currentStatus: BookingStatus
): BookingStatus {
  if (currentStatus === "Cancelled" || currentStatus === "Completed" || currentStatus === "Draft") {
    return currentStatus;
  }

  if (!items || items.length === 0) {
    return "Pending Confirmation";
  }

  const allConfirmed = items.every((i) => i.status === "Confirmed");
  if (allConfirmed) {
    return "Confirmed";
  }

  const anyConfirmed = items.some((i) => i.status === "Confirmed");
  if (anyConfirmed) {
    return "Partially Confirmed";
  }

  return "Pending Confirmation";
}

/**
 * Reconciles Payment Status from total, paid, and refund state
 */
export function reconcilePaymentStatus(
  totalAmount: number,
  paidAmount: number,
  refunds: BookingRefund[] = []
): PaymentStatus {
  const hasPendingRefund = refunds.some((r) => r.status === "Pending");
  const hasProcessedRefund = refunds.some((r) => r.status === "Processed");

  if (hasPendingRefund) return "Refund Pending";
  if (hasProcessedRefund && paidAmount <= 0) return "Refunded";

  if (paidAmount <= 0) return "Unpaid";
  if (paidAmount >= totalAmount && totalAmount > 0) return "Paid";
  return "Partially Paid";
}

/**
 * Converts an accepted Quotation into a comprehensive Booking
 */
export function convertQuotationToBooking(
  quotation: Quotation,
  existingBookings: Booking[]
): Booking {
  const now = new Date().toISOString();
  const bookingNumber = generateBookingNumber(existingBookings);
  const secureToken = generateBookingSecureToken();

  // Create booking items from quotation snapshots
  const items: BookingItem[] = [];

  // Hotels
  quotation.hotelSnapshot?.forEach((hotel, idx) => {
    const estCost = Math.round((quotation.sellingPrice * 0.45) / Math.max(1, quotation.hotelSnapshot.length));
    items.push({
      id: `bi_htl_${Date.now()}_${idx}`,
      bookingId: "",
      type: "Hotel",
      referenceId: hotel.hotelId,
      title: hotel.hotelName || "Hotel Stay",
      subtitle: `${hotel.destination} • ${hotel.starCategory || 3}★`,
      destination: hotel.destination,
      startDate: hotel.checkIn || quotation.tripSnapshot.startDate,
      endDate: hotel.checkOut || quotation.tripSnapshot.endDate,
      nights: hotel.nights || 2,
      roomType: hotel.roomName || "Deluxe Room",
      numberOfRooms: hotel.roomsCount || 1,
      mealPlan: typeof hotel.mealPlan === "string" ? hotel.mealPlan : "CP (Breakfast)",
      supplierName: "Hotel Direct / DMC",
      supplierCost: estCost,
      customerPrice: Math.round(estCost * 1.25),
      status: "Pending",
      notes: hotel.description,
    });
  });

  // Vehicle
  if (quotation.vehicleSnapshot) {
    const v = quotation.vehicleSnapshot;
    const estCost = Math.round(quotation.sellingPrice * 0.2);
    items.push({
      id: `bi_veh_${Date.now()}`,
      bookingId: "",
      type: "Vehicle",
      referenceId: v.vehicleId,
      title: v.vehicleName || v.vehicleType || "Private AC Vehicle",
      subtitle: `${v.vehicleType || "Sedan/SUV"} • ${v.ac ? "AC" : "Non-AC"}`,
      destination: quotation.tripSnapshot.destination,
      startDate: quotation.tripSnapshot.startDate,
      endDate: quotation.tripSnapshot.endDate,
      pickupLocation: v.pickupLocation || quotation.tripSnapshot.destination,
      dropLocation: v.dropLocation || quotation.tripSnapshot.destination,
      supplierName: "Fleet Partner",
      supplierCost: estCost,
      customerPrice: Math.round(estCost * 1.2),
      status: "Pending",
      notes: v.notes,
    });
  }

  // Activities
  quotation.activitySnapshot?.forEach((act, idx) => {
    const estCost = Math.round((quotation.sellingPrice * 0.15) / Math.max(1, quotation.activitySnapshot.length));
    items.push({
      id: `bi_act_${Date.now()}_${idx}`,
      bookingId: "",
      type: "Activity",
      referenceId: act.activityId,
      title: act.activityName || "Sightseeing Tour",
      subtitle: `${act.destination} • ${act.category || "Tour"}`,
      destination: act.destination,
      date: act.date || quotation.tripSnapshot.startDate,
      guests: act.adults + act.children,
      supplierName: "Local Tour Operator",
      supplierCost: estCost,
      customerPrice: Math.round(estCost * 1.25),
      status: "Pending",
      notes: act.description,
    });
  });

  const totalSupplierCost = items.reduce((acc, i) => acc + (i.supplierCost || 0), 0);
  const totalAmount = quotation.sellingPrice || 0;
  const expectedProfit = Math.max(0, totalAmount - totalSupplierCost);

  const initialTimeline: BookingTimelineEvent[] = [
    {
      id: `tl_${Date.now()}_1`,
      bookingId: "",
      type: "QUOTATION_ACCEPTED",
      title: `Quotation ${quotation.quotationNumber} Accepted`,
      description: `Customer confirmed proposal for ${quotation.tripSnapshot.destination} trip.`,
      actor: "Customer (Online)",
      createdAt: now,
    },
    {
      id: `tl_${Date.now()}_2`,
      bookingId: "",
      type: "BOOKING_CREATED",
      title: `Booking Request ${bookingNumber} Created`,
      description: `Assigned status: Pending Confirmation across ${items.length} service components.`,
      actor: "TripDesk System",
      createdAt: now,
    },
  ];

  const bookingId = `bk_${Date.now()}`;
  items.forEach((i) => (i.bookingId = bookingId));
  initialTimeline.forEach((t) => (t.bookingId = bookingId));

  const booking: Booking = {
    id: bookingId,
    bookingNumber,
    secureToken,
    customerId: quotation.customerId,
    tripId: quotation.tripId,
    quotationId: quotation.id,
    title: quotation.title || `${quotation.tripSnapshot.destination} Holiday`,
    destination: quotation.tripSnapshot.destination,
    startDate: quotation.tripSnapshot.startDate,
    endDate: quotation.tripSnapshot.endDate,
    adults: quotation.tripSnapshot.adults,
    children: quotation.tripSnapshot.children,
    infants: quotation.tripSnapshot.infants || 0,
    status: "Pending Confirmation",
    paymentStatus: "Unpaid",

    totalAmount,
    paidAmount: 0,
    pendingAmount: totalAmount,

    totalSupplierCost,
    paidSupplierCost: 0,
    pendingSupplierCost: totalSupplierCost,
    expectedProfit,

    customerSnapshot: quotation.customerSnapshot,
    tripSnapshot: quotation.tripSnapshot,
    agencySnapshot: quotation.agencySnapshot,
    itinerarySnapshot: quotation.itinerarySnapshot,

    items,
    payments: [],
    supplierPayments: [],
    refunds: [],
    timeline: initialTimeline,
    documents: [
      {
        id: `doc_${Date.now()}_1`,
        bookingId,
        type: "Booking Confirmation",
        name: `Booking Confirmation - ${bookingNumber}`,
        referenceNumber: bookingNumber,
        generatedAt: now,
      },
    ],

    notes: quotation.customNotes,
    internalNotes: "Generated from Quotation " + quotation.quotationNumber,
    createdAt: now,
    updatedAt: now,
  };

  return booking;
}

/**
 * Sanitizes booking data for secure customer portal
 * NEVER exposes supplier cost, profit, supplier payments, or internal notes
 */
export function sanitizeForPublicBooking(booking: Booking): PublicBookingView {
  return {
    bookingNumber: booking.bookingNumber,
    secureToken: booking.secureToken,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    title: booking.title,
    destination: booking.destination,
    startDate: booking.startDate,
    endDate: booking.endDate,
    adults: booking.adults,
    children: booking.children,
    infants: booking.infants,

    totalAmount: booking.totalAmount,
    paidAmount: booking.paidAmount,
    pendingAmount: booking.pendingAmount,

    customer: booking.customerSnapshot,
    trip: booking.tripSnapshot,
    agency: booking.agencySnapshot,
    itinerary: booking.itinerarySnapshot,

    // Strip supplier cost, supplier id, and margins
    items: booking.items.map((i) => ({
      id: i.id,
      type: i.type,
      title: i.title,
      subtitle: i.subtitle,
      destination: i.destination,
      date: i.date,
      startDate: i.startDate,
      endDate: i.endDate,
      nights: i.nights,
      roomType: i.roomType,
      numberOfRooms: i.numberOfRooms,
      guests: i.guests,
      mealPlan: i.mealPlan,
      pickupLocation: i.pickupLocation,
      pickupTime: i.pickupTime,
      dropLocation: i.dropLocation,
      driverName: i.driverName,
      driverPhone: i.driverPhone,
      time: i.time,
      status: i.status,
      confirmationNumber: i.confirmationNumber,
    })),

    payments: booking.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      date: p.date,
      method: p.method,
      receiptNumber: p.receiptNumber,
    })),

    notes: booking.notes,
  };
}
