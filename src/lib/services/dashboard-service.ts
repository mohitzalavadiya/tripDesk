import "server-only";
import { prisma } from "@/lib/prisma";
import {
  EnquiryStatus,
  TripStatus,
  QuotationStatus,
  BookingStatus,
  BookingPaymentStatus,
  PaymentStatus,
  FollowUpStatus,
  SupplierStatus,
  SupplierPayableStatus,
  NotificationDeliveryStatus,
  NotificationChannel,
  TravelDocumentType,
  TravelDocumentStatus,
  IssueStatus,
  IssuePriority,
  Prisma,
} from "@prisma/client";
import {
  DashboardPreset,
  DashboardFilterInput,
  calculateDashboardDateRange,
} from "@/lib/validation/dashboard-schema";

// ═════════════════════════════════════════════════════════════════════
// 1. DATA CONTRACTS & INTERFACES (STRICT TYPES)
// ═════════════════════════════════════════════════════════════════════

export interface DashboardSalesKPIs {
  newEnquiries: number;
  activeLeads: number;
  quotationsSent: number;
  quotationAcceptanceRate: number;
  confirmedBookings: number;
  bookingConversionRate: number;
  pipelineValue: number;
}

export interface DashboardFinancialKPIs {
  totalBookingValue: number;
  amountCollected: number;
  outstandingReceivables: number;
  supplierPayable: number;
  supplierPaid: number;
  supplierOutstanding: number;
  grossProfit: number;
  grossMarginPercent: number;
  currency: string;
}

export interface DashboardOperationsKPIs {
  upcomingTripsCount: number;
  ongoingTripsCount: number;
  operationallyReadyTripsCount: number;
  operationalBlockersCount: number;
  pendingHotelConfirmationsCount: number;
  pendingVehicleDispatchesCount: number;
  pendingActivityConfirmationsCount: number;
}

export interface DashboardCRMKPIs {
  followUpsDueTodayCount: number;
  overdueFollowUpsCount: number;
  leadsWithoutNextActionCount: number;
}

export interface DashboardCommunicationKPIs {
  totalMessages: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRatePercent: number;
  emailCount: number;
  whatsappCount: number;
}

export interface DashboardDocumentReadinessKPIs {
  totalIssued: number;
  totalGenerated: number;
  totalRevoked: number;
  missingBookingConfirmationsCount: number;
  missingHotelVouchersCount: number;
  missingVehicleVouchersCount: number;
  missingActivityVouchersCount: number;
  missingItinerariesCount: number;
}

export interface DashboardExecutiveSummary {
  dateRange: {
    start: string;
    end: string;
    preset: DashboardPreset;
  };
  sales: DashboardSalesKPIs;
  financial: DashboardFinancialKPIs;
  operations: DashboardOperationsKPIs;
  crm: DashboardCRMKPIs;
  communication: DashboardCommunicationKPIs;
  documents: DashboardDocumentReadinessKPIs;
}

export interface FunnelStageItem {
  stage: string;
  label: string;
  count: number;
  value: number;
  conversionFromPreviousPercent: number;
  cumulativeConversionPercent: number;
  dropOffPercent: number;
}

export interface SalesFunnelAnalytics {
  stages: FunnelStageItem[];
  overallConversionRate: number;
  totalPipelineValue: number;
  wonBookingsValue: number;
}

export interface RevenueTimeSeriesPoint {
  label: string;
  dateStart: string;
  dateEnd: string;
  bookingValue: number;
  collectedAmount: number;
  supplierCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  bookingsCount: number;
}

export interface RevenueAndProfitAnalytics {
  timeSeries: RevenueTimeSeriesPoint[];
  summary: {
    totalRevenue: number;
    totalCollected: number;
    totalSupplierCost: number;
    totalGrossProfit: number;
    overallMarginPercent: number;
  };
}

export interface OverdueReceivableItem {
  bookingId: string;
  bookingNumber: string;
  tripId: string;
  tripNumber: string;
  tripTitle: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  travelStartDate?: string | null;
  paymentStatus: BookingPaymentStatus;
  isOverdue: boolean;
}

export interface AccountsReceivableAnalytics {
  totalOutstanding: number;
  overdueAmount: number;
  dueTodayAmount: number;
  dueNext7DaysAmount: number;
  overdueBookingsCount: number;
  partiallyPaidBookingsCount: number;
  topOverdueReceivables: OverdueReceivableItem[];
}

export interface TopSupplierPayableItem {
  supplierId: string;
  supplierName: string;
  supplierType: string;
  plannedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  overdueCount: number;
}

export interface SupplierPayableAnalytics {
  totalPayable: number;
  paidAmount: number;
  outstandingAmount: number;
  overdueAmount: number;
  topSuppliers: TopSupplierPayableItem[];
}

export interface UpcomingDepartureItem {
  tripId: string;
  tripNumber: string;
  tripTitle: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  };
  booking?: {
    id: string;
    bookingNumber: string;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    paymentStatus: BookingPaymentStatus;
  } | null;
  readiness: {
    score: number;
    isReady: boolean;
    hotelConfirmed: boolean;
    vehicleAssigned: boolean;
    activityConfirmed: boolean;
    paymentReceived: boolean;
  };
  documents: {
    hasBookingConfirmation: boolean;
    hasHotelVoucher: boolean;
    hasVehicleVoucher: boolean;
    hasActivityVoucher: boolean;
    hasItinerary: boolean;
  };
}

export interface CRMUpcomingFollowUpItem {
  id: string;
  enquiryId: string;
  enquiryNumber: string;
  enquiryTitle: string;
  destination: string;
  customerName: string;
  customerPhone: string;
  type: string;
  status: FollowUpStatus;
  scheduledAt: string;
  notes?: string | null;
  isOverdue: boolean;
  enquiry?: {
    destination: string;
    customer: {
      name: string;
      phone: string;
    };
  };
}

export interface CRMAndFollowUpAnalytics {
  dueTodayCount: number;
  overdueCount: number;
  upcomingCount: number;
  uncontactedLeadsCount: number;
  dueTodayFollowUps: CRMUpcomingFollowUpItem[];
  overdueFollowUps: CRMUpcomingFollowUpItem[];
}

