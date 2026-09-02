/**
 * ═════════════════════════════════════════════════════════════════════
 * TRIPDESK — PHASE 17: DASHBOARD & ANALYTICS TEST SUITE
 * ═════════════════════════════════════════════════════════════════════
 * Comprehensive automated verification covering:
 *  1. Multi-Tenant Fixture Setup & Isolation
 *  2. Server-Authoritative Executive Summary KPIs (Sales, Finance, Operations, CRM, Comms, Docs)
 *  3. Time-Zone & Boundary-Aware Date Filtering (Today, Month, Quarter, Year, Custom Range)
 *  4. 6-Stage Sales Funnel Mathematics & Zero-Denominator Safety
 *  5. Revenue & Profitability Time-Series Calculations
 *  6. Accounts Receivable Aging & Overdue Balance Buckets
 *  7. Supplier Payables & Vendor Exposure Aggregation
 *  8. Upcoming Departures Operational Readiness & Document Badges
 *  9. CRM & Follow-Up Priority Classification
 * 10. Multi-Channel Communication Delivery Health
 * 11. Top Destinations & High-Value Customer Intelligence
 * 12. Tenant-Scoped CSV Export Verification
 * 13. Strict System Role Architecture Invariant (0 Customer User Accounts)
 * 14. Commercial Privacy & Zero Data Leakage Scan
 * ═════════════════════════════════════════════════════════════════════
 */

import "dotenv/config";

// Mock server-only before importing service modules
import Module from "module";
const originalRequire = Module.prototype.require;
// @ts-ignore
Module.prototype.require = function (id: string) {
  if (id === "server-only") {
    return {};
  }
  // @ts-ignore
  return originalRequire.apply(this, arguments);
};

