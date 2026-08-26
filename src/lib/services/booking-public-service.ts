import "server-only";
import { prisma } from "@/lib/prisma";
import { BookingStatus, BookingPaymentStatus, PaymentMethod } from "@prisma/client";

export interface PublicBookingPayload {
  id: string;
  bookingNumber: string;
  packageOptionName?: string | null;
  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  bookingDate: Date;
  travelStartDate?: Date | null;
  travelEndDate?: Date | null;
  currency: string;
  totalAmount: string;
  paidAmount: string;
  balanceAmount: string;
  notes?: string | null;
  agency: {
    name: string;
    phone: string;
    email: string;
    address?: string | null;
    logoUrl?: string | null;
  };
  customer: {
    name: string;
    phone: string;
    email?: string | null;
  };
  trip: {
    id: string;
    tripNumber: string;
    title: string;
    startDate: Date;
    endDate: Date;
    status: string;
    travelers: Array<{
      id: string;
      name: string;
      type: string;
      specialRequests?: string | null;
    }>;
    itinerary: Array<{
      id: string;
      dayNumber: number;
      title: string;
      description: string;
      location?: string | null;
      visitTime?: string | null;
    }>;
    hotels: Array<{
      id: string;
      hotelName: string;
      city?: string | null;
      roomType: string;
      mealPlan?: string | null;
      checkIn: Date;
      checkOut: Date;
      nights: number;
      roomsCount: number;
    }>;
    vehicles: Array<{
      id: string;
      vehicleName: string;
      category: string;
      startDate: Date;
      endDate: Date;
      driverName?: string | null;
      driverPhone?: string | null;
    }>;
    activities: Array<{
      id: string;
      activityName: string;
      type: string;
      location?: string | null;
      date: Date;
      participantsCount: number;
    }>;
  };
  payments: Array<{
    id: string;
    paymentNumber: string;
    amount: string;
    currency: string;
    paymentMethod: PaymentMethod;
    paymentDate: Date;
    receiptNumber?: string | null;
    notes?: string | null;
  }>;
}

