import "server-only";
import { prisma } from "@/lib/prisma";

export interface CustomerInsightsData {
  overview: {
    totalCustomers: number;
    repeatCustomersCount: number;
    repeatRate: number;
    totalBookingsCount: number;
    totalBookingRevenue: number;
    averageLTV: number;
    totalCollected: number;
    totalOutstanding: number;
  };
  feedback: {
    averageRating: number;
    totalFeedbacks: number;
    positivePercentage: number;
    attentionCount: number;
    hotelRating: number;
    driverRating: number;
    vehicleRating: number;
    activityRating: number;
    supportRating: number;
  };
  referrals: {
    totalReferrals: number;
    convertedReferrals: number;
    conversionRate: number;
    totalRewardsDistributed: number;
  };
  topDestinations: Array<{
    destination: string;
    tripsCount: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    id: string;
    name: string;
    phone: string;
    email: string | null;
    totalSpend: number;
    tripsCount: number;
    lastTripDate: string | null;
  }>;
}

export const customerInsightsService = {
  /**
   * Aggregate real-time customer analytics with strict tenant isolation
   */
  async getCustomerInsights(agencyId: string): Promise<CustomerInsightsData> {
    const [
      customers,
      trips,
      bookings,
      payments,
      feedbacks,
      referrals,
    ] = await Promise.all([
      prisma.customer.findMany({
        where: { agencyId, archivedAt: null },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          createdAt: true,
        },
      }),
      prisma.trip.findMany({
        where: { agencyId, archivedAt: null },
        select: {
          id: true,
          customerId: true,
          title: true,
          startDate: true,
          status: true,
          tripHotels: {
            select: {
              hotel: { select: { city: true } },
            },
            take: 1,
          },
        },
      }),
      prisma.booking.findMany({
        where: { agencyId, archivedAt: null, status: { not: "CANCELLED" } },
        select: {
          id: true,
          customerId: true,
          tripId: true,
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
          status: true,
          bookingDate: true,
        },
      }),
      prisma.payment.findMany({
        where: { agencyId, archivedAt: null, status: "COMPLETED" },
        select: {
          amount: true,
        },
      }),
      prisma.customerFeedback.findMany({
        where: { agencyId },
        select: {
          rating: true,
          hotelRating: true,
          driverRating: true,
          vehicleRating: true,
          activityRating: true,
          supportRating: true,
          serviceRecoveryStatus: true,
        },
      }),
      prisma.referral.findMany({
        where: { agencyId },
        select: {
          status: true,
          rewardAmount: true,
        },
      }),
    ]);

    // 1. Overview Calculations
    const totalCustomers = customers.length;
    const tripsByCustomer: Record<string, number> = {};
    const spendByCustomer: Record<string, number> = {};
    const lastTripDateByCustomer: Record<string, string> = {};

    for (const t of trips) {
      tripsByCustomer[t.customerId] = (tripsByCustomer[t.customerId] || 0) + 1;
      if (t.startDate) {
        const dStr = t.startDate.toISOString();
        if (!lastTripDateByCustomer[t.customerId] || dStr > lastTripDateByCustomer[t.customerId]) {
          lastTripDateByCustomer[t.customerId] = dStr;
        }
      }
    }

    let totalBookingRevenue = 0;
    let totalOutstanding = 0;

    for (const b of bookings) {
      const amt = Number(b.totalAmount);
      const bal = Number(b.balanceAmount);
      totalBookingRevenue += amt;
      totalOutstanding += bal;
      spendByCustomer[b.customerId] = (spendByCustomer[b.customerId] || 0) + amt;
    }

    const repeatCustomersCount = Object.values(tripsByCustomer).filter((count) => count >= 2).length;
    const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomersCount / totalCustomers) * 100) : 0;
    const averageLTV = totalCustomers > 0 ? Math.round(totalBookingRevenue / totalCustomers) : 0;
    const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    // 2. Feedback Calculations
    const totalFeedbacks = feedbacks.length;
    let sumRating = 0;
    let sumHotel = 0;
    let sumDriver = 0;
    let sumVehicle = 0;
    let sumActivity = 0;
    let sumSupport = 0;
    let positiveCount = 0;
    let attentionCount = 0;

    for (const f of feedbacks) {
      sumRating += f.rating;
      sumHotel += f.hotelRating ?? 5;
      sumDriver += f.driverRating ?? 5;
      sumVehicle += f.vehicleRating ?? 5;
      sumActivity += f.activityRating ?? 5;
      sumSupport += f.supportRating ?? 5;

      if (f.rating >= 4) positiveCount += 1;
      if (f.rating <= 3 || f.serviceRecoveryStatus === "Follow-up Required") attentionCount += 1;
    }

    const averageRating = totalFeedbacks > 0 ? Number((sumRating / totalFeedbacks).toFixed(1)) : 5.0;
    const hotelRating = totalFeedbacks > 0 ? Number((sumHotel / totalFeedbacks).toFixed(1)) : 5.0;
    const driverRating = totalFeedbacks > 0 ? Number((sumDriver / totalFeedbacks).toFixed(1)) : 5.0;
    const vehicleRating = totalFeedbacks > 0 ? Number((sumVehicle / totalFeedbacks).toFixed(1)) : 5.0;
    const activityRating = totalFeedbacks > 0 ? Number((sumActivity / totalFeedbacks).toFixed(1)) : 5.0;
    const supportRating = totalFeedbacks > 0 ? Number((sumSupport / totalFeedbacks).toFixed(1)) : 5.0;
    const positivePercentage = totalFeedbacks > 0 ? Math.round((positiveCount / totalFeedbacks) * 100) : 100;

    // 3. Referral Calculations
    const totalReferrals = referrals.length;
    let convertedReferrals = 0;
    let totalRewardsDistributed = 0;

    for (const r of referrals) {
      if (r.status === "CONVERTED" || r.status === "REWARDED") {
        convertedReferrals += 1;
      }
      if (r.status === "REWARDED" && r.rewardAmount) {
        totalRewardsDistributed += Number(r.rewardAmount);
      }
    }

    const conversionRate = totalReferrals > 0 ? Math.round((convertedReferrals / totalReferrals) * 100) : 0;

    // 4. Top Destinations
    const destMap: Record<string, { count: number; revenue: number }> = {};
    for (const t of trips) {
      const dest = t.tripHotels[0]?.hotel?.city || t.title || "Tour Destination";
      if (!destMap[dest]) {
        destMap[dest] = { count: 0, revenue: 0 };
      }
      destMap[dest].count += 1;
    }

    for (const b of bookings) {
      const matchedTrip = trips.find((t) => t.id === b.tripId);
      const dest = matchedTrip?.tripHotels[0]?.hotel?.city || matchedTrip?.title || "Tour Destination";
      if (destMap[dest]) {
        destMap[dest].revenue += Number(b.totalAmount);
      }
    }

    const topDestinations = Object.entries(destMap)
      .map(([destination, data]) => ({
        destination,
        tripsCount: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.tripsCount - a.tripsCount)
      .slice(0, 5);

    // 5. Top Spender Customers
    const topCustomers = customers
      .map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        totalSpend: spendByCustomer[c.id] || 0,
        tripsCount: tripsByCustomer[c.id] || 0,
        lastTripDate: lastTripDateByCustomer[c.id] || null,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 5);

    return {
      overview: {
        totalCustomers,
        repeatCustomersCount,
        repeatRate,
        totalBookingsCount: bookings.length,
        totalBookingRevenue,
        averageLTV,
        totalCollected,
        totalOutstanding,
      },
      feedback: {
        averageRating,
        totalFeedbacks,
        positivePercentage,
        attentionCount,
        hotelRating,
        driverRating,
        vehicleRating,
        activityRating,
        supportRating,
      },
      referrals: {
        totalReferrals,
        convertedReferrals,
        conversionRate,
        totalRewardsDistributed,
      },
      topDestinations,
      topCustomers,
    };
  },
};
