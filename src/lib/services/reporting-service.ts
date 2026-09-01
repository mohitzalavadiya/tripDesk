import "server-only";
import prisma from "@/lib/prisma";
import PDFDocument from "pdfkit";
import {
  BookingStatus,
  BookingPaymentStatus,
  PaymentStatus,
  EnquiryStatus,
  TripStatus,
  SupplierPayableStatus,
  Prisma,
} from "@prisma/client";
import {
  ReportFilterInput,
  ReportPreset,
  ReportType,
  calculateReportDateRange,
} from "@/lib/validation/reporting-schema";
import { formatCurrency } from "@/lib/costing-engine";

// ═════════════════════════════════════════════════════════════════════
// DATA CONTRACTS & INTERFACES
// ═════════════════════════════════════════════════════════════════════

export interface ReportExecutiveKPIs {
  // Sales & CRM
  totalEnquiries: number;
  qualifiedEnquiries: number;
  wonEnquiries: number;
  lostEnquiries: number;
  enquiryConversionRate: number;
  pipelineValue: number;

  // Trips
  totalTrips: number;
  activeTrips: number;
  completedTrips: number;
  cancelledTrips: number;

  // Bookings
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  averageBookingValue: number;

  // Financial
  grossBookingValue: number;
  amountCollected: number;
  outstandingReceivables: number;
  supplierPayables: number;
  supplierPaid: number;
  supplierOutstanding: number;
  operationalExpenses: number;
  totalCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  currency: string;
}

export interface RevenueTimeSeriesPoint {
  label: string;
  dateKey: string;
  bookingValue: number;
  collectedAmount: number;
  grossProfit: number;
  bookingsCount: number;
}

export interface CRMStageFunnelItem {
  stage: string;
  label: string;
  count: number;
  value: number;
  conversionPercent: number;
}

export interface DestinationPerformanceItem {
  destination: string;
  tripsCount: number;
  bookingsCount: number;
  revenue: number;
  grossProfit: number;
  averageBookingValue: number;
  marginPercent: number;
}

export interface ReceivableItem {
  bookingId: string;
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  tripTitle: string;
  travelStartDate?: string | null;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: BookingPaymentStatus;
  isOverdue: boolean;
}

export interface SupplierPayableReportItem {
  payableId: string;
  payableNumber: string;
  supplierName: string;
  serviceType: string;
  description: string;
  tripTitle?: string | null;
  plannedAmount: number;
  actualAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate?: string | null;
  status: SupplierPayableStatus;
  isOverdue: boolean;
}

export interface CustomerRetentionReport {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersInPeriod: number;
  repeatCustomers: number;
  repeatRatePercent: number;
  averageCustomerLTV: number;
  topCustomers: Array<{
    customerId: string;
    name: string;
    phone: string;
    email?: string | null;
    city?: string | null;
    totalBookings: number;
    totalSpent: number;
  }>;
}

export interface AgencyBIReportResult {
  agencyInfo: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  dateRange: {
    preset: ReportPreset;
    startDate: string;
    endDate: string;
  };
  kpis: ReportExecutiveKPIs;
  revenueTrend: RevenueTimeSeriesPoint[];
  salesFunnel: CRMStageFunnelItem[];
  destinations: DestinationPerformanceItem[];
  receivables: ReceivableItem[];
  payables: SupplierPayableReportItem[];
  customers: CustomerRetentionReport;
}

// ═════════════════════════════════════════════════════════════════════
// REPORTING SERVICE IMPLEMENTATION
// ═════════════════════════════════════════════════════════════════════

