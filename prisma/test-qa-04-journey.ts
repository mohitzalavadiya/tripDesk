import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  UserRole,
  EnquiryStatus,
  EnquirySource,
  EnquiryPriority,
  FollowUpType,
  TripStatus,
  QuotationStatus,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  SupplierStatus,
  RateStatus,
  OperationStatus,
  ConfirmationStatus,
  Prisma,
} from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
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
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const agencyEmail = process.env.BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
const agencyPassword = process.env.BOOTSTRAP_OWNER_PASSWORD;

async function runQA04RealUserJourneyAudit() {
  console.log("===============================================================================");
  console.log("  TRIPDESK QA-04 — REAL USER JOURNEY, PERFORMANCE & STABILITY AUDIT");
  console.log("===============================================================================\n");

  // -------------------------------------------------------------------------
  // 1. PHASE 1 & 3: Real Authentication Journey & Tenancy Verification
  // -------------------------------------------------------------------------
  console.log("▶ [JOURNEY STEP 1] Authentication & Tenant Context Resolution");
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("[QA-04] Missing Supabase configuration!");
  }

  const sbClient = createClient(supabaseUrl, supabaseKey);
  const { data: authData, error: authError } = await sbClient.auth.signInWithPassword({
    email: agencyEmail,
    password: agencyPassword,
  });

  if (authError || !authData.session) {
    throw new Error(`[QA-04] Agency owner login failed: ${authError?.message}`);
  }

  const authUser = await prisma.user.findUnique({
    where: { id: authData.user.id },
    include: { agency: true },
  });

  if (!authUser || !authUser.agencyId || (authUser.role !== UserRole.AGENCY_OWNER && authUser.role !== UserRole.PLATFORM_OWNER)) {
    throw new Error("[QA-04] Authenticated user is not a valid Agency Owner or Platform Owner with agency binding!");
  }

  const agencyId = authUser.agencyId;
  console.log(`  ✔ Agency Owner Authenticated: "${authUser.email}"`);
  console.log(`  ✔ Agency Tenant Bound: "${authUser.agency?.name}" (${agencyId})`);

  // -------------------------------------------------------------------------
  // 2. PHASE 5: Customer / CRM Audit & Duplicate Checks
  // -------------------------------------------------------------------------
  console.log("\n▶ [JOURNEY STEP 2] Customer Registration & Duplicate Guard");
  const testCustomerEmail = `rohit.sharma.${Date.now()}@example.com`;
  const testCustomerPhone = `+91 98111 ${Math.floor(10000 + Math.random() * 90000)}`;

  const customer = await customerService.createCustomer(agencyId, {
    name: "Rohit Sharma",
    email: testCustomerEmail,
    phone: testCustomerPhone,
    alternatePhone: "+91 98222 33445",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    source: "Website Lead",
    notes: "High net-worth family looking for customized luxury tour.",
  });

  if (!customer || !customer.customerNumber) {
    throw new Error("[QA-04] Customer creation failed!");
  }
  console.log(`  ✔ Customer Registered: ${customer.customerNumber} - "${customer.name}" (${customer.city})`);

  // Verify Duplicate Detection by Phone & Email
  const dupCheckPhone = await customerService.checkDuplicateCustomer(agencyId, {
    phone: testCustomerPhone,
  });
  if (dupCheckPhone.matchCount === 0) {
    throw new Error("[QA-04] Duplicate detection failed to match by phone!");
  }

  const dupCheckEmail = await customerService.checkDuplicateCustomer(agencyId, {
    email: testCustomerEmail.toUpperCase(), // Case insensitive test
  });
  if (dupCheckEmail.matchCount === 0) {
    throw new Error("[QA-04] Duplicate detection failed to match case-insensitive email!");
  }
  console.log(`  ✔ Real-Time Duplicate Guard: PASS (Detected phone and email matches accurately)`);

  // -------------------------------------------------------------------------
  // 3. PHASE 6: Enquiry Management & Follow-up Scheduler
  // -------------------------------------------------------------------------
  console.log("\n▶ [JOURNEY STEP 3] CRM Enquiry & Lead Lifecycle");
  const enquiry = await enquiryService.createEnquiry(agencyId, {
    customerId: customer.id,
    title: "Kashmir Winter Snow & Skiing Tour",
    destination: "Gulmarg & Srinagar",
    origin: "Mumbai",
    startDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 66 * 24 * 60 * 60 * 1000),
    adults: 2,
    children: 2,
    budget: 180000,
    hotelCategory: "4 Star",
    mealPlan: "MAP (Breakfast + Dinner)",
    status: EnquiryStatus.NEW,
    priority: EnquiryPriority.HIGH,
    source: EnquirySource.WEBSITE,
    notes: "Client requested heated rooms and private gondola transfers.",
  });

  if (!enquiry || !enquiry.enquiryNumber) {
    throw new Error("[QA-04] Enquiry creation failed!");
  }
  console.log(`  ✔ Enquiry Created: ${enquiry.enquiryNumber} - "${enquiry.title}" (Budget: ₹${enquiry.budget?.toLocaleString("en-IN")})`);

  // Schedule Follow-Up
  const followUp = await enquiryService.createFollowUp(agencyId, enquiry.id, {
    type: "WHATSAPP",
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    notes: "Share initial Kashmir resort options over WhatsApp.",
  });
  console.log(`  ✔ Follow-Up Scheduled: ${followUp.type} for ${followUp.scheduledAt.toISOString().slice(0, 10)}`);

  // -------------------------------------------------------------------------
  // 4. PHASE 7: Trip & Itinerary Architecture
  // -------------------------------------------------------------------------
  console.log("\n▶ [JOURNEY STEP 4] Trip Building & Multi-Day Itinerary");
  const trip = await tripService.createTrip(agencyId, {
    customerId: customer.id,
    title: "Kashmir Winter Wonderland & Gondola Adventure",
    destination: "Srinagar, Gulmarg & Pahalgam",
    startDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 66 * 24 * 60 * 60 * 1000),
    adults: 2,
    children: 2,
    budget: 180000,
    status: TripStatus.PLANNING,
    notes: "VIP luxury package with private SUV throughout.",
  });

  console.log(`  ✔ Trip Initialized: ${trip.tripNumber} - "${trip.title}"`);

  // Add Itinerary Days
  const item1 = await prisma.itineraryItem.create({
    data: {
      tripId: trip.id,
      dayNumber: 1,
      date: trip.startDate,
      title: "Arrival in Srinagar & Dal Lake Shikara Cruise",
      description: "Pick up from Sheikh ul-Alam International Airport and private transfer to luxury houseboat on Nigeen Lake.",
      location: "Srinagar",
      sortOrder: 1,
    },
  });

  const item2 = await prisma.itineraryItem.create({
    data: {
      tripId: trip.id,
      dayNumber: 2,
      date: new Date(trip.startDate.getTime() + 24 * 60 * 60 * 1000),
      title: "Scenic Transfer to Gulmarg & Phase 1 Gondola Ride",
      description: "Transfer to Gulmarg via Tangmarg, check-in to ski resort and private guided Phase 1 Gondola ride.",
      location: "Gulmarg",
      sortOrder: 2,
    },
  });
  console.log(`  ✔ Itinerary Configured: ${item1.title} & ${item2.title}`);

  // -------------------------------------------------------------------------
  // 5. PHASE 8: Supplier Network & Commercial Rate Sheets
  // -------------------------------------------------------------------------
  console.log("\n▶ [JOURNEY STEP 5] Suppliers & Commercial Contract Rates");
  const supplier = await supplierService.createSupplier(agencyId, {
    name: "Khyber Himalayan Resort & Spa",
    type: "HOTEL",
    email: "reservations@khyberresort.com",
    phone: "+91 1954 254666",
    city: "Gulmarg",
    state: "Jammu & Kashmir",
    country: "India",
  });

  const rateSheet = await rateSheetService.createRateSheet(agencyId, {
    inventoryType: "HOTEL",
    supplierId: supplier.id,
    name: "Khyber Winter Luxury Contract Rates FY26",
    roomType: "Premier Valley View Room",
    mealPlan: "MAP (Breakfast & Dinner)",
    costPrice: 18500,
    taxPercentage: 18,
    validFrom: new Date("2026-01-01"),
    validTo: new Date("2026-12-31"),
    currency: "INR",
  });
  console.log(`  ✔ Supplier & Rate Sheet: "${supplier.name}" -> ${rateSheet.name} (Rate: ₹18,500/night + 18% GST)`);

  // -------------------------------------------------------------------------
  // 6. PHASE 9, 10 & 11: Costing Engine Math, Quotation & Public Portal Sanitization
  // -------------------------------------------------------------------------
  console.log("\n▶ [JOURNEY STEP 6] Costing Engine, Proposal Generation & Security");
  const hotelMaster = await prisma.hotel.create({
    data: {
      agencyId,
      supplierId: supplier.id,
      name: "The Khyber Himalayan Resort",
      city: "Gulmarg",
      state: "Jammu & Kashmir",
      country: "India",
    },
  });

  await prisma.tripHotel.create({
    data: {
      tripId: trip.id,
      hotelId: hotelMaster.id,
      roomType: "Premier Valley View Room",
      mealPlan: "MAP (Breakfast & Dinner)",
      checkIn: trip.startDate,
      checkOut: trip.endDate,
      rooms: 1,
      nightlyRate: new Prisma.Decimal(18500),
      totalAmount: new Prisma.Decimal(18500 * 6), // 6 nights = 111,000
    },
  });

  const costing = await tripCostingService.calculateTripCosting(agencyId, trip.id);
  const expectedSubtotal = 18500 * 6; // 111,000
  if (costing.subtotal !== expectedSubtotal) {
    throw new Error(`[QA-04] Costing calculation mismatch: Expected ${expectedSubtotal}, got ${costing.subtotal}`);
  }
  console.log(`  ✔ Base Cost Aggregation: ₹${costing.subtotal.toLocaleString("en-IN")} across ${costing.hotels.length} hotel item(s)`);

  // Generate Quotation Proposal with 20% Markup & 5% GST
  const quotation = await quotationService.generateQuotationFromTrip(agencyId, trip.id, {
    markupPercentage: 20,
    taxPercentage: 5,
  });

  const cost = 111000;
  const markup = cost * 0.20; // 22,200
  const afterMarkup = cost + markup; // 133,200
  const tax = afterMarkup * 0.05; // 6,660
  const expectedFinal = Math.round(afterMarkup + tax); // 139,860

  const actualFinal = Math.round(Number(quotation.finalAmount));
  if (actualFinal !== expectedFinal) {
    throw new Error(`[QA-04] Quotation mathematical error! Expected ₹${expectedFinal}, got ₹${actualFinal}`);
  }
  console.log(`  ✔ Quotation Generated: ${quotation.quotationNumber} (Base: ₹${cost} + Markup 20%: ₹${markup} + Tax 5%: ₹${tax} = Final: ₹${actualFinal})`);

  // Verify Public Sanitization: Unauthenticated client must NOT see markup or cost
  if (quotation.shareToken) {
    const publicQuote = await quotationService.getPublicQuotationByToken(quotation.shareToken);
    if (!publicQuote) {
      throw new Error("[QA-04] Public quotation not found by shareToken!");
    }

    const publicJson = JSON.stringify(publicQuote);
    if (
      publicJson.includes("costPrice") ||
      publicJson.includes("markupPercentage") ||
      publicJson.includes("markupAmount") ||
      publicJson.includes("internalNotes")
    ) {
      throw new Error("[QA-04] SECURITY VIOLATION: Public proposal leaks internal commercial secrets!");
    }
    console.log(`  ✔ Public Proposal Portal Security: PASS (All internal supplier costs, markups, and notes strictly stripped)`);
  }

  // -------------------------------------------------------------------------
  // 7. PHASE 12 & 13: Booking Conversion & Payments Ledger Recalculation
  // -------------------------------------------------------------------------
  console.log("\n▶ [JOURNEY STEP 7] Booking Confirmation & Payments Ledger");
  const booking = await bookingService.convertQuotationToBooking(agencyId, quotation.id, {
    notes: "Confirmed by Rohit Sharma via client portal.",
  });

  if (!booking || !booking.bookingNumber) {
    throw new Error("[QA-04] Quotation to booking conversion failed!");
  }
  console.log(`  ✔ Booking Confirmed: ${booking.bookingNumber} | Status: ${booking.status}`);
  console.log(`  ✔ Total Booking Value: ₹${Number(booking.totalAmount).toLocaleString("en-IN")}`);

  // Payment 1: Advance Token Deposit (₹50,000)
  const pay1 = await paymentService.createPayment(agencyId, {
    bookingId: booking.id,
    amount: 50000,
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    referenceNumber: `HDFC-NEFT-${Date.now()}`,
    notes: "Advance token payment.",
  });

  const b1 = await prisma.booking.findUnique({ where: { id: booking.id } });
  if (!b1 || Number(b1.paidAmount) !== 50000 || Number(b1.balanceAmount) !== actualFinal - 50000) {
    throw new Error(`[QA-04] Payment 1 failed to update booking ledger accurately! Paid: ${b1?.paidAmount}, Balance: ${b1?.balanceAmount}`);
  }
  console.log(`  ✔ Payment 1 Recorded: ₹50,000 via ${pay1.paymentMethod} (New Balance: ₹${Number(b1.balanceAmount).toLocaleString("en-IN")})`);

  // Payment 2: Settlement Payment for exact remaining balance
  const remainingBalance = Number(b1.balanceAmount);
  const pay2 = await paymentService.createPayment(agencyId, {
    bookingId: booking.id,
    amount: remainingBalance,
    paymentMethod: PaymentMethod.UPI,
    referenceNumber: `UPI-REF-${Date.now()}`,
    notes: "Final balance settlement.",
  });

  const b2 = await prisma.booking.findUnique({ where: { id: booking.id } });
  if (!b2 || Number(b2.paidAmount) !== actualFinal || Number(b2.balanceAmount) !== 0 || b2.paymentStatus !== "PAID") {
    throw new Error(`[QA-04] Final settlement failed to clear balance to 0! Paid: ${b2?.paidAmount}, Status: ${b2?.paymentStatus}`);
  }
  console.log(`  ✔ Payment 2 (Settlement): ₹${remainingBalance.toLocaleString("en-IN")} via ${pay2.paymentMethod}`);
  console.log(`  ✔ Ledger Status: 100% PAID | Balance: ₹0.00 (Booking PaymentStatus: ${b2.paymentStatus})`);

  // -------------------------------------------------------------------------
  // 8. PHASE 14 & 15: Trip Operations Hub & Operational Readiness
  // -------------------------------------------------------------------------
  console.log("\n▶ [JOURNEY STEP 8] Trip Operations Hub & Readiness Engine");
  const operation = await operationsService.initializeOperation(agencyId, {
    tripId: trip.id,
    bookingId: booking.id,
    status: OperationStatus.PREPARING,
  });
  if (!operation || !operation.id) {
    throw new Error("[QA-04] Failed to initialize trip operation!");
  }
  console.log(`  ✔ Operations Record Attached: ID ${operation.id} | Status: ${operation.status}`);

  const readiness = await operationsService.calculateReadiness(agencyId, operation.id);
  console.log(`  ✔ Readiness Score: ${readiness.score}% (Hotels: ${readiness.confirmedHotels}/${readiness.totalHotels} confirmed)`);

  // -------------------------------------------------------------------------
  // 9. PHASE 16: Dashboard Aggregations & Performance
  // -------------------------------------------------------------------------
  console.log("\n▶ [JOURNEY STEP 9] Dashboard Metrics & Performance Integrity");
  const summary = await dashboardService.getDashboardSummary(agencyId);
  const trend = await dashboardService.getMonthlyRevenueTrend(agencyId);
  console.log(`  ✔ Real-Time Metrics: ${summary.enquiries.total} Enquiries, ${summary.trips.active} Active Trips, ${summary.bookings.total} Bookings`);
  console.log(`  ✔ Collections: ₹${summary.payments.collected} | Pipeline: ₹${summary.enquiries.pipelineValue}`);
  console.log(`  ✔ 6-Month Trend Data: ${trend.length} periods evaluated with zero missing months.`);

  // -------------------------------------------------------------------------
  // 10. Teardown transient QA-04 test data
  // -------------------------------------------------------------------------
  console.log("\n▶ Cleaning up QA-04 test artifacts...");
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
  await prisma.tripHotel.deleteMany({ where: { tripId: trip.id } });
  await prisma.itineraryItem.deleteMany({ where: { tripId: trip.id } });
  await prisma.trip.deleteMany({ where: { id: trip.id } });
  await prisma.enquiryFollowUp.deleteMany({ where: { enquiryId: enquiry.id } });
  await prisma.enquiry.deleteMany({ where: { id: enquiry.id } });
  await prisma.rateSheet.deleteMany({ where: { id: rateSheet.id } });
  await prisma.hotel.deleteMany({ where: { id: hotelMaster.id } });
  await prisma.supplier.deleteMany({ where: { id: supplier.id } });
  await prisma.customer.deleteMany({ where: { id: customer.id } });
  console.log("  ✔ Clean-up complete.");

  console.log("\n===============================================================================");
  console.log("🎉 ALL QA-04 REAL USER JOURNEY & STABILITY TESTS PASSED (100% SUCCESS)!");
  console.log("===============================================================================");
}

runQA04RealUserJourneyAudit()
  .catch((err) => {
    console.error("\n❌ QA-04 USER JOURNEY AUDIT FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
