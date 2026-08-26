import "server-only";
import { prisma } from "@/lib/prisma";
import {
  EnquiryStatus,
  TripStatus,
  QuotationStatus,
  BookingStatus,
  PaymentStatus,
  FollowUpStatus,
  SupplierStatus,
  RateStatus,
  Prisma,
} from "@prisma/client";

export interface DashboardSummary {
  enquiries: {
    total: number;
    new: number;
    active: number;
    converted: number;
    pipelineValue: string;
  };
  customers: {
    total: number;
  };
  trips: {
    total: number;
    active: number;
    upcoming: number;
    completed: number;
  };
  quotations: {
    total: number;
    pending: number;
    accepted: number;
  };
  bookings: {
    total: number;
    confirmed: number;
    ongoing: number;
    completed: number;
    cancelled: number;
  };
  payments: {
    collected: string;
    outstanding: string;
    currency: string;
  };
  bookingValue: string;
  inventory: {
    activeHotels: number;
    activeVehicles: number;
    activeActivities: number;
    activeSuppliers: number;
    activeRateSheets: number;
  };
}

export interface PipelineStageMetric {
  status: EnquiryStatus;
  label: string;
  count: number;
  value: string;
}

export interface MonthlyRevenueMetric {
  month: string;
  collected: number;
  bookingValue: number;
  bookingsCount: number;
}

export interface RecentEnquiryItem {
  id: string;
  enquiryNumber: string;
  title: string;
  destination: string;
  startDate?: Date | null;
  endDate?: Date | null;
  budget?: Prisma.Decimal | null;
  currency: string;
  status: EnquiryStatus;
  source: string;
  createdAt: Date;
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  };
}

export interface UpcomingTripItem {
  id: string;
  tripNumber: string;
  title: string;
  destination?: string;
  startDate: Date;
  endDate: Date;
  status: TripStatus;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  travelerCount: number;
}

export interface PendingFollowUpItem {
  id: string;
  enquiryId: string;
  type: string;
  status: FollowUpStatus;
  scheduledAt: Date;
  notes?: string | null;
  enquiry: {
    id: string;
    enquiryNumber: string;
    title: string;
    destination: string;
    customer: {
      id: string;
      name: string;
      phone: string;
    };
  };
}