export const bookingPublicService = {
  /**
   * Resolves a sanitized public booking portal payload by bookingNumber, bookingId, or trip share token.
   */
  async getPublicBookingByToken(token: string): Promise<PublicBookingPayload | null> {
    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return null;
    }

    const trimmed = token.trim();

    // 1. Try finding directly by bookingNumber or bookingId
    let booking = await prisma.booking.findFirst({
      where: {
        OR: [{ id: trimmed }, { bookingNumber: trimmed }],
      },
      include: {
        agency: { select: { name: true, phone: true, email: true, address: true, logo: true } },
        customer: { select: { name: true, phone: true, email: true } },
        trip: {
          include: {
            travelers: { select: { id: true, name: true, type: true, specialRequirements: true } },
            itineraryItems: {
              orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }],
            },
            tripHotels: {
              include: { hotel: { select: { name: true, city: true } } },
              orderBy: { checkIn: "asc" },
            },
            tripVehicles: {
              include: { vehicle: { select: { name: true, type: true } } },
              orderBy: { startDate: "asc" },
            },
            tripActivities: {
              include: { activity: { select: { name: true, type: true, location: true } } },
              orderBy: { date: "asc" },
            },
          },
        },
        payments: {
          where: { status: "COMPLETED" },
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    // 2. Fallback: Lookup via trip PublicShareLink
    if (!booking) {
      const shareLink = await prisma.publicShareLink.findFirst({
        where: { tokenHash: trimmed, status: "ACTIVE", revokedAt: null },
        select: { tripId: true },
      });

      if (shareLink?.tripId) {
        booking = await prisma.booking.findFirst({
          where: { tripId: shareLink.tripId, status: { not: "CANCELLED" } },
          orderBy: { createdAt: "desc" },
          include: {
            agency: { select: { name: true, phone: true, email: true, address: true, logo: true } },
            customer: { select: { name: true, phone: true, email: true } },
            trip: {
              include: {
                travelers: { select: { id: true, name: true, type: true, specialRequirements: true } },
                itineraryItems: {
                  orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }],
                },
                tripHotels: {
                  include: { hotel: { select: { name: true, city: true } } },
                  orderBy: { checkIn: "asc" },
                },
                tripVehicles: {
                  include: { vehicle: { select: { name: true, type: true } } },
                  orderBy: { startDate: "asc" },
                },
                tripActivities: {
                  include: { activity: { select: { name: true, type: true, location: true } } },
                  orderBy: { date: "asc" },
                },
              },
            },
            payments: {
              where: { status: "COMPLETED" },
              orderBy: { paymentDate: "desc" },
            },
          },
        });
      }
    }

    if (!booking) {
      return null;
    }

    // Build sanitized payload with ZERO cost prices, supplier IDs, or internal agency consultant notes
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      packageOptionName: booking.packageOptionName,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      bookingDate: booking.bookingDate,
      travelStartDate: booking.travelStartDate || booking.trip.startDate,
      travelEndDate: booking.travelEndDate || booking.trip.endDate,
      currency: booking.currency,
      totalAmount: booking.totalAmount.toFixed(2),
      paidAmount: booking.paidAmount.toFixed(2),
      balanceAmount: booking.balanceAmount.toFixed(2),
      agency: {
        name: booking.agency.name,
        phone: booking.agency.phone,
        email: booking.agency.email,
        address: booking.agency.address,
        logoUrl: booking.agency.logo,
      },
      customer: booking.customer,
      trip: {
        id: booking.trip.id,
        tripNumber: booking.trip.tripNumber,
        title: booking.trip.title,
        startDate: booking.trip.startDate,
        endDate: booking.trip.endDate,
        status: booking.trip.status,
        travelers: (booking.trip.travelers || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          specialRequests: t.specialRequirements || null,
        })),
        itinerary: (booking.trip.itineraryItems || []).map((item: any) => ({
          id: item.id,
          dayNumber: item.dayNumber,
          title: item.title,
          description: item.description || "",
          location: item.location || null,
          visitTime: item.startTime ? `${item.startTime}${item.endTime ? ` - ${item.endTime}` : ""}` : null,
        })),
        hotels: (booking.trip.tripHotels || []).map((th: any) => ({
          id: th.id,
          hotelName: th.hotel?.name || "Hotel Accommodation",
          city: th.hotel?.city || null,
          roomType: th.roomType,
          mealPlan: th.mealPlan,
          checkIn: th.checkIn,
          checkOut: th.checkOut,
          nights: Math.max(
            1,
            Math.ceil((new Date(th.checkOut).getTime() - new Date(th.checkIn).getTime()) / (1000 * 60 * 60 * 24))
          ),
          roomsCount: th.rooms,
        })),
        vehicles: (booking.trip.tripVehicles || []).map((tv: any) => ({
          id: tv.id,
          vehicleName: tv.vehicle?.name || "Private Transport",
          category: tv.vehicle?.type || "Standard",
          startDate: tv.startDate || booking.trip.startDate,
          endDate: tv.endDate || booking.trip.endDate,
          driverName: tv.driverName || null,
          driverPhone: tv.driverPhone || null,
        })),
        activities: (booking.trip.tripActivities || []).map((ta: any) => ({
          id: ta.id,
          activityName: ta.activity?.name || ta.name || "Activity",
          type: ta.activity?.type || "Sightseeing",
          location: ta.activity?.location || null,
          date: ta.date || booking.trip.startDate,
          participantsCount: (ta.adults || 0) + (ta.children || 0) || 1,
        })),
      },
      payments: booking.payments.map((p) => ({
        id: p.id,
        paymentNumber: p.paymentNumber,
        amount: p.amount.toFixed(2),
        currency: p.currency,
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
        receiptNumber: p.receiptNumber,
      })),
    };
  },
};