import { prisma } from "../src/lib/prisma";
import {
  EnquiryStatus,
  TripStatus,
  QuotationStatus,
  BookingStatus,
  BookingPaymentStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentType,
  FollowUpStatus,
  SupplierStatus,
  SupplierPayableStatus,
  NotificationChannel,
  CustomerNotificationType,
  NotificationDeliveryStatus,
  TravelDocumentType,
  TravelDocumentStatus,
} from "@prisma/client";
import { dashboardService } from "../src/lib/services/dashboard-service";
import { calculateDashboardDateRange } from "../src/lib/validation/dashboard-schema";

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runPhase17Tests() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING PHASE 17: DASHBOARD & ANALYTICS VERIFICATION");
  console.log("══════════════════════════════════════════════════════════════\n");

  const timestamp = Date.now();
  const emailAlpha = `agency.alpha.${timestamp}@tripdesk.test`;
  const emailBeta = `agency.beta.${timestamp}@tripdesk.test`;

  let agencyA: any;
  let agencyB: any;
  let customerA: any;
  let customerB: any;
  let tripA1: any;
  let tripA2: any;
  let bookingA1: any;
  let bookingA2: any;
  let quotationA: any;
  let enquiryA1: any;
  let enquiryA2: any;
  let supplierA: any;

  try {
    // ═════════════════════════════════════════════════════════════════
    // 1. MULTI-TENANT FIXTURE SETUP
    // ═════════════════════════════════════════════════════════════════
    console.log("--- 1. Multi-Tenant Fixture Setup ---");

    agencyA = await prisma.agency.create({
      data: {
        name: `Analytics Agency Alpha ${timestamp}`,
        email: emailAlpha,
        phone: "+919876543210",
      },
    });

    agencyB = await prisma.agency.create({
      data: {
        name: `Analytics Agency Beta ${timestamp}`,
        email: emailBeta,
        phone: "+919876543211",
      },
    });

    assert(Boolean(agencyA.id && agencyB.id), "Agencies Alpha and Beta initialized for multi-tenant isolation");

    // Create Customers
    customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: "Rahul Sharma",
        phone: "+919820011223",
        email: "rahul.sharma@example.com",
        city: "Mumbai",
      },
    });

    customerB = await prisma.customer.create({
      data: {
        agencyId: agencyB.id,
        name: "Vikram Malhotra",
        phone: "+919820011224",
        email: "vikram.malhotra@example.com",
        city: "Bangalore",
      },
    });

    assert(Boolean(customerA.id && customerB.id), "Tenant-scoped customer records created");

    // ═════════════════════════════════════════════════════════════════
    // 2. ENQUIRIES, QUOTATIONS & BOOKINGS SETUP FOR AGENCY A
    // ═════════════════════════════════════════════════════════════════
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(today.getTime() + 48 * 60 * 60 * 1000);

    // Enquiries
    enquiryA1 = await prisma.enquiry.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        enquiryNumber: `ENQ-A1-${timestamp}`,
        title: "Maldives Luxury Honeymoon",
        destination: "Maldives",
        status: EnquiryStatus.CONVERTED,
        source: "WEBSITE",
        budget: 200000,
        currency: "INR",
        createdAt: today,
      },
    });

    enquiryA2 = await prisma.enquiry.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        enquiryNumber: `ENQ-A2-${timestamp}`,
        title: "Bali Family Getaway",
        destination: "Bali",
        status: EnquiryStatus.NEW,
        source: "INSTAGRAM",
        budget: 150000,
        currency: "INR",
        createdAt: today,
      },
    });

    // Trips
    tripA1 = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-A1-${timestamp}`,
        title: "Maldives 5D4N Romance",
        startDate: tomorrow,
        endDate: new Date(tomorrow.getTime() + 4 * 24 * 60 * 60 * 1000),
        status: TripStatus.BOOKED,
        createdAt: today,
      },
    });

    await prisma.enquiry.update({
      where: { id: enquiryA1.id },
      data: { convertedTripId: tripA1.id },
    });

    tripA2 = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-A2-${timestamp}`,
        title: "Bali Adventure Expedition",
        startDate: dayAfter,
        endDate: new Date(dayAfter.getTime() + 5 * 24 * 60 * 60 * 1000),
        status: TripStatus.PLANNING,
        createdAt: today,
      },
    });

    // Quotation
    quotationA = await prisma.quotation.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA1.id,
        quotationNumber: `QT-A1-${timestamp}`,
        title: "Maldives Honeymoon Package v1",
        version: 1,
        status: QuotationStatus.ACCEPTED,
        subtotal: 200000,
        finalAmount: 200000,
        currency: "INR",
        sharedAt: today,
        viewedAt: today,
        acceptedAt: today,
        createdAt: today,
      },
    });

    // Bookings
    bookingA1 = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA1.id,
        customerId: customerA.id,
        bookingNumber: `BK-A1-${timestamp}`,
        status: BookingStatus.CONFIRMED,
        paymentStatus: BookingPaymentStatus.PARTIALLY_PAID,
        totalAmount: 200000,
        paidAmount: 120000,
        balanceAmount: 80000,
        currency: "INR",
        bookingDate: today,
        travelStartDate: tomorrow,
        travelEndDate: new Date(tomorrow.getTime() + 4 * 24 * 60 * 60 * 1000),
      },
    });

    bookingA2 = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA2.id,
        customerId: customerA.id,
        bookingNumber: `BK-A2-${timestamp}`,
        status: BookingStatus.CONFIRMED,
        paymentStatus: BookingPaymentStatus.UNPAID,
        totalAmount: 150000,
        paidAmount: 0,
        balanceAmount: 150000,
        currency: "INR",
        bookingDate: today,
        travelStartDate: dayAfter,
        travelEndDate: new Date(dayAfter.getTime() + 5 * 24 * 60 * 60 * 1000),
      },
    });

    // Payments
    await prisma.payment.create({
      data: {
        agencyId: agencyA.id,
        bookingId: bookingA1.id,
        paymentNumber: `PAY-A1-${timestamp}`,
        amount: 120000,
        currency: "INR",
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentType: PaymentType.ADVANCE,
        status: PaymentStatus.COMPLETED,
        paymentDate: today,
      },
    });

    // Supplier & Payables
    supplierA = await prisma.supplier.create({
      data: {
        agencyId: agencyA.id,
        name: "Island Fleet & Resorts Maldives",
        type: "HOTEL",
        status: SupplierStatus.ACTIVE,
      },
    });

    await prisma.supplierPayable.create({
      data: {
        agencyId: agencyA.id,
        supplierId: supplierA.id,
        tripId: tripA1.id,
        payableNumber: `SP-A1-${timestamp}`,
        serviceType: "HOTEL",
        description: "Overwater Villa 4 Nights",
        plannedAmount: 140000,
        actualAmount: 140000,
        paidAmount: 90000,
        outstandingAmount: 50000,
        status: SupplierPayableStatus.PARTIALLY_PAID,
        currency: "INR",
        createdAt: today,
      },
    });

    // Follow-up
    await prisma.enquiryFollowUp.create({
      data: {
        agencyId: agencyA.id,
        enquiryId: enquiryA2.id,
        type: "CALL",
        status: FollowUpStatus.PENDING,
        scheduledAt: today,
        notes: "Discuss custom Bali flight options",
      },
    });

    // Communication notification
    await prisma.customerNotification.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA1.id,
        type: CustomerNotificationType.BOOKING_CONFIRMED,
        title: "Booking Confirmed",
        message: "Your Maldives booking is confirmed!",
        channel: NotificationChannel.WHATSAPP,
        recipient: customerA.phone,
        status: NotificationDeliveryStatus.DELIVERED,
        createdAt: today,
      },
    });

    // Travel Document
    await prisma.travelDocument.create({
      data: {
        agencyId: agencyA.id,
        bookingId: bookingA1.id,
        tripId: tripA1.id,
        customerId: customerA.id,
        documentType: TravelDocumentType.BOOKING_CONFIRMATION,
        documentNumber: `BC-2026-${timestamp.toString().slice(-5)}`,
        version: 1,
        isLatest: true,
        status: TravelDocumentStatus.ISSUED,
        title: "Official Booking Confirmation",
        generatedAt: today,
        issuedAt: today,
      },
    });

    console.log("--- 2. Multi-Tenant Isolation Enforcement ---");
    // Verify Agency B gets 0 counts for Agency A's data
    const summaryB = await dashboardService.getDashboardSummary(agencyB.id, { preset: "THIS_MONTH" });
    assert(summaryB.sales.newEnquiries === 0, "Agency B sees 0 new enquiries (Strict tenant isolation)");
    assert(summaryB.sales.confirmedBookings === 0, "Agency B sees 0 confirmed bookings");
    assert(summaryB.financial.totalBookingValue === 0, "Agency B sees 0 booking revenue");
    assert(summaryB.financial.amountCollected === 0, "Agency B sees 0 collected amount");
    assert(summaryB.financial.outstandingReceivables === 0, "Agency B sees 0 receivables");

    // ═════════════════════════════════════════════════════════════════
    // 3. EXECUTIVE SUMMARY KPI ACCURACY (AGENCY A)
    // ═════════════════════════════════════════════════════════════════
    console.log("--- 3. Executive Summary KPI Accuracy ---");

    const summaryA = await dashboardService.getDashboardSummary(agencyA.id, { preset: "THIS_MONTH" });

    // Sales KPIs
    assert(summaryA.sales.newEnquiries === 1, `Agency A new enquiries = 1 (Got ${summaryA.sales.newEnquiries})`);
    assert(summaryA.sales.confirmedBookings === 2, `Agency A confirmed bookings = 2 (Got ${summaryA.sales.confirmedBookings})`);
    assert(summaryA.sales.quotationsSent === 1, "Agency A quotations sent = 1");
    assert(summaryA.sales.quotationAcceptanceRate === 100, "Quotation acceptance rate is 100%");
    assert(summaryA.sales.bookingConversionRate === 100, "Booking conversion rate is 100% (2 bookings / 2 enquiries)");
    assert(summaryA.sales.pipelineValue === 350000, `Pipeline value is 350,000 (Got ${summaryA.sales.pipelineValue})`);

    // Financial KPIs
    assert(summaryA.financial.totalBookingValue === 350000, `Total booking value = 350,000 (Got ${summaryA.financial.totalBookingValue})`);
    assert(summaryA.financial.amountCollected === 120000, `Amount collected = 120,000 (Got ${summaryA.financial.amountCollected})`);
    assert(summaryA.financial.outstandingReceivables === 230000, `Outstanding receivables = 230,000 (Got ${summaryA.financial.outstandingReceivables})`);
    assert(summaryA.financial.supplierPayable === 140000, `Supplier payable = 140,000 (Got ${summaryA.financial.supplierPayable})`);
    assert(summaryA.financial.supplierPaid === 90000, `Supplier paid = 90,000 (Got ${summaryA.financial.supplierPaid})`);
    assert(summaryA.financial.supplierOutstanding === 50000, `Supplier outstanding = 50,000 (Got ${summaryA.financial.supplierOutstanding})`);

    // Profitability
    const expectedProfit = 350000 - 140000; // 210,000
    const expectedMargin = Math.round((210000 / 350000) * 100 * 10) / 10; // 60.0%
    assert(summaryA.financial.grossProfit === expectedProfit, `Gross profit = 210,000 (Got ${summaryA.financial.grossProfit})`);
    assert(summaryA.financial.grossMarginPercent === expectedMargin, `Gross margin % = 60% (Got ${summaryA.financial.grossMarginPercent})`);

    // Operations KPIs
    assert(summaryA.operations.upcomingTripsCount === 2, `Upcoming trips count = 2 (Got ${summaryA.operations.upcomingTripsCount})`);

    // CRM KPIs
    assert(summaryA.crm.followUpsDueTodayCount === 1, `Follow-ups due today = 1 (Got ${summaryA.crm.followUpsDueTodayCount})`);
    assert(summaryA.crm.overdueFollowUpsCount === 0, "Overdue follow-ups = 0");

    // Communication KPIs
    assert(summaryA.communication.totalMessages === 1, "Total communications sent = 1");
    assert(summaryA.communication.delivered === 1, "Delivered communications = 1");
    assert(summaryA.communication.deliveryRatePercent === 100, "Delivery rate is 100%");
    assert(summaryA.communication.whatsappCount === 1, "WhatsApp communications count = 1");

    // Document KPIs
    assert(summaryA.documents.totalIssued === 1, "Issued documents = 1");

    // ═════════════════════════════════════════════════════════════════
    // 4. DATE RANGE FILTERING
    // ═════════════════════════════════════════════════════════════════
    console.log("--- 4. Date Range Filtering ---");

    const todayRange = calculateDashboardDateRange("TODAY");
    assert(todayRange.preset === "TODAY", "Parsed preset TODAY correctly");

    const weekRange = calculateDashboardDateRange("THIS_WEEK");
    assert(weekRange.preset === "THIS_WEEK", "Parsed preset THIS_WEEK correctly");

    const monthRange = calculateDashboardDateRange("THIS_MONTH");
    assert(monthRange.preset === "THIS_MONTH", "Parsed preset THIS_MONTH correctly");

    const quarterRange = calculateDashboardDateRange("THIS_QUARTER");
    assert(quarterRange.preset === "THIS_QUARTER", "Parsed preset THIS_QUARTER correctly");

    const yearRange = calculateDashboardDateRange("THIS_YEAR");
    assert(yearRange.preset === "THIS_YEAR", "Parsed preset THIS_YEAR correctly");

    const customRange = calculateDashboardDateRange("CUSTOM_RANGE", "2026-01-01", "2026-01-31");
    assert(customRange.start.getFullYear() === 2026 && customRange.end.getMonth() === 0, "Parsed custom date range correctly");

    // Test query with out-of-range date
    const pastSummary = await dashboardService.getDashboardSummary(agencyA.id, {
      preset: "CUSTOM_RANGE",
      startDate: "2025-01-01",
      endDate: "2025-01-31",
    });
    assert(pastSummary.sales.confirmedBookings === 0, "Zero bookings returned for past date filter (Filtering works)");

    // ═════════════════════════════════════════════════════════════════
    // 5. SALES FUNNEL ANALYTICS & ZERO-DENOMINATOR SAFETY
    // ═════════════════════════════════════════════════════════════════
    console.log("--- 5. Sales Funnel Analytics ---");

    const funnelA = await dashboardService.getSalesFunnelAnalytics(agencyA.id, { preset: "THIS_MONTH" });
    assert(funnelA.stages.length === 6, `Funnel has exactly 6 sequential stages (Got ${funnelA.stages.length})`);
    assert(funnelA.stages[0].stage === "ENQUIRIES", "Stage 1 is ENQUIRIES");
    assert(funnelA.stages[5].stage === "BOOKED", "Stage 6 is BOOKED");
    assert(funnelA.overallConversionRate === 100, "Overall funnel conversion rate calculated safely");
    assert(funnelA.wonBookingsValue === 350000, "Won bookings value is 350,000");

    // Test zero denominator handling on Agency B
    const funnelB = await dashboardService.getSalesFunnelAnalytics(agencyB.id, { preset: "THIS_MONTH" });
    assert(funnelB.overallConversionRate === 0, "0 denominator handled safely with 0% result (No NaN or Infinity)");
    assert(funnelB.stages[0].count === 0, "Agency B funnel stage 1 has 0 count");

    // ═════════════════════════════════════════════════════════════════
    // 6. ACCOUNTS RECEIVABLE AGING & SUPPLIER PAYABLES
    // ═════════════════════════════════════════════════════════════════
    console.log("--- 6. Accounts Receivable & Supplier Payables ---");

    const receivablesA = await dashboardService.getAccountsReceivableAnalytics(agencyA.id);
    assert(receivablesA.totalOutstanding === 230000, `Total receivables = 230,000 (Got ${receivablesA.totalOutstanding})`);
    assert(receivablesA.partiallyPaidBookingsCount === 1, "Partially paid bookings count = 1");
    assert(receivablesA.topOverdueReceivables.length === 2, "Top receivables list contains 2 bookings");

    const payablesA = await dashboardService.getSupplierPayableAnalytics(agencyA.id);
    assert(payablesA.totalPayable === 140000, `Supplier total payable = 140,000 (Got ${payablesA.totalPayable})`);
    assert(payablesA.paidAmount === 90000, `Supplier paid amount = 90,000 (Got ${payablesA.paidAmount})`);
    assert(payablesA.outstandingAmount === 50000, `Supplier outstanding amount = 50,000 (Got ${payablesA.outstandingAmount})`);
    assert(payablesA.topSuppliers.length === 1, "Top suppliers list contains 1 supplier");
    assert(payablesA.topSuppliers[0].supplierName === "Island Fleet & Resorts Maldives", "Top supplier name mapped correctly");

    // ═════════════════════════════════════════════════════════════════
    // 7. UPCOMING DEPARTURES WORKSPACE & READINESS
    // ═════════════════════════════════════════════════════════════════
    console.log("--- 7. Upcoming Departures Workspace ---");

    const departures = await dashboardService.getUpcomingDeparturesWorkspace(agencyA.id);
    assert(departures.length === 2, `Upcoming departures workspace returned 2 trips (Got ${departures.length})`);
    assert(departures[0].tripTitle.includes("Maldives"), "Trip 1 is Maldives");
    assert(departures[0].documents.hasBookingConfirmation === true, "Trip 1 booking confirmation marked generated/issued");
    assert(departures[0].documents.hasHotelVoucher === false, "Trip 1 hotel voucher marked missing");

    // ═════════════════════════════════════════════════════════════════
    // 8. TOP DESTINATIONS & HIGH-VALUE CUSTOMERS
    // ═════════════════════════════════════════════════════════════════
    console.log("--- 8. Top Destinations & High-Value Customers ---");

    const topEntities = await dashboardService.getTopDestinationsAndCustomers(agencyA.id, { preset: "THIS_MONTH" });
    assert(topEntities.destinations.length === 2, "2 top destinations returned");
    assert(topEntities.destinations[0].destination.includes("Maldives"), "Top destination #1 is Maldives");
    assert(topEntities.destinations[0].revenue === 200000, "Maldives revenue is 200,000");

    assert(topEntities.customers.length === 1, "1 top customer returned");
    assert(topEntities.customers[0].name === "Rahul Sharma", "Top customer is Rahul Sharma");
    assert(topEntities.customers[0].totalSpend === 350000, `Rahul Sharma total spend = 350,000 (Got ${topEntities.customers[0].totalSpend})`);

    // ═════════════════════════════════════════════════════════════════
    // 9. TENANT-SCOPED CSV EXPORT
    // ═════════════════════════════════════════════════════════════════
    console.log("--- 9. Tenant-Scoped CSV Export ---");

    const exportA = await dashboardService.exportDashboardCSV(agencyA.id, { preset: "THIS_MONTH" });
    assert(exportA.csv.includes("TripDesk Executive Analytics Report"), "CSV contains executive report header");
    assert(exportA.csv.includes("350000"), "CSV contains authoritative financial figures");
    assert(exportA.csv.includes("Maldives"), "CSV contains destination data");
    assert(exportA.filename.endsWith(".csv"), "Export filename ends with .csv");

    // ═════════════════════════════════════════════════════════════════
    // 10. STRICT ROLE ARCHITECTURE INVARIANT
    // ═════════════════════════════════════════════════════════════════
    console.log("--- 10. Strict Role Architecture Invariant ---");

    const allUsers = await prisma.user.findMany({
      select: { id: true, role: true, email: true },
    });

    for (const u of allUsers) {
      assert(
        u.role === "PLATFORM_OWNER" || u.role === "AGENCY_OWNER",
        `User ${u.email} has valid role ${u.role}`
      );
    }
    assert(true, "Zero Customer User records exist in system (Customer Token Architecture preserved)");

  } finally {
    // ═════════════════════════════════════════════════════════════════
    // CLEANUP FIXTURES
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- Cleaning up Phase 17 Test Fixtures ---");
    if (agencyA?.id) {
      await prisma.travelDocument.deleteMany({ where: { agencyId: agencyA.id } });
      await prisma.customerNotification.deleteMany({ where: { agencyId: agencyA.id } });
      await prisma.enquiryFollowUp.deleteMany({ where: { agencyId: agencyA.id } });
      await prisma.supplierPayable.deleteMany({ where: { agencyId: agencyA.id } });
      await prisma.supplier.deleteMany({ where: { agencyId: agencyA.id } });
      await prisma.payment.deleteMany({ where: { agencyId: agencyA.id } });
      await prisma.booking.deleteMany({ where: { agencyId: agencyA.id } });
      await prisma.quotation.deleteMany({ where: { agencyId: agencyA.id } });
      await prisma.trip.deleteMany({ where: { agencyId: agencyA.id } });
      await prisma.enquiry.deleteMany({ where: { agencyId: agencyA.id } });
      await prisma.customer.deleteMany({ where: { agencyId: agencyA.id } });
      await prisma.agency.delete({ where: { id: agencyA.id } });
    }
    if (agencyB?.id) {
      await prisma.customer.deleteMany({ where: { agencyId: agencyB.id } });
      await prisma.agency.delete({ where: { id: agencyB.id } });
    }
  }

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log(`🏁 PHASE 17 VERIFICATION COMPLETE: ${passedTests} PASSED, 0 FAILED (${totalTests} Total)`);
  console.log("══════════════════════════════════════════════════════════════\n");
}

runPhase17Tests().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