export const dashboardService = {
  /**
   * Generates comprehensive, tenant-isolated executive summary statistics
   * using fast PostgreSQL server-side aggregations (count, sum, groupBy).
   */
  async getDashboardSummary(agencyId: string): Promise<DashboardSummary> {
    const now = new Date();

    // 1. Enquiries Counts & Pipeline Aggregations
    const [
      totalEnquiries,
      newEnquiries,
      convertedEnquiries,
      activeEnquiriesCount,
      enquiryBudgetAggregate,
    ] = await Promise.all([
      prisma.enquiry.count({ where: { agencyId, archivedAt: null } }),
      prisma.enquiry.count({ where: { agencyId, archivedAt: null, status: EnquiryStatus.NEW } }),
      prisma.enquiry.count({ where: { agencyId, archivedAt: null, status: EnquiryStatus.CONVERTED } }),
      prisma.enquiry.count({
        where: {
          agencyId,
          archivedAt: null,
          status: {
            in: [
              EnquiryStatus.NEW,
              EnquiryStatus.CONTACTED,
              EnquiryStatus.QUALIFIED,
              EnquiryStatus.FOLLOW_UP,
              EnquiryStatus.QUOTATION_SENT,
              EnquiryStatus.NEGOTIATION,
            ],
          },
        },
      }),
      prisma.enquiry.aggregate({
        where: {
          agencyId,
          archivedAt: null,
          status: {
            in: [
              EnquiryStatus.NEW,
              EnquiryStatus.CONTACTED,
              EnquiryStatus.QUALIFIED,
              EnquiryStatus.FOLLOW_UP,
              EnquiryStatus.QUOTATION_SENT,
              EnquiryStatus.NEGOTIATION,
              EnquiryStatus.CONVERTED,
            ],
          },
        },
        _sum: { budget: true },
      }),
    ]);

    // 2. Customer Directory Count
    const totalCustomers = await prisma.customer.count({
      where: { agencyId, archivedAt: null },
    });

    // 3. Trips Counts
    const [totalTrips, activeTrips, upcomingTrips, completedTrips] = await Promise.all([
      prisma.trip.count({ where: { agencyId, archivedAt: null } }),
      prisma.trip.count({
        where: {
          agencyId,
          archivedAt: null,
          status: { in: [TripStatus.PLANNING, TripStatus.QUOTED, TripStatus.BOOKED, TripStatus.ONGOING] },
        },
      }),
      prisma.trip.count({
        where: {
          agencyId,
          archivedAt: null,
          startDate: { gte: now },
          status: { not: TripStatus.CANCELLED },
        },
      }),
      prisma.trip.count({
        where: { agencyId, archivedAt: null, status: TripStatus.COMPLETED },
      }),
    ]);

    // 4. Quotations Counts
    const [totalQuotations, pendingQuotations, acceptedQuotations] = await Promise.all([
      prisma.quotation.count({ where: { agencyId, archivedAt: null } }),
      prisma.quotation.count({
        where: {
          agencyId,
          archivedAt: null,
          status: { in: [QuotationStatus.DRAFT, QuotationStatus.SENT, QuotationStatus.VIEWED] },
        },
      }),
      prisma.quotation.count({
        where: { agencyId, archivedAt: null, status: QuotationStatus.ACCEPTED },
      }),
    ]);

    // 5. Bookings Counts & Financial Totals
    const [
      totalBookings,
      confirmedBookings,
      ongoingBookings,
      completedBookings,
      cancelledBookings,
      bookingFinancials,
    ] = await Promise.all([
      prisma.booking.count({ where: { agencyId, archivedAt: null } }),
      prisma.booking.count({ where: { agencyId, archivedAt: null, status: BookingStatus.CONFIRMED } }),
      prisma.booking.count({ where: { agencyId, archivedAt: null, status: BookingStatus.ONGOING } }),
      prisma.booking.count({ where: { agencyId, archivedAt: null, status: BookingStatus.COMPLETED } }),
      prisma.booking.count({ where: { agencyId, archivedAt: null, status: BookingStatus.CANCELLED } }),
      prisma.booking.aggregate({
        where: {
          agencyId,
          archivedAt: null,
          status: { not: BookingStatus.CANCELLED },
        },
        _sum: {
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
        },
      }),
    ]);

    // 6. Payments Collected Aggregation
    const paymentsCollected = await prisma.payment.aggregate({
      where: {
        agencyId,
        archivedAt: null,
        status: PaymentStatus.COMPLETED,
      },
      _sum: {
        amount: true,
      },
    });

    // 7. Inventory & Supplier Network Counts
    const [activeHotels, activeVehicles, activeActivities, activeSuppliers, activeRateSheets] =
      await Promise.all([
        prisma.hotel.count({ where: { agencyId, archivedAt: null } }),
        prisma.vehicle.count({ where: { agencyId, archivedAt: null } }),
        prisma.activity.count({ where: { agencyId, archivedAt: null } }),
        prisma.supplier.count({ where: { agencyId, archivedAt: null, status: SupplierStatus.ACTIVE } }),
        prisma.rateSheet.count({ where: { agencyId, archivedAt: null, status: RateStatus.ACTIVE } }),
      ]);

    const collectedDec = paymentsCollected._sum.amount || new Prisma.Decimal(0);
    const balanceDec = bookingFinancials._sum.balanceAmount || new Prisma.Decimal(0);
    const bookingValDec = bookingFinancials._sum.totalAmount || new Prisma.Decimal(0);
    const pipelineValDec = enquiryBudgetAggregate._sum.budget || new Prisma.Decimal(0);

    return {
      enquiries: {
        total: totalEnquiries,
        new: newEnquiries,
        active: activeEnquiriesCount,
        converted: convertedEnquiries,
        pipelineValue: pipelineValDec.toFixed(2),
      },
      customers: {
        total: totalCustomers,
      },
      trips: {
        total: totalTrips,
        active: activeTrips,
        upcoming: upcomingTrips,
        completed: completedTrips,
      },
      quotations: {
        total: totalQuotations,
        pending: pendingQuotations,
        accepted: acceptedQuotations,
      },
      bookings: {
        total: totalBookings,
        confirmed: confirmedBookings,
        ongoing: ongoingBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },
      payments: {
        collected: collectedDec.toFixed(2),
        outstanding: balanceDec.toFixed(2),
        currency: "INR",
      },
      bookingValue: bookingValDec.toFixed(2),
      inventory: {
        activeHotels,
        activeVehicles,
        activeActivities,
        activeSuppliers,
        activeRateSheets,
      },
    };
  },

  /**
   * Retrieves pipeline stage breakdown metrics.
   */
  async getPipelineStages(agencyId: string): Promise<PipelineStageMetric[]> {
    const stages: Array<{ status: EnquiryStatus; label: string }> = [
      { status: EnquiryStatus.NEW, label: "New Lead" },
      { status: EnquiryStatus.CONTACTED, label: "Contacted" },
      { status: EnquiryStatus.QUALIFIED, label: "Qualified" },
      { status: EnquiryStatus.FOLLOW_UP, label: "Follow-up" },
      { status: EnquiryStatus.QUOTATION_SENT, label: "Quoted" },
      { status: EnquiryStatus.NEGOTIATION, label: "Negotiation" },
      { status: EnquiryStatus.CONVERTED, label: "Converted / Won" },
    ];

    const results = await Promise.all(
      stages.map(async ({ status, label }) => {
        const [count, agg] = await Promise.all([
          prisma.enquiry.count({ where: { agencyId, archivedAt: null, status } }),
          prisma.enquiry.aggregate({
            where: { agencyId, archivedAt: null, status },
            _sum: { budget: true },
          }),
        ]);
        const val = agg._sum.budget || new Prisma.Decimal(0);
        return {
          status,
          label,
          count,
          value: val.toFixed(2),
        };
      })
    );

    return results;
  },

  /**
   * Computes monthly revenue & booking trend for the last 6 months.
   */
  async getMonthlyRevenueTrend(agencyId: string): Promise<MonthlyRevenueMetric[]> {
    const months: MonthlyRevenueMetric[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const year = now.getFullYear();
      const monthIndex = now.getMonth() - i;
      const dStart = new Date(year, monthIndex, 1);
      const dEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
      const monthLabel = dStart.toLocaleDateString("en-US", { month: "short", year: "numeric" });

      const [paymentsAgg, bookingsAgg, bookingsCount] = await Promise.all([
        prisma.payment.aggregate({
          where: {
            agencyId,
            archivedAt: null,
            status: PaymentStatus.COMPLETED,
            paymentDate: { gte: dStart, lte: dEnd },
          },
          _sum: { amount: true },
        }),
        prisma.booking.aggregate({
          where: {
            agencyId,
            archivedAt: null,
            status: { not: BookingStatus.CANCELLED },
            bookingDate: { gte: dStart, lte: dEnd },
          },
          _sum: { totalAmount: true },
        }),
        prisma.booking.count({
          where: {
            agencyId,
            archivedAt: null,
            status: { not: BookingStatus.CANCELLED },
            bookingDate: { gte: dStart, lte: dEnd },
          },
        }),
      ]);

      months.push({
        month: monthLabel,
        collected: Number(paymentsAgg._sum.amount || 0),
        bookingValue: Number(bookingsAgg._sum.totalAmount || 0),
        bookingsCount,
      });
    }

    return months;
  },

  /**
   * Retrieves latest live enquiries for dashboard display.
   */
  async getRecentEnquiries(agencyId: string, limit = 5): Promise<RecentEnquiryItem[]> {
    const list = await prisma.enquiry.findMany({
      where: { agencyId, archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    return list.map((e) => ({
      id: e.id,
      enquiryNumber: e.enquiryNumber,
      title: e.title,
      destination: e.destination,
      startDate: e.startDate,
      endDate: e.endDate,
      budget: e.budget,
      currency: e.currency,
      status: e.status,
      source: e.source,
      createdAt: e.createdAt,
      customer: e.customer,
    }));
  },

  /**
   * Retrieves upcoming scheduled trips for dashboard display.
   */
  async getUpcomingTrips(agencyId: string, limit = 5): Promise<UpcomingTripItem[]> {
    const list = await prisma.trip.findMany({
      where: {
        agencyId,
        archivedAt: null,
        status: { not: TripStatus.CANCELLED },
      },
      orderBy: { startDate: "asc" },
      take: limit,
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
        travelers: {
          select: { id: true },
        },
      },
    });

    return list.map((t) => ({
      id: t.id,
      tripNumber: t.tripNumber,
      title: t.title,
      startDate: t.startDate,
      endDate: t.endDate,
      status: t.status,
      customer: t.customer,
      travelerCount: t.travelers.length || 1,
    }));
  },

  /**
   * Retrieves pending follow-ups due for the agency.
   */
  async getPendingFollowUps(agencyId: string, limit = 5): Promise<PendingFollowUpItem[]> {
    const list = await prisma.enquiryFollowUp.findMany({
      where: {
        agencyId,
        archivedAt: null,
        status: FollowUpStatus.PENDING,
      },
      orderBy: { scheduledAt: "asc" },
      take: limit,
      include: {
        enquiry: {
          select: {
            id: true,
            enquiryNumber: true,
            title: true,
            destination: true,
            customer: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
      },
    });

    return list;
  },
};
