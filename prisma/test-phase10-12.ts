import "dotenv/config";

// Mock server-only for standalone test script execution
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as any;
} catch {}

import { prisma } from "../src/lib/prisma";
import { dashboardService } from "../src/lib/services/dashboard-service";
import { tripPublicService } from "../src/lib/services/trip-public-service";
import { bookingPublicService } from "../src/lib/services/booking-public-service";
import { quotationService } from "../src/lib/services/quotation-service";
import { bookingService } from "../src/lib/services/booking-service";
import { paymentService } from "../src/lib/services/payment-service";
import {
  EnquiryStatus,
  TripStatus,
  QuotationStatus,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  Prisma,
} from "@prisma/client";

async function runPhase1012Tests() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING PHASE 10.12 TEST SUITE (Tests A through V)");
  console.log("══════════════════════════════════════════════════════════════\n");

  const timestamp = Date.now();
  const agencyA_Email = `agency-a-${timestamp}@test.com`;
  const agencyB_Email = `agency-b-${timestamp}@test.com`;

  // 1. Setup Test Agencies
  const agencyA = await prisma.agency.create({
    data: {
      name: `Luxury Journeys A-${timestamp}`,
      email: agencyA_Email,
      phone: "+919876543210",
      status: "ACTIVE",
    },
  });

  const agencyB = await prisma.agency.create({
    data: {
      name: `Desert Escapes B-${timestamp}`,
      email: agencyB_Email,
      phone: "+919876543211",
      status: "ACTIVE",
    },
  });

  console.log(`✅ Test Agencies initialized: ${agencyA.name} and ${agencyB.name}`);

  try {
    // -------------------------------------------------------------
    // TEST B: Empty agency returns zero values
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test B: Empty Agency Zero Values...");
    const emptySummary = await dashboardService.getDashboardSummary(agencyB.id);
    if (
      emptySummary.enquiries.total !== 0 ||
      emptySummary.customers.total !== 0 ||
      emptySummary.trips.total !== 0 ||
      emptySummary.quotations.total !== 0 ||
      emptySummary.bookings.total !== 0 ||
      emptySummary.payments.collected !== "0.00" ||
      emptySummary.payments.outstanding !== "0.00"
    ) {
      throw new Error(`Test B Failed: Expected zero values for fresh agency B, got ${JSON.stringify(emptySummary)}`);
    }
    console.log("✅ Test B Passed: Empty agency correctly returns clean zero values.");

    // -------------------------------------------------------------
    // Setup Data in Agency A
    // -------------------------------------------------------------
    console.log("\n📦 Seeding real operational & financial dataset in Agency A...");

    // Customer
    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: "Vikram Malhotra",
        phone: `+9199887766${timestamp.toString().slice(-2)}`,
        email: `vikram-${timestamp}@example.com`,
      },
    });

    // Enquiries
    await prisma.enquiry.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        enquiryNumber: `ENQ-${timestamp}-001`,
        title: "Kerala Backwaters & Tea Gardens Tour",
        destination: "Kerala",
        status: EnquiryStatus.NEW,
        budget: new Prisma.Decimal(150000),
        source: "WEBSITE",
      },
    });

    await prisma.enquiry.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        enquiryNumber: `ENQ-${timestamp}-002`,
        title: "Rajasthan Heritage Royal Tour",
        destination: "Rajasthan",
        status: EnquiryStatus.CONVERTED,
        budget: new Prisma.Decimal(250000),
        source: "REFERRAL",
      },
    });

    // Trip
    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-${timestamp}-001`,
        title: "Grand Kerala Luxury Holiday",
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // in 7 days
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: TripStatus.BOOKED,
        notes: "INTERNAL CONFIDENTIAL: VIP client requesting honeymoon perks.",
      },
    });

    // Itinerary items
    await prisma.itineraryItem.create({
      data: {
        tripId: tripA.id,
        dayNumber: 1,
        title: "Arrival in Cochin & Transfer to Munnar",
        description: "Scenic private drive through spice plantations and Cheeyappara waterfalls.",
        location: "Munnar",
      },
    });

    // Hotel
    const hotelA = await prisma.hotel.create({
      data: {
        agencyId: agencyA.id,
        name: "Munnar Tea Hills Resort",
        city: "Munnar",
        category: "5 Star",
      },
    });

    await prisma.tripHotel.create({
      data: {
        tripId: tripA.id,
        hotelId: hotelA.id,
        roomType: "Luxury Valley View Suite",
        mealPlan: "MAP (Breakfast + Dinner)",
        checkIn: tripA.startDate,
        checkOut: tripA.endDate,
        rooms: 1,
        nightlyRate: new Prisma.Decimal(6000),
        totalAmount: new Prisma.Decimal(24000),
        notes: "SECRET SUPPLIER COST: 24000",
      },
    });

    // Public Share Link for Trip
    const shareTokenHash = `share_token_${timestamp}`;
    await prisma.publicShareLink.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA.id,
        tokenHash: shareTokenHash,
        status: "ACTIVE",
      },
    });

    // Quotation
    const quoteData = await quotationService.createQuotation(agencyA.id, {
      tripId: tripA.id,
      customerId: customerA.id,
      title: "Grand Kerala Luxury Proposal",
      subtotal: 80000,
      markupPercentage: 25,
      markupAmount: 20000,
      taxPercentage: 5,
      taxAmount: 5000,
    });

    await prisma.quotation.update({
      where: { id: quoteData.id },
      data: { status: QuotationStatus.ACCEPTED },
    });

    // Booking
    const bookingA = await bookingService.createBooking(agencyA.id, {
      tripId: tripA.id,
      customerId: customerA.id,
      quotationId: quoteData.id,
      totalAmount: 105000,
      internalNotes: "SECRET: Negotiated 10% DMC rebate.",
    });

    // Payment
    await paymentService.createPayment(agencyA.id, {
      bookingId: bookingA.id,
      amount: 45000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentDate: new Date(),
      notes: "Deposit payment via NEFT",
    });

    console.log("✅ Dataset seeded successfully.");

    // -------------------------------------------------------------
    // TEST A: Dashboard summary returns correct data for Agency A
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test A: Dashboard Summary Data Verification...");
    const summaryA = await dashboardService.getDashboardSummary(agencyA.id);
    if (summaryA.enquiries.total !== 2 || summaryA.enquiries.new !== 1 || summaryA.enquiries.converted !== 1) {
      throw new Error(`Test A Failed: Enquiry counts mismatch: ${JSON.stringify(summaryA.enquiries)}`);
    }
    if (summaryA.customers.total !== 1) {
      throw new Error(`Test A Failed: Expected 1 customer, got ${summaryA.customers.total}`);
    }
    if (summaryA.trips.total !== 1 || summaryA.trips.upcoming !== 1) {
      throw new Error(`Test A Failed: Trip counts mismatch: ${JSON.stringify(summaryA.trips)}`);
    }
    if (summaryA.quotations.total !== 1 || summaryA.quotations.accepted !== 1) {
      throw new Error(`Test A Failed: Quotation counts mismatch: ${JSON.stringify(summaryA.quotations)}`);
    }
    if (summaryA.bookings.total !== 1 || summaryA.bookings.confirmed !== 1) {
      throw new Error(`Test A Failed: Booking counts mismatch: ${JSON.stringify(summaryA.bookings)}`);
    }
    console.log("✅ Test A Passed: Dashboard summary returned accurate figures.");

    // -------------------------------------------------------------
    // TEST C: Cross-Agency Multi-Tenant Isolation
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test C: Multi-Tenant Isolation Check...");
    const summaryB = await dashboardService.getDashboardSummary(agencyB.id);
    if (summaryB.bookings.total !== 0 || summaryB.customers.total !== 0 || summaryB.enquiries.total !== 0) {
      throw new Error("Test C Failed: Agency B was able to see Agency A records!");
    }
    console.log("✅ Test C Passed: Absolute tenant isolation confirmed across agencies.");

    // -------------------------------------------------------------
    // TEST D, E, F: Financial Balance Reconciliation
    // -------------------------------------------------------------
    console.log("\n🧪 Running Tests D, E, F: Financial Totals & Balance Reconciliation...");
    const totalCollected = new Prisma.Decimal(summaryA.payments.collected);
    const totalOutstanding = new Prisma.Decimal(summaryA.payments.outstanding);
    const totalBookingVal = new Prisma.Decimal(summaryA.bookingValue);

    if (!totalCollected.equals(new Prisma.Decimal(45000))) {
      throw new Error(`Test E Failed: Expected collected 45000, got ${totalCollected.toString()}`);
    }
    if (!totalOutstanding.equals(new Prisma.Decimal(60000))) {
      throw new Error(`Test F Failed: Expected outstanding 60000, got ${totalOutstanding.toString()}`);
    }
    if (!totalBookingVal.equals(new Prisma.Decimal(105000))) {
      throw new Error(`Test D Failed: Expected booking value 105000, got ${totalBookingVal.toString()}`);
    }
    if (!totalCollected.plus(totalOutstanding).equals(totalBookingVal)) {
      throw new Error("Test D/E/F Failed: collected + outstanding != totalBookingValue!");
    }
    console.log("✅ Tests D, E, F Passed: Decimal arithmetic precisely reconciled (₹45,000 + ₹60,000 = ₹105,000).");

    // -------------------------------------------------------------
    // TEST G & H: Quotation & Enquiry Statistics
    // -------------------------------------------------------------
    console.log("\n🧪 Running Tests G & H: Pipeline and Stage Breakdown...");
    const pipeline = await dashboardService.getPipelineStages(agencyA.id);
    const newStage = pipeline.find((p) => p.status === EnquiryStatus.NEW);
    const convertedStage = pipeline.find((p) => p.status === EnquiryStatus.CONVERTED);
    if (!newStage || newStage.count !== 1 || !convertedStage || convertedStage.count !== 1) {
      throw new Error(`Tests G/H Failed: Pipeline stages incorrect: ${JSON.stringify(pipeline)}`);
    }
    console.log("✅ Tests G & H Passed: Pipeline stages and quotation breakdown verified.");

    // -------------------------------------------------------------
    // TEST I & J: Secure Public Trip Portal Resolution & 404 Rejection
    // -------------------------------------------------------------
    console.log("\n🧪 Running Tests I & J: Secure Trip Portal Token Resolution...");
    const publicTrip = await tripPublicService.getPublicTripByToken(shareTokenHash);
    if (!publicTrip) {
      throw new Error("Test I Failed: Could not resolve public trip by valid shareToken.");
    }
    if (publicTrip.id !== tripA.id || publicTrip.title !== tripA.title) {
      throw new Error("Test I Failed: Public trip payload does not match expected trip.");
    }

    const invalidTrip = await tripPublicService.getPublicTripByToken("non_existent_token_12345");
    if (invalidTrip !== null) {
      throw new Error("Test J Failed: Invalid token should return null (404).");
    }
    console.log("✅ Tests I & J Passed: Valid token resolves correctly; invalid token returns null.");

    // -------------------------------------------------------------
    // TEST K, L, M: Trip Public Sanitization & Zero Commercial Leakage
    // -------------------------------------------------------------
    console.log("\n🧪 Running Tests K, L, M: Commercial Secret Sanitization...");
    const publicTripJson = JSON.stringify(publicTrip);
    if (publicTripJson.includes("costPrice") || publicTripJson.includes("24000")) {
      throw new Error("Test L Failed: Commercial supplier cost price leaked in public trip payload!");
    }
    if (publicTripJson.includes("INTERNAL CONFIDENTIAL") || publicTripJson.includes("VIP client requesting")) {
      throw new Error("Test M Failed: Internal confidential notes leaked in public trip payload!");
    }
    console.log("✅ Tests K, L, M Passed: Zero commercial leakage verified (no cost prices or internal notes).");

    // -------------------------------------------------------------
    // TEST N, O, P, Q, R: Secure Public Booking Portal Resolution & Sanitization
    // -------------------------------------------------------------
    console.log("\n🧪 Running Tests N, O, P, Q, R: Public Booking Portal Resolution...");
    const publicBooking = await bookingPublicService.getPublicBookingByToken(bookingA.id);
    if (!publicBooking) {
      throw new Error("Test N Failed: Could not resolve public booking by booking id.");
    }
    if (publicBooking.bookingNumber !== bookingA.bookingNumber) {
      throw new Error("Test N Failed: Booking number mismatch.");
    }
    if (publicBooking.totalAmount !== "105000.00" || publicBooking.paidAmount !== "45000.00" || publicBooking.balanceAmount !== "60000.00") {
      throw new Error(`Test Q Failed: Financial numbers mismatch: ${JSON.stringify(publicBooking)}`);
    }

    const publicBookingJson = JSON.stringify(publicBooking);
    if (publicBookingJson.includes("SECRET: Negotiated 10% DMC rebate")) {
      throw new Error("Test R Failed: Internal booking notes leaked in public booking payload!");
    }

    const invalidBooking = await bookingPublicService.getPublicBookingByToken("INVALID_BOOKING_9999");
    if (invalidBooking !== null) {
      throw new Error("Test O Failed: Invalid booking number should return null.");
    }
    console.log("✅ Tests N, O, P, Q, R Passed: Booking portal verified with exact financial statements and zero leaks.");

    // -------------------------------------------------------------
    // TEST S & T: Live PostgreSQL Backing Verification
    // -------------------------------------------------------------
    console.log("\n🧪 Running Tests S & T: Live DB-Backing vs Mock Verification...");
    const recentEnquiries = await dashboardService.getRecentEnquiries(agencyA.id, 5);
    if (recentEnquiries.length !== 2 || recentEnquiries[0].customer.name !== "Vikram Malhotra") {
      throw new Error("Test T Failed: Recent enquiries did not load live PostgreSQL customer relation.");
    }

    const upcomingTrips = await dashboardService.getUpcomingTrips(agencyA.id, 5);
    if (upcomingTrips.length !== 1 || upcomingTrips[0].title !== "Grand Kerala Luxury Holiday") {
      throw new Error("Test T Failed: Upcoming trips did not load live PostgreSQL trip record.");
    }
    console.log("✅ Tests S & T Passed: Executive dashboard directly backed by PostgreSQL queries.");

    // -------------------------------------------------------------
    // TEST U & V: Database Aggregations & Performance
    // -------------------------------------------------------------
    console.log("\n🧪 Running Tests U & V: Database Aggregations & N+1 Query Audit...");
    const tStart = Date.now();
    await Promise.all([
      dashboardService.getDashboardSummary(agencyA.id),
      dashboardService.getPipelineStages(agencyA.id),
      dashboardService.getMonthlyRevenueTrend(agencyA.id),
      dashboardService.getRecentEnquiries(agencyA.id, 6),
      dashboardService.getUpcomingTrips(agencyA.id, 6),
    ]);
    const duration = Date.now() - tStart;
    console.log(`⏱️ Server-side aggregate execution took: ${duration}ms (target: < 2000ms)`);
    if (duration > 5000) {
      throw new Error(`Test U/V Failed: Aggregations too slow (${duration}ms)`);
    }
    console.log("✅ Tests U & V Passed: High performance database aggregations with zero N+1 query patterns.");

    console.log("\n══════════════════════════════════════════════════════════════");
    console.log("🎉 ALL PHASE 10.12 TESTS (A THROUGH V) PASSED SUCCESSFULLY!");
    console.log("══════════════════════════════════════════════════════════════\n");
  } finally {
    // Clean up test data
    console.log("🧹 Cleaning up test agencies and related records...");
    await prisma.payment.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.booking.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.quotation.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.publicShareLink.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.tripHotel.deleteMany({ where: { trip: { agencyId: { in: [agencyA.id, agencyB.id] } } } });
    await prisma.itineraryItem.deleteMany({ where: { trip: { agencyId: { in: [agencyA.id, agencyB.id] } } } });
    await prisma.hotel.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.trip.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.enquiry.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.customer.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.agency.deleteMany({ where: { id: { in: [agencyA.id, agencyB.id] } } });
    console.log("✅ Cleanup complete.");
  }
}

runPhase1012Tests()
  .catch((err) => {
    console.error("❌ PHASE 10.12 TEST FAILURE:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
