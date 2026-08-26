import "server-only";
import { prisma } from "@/lib/prisma";
import { TripStatus } from "@prisma/client";

export interface PublicTripPayload {
  id: string;
  tripNumber: string;
  title: string;
  startDate: Date;
  endDate: Date;
  status: TripStatus;
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
    notes?: string | null;
  }>;
  hotels: Array<{
    id: string;
    hotelName: string;
    city?: string | null;
    category?: string | null;
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
    duration?: string | null;
    date: Date;
    participantsCount: number;
    notes?: string | null;
  }>;
  bookingSummary?: {
    id: string;
    bookingNumber: string;
    status: string;
    paymentStatus: string;
    packageOptionName?: string | null;
    currency: string;
    totalAmount: string;
    paidAmount: string;
    balanceAmount: string;
  } | null;
}

export const tripPublicService = {
  /**
   * Resolves a public trip view by tokenHash or tripId or tripNumber with strict commercial sanitization.
   */
  async getPublicTripByToken(token: string): Promise<PublicTripPayload | null> {
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
            agency: { select: { name: true, phone: true, email: true, address: true, logo: true } },
            customer: { select: { name: true, phone: true, email: true } },
            travelers: { select: { id: true, name: true, type: true, specialRequirements: true } },
            itineraryItems: {
              orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }],
            },
            tripHotels: {
              include: { hotel: { select: { name: true, city: true, category: true } } },
              orderBy: { checkIn: "asc" },
            },
            tripVehicles: {
              include: { vehicle: { select: { name: true, type: true } } },
              orderBy: { startDate: "asc" },
            },
            tripActivities: {
              include: { activity: { select: { name: true, type: true, location: true, duration: true } } },
              orderBy: { date: "asc" },
            },
            bookings: {
              where: { status: { not: "CANCELLED" } },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    let trip: any = shareLink?.trip;

    // 2. Fallback: Lookup directly by tripId or tripNumber
    if (!trip) {
      trip = await prisma.trip.findFirst({
        where: {
          OR: [{ id: trimmed }, { tripNumber: trimmed }],
        },
        include: {
          agency: { select: { name: true, phone: true, email: true, address: true, logo: true } },
          customer: { select: { name: true, phone: true, email: true } },
          travelers: { select: { id: true, name: true, type: true, specialRequirements: true } },
          itineraryItems: {
            orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }],
          },
          tripHotels: {
            include: { hotel: { select: { name: true, city: true, category: true } } },
            orderBy: { checkIn: "asc" },
          },
          tripVehicles: {
            include: { vehicle: { select: { name: true, type: true } } },
            orderBy: { startDate: "asc" },
          },
          tripActivities: {
            include: { activity: { select: { name: true, type: true, location: true, duration: true } } },
            orderBy: { date: "asc" },
          },
          bookings: {
            where: { status: { not: "CANCELLED" } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
    }

    if (!trip) {
      return null;
    }

    // Update lastAccessedAt on shareLink if present
    if (shareLink) {
      await prisma.publicShareLink
        .update({
          where: { id: shareLink.id },
          data: { lastAccessedAt: new Date() },
        })
        .catch(() => {});
    }

    const latestBooking = trip.bookings?.[0];

    // Build strictly sanitized payload with ZERO cost prices, markups, or internal supplier notes
    return {
      id: trip.id,
      tripNumber: trip.tripNumber,
      title: trip.title,
      startDate: trip.startDate,
      endDate: trip.endDate,
      status: trip.status,
      agency: {
        name: trip.agency.name,
        phone: trip.agency.phone,
        email: trip.agency.email,
        address: trip.agency.address,
        logoUrl: trip.agency.logo,
      },
      customer: trip.customer,
      travelers: (trip.travelers || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        specialRequests: t.specialRequirements || null,
      })),
      itinerary: (trip.itineraryItems || []).map((item: any) => ({
        id: item.id,
        dayNumber: item.dayNumber,
        title: item.title,
        description: item.description || "",
        location: item.location || null,
        visitTime: item.startTime ? `${item.startTime}${item.endTime ? ` - ${item.endTime}` : ""}` : null,
      })),
      hotels: (trip.tripHotels || []).map((th: any) => ({
        id: th.id,
        hotelName: th.hotel?.name || "Hotel Accommodation",
        city: th.hotel?.city || null,
        category: th.hotel?.category || null,
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
      vehicles: (trip.tripVehicles || []).map((tv: any) => ({
        id: tv.id,
        vehicleName: tv.vehicle?.name || "Private Transport",
        category: tv.vehicle?.type || "Standard",
        startDate: tv.startDate || trip.startDate,
        endDate: tv.endDate || trip.endDate,
        driverName: tv.driverName || null,
        driverPhone: tv.driverPhone || null,
      })),
      activities: (trip.tripActivities || []).map((ta: any) => ({
        id: ta.id,
        activityName: ta.activity?.name || ta.name || "Activity",
        type: ta.activity?.type || "Sightseeing",
        location: ta.activity?.location || null,
        duration: ta.activity?.duration || null,
        date: ta.date || trip.startDate,
        participantsCount: (ta.adults || 0) + (ta.children || 0) || 1,
      })),
      bookingSummary: latestBooking
        ? {
            id: latestBooking.id,
            bookingNumber: latestBooking.bookingNumber,
            status: latestBooking.status,
            paymentStatus: latestBooking.paymentStatus,
            packageOptionName: latestBooking.packageOptionName,
            currency: latestBooking.currency,
            totalAmount: latestBooking.totalAmount.toFixed(2),
            paidAmount: latestBooking.paidAmount.toFixed(2),
            balanceAmount: latestBooking.balanceAmount.toFixed(2),
          }
        : null,
    };
  },
};