export interface TopDestinationItem {
  destination: string;
  bookingsCount: number;
  revenue: number;
  percentageOfRevenue: number;
}

export interface TopCustomerItem {
  customerId: string;
  name: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  bookingsCount: number;
  totalSpend: number;
  lastBookingDate?: string | null;
}

export type PendingFollowUpItem = CRMUpcomingFollowUpItem;

export interface PipelineStageMetric {
  stage: string;
  label: string;
  count: number;
  value: number;
  percentage: number;
  status?: string;
}

export interface RecentEnquiryItem {
  id: string;
  enquiryNumber: string;
  title: string;
  destination: string;
  source: string;
  status: EnquiryStatus;
  budget?: number | null;
  priority: string;
  createdAt: string;
  startDate?: string | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  };
}

// ═════════════════════════════════════════════════════════════════════
// 2. HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════

function safeDivision(numerator: number, denominator: number): number {
  if (!denominator || denominator === 0 || isNaN(denominator)) return 0;
  const result = (numerator / denominator) * 100;
  return isNaN(result) || !isFinite(result) ? 0 : Math.round(result * 10) / 10;
}

// ═════════════════════════════════════════════════════════════════════
// 3. CORE DOMAIN SERVICE
// ═════════════════════════════════════════════════════════════════════

export const dashboardService = {
  /**
   * 1. Generates the Executive Summary KPIs scoped strictly by agencyId and date range.
   */
  async getDashboardSummary(
    agencyId: string,
    filter: DashboardFilterInput = { preset: "THIS_MONTH" }
  ): Promise<DashboardExecutiveSummary> {
    const { start, end, preset } = calculateDashboardDateRange(
      filter.preset,
      filter.startDate,
      filter.endDate
    );

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // ─── PARALLEL SERVER-SIDE AGGREGATIONS ───
    const [
      // Sales & Enquiries
      newEnquiries,
      activeLeads,
      enquiriesInRange,
      enquiriesBudgetInRange,
      quotationsSent,
      quotationsAccepted,
      confirmedBookingsInRange,

      // Financials (Bookings in range)
      bookingsFinancials,
      paymentsCollectedInRange,
      supplierPayablesInRange,

      // Operations (Real-time snapshots)
      upcomingTripsCount,
      ongoingTripsCount,
      operationsList,

      // CRM (Real-time snapshots)
      followUpsDueTodayCount,
      overdueFollowUpsCount,
      leadsWithoutNextActionCount,

      // Communications (in range)
      commTotal,
      commDelivered,
      commFailed,
      commPending,
      commEmail,
      commWhatsapp,

      // Documents (Snapshots & in-range)
      docsIssued,
      docsGenerated,
      docsRevoked,
    ] = await Promise.all([
      // 1. New Enquiries in range
      prisma.enquiry.count({
        where: { agencyId, archivedAt: null, createdAt: { gte: start, lte: end }, status: EnquiryStatus.NEW },
      }),
      // 2. Active Leads in range
      prisma.enquiry.count({
        where: {
          agencyId,
          archivedAt: null,
          createdAt: { gte: start, lte: end },
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
      // 3. Total Enquiries in range
      prisma.enquiry.count({
        where: { agencyId, archivedAt: null, createdAt: { gte: start, lte: end } },
      }),
      // 4. Pipeline budget in range
      prisma.enquiry.aggregate({
        where: {
          agencyId,
          archivedAt: null,
          createdAt: { gte: start, lte: end },
          status: { notIn: [EnquiryStatus.LOST, EnquiryStatus.CANCELLED] },
        },
        _sum: { budget: true },
      }),
      // 5. Quotations Sent in range
      prisma.quotation.count({
        where: {
          agencyId,
          archivedAt: null,
          sharedAt: { gte: start, lte: end },
        },
      }),
      // 6. Quotations Accepted in range
      prisma.quotation.count({
        where: {
          agencyId,
          archivedAt: null,
          acceptedAt: { gte: start, lte: end },
          status: QuotationStatus.ACCEPTED,
        },
      }),
      // 7. Confirmed Bookings in range
      prisma.booking.count({
        where: {
          agencyId,
          archivedAt: null,
          bookingDate: { gte: start, lte: end },
          status: { not: BookingStatus.CANCELLED },
        },
      }),

      // 8. Bookings financial aggregates in range
      prisma.booking.aggregate({
        where: {
          agencyId,
          archivedAt: null,
          bookingDate: { gte: start, lte: end },
          status: { not: BookingStatus.CANCELLED },
        },
        _sum: {
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
        },
      }),
      // 9. Payments collected in range
      prisma.payment.aggregate({
        where: {
          agencyId,
          archivedAt: null,
          paymentDate: { gte: start, lte: end },
          status: PaymentStatus.COMPLETED,
        },
        _sum: { amount: true },
      }),
      // 10. Supplier Payables in range
      prisma.supplierPayable.aggregate({
        where: {
          agencyId,
          archivedAt: null,
          createdAt: { gte: start, lte: end },
          status: { not: SupplierPayableStatus.CANCELLED },
        },
        _sum: {
          plannedAmount: true,
          actualAmount: true,
          paidAmount: true,
          outstandingAmount: true,
        },
      }),

      // 11. Upcoming trips count (starting in future)
      prisma.trip.count({
        where: {
          agencyId,
          archivedAt: null,
          startDate: { gte: now },
          status: { not: TripStatus.CANCELLED },
        },
      }),
      // 12. Ongoing trips count (active right now)
      prisma.trip.count({
        where: {
          agencyId,
          archivedAt: null,
          startDate: { lte: now },
          endDate: { gte: now },
          status: { in: [TripStatus.BOOKED, TripStatus.ONGOING] },
        },
      }),
      // 13. Operations details for readiness & pending confirmations
      prisma.tripOperation.findMany({
        where: {
          agencyId,
          trip: {
            startDate: { gte: now },
            status: { not: TripStatus.CANCELLED },
          },
        },
        select: {
          id: true,
          status: true,
          hotelConfirmations: { select: { status: true } },
          vehicleDispatches: { select: { status: true } },
          activityConfirmations: { select: { status: true } },
          issues: { where: { status: { in: [IssueStatus.OPEN, IssueStatus.IN_PROGRESS] } }, select: { priority: true } },
        },
      }),

      // 14. Follow-ups Due Today
      prisma.enquiryFollowUp.count({
        where: {
          agencyId,
          archivedAt: null,
          status: FollowUpStatus.PENDING,
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      // 15. Overdue Follow-ups
      prisma.enquiryFollowUp.count({
        where: {
          agencyId,
          archivedAt: null,
          status: FollowUpStatus.PENDING,
          scheduledAt: { lt: todayStart },
        },
      }),
      // 16. Leads Without Next Action
      prisma.enquiry.count({
        where: {
          agencyId,
          archivedAt: null,
          status: { in: [EnquiryStatus.NEW, EnquiryStatus.CONTACTED, EnquiryStatus.QUALIFIED] },
          followUps: { none: { status: FollowUpStatus.PENDING } },
        },
      }),

      // 17-22 Communications
      prisma.customerNotification.count({
        where: { agencyId, createdAt: { gte: start, lte: end } },
      }),
      prisma.customerNotification.count({
        where: { agencyId, createdAt: { gte: start, lte: end }, status: NotificationDeliveryStatus.DELIVERED },
      }),
      prisma.customerNotification.count({
        where: { agencyId, createdAt: { gte: start, lte: end }, status: NotificationDeliveryStatus.FAILED },
      }),
      prisma.customerNotification.count({
        where: { agencyId, createdAt: { gte: start, lte: end }, status: { in: [NotificationDeliveryStatus.PENDING, NotificationDeliveryStatus.QUEUED] } },
      }),
      prisma.customerNotification.count({
        where: { agencyId, createdAt: { gte: start, lte: end }, channel: NotificationChannel.EMAIL },
      }),
      prisma.customerNotification.count({
        where: { agencyId, createdAt: { gte: start, lte: end }, channel: NotificationChannel.WHATSAPP },
      }),

      // 23-25 Documents
      prisma.travelDocument.count({
        where: { agencyId, status: TravelDocumentStatus.ISSUED, issuedAt: { gte: start, lte: end } },
      }),
      prisma.travelDocument.count({
        where: { agencyId, status: TravelDocumentStatus.GENERATED, generatedAt: { gte: start, lte: end } },
      }),
      prisma.travelDocument.count({
        where: { agencyId, status: TravelDocumentStatus.REVOKED, revokedAt: { gte: start, lte: end } },
      }),
    ]);

    // ─── DERIVED OPERATIONS COMPUTATIONS ───
    let operationallyReadyCount = 0;
    let operationalBlockersCount = 0;
    let pendingHotelConfirmationsCount = 0;
    let pendingVehicleDispatchesCount = 0;
    let pendingActivityConfirmationsCount = 0;

    for (const op of operationsList) {
      if (op.status === "READY") {
        operationallyReadyCount++;
      }
      const hasCriticalIssue = op.issues.some((i) => i.priority === "HIGH" || i.priority === "CRITICAL");
      if (hasCriticalIssue) {
        operationalBlockersCount++;
      }

      for (const h of op.hotelConfirmations) {
        if (h.status === "PENDING" || h.status === "REQUESTED") pendingHotelConfirmationsCount++;
      }
      for (const v of op.vehicleDispatches) {
        if (v.status === "PENDING") pendingVehicleDispatchesCount++;
      }
      for (const a of op.activityConfirmations) {
        if (a.status === "PENDING" || a.status === "REQUESTED") pendingActivityConfirmationsCount++;
      }
    }

    // ─── DERIVED FINANCIAL COMPUTATIONS ───
    const totalBookingValue = Number(bookingsFinancials._sum.totalAmount || 0);
    const amountCollected = Number(paymentsCollectedInRange._sum.amount || 0);
    const outstandingReceivables = Number(bookingsFinancials._sum.balanceAmount || 0);

    const supplierPayablePlanned = Number(supplierPayablesInRange._sum.plannedAmount || 0);
    const supplierPayableActual = Number(supplierPayablesInRange._sum.actualAmount || 0);
    const supplierCost = supplierPayableActual > 0 ? supplierPayableActual : supplierPayablePlanned;
    const supplierPaid = Number(supplierPayablesInRange._sum.paidAmount || 0);
    const supplierOutstanding = Number(supplierPayablesInRange._sum.outstandingAmount || 0);

    const grossProfit = Math.max(0, totalBookingValue - supplierCost);
    const grossMarginPercent = safeDivision(grossProfit, totalBookingValue);

    // ─── MISSING DOCUMENTS COMPUTATIONS FOR UPCOMING TRIPS ───
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        agencyId,
        archivedAt: null,
        status: { not: BookingStatus.CANCELLED },
        trip: { startDate: { gte: now } },
      },
      select: {
        id: true,
        travelDocuments: {
          where: { isLatest: true, status: { in: [TravelDocumentStatus.ISSUED, TravelDocumentStatus.GENERATED] } },
          select: { documentType: true },
        },
      },
    });

    let missingBookingConfirmationsCount = 0;
    let missingHotelVouchersCount = 0;
    let missingVehicleVouchersCount = 0;
    let missingActivityVouchersCount = 0;
    let missingItinerariesCount = 0;

    for (const b of upcomingBookings) {
      const docTypes = new Set(b.travelDocuments.map((d) => d.documentType));
      if (!docTypes.has(TravelDocumentType.BOOKING_CONFIRMATION)) missingBookingConfirmationsCount++;
      if (!docTypes.has(TravelDocumentType.HOTEL_VOUCHER)) missingHotelVouchersCount++;
      if (!docTypes.has(TravelDocumentType.VEHICLE_VOUCHER)) missingVehicleVouchersCount++;
      if (!docTypes.has(TravelDocumentType.ACTIVITY_VOUCHER)) missingActivityVouchersCount++;
      if (!docTypes.has(TravelDocumentType.CUSTOMER_ITINERARY) && !docTypes.has(TravelDocumentType.TRAVEL_SUMMARY)) {
        missingItinerariesCount++;
      }
    }

    return {
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
        preset,
      },
      sales: {
        newEnquiries,
        activeLeads,
        quotationsSent,
        quotationAcceptanceRate: safeDivision(quotationsAccepted, quotationsSent),
        confirmedBookings: confirmedBookingsInRange,
        bookingConversionRate: safeDivision(confirmedBookingsInRange, enquiriesInRange),
        pipelineValue: Number(enquiriesBudgetInRange._sum.budget || 0),
      },
      financial: {
        totalBookingValue,
        amountCollected,
        outstandingReceivables,
        supplierPayable: supplierCost,
        supplierPaid,
        supplierOutstanding,
        grossProfit,
        grossMarginPercent,
        currency: "INR",
      },
      operations: {
        upcomingTripsCount,
        ongoingTripsCount,
        operationallyReadyTripsCount: operationallyReadyCount,
        operationalBlockersCount,
        pendingHotelConfirmationsCount,
        pendingVehicleDispatchesCount,
        pendingActivityConfirmationsCount,
      },
      crm: {
        followUpsDueTodayCount,
        overdueFollowUpsCount,
        leadsWithoutNextActionCount,
      },
      communication: {
        totalMessages: commTotal,
        delivered: commDelivered,
        failed: commFailed,
        pending: commPending,
        deliveryRatePercent: safeDivision(commDelivered, commTotal),
        emailCount: commEmail,
        whatsappCount: commWhatsapp,
      },
      documents: {
        totalIssued: docsIssued,
        totalGenerated: docsGenerated,
        totalRevoked: docsRevoked,
        missingBookingConfirmationsCount,
        missingHotelVouchersCount,
        missingVehicleVouchersCount,
        missingActivityVouchersCount,
        missingItinerariesCount,
      },
    };
  },

  /**
   * 2. Generates the 6-Stage Sales Funnel Analytics with conversion and drop-off percentages.
   */
  async getSalesFunnelAnalytics(
    agencyId: string,
    filter: DashboardFilterInput = { preset: "THIS_MONTH" }
  ): Promise<SalesFunnelAnalytics> {
    const { start, end } = calculateDashboardDateRange(
      filter.preset,
      filter.startDate,
      filter.endDate
    );

    const [
      enquiriesTotal,
      enquiriesBudget,
      qualifiedCount,
      qualifiedBudget,
      quotationsCreated,
      quotationsBudget,
      quotationsViewed,
      quotationsAccepted,
      acceptedBudget,
      confirmedBookings,
      confirmedBookingValue,
    ] = await Promise.all([
      // 1. Total Enquiries created
      prisma.enquiry.count({
        where: { agencyId, archivedAt: null, createdAt: { gte: start, lte: end } },
      }),
      prisma.enquiry.aggregate({
        where: { agencyId, archivedAt: null, createdAt: { gte: start, lte: end } },
        _sum: { budget: true },
      }),
      // 2. Qualified Enquiries
      prisma.enquiry.count({
        where: {
          agencyId,
          archivedAt: null,
          createdAt: { gte: start, lte: end },
          status: {
            in: [
              EnquiryStatus.QUALIFIED,
              EnquiryStatus.FOLLOW_UP,
              EnquiryStatus.QUOTATION_SENT,
              EnquiryStatus.NEGOTIATION,
              EnquiryStatus.CONVERTED,
            ],
          },
        },
      }),
      prisma.enquiry.aggregate({
        where: {
          agencyId,
          archivedAt: null,
          createdAt: { gte: start, lte: end },
          status: {
            in: [
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
      // 3. Quotations Sent
      prisma.quotation.count({
        where: { agencyId, archivedAt: null, createdAt: { gte: start, lte: end } },
      }),
      prisma.quotation.aggregate({
        where: { agencyId, archivedAt: null, createdAt: { gte: start, lte: end } },
        _sum: { finalAmount: true },
      }),
      // 4. Quotations Viewed
      prisma.quotation.count({
        where: {
          agencyId,
          archivedAt: null,
          createdAt: { gte: start, lte: end },
          viewedAt: { not: null },
        },
      }),
      // 5. Quotations Accepted
      prisma.quotation.count({
        where: {
          agencyId,
          archivedAt: null,
          createdAt: { gte: start, lte: end },
          status: QuotationStatus.ACCEPTED,
        },
      }),
      prisma.quotation.aggregate({
        where: {
          agencyId,
          archivedAt: null,
          createdAt: { gte: start, lte: end },
          status: QuotationStatus.ACCEPTED,
        },
        _sum: { finalAmount: true },
      }),
      // 6. Confirmed Bookings
      prisma.booking.count({
        where: {
          agencyId,
          archivedAt: null,
          bookingDate: { gte: start, lte: end },
          status: { not: BookingStatus.CANCELLED },
        },
      }),
      prisma.booking.aggregate({
        where: {
          agencyId,
          archivedAt: null,
          bookingDate: { gte: start, lte: end },
          status: { not: BookingStatus.CANCELLED },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const stageCounts = [
      { key: "ENQUIRIES", label: "1. Enquiries Received", count: enquiriesTotal, val: Number(enquiriesBudget._sum.budget || 0) },
      { key: "QUALIFIED", label: "2. Qualified Leads", count: qualifiedCount, val: Number(qualifiedBudget._sum.budget || 0) },
      { key: "QUOTED", label: "3. Quotations Sent", count: quotationsCreated, val: Number(quotationsBudget._sum.finalAmount || 0) },
      { key: "VIEWED", label: "4. Quotations Viewed", count: quotationsViewed, val: Number(quotationsBudget._sum.finalAmount || 0) },
      { key: "ACCEPTED", label: "5. Quotations Accepted", count: quotationsAccepted, val: Number(acceptedBudget._sum.finalAmount || 0) },
      { key: "BOOKED", label: "6. Confirmed Bookings", count: confirmedBookings, val: Number(confirmedBookingValue._sum.totalAmount || 0) },
    ];

    const topCount = enquiriesTotal;
    const stages: FunnelStageItem[] = [];

    for (let i = 0; i < stageCounts.length; i++) {
      const current = stageCounts[i];
      const prev = i > 0 ? stageCounts[i - 1] : current;

      const conversionFromPrev = i === 0 ? 100 : safeDivision(current.count, prev.count);
      const cumulativeConversion = safeDivision(current.count, topCount);
      const dropOff = i === 0 ? 0 : Math.max(0, 100 - conversionFromPrev);

      stages.push({
        stage: current.key,
        label: current.label,
        count: current.count,
        value: current.val,
        conversionFromPreviousPercent: conversionFromPrev,
        cumulativeConversionPercent: cumulativeConversion,
        dropOffPercent: Math.round(dropOff * 10) / 10,
      });
    }

    return {
      stages,
      overallConversionRate: safeDivision(confirmedBookings, enquiriesTotal),
      totalPipelineValue: Number(enquiriesBudget._sum.budget || 0),
      wonBookingsValue: Number(confirmedBookingValue._sum.totalAmount || 0),
    };
  },

  /**
   * 3. Generates the Revenue & Profitability time series trend.
   */
  async getRevenueAndProfitAnalytics(
    agencyId: string,
    filter: DashboardFilterInput = { preset: "THIS_MONTH" }
  ): Promise<RevenueAndProfitAnalytics> {
    const { start, end } = calculateDashboardDateRange(
      filter.preset,
      filter.startDate,
      filter.endDate
    );

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const isDaily = diffDays <= 35;

    const points: RevenueTimeSeriesPoint[] = [];

    if (isDaily) {
      // Step daily
      const current = new Date(start);
      while (current <= end) {
        const dStart = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0, 0);
        const dEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 23, 59, 59, 999);
        const label = dStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

        const [bookingAgg, paymentAgg, payableAgg, count] = await Promise.all([
          prisma.booking.aggregate({
            where: { agencyId, archivedAt: null, bookingDate: { gte: dStart, lte: dEnd }, status: { not: BookingStatus.CANCELLED } },
            _sum: { totalAmount: true },
          }),
          prisma.payment.aggregate({
            where: { agencyId, archivedAt: null, paymentDate: { gte: dStart, lte: dEnd }, status: PaymentStatus.COMPLETED },
            _sum: { amount: true },
          }),
          prisma.supplierPayable.aggregate({
            where: { agencyId, archivedAt: null, createdAt: { gte: dStart, lte: dEnd }, status: { not: SupplierPayableStatus.CANCELLED } },
            _sum: { plannedAmount: true, actualAmount: true },
          }),
          prisma.booking.count({
            where: { agencyId, archivedAt: null, bookingDate: { gte: dStart, lte: dEnd }, status: { not: BookingStatus.CANCELLED } },
          }),
        ]);

        const bVal = Number(bookingAgg._sum.totalAmount || 0);
        const colVal = Number(paymentAgg._sum.amount || 0);
        const pAct = Number(payableAgg._sum.actualAmount || 0);
        const pPlan = Number(payableAgg._sum.plannedAmount || 0);
        const costVal = pAct > 0 ? pAct : pPlan;
        const profit = Math.max(0, bVal - costVal);

        points.push({
          label,
          dateStart: dStart.toISOString(),
          dateEnd: dEnd.toISOString(),
          bookingValue: bVal,
          collectedAmount: colVal,
          supplierCost: costVal,
          grossProfit: profit,
          grossMarginPercent: safeDivision(profit, bVal),
          bookingsCount: count,
        });

        current.setDate(current.getDate() + 1);
      }
    } else {
      // Step monthly
      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      while (current <= end) {
        const dStart = new Date(current.getFullYear(), current.getMonth(), 1, 0, 0, 0, 0);
        const dEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
        const label = dStart.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

        const [bookingAgg, paymentAgg, payableAgg, count] = await Promise.all([
          prisma.booking.aggregate({
            where: { agencyId, archivedAt: null, bookingDate: { gte: dStart, lte: dEnd }, status: { not: BookingStatus.CANCELLED } },
            _sum: { totalAmount: true },
          }),
          prisma.payment.aggregate({
            where: { agencyId, archivedAt: null, paymentDate: { gte: dStart, lte: dEnd }, status: PaymentStatus.COMPLETED },
            _sum: { amount: true },
          }),
          prisma.supplierPayable.aggregate({
            where: { agencyId, archivedAt: null, createdAt: { gte: dStart, lte: dEnd }, status: { not: SupplierPayableStatus.CANCELLED } },
            _sum: { plannedAmount: true, actualAmount: true },
          }),
          prisma.booking.count({
            where: { agencyId, archivedAt: null, bookingDate: { gte: dStart, lte: dEnd }, status: { not: BookingStatus.CANCELLED } },
          }),
        ]);

        const bVal = Number(bookingAgg._sum.totalAmount || 0);
        const colVal = Number(paymentAgg._sum.amount || 0);
        const pAct = Number(payableAgg._sum.actualAmount || 0);
        const pPlan = Number(payableAgg._sum.plannedAmount || 0);
        const costVal = pAct > 0 ? pAct : pPlan;
        const profit = Math.max(0, bVal - costVal);

        points.push({
          label,
          dateStart: dStart.toISOString(),
          dateEnd: dEnd.toISOString(),
          bookingValue: bVal,
          collectedAmount: colVal,
          supplierCost: costVal,
          grossProfit: profit,
          grossMarginPercent: safeDivision(profit, bVal),
          bookingsCount: count,
        });

        current.setMonth(current.getMonth() + 1);
      }
    }

    const totalRev = points.reduce((acc, p) => acc + p.bookingValue, 0);
    const totalCol = points.reduce((acc, p) => acc + p.collectedAmount, 0);
    const totalCost = points.reduce((acc, p) => acc + p.supplierCost, 0);
    const totalProfit = Math.max(0, totalRev - totalCost);

    return {
      timeSeries: points,
      summary: {
        totalRevenue: totalRev,
        totalCollected: totalCol,
        totalSupplierCost: totalCost,
        totalGrossProfit: totalProfit,
        overallMarginPercent: safeDivision(totalProfit, totalRev),
      },
    };
  },

  /**
   * 4. Generates the Accounts Receivable Analytics with overdue buckets and actionable list.
   */
  async getAccountsReceivableAnalytics(agencyId: string): Promise<AccountsReceivableAnalytics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const next7DaysEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [allOutstandingBookings, overdueCount, partiallyPaidCount] = await Promise.all([
      prisma.booking.findMany({
        where: {
          agencyId,
          archivedAt: null,
          status: { not: BookingStatus.CANCELLED },
          balanceAmount: { gt: 0 },
        },
        orderBy: { balanceAmount: "desc" },
        take: 10,
        include: {
          customer: { select: { name: true, phone: true, email: true } },
          trip: { select: { id: true, tripNumber: true, title: true, startDate: true } },
        },
      }),
      prisma.booking.count({
        where: {
          agencyId,
          archivedAt: null,
          status: { not: BookingStatus.CANCELLED },
          balanceAmount: { gt: 0 },
          travelStartDate: { lt: now },
        },
      }),
      prisma.booking.count({
        where: {
          agencyId,
          archivedAt: null,
          status: { not: BookingStatus.CANCELLED },
          paymentStatus: BookingPaymentStatus.PARTIALLY_PAID,
        },
      }),
    ]);

    const totalOutstandingAgg = await prisma.booking.aggregate({
      where: {
        agencyId,
        archivedAt: null,
        status: { not: BookingStatus.CANCELLED },
      },
      _sum: { balanceAmount: true },
    });

    const totalOutstanding = Number(totalOutstandingAgg._sum.balanceAmount || 0);

    let overdueAmount = 0;
    let dueTodayAmount = 0;
    let dueNext7DaysAmount = 0;

    const topReceivables: OverdueReceivableItem[] = allOutstandingBookings.map((b) => {
      const total = Number(b.totalAmount);
      const paid = Number(b.paidAmount);
      const balance = Number(b.balanceAmount);
      const travelStart = b.travelStartDate || b.trip?.startDate;
      const isOverdue = travelStart ? new Date(travelStart) < now : false;
      const isDueToday = travelStart ? new Date(travelStart) >= todayStart && new Date(travelStart) <= todayEnd : false;
      const isDueNext7Days = travelStart ? new Date(travelStart) > todayEnd && new Date(travelStart) <= next7DaysEnd : false;

      if (isOverdue) overdueAmount += balance;
      if (isDueToday) dueTodayAmount += balance;
      if (isDueNext7Days) dueNext7DaysAmount += balance;

      return {
        bookingId: b.id,
        bookingNumber: b.bookingNumber,
        tripId: b.tripId,
        tripNumber: b.trip?.tripNumber || "TRIP",
        tripTitle: b.trip?.title || "Tour Package",
        customerName: b.customer?.name || "Customer",
        customerPhone: b.customer?.phone || "—",
        customerEmail: b.customer?.email,
        totalAmount: total,
        paidAmount: paid,
        balanceAmount: balance,
        travelStartDate: travelStart ? travelStart.toISOString() : null,
        paymentStatus: b.paymentStatus,
        isOverdue,
      };
    });

    return {
      totalOutstanding,
      overdueAmount,
      dueTodayAmount,
      dueNext7DaysAmount,
      overdueBookingsCount: overdueCount,
      partiallyPaidBookingsCount: partiallyPaidCount,
      topOverdueReceivables: topReceivables,
    };
  },

  /**
   * 5. Generates the Supplier Payable Analytics & Top Suppliers breakdown.
   */
  async getSupplierPayableAnalytics(agencyId: string): Promise<SupplierPayableAnalytics> {
    const now = new Date();

    const [payableAgg, overdueAgg, topSuppliersGroup] = await Promise.all([
      prisma.supplierPayable.aggregate({
        where: {
          agencyId,
          archivedAt: null,
          status: { not: SupplierPayableStatus.CANCELLED },
        },
        _sum: {
          plannedAmount: true,
          actualAmount: true,
          paidAmount: true,
          outstandingAmount: true,
        },
      }),
      prisma.supplierPayable.aggregate({
        where: {
          agencyId,
          archivedAt: null,
          status: { in: [SupplierPayableStatus.PENDING, SupplierPayableStatus.PARTIALLY_PAID] },
          dueDate: { lt: now },
        },
        _sum: { outstandingAmount: true },
      }),
      prisma.supplierPayable.groupBy({
        by: ["supplierId"],
        where: {
          agencyId,
          archivedAt: null,
          status: { in: [SupplierPayableStatus.PENDING, SupplierPayableStatus.PARTIALLY_PAID] },
        },
        _sum: {
          plannedAmount: true,
          paidAmount: true,
          outstandingAmount: true,
        },
        orderBy: {
          _sum: {
            outstandingAmount: "desc",
          },
        },
        take: 5,
      }),
    ]);

    const planned = Number(payableAgg._sum.plannedAmount || 0);
    const actual = Number(payableAgg._sum.actualAmount || 0);
    const total = actual > 0 ? actual : planned;
    const paid = Number(payableAgg._sum.paidAmount || 0);
    const outstanding = Number(payableAgg._sum.outstandingAmount || 0);
    const overdue = Number(overdueAgg._sum.outstandingAmount || 0);

    const supplierIds = topSuppliersGroup.map((g) => g.supplierId).filter(Boolean);
    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, name: true, type: true },
    });

    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

    const topSuppliers: TopSupplierPayableItem[] = topSuppliersGroup.map((g) => {
      const sInfo = supplierMap.get(g.supplierId);
      return {
        supplierId: g.supplierId,
        supplierName: sInfo?.name || "Supplier",
        supplierType: sInfo?.type || "Vendor",
        plannedAmount: Number(g._sum.plannedAmount || 0),
        paidAmount: Number(g._sum.paidAmount || 0),
        outstandingAmount: Number(g._sum.outstandingAmount || 0),
        overdueCount: 0,
      };
    });

    return {
      totalPayable: total,
      paidAmount: paid,
      outstandingAmount: outstanding,
      overdueAmount: overdue,
      topSuppliers,
    };
  },

  /**
   * 6. Generates the Upcoming Departures Workspace with operational readiness & document badges.
   */
  async getUpcomingDeparturesWorkspace(
    agencyId: string,
    limit = 10
  ): Promise<UpcomingDepartureItem[]> {
    const now = new Date();

    const trips = await prisma.trip.findMany({
      where: {
        agencyId,
        archivedAt: null,
        startDate: { gte: now },
        status: { not: TripStatus.CANCELLED },
      },
      orderBy: { startDate: "asc" },
      take: limit,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        enquiries: { select: { destination: true }, take: 1 },
        bookings: {
          where: { status: { not: BookingStatus.CANCELLED } },
          take: 1,
          select: {
            id: true,
            bookingNumber: true,
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
            paymentStatus: true,
            travelDocuments: {
              where: { isLatest: true, status: { in: [TravelDocumentStatus.ISSUED, TravelDocumentStatus.GENERATED] } },
              select: { documentType: true, status: true },
            },
          },
        },
        tripOperation: {
          select: {
            id: true,
            status: true,
            hotelConfirmations: { select: { status: true } },
            vehicleDispatches: { select: { status: true } },
            activityConfirmations: { select: { status: true } },
          },
        },
      },
    });

    return trips.map((t) => {
      const booking = t.bookings[0];
      const op = t.tripOperation;
      const destination = t.enquiries[0]?.destination || t.title;

      // ─── OPERATIONAL READINESS CALCULATION ───
      const hotelConfirmed = op ? op.hotelConfirmations.length > 0 && op.hotelConfirmations.every((h) => h.status === "CONFIRMED") : false;
      const vehicleAssigned = op ? op.vehicleDispatches.length > 0 && op.vehicleDispatches.every((v) => v.status === "CONFIRMED" || v.status === "ASSIGNED") : false;
      const activityConfirmed = op ? op.activityConfirmations.length > 0 && op.activityConfirmations.every((a) => a.status === "CONFIRMED") : true;
      const paymentReceived = booking ? booking.balanceAmount.toNumber() <= 0 || booking.paymentStatus === "PAID" : false;

      let checksPassed = 0;
      let totalChecks = 4;
      if (hotelConfirmed) checksPassed++;
      if (vehicleAssigned) checksPassed++;
      if (activityConfirmed) checksPassed++;
      if (paymentReceived) checksPassed++;

      const readinessScore = Math.round((checksPassed / totalChecks) * 100);
      const isReady = op ? op.status === "READY" || readinessScore >= 100 : false;

      // ─── DOCUMENT READINESS CALCULATION ───
      const docTypes = new Set((booking?.travelDocuments || []).map((d) => d.documentType));

      return {
        tripId: t.id,
        tripNumber: t.tripNumber,
        tripTitle: t.title,
        destination,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate.toISOString(),
        status: t.status,
        customer: {
          id: t.customer.id,
          name: t.customer.name,
          phone: t.customer.phone,
          email: t.customer.email,
        },
        booking: booking
          ? {
              id: booking.id,
              bookingNumber: booking.bookingNumber,
              totalAmount: Number(booking.totalAmount),
              paidAmount: Number(booking.paidAmount),
              balanceAmount: Number(booking.balanceAmount),
              paymentStatus: booking.paymentStatus,
            }
          : null,
        readiness: {
          score: readinessScore,
          isReady,
          hotelConfirmed,
          vehicleAssigned,
          activityConfirmed,
          paymentReceived,
        },
        documents: {
          hasBookingConfirmation: docTypes.has(TravelDocumentType.BOOKING_CONFIRMATION),
          hasHotelVoucher: docTypes.has(TravelDocumentType.HOTEL_VOUCHER),
          hasVehicleVoucher: docTypes.has(TravelDocumentType.VEHICLE_VOUCHER),
          hasActivityVoucher: docTypes.has(TravelDocumentType.ACTIVITY_VOUCHER),
          hasItinerary: docTypes.has(TravelDocumentType.CUSTOMER_ITINERARY) || docTypes.has(TravelDocumentType.TRAVEL_SUMMARY),
        },
      };
    });
  },

  /**
   * 7. Generates CRM Follow-ups Analytics (Due Today & Overdue actionable lists).
   */
  async getCRMAndFollowUpAnalytics(agencyId: string): Promise<CRMAndFollowUpAnalytics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [dueToday, overdue, upcomingCount, uncontactedCount] = await Promise.all([
      prisma.enquiryFollowUp.findMany({
        where: {
          agencyId,
          archivedAt: null,
          status: FollowUpStatus.PENDING,
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
        orderBy: { scheduledAt: "asc" },
        take: 10,
        include: {
          enquiry: {
            select: {
              enquiryNumber: true,
              title: true,
              destination: true,
              customer: { select: { name: true, phone: true } },
            },
          },
        },
      }),
      prisma.enquiryFollowUp.findMany({
        where: {
          agencyId,
          archivedAt: null,
          status: FollowUpStatus.PENDING,
          scheduledAt: { lt: todayStart },
        },
        orderBy: { scheduledAt: "asc" },
        take: 10,
        include: {
          enquiry: {
            select: {
              enquiryNumber: true,
              title: true,
              destination: true,
              customer: { select: { name: true, phone: true } },
            },
          },
        },
      }),
      prisma.enquiryFollowUp.count({
        where: {
          agencyId,
          archivedAt: null,
          status: FollowUpStatus.PENDING,
          scheduledAt: { gt: todayEnd },
        },
      }),
      prisma.enquiry.count({
        where: {
          agencyId,
          archivedAt: null,
          status: { in: [EnquiryStatus.NEW, EnquiryStatus.CONTACTED] },
          followUps: { none: { status: FollowUpStatus.PENDING } },
        },
      }),
    ]);

    const mapFollowUp = (f: any, isOverdue: boolean): CRMUpcomingFollowUpItem => ({
      id: f.id,
      enquiryId: f.enquiryId,
      enquiryNumber: f.enquiry?.enquiryNumber || "ENQ",
      enquiryTitle: f.enquiry?.title || "Trip Enquiry",
      destination: f.enquiry?.destination || "Destination",
      customerName: f.enquiry?.customer?.name || "Customer",
      customerPhone: f.enquiry?.customer?.phone || "—",
      type: f.type,
      status: f.status,
      scheduledAt: f.scheduledAt.toISOString(),
      notes: f.notes,
      isOverdue,
    });

    return {
      dueTodayCount: dueToday.length,
      overdueCount: overdue.length,
      upcomingCount,
      uncontactedLeadsCount: uncontactedCount,
      dueTodayFollowUps: dueToday.map((f) => mapFollowUp(f, false)),
      overdueFollowUps: overdue.map((f) => mapFollowUp(f, true)),
    };
  },

  /**
   * 8. Generates Top Destinations and Top High-Value Customers.
   */
  async getTopDestinationsAndCustomers(
    agencyId: string,
    filter: DashboardFilterInput = { preset: "THIS_MONTH" }
  ): Promise<{ destinations: TopDestinationItem[]; customers: TopCustomerItem[] }> {
    const { start, end } = calculateDashboardDateRange(
      filter.preset,
      filter.startDate,
      filter.endDate
    );

    // ─── TOP DESTINATIONS ───
    const trips = await prisma.trip.findMany({
      where: {
        agencyId,
        archivedAt: null,
        createdAt: { gte: start, lte: end },
        status: { not: TripStatus.CANCELLED },
      },
      select: {
        title: true,
        enquiries: { select: { destination: true }, take: 1 },
        bookings: {
          where: { status: { not: BookingStatus.CANCELLED } },
          select: { totalAmount: true },
        },
      },
    });

    const destMap = new Map<string, { count: number; rev: number }>();
    let grandTotalRev = 0;

    for (const t of trips) {
      const dest = (t.enquiries[0]?.destination || t.title || "Other").trim();
      const current = destMap.get(dest) || { count: 0, rev: 0 };
      const bookingSum = t.bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);

      current.count += 1;
      current.rev += bookingSum;
      grandTotalRev += bookingSum;

      destMap.set(dest, current);
    }

    const destinations: TopDestinationItem[] = Array.from(destMap.entries())
      .map(([destination, stats]) => ({
        destination,
        bookingsCount: stats.count,
        revenue: stats.rev,
        percentageOfRevenue: safeDivision(stats.rev, grandTotalRev),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // ─── TOP CUSTOMERS ───
    const customerGroups = await prisma.booking.groupBy({
      by: ["customerId"],
      where: {
        agencyId,
        archivedAt: null,
        status: { not: BookingStatus.CANCELLED },
        bookingDate: { gte: start, lte: end },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 5,
    });

    const customerIds = customerGroups.map((g) => g.customerId);
    const customerProfiles = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, phone: true, email: true, city: true },
    });

    const custProfileMap = new Map(customerProfiles.map((c) => [c.id, c]));

    const customers: TopCustomerItem[] = customerGroups.map((g) => {
      const p = custProfileMap.get(g.customerId);
      return {
        customerId: g.customerId,
        name: p?.name || "Customer",
        phone: p?.phone || "—",
        email: p?.email,
        city: p?.city,
        bookingsCount: g._count.id,
        totalSpend: Number(g._sum.totalAmount || 0),
        lastBookingDate: null,
      };
    });

    return {
      destinations,
      customers,
    };
  },

  /**
   * 9. Generates Tenant-Scoped CSV Export for Dashboard Report.
   */
  async exportDashboardCSV(
    agencyId: string,
    filter: DashboardFilterInput = { preset: "THIS_MONTH" }
  ): Promise<{ csv: string; filename: string }> {
    const summary = await this.getDashboardSummary(agencyId, filter);
    const funnel = await this.getSalesFunnelAnalytics(agencyId, filter);
    const receivables = await this.getAccountsReceivableAnalytics(agencyId);
    const topEntities = await this.getTopDestinationsAndCustomers(agencyId, filter);

    const rows = [
      ["TripDesk Executive Analytics Report"],
      [`Generated At`, new Date().toISOString()],
      [`Date Range`, `${summary.dateRange.start} to ${summary.dateRange.end} (${summary.dateRange.preset})`],
      [],
      ["EXECUTIVE KPIs", "METRIC VALUE"],
      ["Total Booking Value", `INR ${summary.financial.totalBookingValue}`],
      ["Amount Collected", `INR ${summary.financial.amountCollected}`],
      ["Outstanding Receivables", `INR ${summary.financial.outstandingReceivables}`],
      ["Estimated Gross Profit", `INR ${summary.financial.grossProfit}`],
      ["Gross Margin", `${summary.financial.grossMarginPercent}%`],
      ["New Enquiries", summary.sales.newEnquiries.toString()],
      ["Active Leads", summary.sales.activeLeads.toString()],
      ["Confirmed Bookings", summary.sales.confirmedBookings.toString()],
      ["Quotation Acceptance Rate", `${summary.sales.quotationAcceptanceRate}%`],
      ["Booking Conversion Rate", `${summary.sales.bookingConversionRate}%`],
      ["Upcoming Trips", summary.operations.upcomingTripsCount.toString()],
      ["Operationally Ready Trips", summary.operations.operationallyReadyTripsCount.toString()],
      ["Overdue Follow-ups", summary.crm.overdueFollowUpsCount.toString()],
      [],
      ["SALES FUNNEL", "STAGE", "COUNT", "STAGE VALUE", "CONVERSION %", "DROP OFF %"],
      ...funnel.stages.map((s) => [
        "",
        s.label,
        s.count.toString(),
        `INR ${s.value}`,
        `${s.conversionFromPreviousPercent}%`,
        `${s.dropOffPercent}%`,
      ]),
      [],
      ["TOP OVERDUE RECEIVABLES", "BOOKING #", "CUSTOMER", "PHONE", "TOTAL", "PAID", "BALANCE DUE"],
      ...receivables.topOverdueReceivables.map((r) => [
        "",
        r.bookingNumber,
        r.customerName,
        r.customerPhone,
        `INR ${r.totalAmount}`,
        `INR ${r.paidAmount}`,
        `INR ${r.balanceAmount}`,
      ]),
      [],
      ["TOP DESTINATIONS", "DESTINATION", "BOOKINGS COUNT", "REVENUE", "% OF TOTAL"],
      ...topEntities.destinations.map((d) => [
        "",
        d.destination,
        d.bookingsCount.toString(),
        `INR ${d.revenue}`,
        `${d.percentageOfRevenue}%`,
      ]),
      [],
      ["TOP HIGH-VALUE CUSTOMERS", "CUSTOMER NAME", "PHONE", "BOOKINGS COUNT", "TOTAL SPEND"],
      ...topEntities.customers.map((c) => [
        "",
        c.name,
        c.phone,
        c.bookingsCount.toString(),
        `INR ${c.totalSpend}`,
      ]),
    ];

    const csv = rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const filename = `tripdesk_executive_report_${summary.dateRange.preset.toLowerCase()}_${Date.now()}.csv`;

    return { csv, filename };
  },
};
