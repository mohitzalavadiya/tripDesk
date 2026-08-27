import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  UserRole,
  EnquiryStatus,
  TripStatus,
  QuotationStatus,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  SupplierStatus,
  RateStatus,
  Prisma,
} from "@prisma/client";
import { dashboardService } from "../src/lib/services/dashboard-service";
import { enquiryService } from "../src/lib/services/enquiry-service";
import { customerService } from "../src/lib/services/customer-service";
import { tripService } from "../src/lib/services/trip-service";
import { supplierService } from "../src/lib/services/supplier-service";
import { rateSheetService } from "../src/lib/services/rate-sheet-service";
import { tripCostingService } from "../src/lib/services/trip-costing-service";
import { quotationService } from "../src/lib/services/quotation-service";
import { bookingService } from "../src/lib/services/booking-service";
import { paymentService } from "../src/lib/services/payment-service";
import { operationsService } from "../src/lib/services/operations-service";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runQA03FunctionalAudit() {
  console.log("===============================================================================");
  console.log("  TRIPDESK QA-03 — FULL APPLICATION FUNCTIONAL & DATA AUDIT TEST SUITE");
  console.log("===============================================================================\n");

  // Retrieve primary test agency
  const testAgency = await prisma.agency.findFirst({
    where: { status: "ACTIVE" },
    include: { users: true },
  });

  if (!testAgency) {
    throw new Error("No active agency found in database to run functional test suite.");
  }
  const agencyId = testAgency.id;
  const agencyUser = testAgency.users[0];
  console.log(`🏢 Active Test Agency: "${testAgency.name}" (${agencyId})`);
  console.log(`👤 Agency User: "${agencyUser?.email}" (${agencyUser?.role})\n`);

  // -------------------------------------------------------------------------
  // 1. QA-03-B: Dashboard Summary & Pipeline Metrics
  // -------------------------------------------------------------------------
  console.log("▶ [QA-03-B] Dashboard Metrics & Aggregations");
  const summary = await dashboardService.getDashboardSummary(agencyId);
  const pipeline = await dashboardService.getPipelineStages(agencyId);
  const revenueTrend = await dashboardService.getMonthlyRevenueTrend(agencyId);

  if (typeof summary.enquiries.total !== "number" || typeof summary.bookings.total !== "number") {
    throw new Error("[QA-03-B] Dashboard summary aggregation failed!");
  }
  if (!Array.isArray(pipeline) || pipeline.length === 0) {
    throw new Error("[QA-03-B] Pipeline stages failed to generate!");
  }
  if (!Array.isArray(revenueTrend) || revenueTrend.length !== 6) {
    throw new Error("[QA-03-B] 6-month revenue trend calculation failed!");
  }
  console.log(`  ✔ Total Enquiries: ${summary.enquiries.total} | Active Trips: ${summary.trips.active} | Bookings: ${summary.bookings.total}`);
  console.log(`  ✔ Pipeline Value: ₹${summary.enquiries.pipelineValue} | Collections: ₹${summary.payments.collected}`);
  console.log(`  ✔ 6-Month Revenue Trend successfully computed (${revenueTrend.length} periods).`);

  // -------------------------------------------------------------------------
  // 2. QA-03-C & D: CRM Customer & Enquiry CRUD Workflow
  // -------------------------------------------------------------------------
  console.log("\n▶ [QA-03-C & D] Customer & Enquiry Management");
  const testCustomerEmail = `qa03.client.${Date.now()}@example.com`;
  const createdCustomer = await customerService.createCustomer(agencyId, {
    name: "Aarav Sharma",
    email: testCustomerEmail,
    phone: "+91 98200 11223",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
  });

  if (!createdCustomer || !createdCustomer.id) {
    throw new Error("[QA-03-D] Failed to create customer record!");
  }
  console.log(`  ✔ Customer Created: "${createdCustomer.name}" (${createdCustomer.phone})`);

  // Duplicate phone/email detection
  const isDuplicate = await customerService.checkDuplicateCustomer(agencyId, {
    email: testCustomerEmail,
    phone: "+91 98200 11223",
  });
  if (isDuplicate.matchCount === 0) {
    throw new Error("[QA-03-D] Duplicate check failed to detect existing email/phone!");
  }
  console.log(`  ✔ Duplicate Detection Check: PASS (Correctly identified matching profile)`);

  // Create Enquiry
  const createdEnquiry = await enquiryService.createEnquiry(agencyId, {
    customerId: createdCustomer.id,
    title: "Kerala Luxury Monsoon Escape",
    destination: "Munnar & Alleppey",
    adults: 2,
    children: 1,
    startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    budget: new Prisma.Decimal(120000),
    currency: "INR",
    source: "WEBSITE",
    notes: "Requires river-view villa and private chauffeur.",
  });

  if (!createdEnquiry || !createdEnquiry.enquiryNumber) {
    throw new Error("[QA-03-C] Failed to create enquiry record!");
  }
  console.log(`  ✔ Enquiry Created: REF ${createdEnquiry.enquiryNumber} - "${createdEnquiry.title}"`);

  // Create Follow-up
  const followUp = await enquiryService.createFollowUp(agencyId, createdEnquiry.id, {
    type: "CALL",
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    notes: "Call client to review hotel category preferences.",
  });
  console.log(`  ✔ Follow-Up Scheduled: ${followUp.type} on ${followUp.scheduledAt.toISOString().split("T")[0]}`);

  // -------------------------------------------------------------------------
  // 3. QA-03-E & F: Trip Creation & Itinerary Architecture
  // -------------------------------------------------------------------------
  console.log("\n▶ [QA-03-E & F] Trip & Itinerary Architecture");
  const createdTrip = await tripService.createTrip(agencyId, {
    customerId: createdCustomer.id,
    title: "Kerala Royal Backwaters & Tea Hills",
    destination: "Kerala",
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
    adults: 2,
    children: 1,
    notes: "Honeymoon / anniversary setup requested.",
  });

  if (!createdTrip || !createdTrip.tripNumber) {
    throw new Error("[QA-03-E] Trip creation failed!");
  }
  console.log(`  ✔ Trip Created: ${createdTrip.tripNumber} - "${createdTrip.title}"`);

  // Add Itinerary Items
  const day1 = await prisma.itineraryItem.create({
    data: {
      tripId: createdTrip.id,
      dayNumber: 1,
      date: createdTrip.startDate,
      title: "Arrival in Cochin & Scenic Transfer to Munnar",
      description: "Pick up from Cochin International Airport, scenic drive through Cheeyappara waterfalls to Munnar tea estate.",
      location: "Cochin to Munnar",
      sortOrder: 1,
    },
  });

  const day2 = await prisma.itineraryItem.create({
    data: {
      tripId: createdTrip.id,
      dayNumber: 2,
      date: new Date(createdTrip.startDate.getTime() + 24 * 60 * 60 * 1000),
      title: "Munnar Tea Plantations & Eravikulam National Park",
      description: "Morning guided tea tasting session followed by wildlife safari at Eravikulam National Park.",
      location: "Munnar",
      sortOrder: 2,
    },
  });
  console.log(`  ✔ Itinerary Days Configured: Day 1 (${day1.title}) & Day 2 (${day2.title})`);

  // -------------------------------------------------------------------------
  // 4. QA-03-G & H: Supplier Network & Rate Sheets
  // -------------------------------------------------------------------------
  console.log("\n▶ [QA-03-G & H] Suppliers & Commercial Rate Sheets");
  const testSupplier = await supplierService.createSupplier(agencyId, {
    name: "Spice Valley Resorts & Hospitality",
    type: "HOTEL",
    email: "reservations@spicevalleyresorts.com",
    phone: "+91 4865 230001",
    city: "Munnar",
    state: "Kerala",
    country: "India",
  });

  if (!testSupplier || !testSupplier.id) {
    throw new Error("[QA-03-G] Failed to create supplier!");
  }
  console.log(`  ✔ Supplier Registered: "${testSupplier.name}" (${testSupplier.type})`);

  const testRateSheet = await rateSheetService.createRateSheet(agencyId, {
    inventoryType: "HOTEL",
    supplierId: testSupplier.id,
    name: "Spice Valley FY26 Contract Rates",
    roomType: "Valley View Luxury Suite",
    mealPlan: "CP (Breakfast)",
    costPrice: 8500,
    taxPercentage: 12,
    validFrom: new Date("2026-01-01"),
    validTo: new Date("2026-12-31"),
    currency: "INR",
  });
  console.log(`  ✔ Active Rate Sheet Attached: "${testRateSheet.name}" (${testRateSheet.rateSheetNumber})`);

  // -------------------------------------------------------------------------
  // 5. QA-03-I, J & K: Costing Engine, Quotations & Public Proposal Portal
  // -------------------------------------------------------------------------
  console.log("\n▶ [QA-03-I, J & K] Costing Engine, Quotations & Proposal Security");
  // Create Hotel Master and link to trip
  const hotelMaster = await prisma.hotel.create({
    data: {
      agencyId,
      supplierId: testSupplier.id,
      name: "Spice Valley Resort",
      city: "Munnar",
      state: "Kerala",
      country: "India",
    },
  });

  const tripHotel = await prisma.tripHotel.create({
    data: {
      tripId: createdTrip.id,
      hotelId: hotelMaster.id,
      roomType: "Valley View Luxury Suite",
      mealPlan: "CP (Breakfast)",
      checkIn: createdTrip.startDate,
      checkOut: createdTrip.endDate,
      rooms: 1,
      nightlyRate: new Prisma.Decimal(8500),
      totalAmount: new Prisma.Decimal(42500),
    },
  });

  // Calculate Costing
  const costing = await tripCostingService.calculateTripCosting(agencyId, createdTrip.id);
  if (!costing || costing.subtotal <= 0) {
    throw new Error("[QA-03-I] Costing calculation returned invalid subtotal!");
  }
  console.log(`  ✔ Costing Subtotal: ₹${costing.subtotal.toLocaleString("en-IN")} (${costing.hotels.length} hotel accommodations)`);

  // Generate Quotation Proposal
  const quotation = await quotationService.generateQuotationFromTrip(agencyId, createdTrip.id, {
    markupPercentage: 15,
    taxPercentage: 5,
  });

  if (!quotation || !quotation.quotationNumber || !quotation.shareToken) {
    throw new Error("[QA-03-J] Quotation proposal generation failed!");
  }
  console.log(`  ✔ Quotation Generated: ${quotation.quotationNumber} (Selling Price: ₹${Number(quotation.finalAmount).toLocaleString("en-IN")})`);

  // Public Sanitized Proposal Check
  const publicProposal = await quotationService.getPublicQuotationByToken(quotation.shareToken);
  if (!publicProposal) {
    throw new Error("[QA-03-K] Public proposal lookup by token failed!");
  }

  // Verify Zero Commercial Secret Leakage
  const hasCostPrice = (publicProposal.items as any[])?.some((i) => i.costPrice !== undefined);
  const hasMarkup = (publicProposal.items as any[])?.some((i) => i.markupPercentage !== undefined);
  if (hasCostPrice || hasMarkup) {
    throw new Error("[QA-03-K] CRITICAL: Commercial secrets (costPrice/markup) leaked in public proposal payload!");
  }
  console.log(`  ✔ Public Proposal Portal Security: PASS (All internal supplier costs and markups strictly stripped)`);

  // -------------------------------------------------------------------------
  // 6. QA-03-L & M: Quotation Acceptance, Bookings & Financial Ledger
  // -------------------------------------------------------------------------
  console.log("\n▶ [QA-03-L & M] Bookings & Payment Transactions");
  const booking = await bookingService.convertQuotationToBooking(agencyId, quotation.id, {
    notes: "Booking confirmed via client proposal portal.",
  });

  if (!booking || !booking.bookingNumber) {
    throw new Error("[QA-03-L] Failed to convert quotation to confirmed booking!");
  }
  console.log(`  ✔ Booking Confirmed: ${booking.bookingNumber} | Status: ${booking.status}`);
  console.log(`  ✔ Total Booking Amount: ₹${Number(booking.totalAmount).toLocaleString("en-IN")} | Balance: ₹${Number(booking.balanceAmount).toLocaleString("en-IN")}`);

  // Record Advance Payment
  const advancePayment = await paymentService.createPayment(agencyId, {
    bookingId: booking.id,
    amount: 25000,
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    referenceNumber: `TXN-QA03-${Date.now()}`,
    notes: "25k Advance token deposit received.",
  });

  const refreshedBooking = await prisma.booking.findUnique({
    where: { id: booking.id },
  });

  if (!refreshedBooking || Number(refreshedBooking.paidAmount) !== 25000) {
    throw new Error("[QA-03-M] Payment recording failed to update booking paid balance!");
  }
  console.log(`  ✔ Payment Recorded: ₹25,000 via ${advancePayment.paymentMethod} (Ref: ${advancePayment.referenceNumber})`);
  console.log(`  ✔ Updated Booking Balance: Paid ₹${Number(refreshedBooking.paidAmount).toLocaleString("en-IN")} / Remaining ₹${Number(refreshedBooking.balanceAmount).toLocaleString("en-IN")}`);

  // -------------------------------------------------------------------------
  // 7. QA-03-N: Trip Operations & Service Confirmations
  // -------------------------------------------------------------------------
  console.log("\n▶ [QA-03-N] Trip Operations & Operational Readiness");
  const operation = await operationsService.initializeOperation(agencyId, {
    tripId: createdTrip.id,
    bookingId: booking.id,
    status: "PREPARING",
  });

  if (!operation || !operation.id) {
    throw new Error("[QA-03-N] Operations initialization failed!");
  }
  console.log(`  ✔ Trip Operation Initialized (ID: ${operation.id}) with Status: ${operation.status}`);

  const readiness = await operationsService.calculateReadiness(agencyId, operation.id);
  console.log(`  ✔ Operational Readiness Score: ${readiness.score}% (Hotels: ${readiness.confirmedHotels}/${readiness.totalHotels} confirmed)`);

  // -------------------------------------------------------------------------
  // 8. Clean up test records
  // -------------------------------------------------------------------------
  console.log("\n▶ Cleaning up QA-03 transient test artifacts...");
  await prisma.payment.deleteMany({ where: { bookingId: booking.id } });
  await prisma.hotelConfirmation.deleteMany({ where: { tripOperationId: operation.id } });
  await prisma.vehicleDispatch.deleteMany({ where: { tripOperationId: operation.id } });
  await prisma.activityConfirmation.deleteMany({ where: { tripOperationId: operation.id } });
  await prisma.operationEvent.deleteMany({ where: { tripOperationId: operation.id } });
  await prisma.tripOperation.deleteMany({ where: { id: operation.id } });
  await prisma.booking.deleteMany({ where: { id: booking.id } });
  await prisma.quotationItem.deleteMany({ where: { quotationId: quotation.id } });
  await prisma.quotationPaymentMilestone.deleteMany({ where: { quotationId: quotation.id } });
  await prisma.quotationPackageOption.deleteMany({ where: { quotationId: quotation.id } });
  await prisma.quotation.deleteMany({ where: { id: quotation.id } });
  await prisma.tripHotel.deleteMany({ where: { tripId: createdTrip.id } });
  await prisma.itineraryItem.deleteMany({ where: { tripId: createdTrip.id } });
  await prisma.trip.deleteMany({ where: { id: createdTrip.id } });
  await prisma.enquiryFollowUp.deleteMany({ where: { enquiryId: createdEnquiry.id } });
  await prisma.enquiry.deleteMany({ where: { id: createdEnquiry.id } });
  await prisma.rateSheet.deleteMany({ where: { id: testRateSheet.id } });
  await prisma.hotel.deleteMany({ where: { id: hotelMaster.id } });
  await prisma.supplier.deleteMany({ where: { id: testSupplier.id } });
  await prisma.customer.deleteMany({ where: { id: createdCustomer.id } });
  console.log("  ✔ Clean-up complete.");

  console.log("\n===============================================================================");
  console.log("🎉 ALL QA-03 FULL APPLICATION FUNCTIONAL & AUDIT TESTS PASSED (100% SUCCESS)!");
  console.log("===============================================================================");
}

runQA03FunctionalAudit()
  .catch((err) => {
    console.error("\n❌ QA-03 FUNCTIONAL AUDIT FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