export class ReportingService {
  /**
   * Generates comprehensive agency business intelligence report.
   * Multi-tenant scoped to agencyId.
   */
  async getAgencyBIReport(
    agencyId: string,
    filter: ReportFilterInput
  ): Promise<AgencyBIReportResult> {
    const { startDate, endDate } = calculateReportDateRange(
      filter.preset,
      filter.startDate,
      filter.endDate
    );

    // 1. Fetch Agency Profile
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (!agency) {
      throw new Error("Agency profile not found.");
    }

    // 2. Query Bookings within range
    const bookings = await prisma.booking.findMany({
      where: {
        agencyId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        trip: {
          select: {
            id: true,
            title: true,
            tripHotels: { include: { hotel: { select: { city: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Query All Active Bookings with Receivables (Outstanding Balance)
    const allReceivableBookings = await prisma.booking.findMany({
      where: {
        agencyId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.ONGOING, BookingStatus.COMPLETED] },
        balanceAmount: { gt: 0 },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        trip: { select: { id: true, title: true } },
      },
      orderBy: { travelStartDate: "asc" },
      take: 200,
    });

    // 4. Query Customer Payments within range
    const payments = await prisma.payment.findMany({
      where: {
        agencyId,
        paymentDate: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        amount: true,
        refundedAmount: true,
        status: true,
        paymentDate: true,
      },
    });

    // 5. Query Enquiries within range
    const enquiries = await prisma.enquiry.findMany({
      where: {
        agencyId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        status: true,
        budget: true,
        destination: true,
        createdAt: true,
      },
    });

    // 6. Query Trips within range
    const trips = await prisma.trip.findMany({
      where: {
        agencyId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        tripHotels: { include: { hotel: { select: { city: true } } } },
        bookings: { select: { id: true, totalAmount: true, status: true } },
        supplierPayables: { select: { actualAmount: true, plannedAmount: true } },
      },
    });

    // 7. Query Supplier Payables within range
    const payables = await prisma.supplierPayable.findMany({
      where: {
        agencyId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        supplier: { select: { name: true } },
        trip: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // 8. Query Operational Expenses within range
    const expenses = await prisma.operationalExpense.findMany({
      where: {
        agencyId,
        expenseDate: { gte: startDate, lte: endDate },
      },
      select: { amount: true },
    });

    // 9. Query Customers for Retention Metrics
    const allCustomers = await prisma.customer.findMany({
      where: { agencyId },
      include: {
        trips: { select: { id: true } },
        bookings: {
          where: { status: { not: BookingStatus.CANCELLED } },
          select: { totalAmount: true },
        },
      },
    });

    // ─── CALCULATE EXECUTIVE KPIS ──────────────────────────────────────────

    // Sales / CRM KPIs
    const totalEnquiries = enquiries.length;
    const qualifiedEnquiries = enquiries.filter((e) =>
      ([
        EnquiryStatus.QUALIFIED,
        EnquiryStatus.QUOTATION_SENT,
        EnquiryStatus.NEGOTIATION,
        EnquiryStatus.CONVERTED,
      ] as EnquiryStatus[]).includes(e.status)
    ).length;
    const wonEnquiries = enquiries.filter((e) => e.status === EnquiryStatus.CONVERTED).length;
    const lostEnquiries = enquiries.filter((e) =>
      ([EnquiryStatus.LOST, EnquiryStatus.CANCELLED] as EnquiryStatus[]).includes(e.status)
    ).length;
    const enquiryConversionRate =
      totalEnquiries > 0 ? Math.round((wonEnquiries / totalEnquiries) * 1000) / 10 : 0;
    const pipelineValue = enquiries
      .filter((e) =>
        ([
          EnquiryStatus.NEW,
          EnquiryStatus.CONTACTED,
          EnquiryStatus.QUALIFIED,
          EnquiryStatus.FOLLOW_UP,
          EnquiryStatus.QUOTATION_SENT,
          EnquiryStatus.NEGOTIATION,
        ] as EnquiryStatus[]).includes(e.status)
      )
      .reduce((sum, e) => sum + (Number(e.budget) || 0), 0);

    // Trips KPIs
    const totalTrips = trips.length;
    const activeTrips = trips.filter((t) =>
      ([TripStatus.PLANNING, TripStatus.QUOTED, TripStatus.BOOKED, TripStatus.ONGOING] as TripStatus[]).includes(t.status)
    ).length;
    const completedTrips = trips.filter((t) => t.status === TripStatus.COMPLETED).length;
    const cancelledTrips = trips.filter((t) => t.status === TripStatus.CANCELLED).length;

    // Bookings KPIs
    const confirmedBookingsList = bookings.filter((b) => b.status !== BookingStatus.CANCELLED);
    const confirmedBookings = confirmedBookingsList.length;
    const cancelledBookings = bookings.filter((b) => b.status === BookingStatus.CANCELLED).length;

    const grossBookingValue = confirmedBookingsList.reduce(
      (sum, b) => sum + Number(b.totalAmount || 0),
      0
    );
    const averageBookingValue =
      confirmedBookings > 0 ? Math.round(grossBookingValue / confirmedBookings) : 0;

    // Financial Collections
    const amountCollected = payments
      .filter((p) => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + Number(p.amount || 0) - Number(p.refundedAmount || 0), 0);

    // Outstanding Receivables
    const outstandingReceivables = allReceivableBookings.reduce(
      (sum, b) => sum + Number(b.balanceAmount || 0),
      0
    );

    // Supplier Payables
    const totalSupplierPayables = payables
      .filter((p) => p.status !== SupplierPayableStatus.CANCELLED)
      .reduce((sum, p) => sum + (Number(p.actualAmount) || Number(p.plannedAmount) || 0), 0);
    const totalSupplierPaid = payables
      .filter((p) => p.status !== SupplierPayableStatus.CANCELLED)
      .reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);
    const totalSupplierOutstanding = payables
      .filter((p) => p.status !== SupplierPayableStatus.CANCELLED)
      .reduce((sum, p) => sum + Number(p.outstandingAmount || 0), 0);

    // Operational Expenses & Total Buy Cost
    const totalOperationalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalCost = totalSupplierPayables + totalOperationalExpenses;
    const grossProfit = grossBookingValue - totalCost;
    const grossMarginPercent =
      grossBookingValue > 0 ? Math.round((grossProfit / grossBookingValue) * 1000) / 10 : 0;

    const kpis: ReportExecutiveKPIs = {
      totalEnquiries,
      qualifiedEnquiries,
      wonEnquiries,
      lostEnquiries,
      enquiryConversionRate,
      pipelineValue,
      totalTrips,
      activeTrips,
      completedTrips,
      cancelledTrips,
      totalBookings: bookings.length,
      confirmedBookings,
      cancelledBookings,
      averageBookingValue,
      grossBookingValue,
      amountCollected,
      outstandingReceivables,
      supplierPayables: totalSupplierPayables,
      supplierPaid: totalSupplierPaid,
      supplierOutstanding: totalSupplierOutstanding,
      operationalExpenses: totalOperationalExpenses,
      totalCost,
      grossProfit,
      grossMarginPercent,
      currency: "INR",
    };

    // ─── TIME-SERIES REVENUE & COLLECTIONS TREND ───────────────────────────
    const revenueTrend = this.buildRevenueTimeSeries(startDate, endDate, bookings, payments);

    // ─── CRM SALES FUNNEL ──────────────────────────────────────────────────
    const salesFunnel = this.buildCRMStageFunnel(enquiries);

    // ─── DESTINATION PERFORMANCE ───────────────────────────────────────────
    const destinations = this.buildDestinationPerformance(trips, bookings);

    // ─── CUSTOMER RECEIVABLES ──────────────────────────────────────────────
    const today = new Date();
    const receivables: ReceivableItem[] = allReceivableBookings.map((b) => {
      const travelDate = b.travelStartDate ? new Date(b.travelStartDate) : null;
      const isOverdue = travelDate ? travelDate < today : false;
      return {
        bookingId: b.id,
        bookingNumber: b.bookingNumber,
        customerName: b.customer?.name || "Guest Customer",
        customerPhone: b.customer?.phone || "—",
        customerEmail: b.customer?.email,
        tripTitle: b.trip?.title || "Tour Itinerary",
        travelStartDate: b.travelStartDate ? b.travelStartDate.toISOString().slice(0, 10) : null,
        totalAmount: Number(b.totalAmount || 0),
        paidAmount: Number(b.paidAmount || 0),
        balanceAmount: Number(b.balanceAmount || 0),
        paymentStatus: b.paymentStatus,
        isOverdue,
      };
    });

    // ─── SUPPLIER PAYABLES ─────────────────────────────────────────────────
    const payableItems: SupplierPayableReportItem[] = payables.map((p) => {
      const due = p.dueDate ? new Date(p.dueDate) : null;
      const isOverdue = due ? due < today && p.status !== SupplierPayableStatus.PAID : false;
      return {
        payableId: p.id,
        payableNumber: p.payableNumber || p.id.slice(-6).toUpperCase(),
        supplierName: p.supplier?.name || "Vendor",
        serviceType: p.serviceType,
        description: p.description,
        tripTitle: p.trip?.title,
        plannedAmount: Number(p.plannedAmount || 0),
        actualAmount: Number(p.actualAmount || 0),
        paidAmount: Number(p.paidAmount || 0),
        outstandingAmount: Number(p.outstandingAmount || 0),
        dueDate: p.dueDate ? p.dueDate.toISOString().slice(0, 10) : null,
        status: p.status,
        isOverdue,
      };
    });

    // ─── CUSTOMER RETENTION & LTV ──────────────────────────────────────────
    const newCustomersInPeriod = allCustomers.filter(
      (c) => (c as any).createdAt >= startDate && (c as any).createdAt <= endDate
    ).length;
    const activeCustomers = allCustomers.filter((c) => c.trips.length > 0).length;
    const repeatCustomers = allCustomers.filter((c) => c.trips.length >= 2).length;
    const repeatRatePercent =
      activeCustomers > 0 ? Math.round((repeatCustomers / activeCustomers) * 1000) / 10 : 0;

    let totalLtvSum = 0;
    const customerRankings = allCustomers
      .map((c) => {
        const spent = c.bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
        totalLtvSum += spent;
        return {
          customerId: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          city: c.city,
          totalBookings: c.bookings.length,
          totalSpent: spent,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent);

    const averageCustomerLTV =
      allCustomers.length > 0 ? Math.round(totalLtvSum / allCustomers.length) : 0;

    const customerReport: CustomerRetentionReport = {
      totalCustomers: allCustomers.length,
      activeCustomers,
      newCustomersInPeriod,
      repeatCustomers,
      repeatRatePercent,
      averageCustomerLTV,
      topCustomers: customerRankings.slice(0, 10),
    };

    return {
      agencyInfo: agency,
      dateRange: {
        preset: filter.preset,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
      },
      kpis,
      revenueTrend,
      salesFunnel,
      destinations,
      receivables,
      payables: payableItems,
      customers: customerReport,
    };
  }

  // ─── REVENUE TIME SERIES BUILDER ────────────────────────────────────────
  private buildRevenueTimeSeries(
    startDate: Date,
    endDate: Date,
    bookings: any[],
    payments: any[]
  ): RevenueTimeSeriesPoint[] {
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const points: RevenueTimeSeriesPoint[] = [];

    if (diffDays <= 14) {
      // Daily intervals
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        const dayBookings = bookings.filter(
          (b) => b.status !== BookingStatus.CANCELLED && b.createdAt.toISOString().slice(0, 10) === dateKey
        );
        const dayPayments = payments.filter(
          (p) => p.status === PaymentStatus.COMPLETED && p.paymentDate.toISOString().slice(0, 10) === dateKey
        );

        const bookingValue = dayBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
        const collectedAmount = dayPayments.reduce(
          (sum, p) => sum + Number(p.amount || 0) - Number(p.refundedAmount || 0),
          0
        );
        const grossProfit = Math.round(bookingValue * 0.2); // Est 20% margin daily

        points.push({
          label,
          dateKey,
          bookingValue,
          collectedAmount,
          grossProfit,
          bookingsCount: dayBookings.length,
        });
      }
    } else if (diffDays <= 95) {
      // Weekly intervals
      let current = new Date(startDate);
      let weekNum = 1;
      while (current <= endDate) {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());

        const label = `W${weekNum} (${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
        const dateKey = weekStart.toISOString().slice(0, 10);

        const weekBookings = bookings.filter((b) => {
          if (b.status === BookingStatus.CANCELLED) return false;
          const bDate = new Date(b.createdAt);
          return bDate >= weekStart && bDate <= weekEnd;
        });

        const weekPayments = payments.filter((p) => {
          if (p.status !== PaymentStatus.COMPLETED) return false;
          const pDate = new Date(p.paymentDate);
          return pDate >= weekStart && pDate <= weekEnd;
        });

        const bookingValue = weekBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
        const collectedAmount = weekPayments.reduce(
          (sum, p) => sum + Number(p.amount || 0) - Number(p.refundedAmount || 0),
          0
        );
        const grossProfit = Math.round(bookingValue * 0.2);

        points.push({
          label,
          dateKey,
          bookingValue,
          collectedAmount,
          grossProfit,
          bookingsCount: weekBookings.length,
        });

        current.setDate(current.getDate() + 7);
        weekNum++;
      }
    } else {
      // Monthly intervals
      const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

      for (let m = new Date(startMonth); m <= endMonth; m.setMonth(m.getMonth() + 1)) {
        const monthKey = m.toISOString().slice(0, 7);
        const label = m.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

        const mStart = new Date(m.getFullYear(), m.getMonth(), 1);
        const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59);

        const mBookings = bookings.filter((b) => {
          if (b.status === BookingStatus.CANCELLED) return false;
          const bDate = new Date(b.createdAt);
          return bDate >= mStart && bDate <= mEnd;
        });

        const mPayments = payments.filter((p) => {
          if (p.status !== PaymentStatus.COMPLETED) return false;
          const pDate = new Date(p.paymentDate);
          return pDate >= mStart && pDate <= mEnd;
        });

        const bookingValue = mBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
        const collectedAmount = mPayments.reduce(
          (sum, p) => sum + Number(p.amount || 0) - Number(p.refundedAmount || 0),
          0
        );
        const grossProfit = Math.round(bookingValue * 0.2);

        points.push({
          label,
          dateKey: monthKey,
          bookingValue,
          collectedAmount,
          grossProfit,
          bookingsCount: mBookings.length,
        });
      }
    }

    return points;
  }

  // ─── CRM FUNNEL BUILDER ────────────────────────────────────────────────
  private buildCRMStageFunnel(enquiries: any[]): CRMStageFunnelItem[] {
    const total = enquiries.length;
    const stages = [
      {
        stage: "NEW",
        label: "New Leads",
        statuses: [EnquiryStatus.NEW, EnquiryStatus.CONTACTED],
      },
      {
        stage: "QUALIFIED",
        label: "Qualified",
        statuses: [EnquiryStatus.QUALIFIED, EnquiryStatus.FOLLOW_UP],
      },
      {
        stage: "PROPOSAL_SENT",
        label: "Proposal Sent",
        statuses: [EnquiryStatus.QUOTATION_SENT, EnquiryStatus.NEGOTIATION],
      },
      {
        stage: "WON",
        label: "Won / Booked",
        statuses: [EnquiryStatus.CONVERTED],
      },
      {
        stage: "LOST",
        label: "Lost / Cancelled",
        statuses: [EnquiryStatus.LOST, EnquiryStatus.CANCELLED],
      },
    ];

    return stages.map((st) => {
      const match = enquiries.filter((e) => (st.statuses as EnquiryStatus[]).includes(e.status));
      const count = match.length;
      const value = match.reduce((sum, e) => sum + (Number(e.budget) || 0), 0);
      const conversionPercent = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
      return {
        stage: st.stage,
        label: st.label,
        count,
        value,
        conversionPercent,
      };
    });
  }

  // ─── DESTINATION PERFORMANCE BUILDER ───────────────────────────────────
  private buildDestinationPerformance(
    trips: any[],
    bookings: any[]
  ): DestinationPerformanceItem[] {
    const map = new Map<
      string,
      { tripsCount: number; bookingsCount: number; revenue: number; cost: number }
    >();

    for (const trip of trips) {
      const city =
        trip.tripHotels?.[0]?.hotel?.city ||
        trip.title.split("-")[0]?.trim() ||
        "Domestic Tour";

      const entry = map.get(city) || { tripsCount: 0, bookingsCount: 0, revenue: 0, cost: 0 };
      entry.tripsCount += 1;

      const tripBookings = bookings.filter(
        (b) => b.tripId === trip.id && b.status !== BookingStatus.CANCELLED
      );
      entry.bookingsCount += tripBookings.length;
      entry.revenue += tripBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

      const payablesSum = (trip.supplierPayables || []).reduce(
        (sum: number, p: any) => sum + (Number(p.actualAmount) || Number(p.plannedAmount) || 0),
        0
      );
      entry.cost += payablesSum;

      map.set(city, entry);
    }

    return Array.from(map.entries())
      .map(([destination, data]) => {
        const grossProfit = data.revenue - data.cost;
        const marginPercent =
          data.revenue > 0 ? Math.round((grossProfit / data.revenue) * 1000) / 10 : 0;
        const averageBookingValue =
          data.bookingsCount > 0 ? Math.round(data.revenue / data.bookingsCount) : 0;

        return {
          destination,
          tripsCount: data.tripsCount,
          bookingsCount: data.bookingsCount,
          revenue: data.revenue,
          grossProfit,
          averageBookingValue,
          marginPercent,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);
  }

  // ─── CSV EXPORT GENERATOR ───────────────────────────────────────────────
  async generateReportsCSV(
    agencyId: string,
    filter: ReportFilterInput,
    reportType: ReportType = "OVERVIEW"
  ): Promise<{ csv: string; filename: string }> {
    const data = await this.getAgencyBIReport(agencyId, filter);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const sanitize = (val: any) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      // Defend against CSV formula injection
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str}"`;
    };

    let lines: string[] = [];
    let filename = `tripdesk-${reportType.toLowerCase()}-report-${dateStamp}.csv`;

    switch (reportType) {
      case "RECEIVABLES": {
        lines.push(["Booking #", "Customer", "Phone", "Trip", "Travel Date", "Total Amount", "Paid Amount", "Balance Due", "Status", "Overdue"].map(sanitize).join(","));
        for (const r of data.receivables) {
          lines.push([
            r.bookingNumber,
            r.customerName,
            r.customerPhone,
            r.tripTitle,
            r.travelStartDate || "—",
            r.totalAmount.toFixed(2),
            r.paidAmount.toFixed(2),
            r.balanceAmount.toFixed(2),
            r.paymentStatus,
            r.isOverdue ? "YES" : "NO",
          ].map(sanitize).join(","));
        }
        break;
      }

      case "PAYABLES": {
        lines.push(["Payable #", "Supplier", "Service", "Description", "Trip", "Planned", "Actual", "Paid", "Outstanding", "Due Date", "Status"].map(sanitize).join(","));
        for (const p of data.payables) {
          lines.push([
            p.payableNumber,
            p.supplierName,
            p.serviceType,
            p.description,
            p.tripTitle || "—",
            p.plannedAmount.toFixed(2),
            p.actualAmount.toFixed(2),
            p.paidAmount.toFixed(2),
            p.outstandingAmount.toFixed(2),
            p.dueDate || "—",
            p.status,
          ].map(sanitize).join(","));
        }
        break;
      }

      case "DESTINATIONS": {
        lines.push(["Destination", "Trips", "Bookings", "Gross Revenue", "Gross Profit", "Avg Booking Value", "Margin %"].map(sanitize).join(","));
        for (const d of data.destinations) {
          lines.push([
            d.destination,
            d.tripsCount,
            d.bookingsCount,
            d.revenue.toFixed(2),
            d.grossProfit.toFixed(2),
            d.averageBookingValue.toFixed(2),
            `${d.marginPercent}%`,
          ].map(sanitize).join(","));
        }
        break;
      }

      case "OVERVIEW":
      default: {
        lines.push(`"TRIPDESK EXECUTIVE BI & FINANCIAL REPORT - ${data.agencyInfo.name}"`);
        lines.push(`"Period: ${data.dateRange.startDate} to ${data.dateRange.endDate} (${data.dateRange.preset})"`);
        lines.push("");
        lines.push(["EXECUTIVE METRIC", "VALUE"].map(sanitize).join(","));
        lines.push(["Gross Booking Value", formatCurrency(data.kpis.grossBookingValue)].map(sanitize).join(","));
        lines.push(["Collections Received", formatCurrency(data.kpis.amountCollected)].map(sanitize).join(","));
        lines.push(["Outstanding Receivables", formatCurrency(data.kpis.outstandingReceivables)].map(sanitize).join(","));
        lines.push(["Supplier Payables", formatCurrency(data.kpis.supplierPayables)].map(sanitize).join(","));
        lines.push(["Supplier Paid", formatCurrency(data.kpis.supplierPaid)].map(sanitize).join(","));
        lines.push(["Supplier Outstanding", formatCurrency(data.kpis.supplierOutstanding)].map(sanitize).join(","));
        lines.push(["Operational Expenses", formatCurrency(data.kpis.operationalExpenses)].map(sanitize).join(","));
        lines.push(["Gross Profit", formatCurrency(data.kpis.grossProfit)].map(sanitize).join(","));
        lines.push(["Gross Margin %", `${data.kpis.grossMarginPercent}%`].map(sanitize).join(","));
        lines.push(["Total Enquiries", data.kpis.totalEnquiries].map(sanitize).join(","));
        lines.push(["Won Enquiries", data.kpis.wonEnquiries].map(sanitize).join(","));
        lines.push(["Conversion Rate", `${data.kpis.enquiryConversionRate}%`].map(sanitize).join(","));
        lines.push(["Confirmed Bookings", data.kpis.confirmedBookings].map(sanitize).join(","));
        lines.push(["Average Booking Value", formatCurrency(data.kpis.averageBookingValue)].map(sanitize).join(","));
        lines.push("");
        lines.push(`"DESTINATION PERFORMANCE"`);
        lines.push(["Destination", "Trips", "Bookings", "Revenue", "Gross Profit", "Margin %"].map(sanitize).join(","));
        for (const d of data.destinations) {
          lines.push([d.destination, d.tripsCount, d.bookingsCount, d.revenue.toFixed(2), d.grossProfit.toFixed(2), `${d.marginPercent}%`].map(sanitize).join(","));
        }
        break;
      }
    }

    const csvContent = "\uFEFF" + lines.join("\r\n");
    return { csv: csvContent, filename };
  }

  // ─── PDF EXPORT GENERATOR ───────────────────────────────────────────────
  async generateReportsPDF(
    agencyId: string,
    filter: ReportFilterInput
  ): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.getAgencyBIReport(agencyId, filter);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `tripdesk-executive-report-${dateStamp}.pdf`;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve({ buffer: Buffer.concat(buffers), filename }));
        doc.on("error", (err: Error) => reject(err));

        // 1. Header & Agency Info
        doc.fillColor("#1E293B").fontSize(20).text("TRIPDESK EXECUTIVE BI REPORT", { bold: true } as any);
        doc.fontSize(10).fillColor("#64748B").text(`Agency: ${data.agencyInfo.name} (${data.agencyInfo.email})`);
        doc.text(`Reporting Horizon: ${data.dateRange.startDate} to ${data.dateRange.endDate} (${data.dateRange.preset})`);
        doc.text(`Generated On: ${new Date().toUTCString()}`);
        doc.moveDown(1.5);

        // Horizontal Rule
        doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(1);

        // 2. Executive Summary KPIs Table
        doc.fontSize(14).fillColor("#0F172A").text("1. Executive Financial & Operational KPIs", { bold: true } as any);
        doc.moveDown(0.5);

        const kpiRows = [
          ["Gross Booking Value (GBV)", formatCurrency(data.kpis.grossBookingValue), "Total Enquiries", `${data.kpis.totalEnquiries}`],
          ["Amount Collected", formatCurrency(data.kpis.amountCollected), "Won Enquiries", `${data.kpis.wonEnquiries}`],
          ["Outstanding Receivables", formatCurrency(data.kpis.outstandingReceivables), "Enquiry Conversion Rate", `${data.kpis.enquiryConversionRate}%`],
          ["Supplier Payables", formatCurrency(data.kpis.supplierPayables), "Confirmed Bookings", `${data.kpis.confirmedBookings}`],
          ["Supplier Outstanding", formatCurrency(data.kpis.supplierOutstanding), "Average Booking Value", formatCurrency(data.kpis.averageBookingValue)],
          ["Gross Profit", formatCurrency(data.kpis.grossProfit), "Gross Margin %", `${data.kpis.grossMarginPercent}%`],
        ];

        doc.fontSize(9).fillColor("#334155");
        for (const row of kpiRows) {
          const y = doc.y;
          doc.fillColor("#475569").text(row[0], 45, y, { width: 140 });
          doc.fillColor("#0F172A").text(row[1], 190, y, { width: 90, bold: true } as any);
          doc.fillColor("#475569").text(row[2], 300, y, { width: 140 });
          doc.fillColor("#0F172A").text(row[3], 445, y, { width: 90, bold: true } as any);
          doc.moveDown(0.5);
        }

        doc.moveDown(1.5);

        // 3. Top Travel Destinations
        doc.fontSize(14).fillColor("#0F172A").text("2. Top Destinations Performance", { bold: true } as any);
        doc.moveDown(0.5);

        // Destination Table Header
        const startY = doc.y;
        doc.rect(40, startY, 515, 20).fill("#F1F5F9");
        doc.fillColor("#334155").fontSize(8);
        doc.text("Destination", 45, startY + 5, { width: 130 });
        doc.text("Trips", 180, startY + 5, { width: 50 });
        doc.text("Bookings", 235, startY + 5, { width: 55 });
        doc.text("Gross Revenue", 295, startY + 5, { width: 85 });
        doc.text("Gross Profit", 385, startY + 5, { width: 85 });
        doc.text("Margin", 475, startY + 5, { width: 75 });
        doc.y = startY + 25;

        for (const d of data.destinations.slice(0, 8)) {
          const rowY = doc.y;
          doc.fillColor("#1E293B").fontSize(8);
          doc.text(d.destination, 45, rowY, { width: 130 });
          doc.text(`${d.tripsCount}`, 180, rowY, { width: 50 });
          doc.text(`${d.bookingsCount}`, 235, rowY, { width: 55 });
          doc.text(formatCurrency(d.revenue), 295, rowY, { width: 85 });
          doc.text(formatCurrency(d.grossProfit), 385, rowY, { width: 85 });
          doc.text(`${d.marginPercent}%`, 475, rowY, { width: 75 });
          doc.moveDown(0.5);
        }

        doc.moveDown(1.5);

        // 4. Receivables Overview
        if (data.receivables.length > 0) {
          doc.fontSize(14).fillColor("#0F172A").text("3. Top Outstanding Receivables", { bold: true } as any);
          doc.moveDown(0.5);

          const rStartY = doc.y;
          doc.rect(40, rStartY, 515, 20).fill("#F1F5F9");
          doc.fillColor("#334155").fontSize(8);
          doc.text("Booking #", 45, rStartY + 5, { width: 80 });
          doc.text("Customer", 130, rStartY + 5, { width: 110 });
          doc.text("Travel Date", 245, rStartY + 5, { width: 75 });
          doc.text("Total", 325, rStartY + 5, { width: 75 });
          doc.text("Paid", 405, rStartY + 5, { width: 70 });
          doc.text("Balance Due", 480, rStartY + 5, { width: 70 });
          doc.y = rStartY + 25;

          for (const r of data.receivables.slice(0, 6)) {
            const rowY = doc.y;
            doc.fillColor("#1E293B").fontSize(8);
            doc.text(r.bookingNumber, 45, rowY, { width: 80 });
            doc.text(r.customerName, 130, rowY, { width: 110 });
            doc.text(r.travelStartDate || "—", 245, rowY, { width: 75 });
            doc.text(formatCurrency(r.totalAmount), 325, rowY, { width: 75 });
            doc.text(formatCurrency(r.paidAmount), 405, rowY, { width: 70 });
            doc.fillColor("#B91C1C").text(formatCurrency(r.balanceAmount), 480, rowY, { width: 70, bold: true } as any);
            doc.moveDown(0.5);
          }
        }

        // Footer
        doc.fontSize(8).fillColor("#94A3B8").text(
          "TripDesk SaaS B2B Platform • Confidential Agency BI & Financial Report • Zero Commercial Leakage",
          40,
          770,
          { align: "center", width: 515 }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const reportingService = new ReportingService();
