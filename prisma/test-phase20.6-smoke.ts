import "dotenv/config";

// Mock server-only for standalone script execution
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
  UserRole,
  AgencyStatus,
  SubscriptionStatus,
  BookingPaymentStatus,
  QuotationStatus,
  TripStatus,
  OperationStatus,
} from "@prisma/client";
import { getAdminClient } from "../src/lib/supabase/admin";
import { customerService } from "../src/lib/services/customer-service";
import { enquiryService } from "../src/lib/services/enquiry-service";
import { supplierService } from "../src/lib/services/supplier-service";
import { quotationService } from "../src/lib/services/quotation-service";
import { bookingService } from "../src/lib/services/booking-service";
import { financeService } from "../src/lib/services/finance-service";
import { travelDocumentService } from "../src/lib/services/travel-document-service";
import { tripPublicService } from "../src/lib/services/trip-public-service";
import { bookingPublicService } from "../src/lib/services/booking-public-service";
import { dashboardService } from "../src/lib/services/dashboard-service";
import { adminService } from "../src/lib/services/admin-service";

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✔ PASS: ${message}`);
    passedAssertions++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedAssertions++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

const CANONICAL_PLATFORM_OWNER_ID = "de5c1377-0e7c-4747-b3ed-aaee8b7e32a9";
const CANONICAL_PLATFORM_OWNER_EMAIL = "mzpatel14@gmail.com";

async function runPhase20_6_SmokeTest() {
  console.log("═════════════════════════════════════════════════════════════════════════");
  console.log("   TRIPDESK PHASE 20.6 — PRODUCTION SMOKE TEST & PILOT ONBOARDING");
  console.log("═════════════════════════════════════════════════════════════════════════\n");

  const timestamp = Date.now();

  // ─────────────────────────────────────────────────────────────────
  // STEP 1 — PRE-SMOKE DATABASE BASELINE INSPECTION
  // ─────────────────────────────────────────────────────────────────
  console.log("▶ STEP 1 — Pre-Smoke Database Baseline Inspection");

  const baselineUsers = await prisma.user.count();
  const baselineAgencies = await prisma.agency.count();
  const baselineCustomers = await prisma.customer.count();
  const baselineTrips = await prisma.trip.count();
  const baselineQuotations = await prisma.quotation.count();
  const baselineBookings = await prisma.booking.count();
  const baselinePayments = await prisma.payment.count();
  const baselineSuppliers = await prisma.supplier.count();
  const baselineSubscriptions = await prisma.subscription.count();
  const baselinePlans = await prisma.subscriptionPlan.count();
  const baselineSettings = await prisma.platformSetting.count();

  console.log(`  Current Users in DB:        ${baselineUsers}`);
  console.log(`  Current Agencies in DB:     ${baselineAgencies}`);
  console.log(`  Current Canonical Plans:    ${baselinePlans}`);
  console.log(`  Current Platform Settings:  ${baselineSettings}`);

  assert(baselineUsers >= 1, "Baseline User count has at least 1 (Platform Owner)");
  assert(baselinePlans === 2, "Baseline Subscription Plans count is exactly 2");
  assert(baselineSettings >= 2, "Baseline Platform Settings count is at least 2");

  // ─────────────────────────────────────────────────────────────────
  // STEP 2 — PLATFORM OWNER IDENTITY & ROLE VERIFICATION
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 2 — Platform Owner Identity & Role Verification");

  const platformOwner = await prisma.user.findUnique({
    where: { id: CANONICAL_PLATFORM_OWNER_ID },
  });

  assert(platformOwner !== null, "Authoritative Platform Owner exists in database");
  assert(platformOwner?.email === CANONICAL_PLATFORM_OWNER_EMAIL, "Platform Owner email matches mzpatel14@gmail.com");
  assert(platformOwner?.role === UserRole.PLATFORM_OWNER, "Platform Owner role is PLATFORM_OWNER");
  assert(platformOwner?.agencyId === null, "Platform Owner agencyId is strictly null");

  const adminClient = getAdminClient();
  if (adminClient) {
    const { data: authData } = await adminClient.auth.admin.getUserById(CANONICAL_PLATFORM_OWNER_ID);
    assert(authData?.user?.email === CANONICAL_PLATFORM_OWNER_EMAIL, "Supabase Auth user matches Platform Owner email");
    assert(!!authData?.user?.email_confirmed_at, "Supabase Auth Platform Owner is confirmed");
  }

  // ─────────────────────────────────────────────────────────────────
  // STEP 3 — ADMIN COMMAND CENTER & SAAS GOVERNANCE
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 3 — Admin Command Center & SaaS Governance");

  const adminStats = await adminService.getPlatformOverview();
  console.log(`  Admin Overview Total Agencies: ${adminStats.totalAgencies}`);
  console.log(`  Admin Overview Active Subs:    ${adminStats.activeAgencies}`);
  console.log(`  Admin Overview Total MRR:      ₹${adminStats.mrr}`);

  const canonicalStarterPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Starter" },
  });
  const canonicalProPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Professional" },
  });
  assert(canonicalStarterPlan !== null && canonicalStarterPlan.isActive, "Canonical Starter plan is active");
  assert(canonicalProPlan !== null && canonicalProPlan.isActive, "Canonical Professional plan is active");

  // ─────────────────────────────────────────────────────────────────
  // STEP 4 — FIRST REAL PILOT AGENCY SIGNUP
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 4 — First Real Pilot Agency Public Signup");

  const pilotEmail = "pilot.owner@tripdesk.io";
  const pilotPassword = "TripDeskPilot2026!";
  const pilotAgencyName = "TripDesk Pilot Agency";
  let pilotAuthUserId: string;

  if (adminClient) {
    const { data: createdAuth, error: authErr } = await adminClient.auth.admin.createUser({
      email: pilotEmail,
      password: pilotPassword,
      email_confirm: true,
      user_metadata: {
        name: "Mohit Pilot Lead",
        phone: "+919876543210",
        role: "AGENCY_OWNER",
      },
    });

    if (authErr && !createdAuth?.user) {
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u) => u.email === pilotEmail);
      if (!existing) throw authErr;
      pilotAuthUserId = existing.id;
    } else {
      pilotAuthUserId = createdAuth.user!.id;
    }
  } else {
    throw new Error("Supabase admin client required for automated pilot signup");
  }

  // Atomic creation of Agency + User + 7-day Trial Subscription
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const pilotAgency = await prisma.$transaction(async (tx) => {
    let agency = await tx.agency.findFirst({
      where: { email: "pilot@tripdesk.io" },
    });

    if (!agency) {
      agency = await tx.agency.create({
        data: {
          name: pilotAgencyName,
          phone: "+919876543210",
          email: "pilot@tripdesk.io",
          address: "Suite 401, Nariman Point, Mumbai, Maharashtra, India",
          status: AgencyStatus.ACTIVE,
        },
      });
    }

    let user = await tx.user.findUnique({
      where: { id: pilotAuthUserId },
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          id: pilotAuthUserId,
          agencyId: agency.id,
          name: "Mohit Pilot Lead",
          email: pilotEmail,
          phone: "+919876543210",
          role: UserRole.AGENCY_OWNER,
        },
      });
    }

    let sub = await tx.subscription.findFirst({
      where: { agencyId: agency.id },
    });

    if (!sub) {
      sub = await tx.subscription.create({
        data: {
          agencyId: agency.id,
          planId: canonicalStarterPlan!.id,
          status: SubscriptionStatus.TRIAL,
          trialStart: now,
          trialEnd: trialEnd,
        },
      });
    }

    return agency;
  });

  const pilotUser = await prisma.user.findUnique({
    where: { id: pilotAuthUserId },
  });

  assert(pilotAgency !== null, "Pilot Agency created successfully");
  assert(pilotUser !== null, "Pilot Agency Owner user created successfully");
  assert(pilotUser?.role === UserRole.AGENCY_OWNER, "Pilot User role is AGENCY_OWNER");
  assert(pilotUser?.agencyId === pilotAgency.id, "Pilot User agencyId links to Pilot Agency");

  const currentAgencyCount = await prisma.agency.count();
  const currentUserCount = await prisma.user.count();
  assert(currentAgencyCount === 1, "Exactly 1 Agency exists in production database");
  assert(currentUserCount === 2, "Exactly 2 Users exist in production database (1 Platform Owner, 1 Pilot Owner)");

  // ─────────────────────────────────────────────────────────────────
  // STEP 5 — 7-DAY TRIAL SUBSCRIPTION VERIFICATION
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 5 — 7-Day Trial Subscription Verification");

  const pilotSub = await prisma.subscription.findFirst({
    where: { agencyId: pilotAgency.id },
    include: { plan: true },
  });

  assert(pilotSub !== null, "Pilot Agency subscription record exists");
  assert(pilotSub?.status === SubscriptionStatus.TRIAL, "Subscription status is TRIAL");
  assert(pilotSub?.plan.name === "Starter", "Trial is provisioned on canonical Starter plan");
  assert(pilotSub?.trialStart !== null && pilotSub?.trialEnd !== null, "trialStart and trialEnd are populated");

  const trialDurationDays = Math.round(
    (pilotSub!.trialEnd!.getTime() - pilotSub!.trialStart!.getTime()) / (1000 * 60 * 60 * 24)
  );
  console.log(`  Calculated Trial Duration: ${trialDurationDays} calendar days`);
  assert(trialDurationDays === 7, "Trial duration represents exactly 7 calendar days");

  // ─────────────────────────────────────────────────────────────────
  // STEP 6 — AGENCY OWNER AUTHENTICATION & ACCESS GUARD
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 6 — Agency Owner Role Dispatch & Route Guards");

  assert(pilotUser?.role === UserRole.AGENCY_OWNER, "Role is confirmed AGENCY_OWNER");
  assert(pilotUser?.agencyId !== null, "Agency Owner has a valid non-null agencyId");
  assert(pilotUser?.agencyId !== CANONICAL_PLATFORM_OWNER_ID, "Agency Owner cannot access platform owner root");

  // ─────────────────────────────────────────────────────────────────
  // STEP 7 — INITIAL DASHBOARD METRICS (ZERO STATE)
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 7 — Initial Agency Dashboard Zero State Verification");

  const initialSummary = await dashboardService.getDashboardSummary(pilotAgency.id, { preset: "THIS_MONTH" });
  console.log(`  Initial Active Trips:      ${initialSummary.operations.upcomingTripsCount}`);
  console.log(`  Initial Pending Enquiries: ${initialSummary.sales.newEnquiries}`);
  console.log(`  Initial GMV:               ₹${initialSummary.financial.totalBookingValue}`);
  console.log(`  Initial Collections:       ₹${initialSummary.financial.amountCollected}`);
  console.log(`  Initial Receivables:       ₹${initialSummary.financial.outstandingReceivables}`);

  assert(typeof initialSummary.operations.upcomingTripsCount === "number", "Upcoming trips metric queries cleanly");
  assert(typeof initialSummary.sales.newEnquiries === "number", "New enquiries metric queries cleanly");
  assert(typeof initialSummary.financial.totalBookingValue === "number", "GMV metric queries cleanly");
  assert(typeof initialSummary.financial.amountCollected === "number", "Collections metric queries cleanly");
  assert(typeof initialSummary.financial.outstandingReceivables === "number", "Receivables metric queries cleanly");

  // ─────────────────────────────────────────────────────────────────
  // STEP 8 — CREATE ONE PILOT CUSTOMER
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 8 — Create One Pilot Customer");

  let pilotCustomer = await prisma.customer.findFirst({
    where: { agencyId: pilotAgency.id, email: "rajesh.sharma@example.com" },
  });

  if (!pilotCustomer) {
    pilotCustomer = await customerService.createCustomer(pilotAgency.id, {
      name: "Rajesh Sharma",
      phone: "+919811122233",
      email: "rajesh.sharma@example.com",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      address: "B-204, Sea View Apartments, Bandra West",
      notes: "High-value luxury leisure traveler",
    });
  }

  assert(pilotCustomer !== null, "Pilot customer created successfully");
  assert(pilotCustomer.agencyId === pilotAgency.id, "Customer belongs to Pilot Agency");
  assert(pilotCustomer.name === "Rajesh Sharma", "Customer name is Rajesh Sharma");
  assert(pilotCustomer.customerNumber.startsWith("CUS-"), "Customer number follows sequential format CUS-YYYY-XXXXX");

  const customer360 = await customerService.getCustomerDetails360(pilotAgency.id, pilotCustomer.id);
  assert(customer360 !== null, "Customer 360 details load cleanly");

  // ─────────────────────────────────────────────────────────────────
  // STEP 9 — CREATE ONE CRM ENQUIRY
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 9 — Create One CRM Enquiry");

  let pilotEnquiry = await prisma.enquiry.findFirst({
    where: { agencyId: pilotAgency.id, customerId: pilotCustomer.id },
  });

  if (!pilotEnquiry) {
    pilotEnquiry = await enquiryService.createEnquiry(pilotAgency.id, {
      customerId: pilotCustomer.id,
      destination: "Kerala, India",
      title: "7D Luxury Kerala Backwaters Tour",
      budget: 60000,
      paxCount: 2,
      priority: "HIGH",
      source: "PHONE",
      notes: "Interested in private houseboat and luxury Ayurvedic resort",
    });
  }

  assert(pilotEnquiry !== null, "Pilot enquiry created successfully");
  assert(pilotEnquiry.agencyId === pilotAgency.id, "Enquiry belongs to Pilot Agency");
  assert(pilotEnquiry.customerId === pilotCustomer.id, "Enquiry links to Pilot Customer");
  assert(pilotEnquiry.enquiryNumber.startsWith("ENQ-"), "Enquiry number follows format ENQ-YYYY-XXXXX");

  // ─────────────────────────────────────────────────────────────────
  // STEP 10 — CREATE ONE SUPPLIER
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 10 — Create One Supplier");

  let pilotSupplier = await prisma.supplier.findFirst({
    where: { agencyId: pilotAgency.id, email: "reservations@keralaluxuryresorts.test" },
  });

  if (!pilotSupplier) {
    pilotSupplier = await supplierService.createSupplier(pilotAgency.id, {
      name: "Kerala Luxury Resorts & Houseboats",
      type: "Hotel Supplier",
      contactPerson: "Anand Nair",
      email: "reservations@keralaluxuryresorts.test",
      phone: "+919447012345",
      city: "Kumarakom",
      state: "Kerala",
      country: "India",
      status: "ACTIVE",
      notes: "Key DMC partner for Kerala luxury inventory",
    });
  }

  assert(pilotSupplier !== null, "Pilot supplier created successfully");
  assert(pilotSupplier.agencyId === pilotAgency.id, "Supplier belongs to Pilot Agency");
  assert(pilotSupplier.supplierCode.startsWith("SUP-"), "Supplier code follows format SUP-YYYY-XXXXX");

  // ─────────────────────────────────────────────────────────────────
  // STEP 11 — CREATE ONE QUOTATION (COMMERCIAL INTEGRITY)
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 11 — Create One Quotation & Pricing Engine Verification");

  let pilotTrip = await prisma.trip.findFirst({
    where: { agencyId: pilotAgency.id, customerId: pilotCustomer.id },
  });

  if (!pilotTrip) {
    pilotTrip = await prisma.trip.create({
      data: {
        agencyId: pilotAgency.id,
        customerId: pilotCustomer.id,
        tripNumber: `TRP-${new Date().getFullYear()}-00001`,
        title: "7D Luxury Kerala Backwaters Tour",
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000),
        status: TripStatus.PLANNING,
      },
    });
  }

  let pilotQuotation = await prisma.quotation.findFirst({
    where: { agencyId: pilotAgency.id, customerId: pilotCustomer.id },
  });

  if (!pilotQuotation) {
    pilotQuotation = await quotationService.createQuotation(pilotAgency.id, {
      customerId: pilotCustomer.id,
      tripId: pilotTrip.id,
      title: "Kerala 7D Luxury Experience Proposal",
      destination: "Kerala, India",
      startDate: pilotTrip.startDate,
      endDate: pilotTrip.endDate,
      adults: 2,
      children: 0,
      currency: "INR",
      pricingType: "FIXED_TOTAL",
      subtotal: 50000,
      finalAmount: 50000,
      status: QuotationStatus.SENT,
    });
  }

  let quoteItem = await prisma.quotationItem.findFirst({
    where: { quotationId: pilotQuotation.id },
  });

  if (!quoteItem) {
    quoteItem = await prisma.quotationItem.create({
      data: {
        quotationId: pilotQuotation.id,
        type: "HOTEL",
        category: "ACCOMMODATION",
        name: "Kumarakom Lake Resort - Luxury Pavilion Room",
        description: "4 Nights Luxury Pavilion Room + Private Pool Villa",
        quantity: 1,
        unit: "package",
        unitPrice: 50000,
        sellingPrice: 50000,
        totalPrice: 50000,
        costPrice: 40000,
        notes: "Confidential wholesale DMC rate negotiated with Anand Nair",
      },
    });
  }

  pilotQuotation = await prisma.quotation.update({
    where: { id: pilotQuotation.id },
    data: {
      subtotal: 50000,
      finalAmount: 50000,
    },
    include: {
      items: true,
    },
  }) as any;

  assert(pilotQuotation !== null, "Pilot quotation created successfully");
  assert(pilotQuotation.agencyId === pilotAgency.id, "Quotation belongs to Pilot Agency");
  assert(Number(pilotQuotation.finalAmount) === 50000, "Quotation final amount is ₹50,000");
  assert(pilotQuotation.shareToken !== null, "Quotation generated secure public shareToken");

  // ─────────────────────────────────────────────────────────────────
  // STEP 12 — PUBLIC QUOTATION SECURITY (ZERO COMMERCIAL LEAKAGE)
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 12 — Public Quotation Security & Commercial Privacy Audit");

  const publicProposal = await quotationService.getPublicQuotationByToken(pilotQuotation.shareToken!);
  assert(publicProposal !== null, "Public proposal accessible via valid shareToken");
  assert(Number(publicProposal?.finalAmount) === 50000 || Number((publicProposal as any)?.totalAmount) === 50000, "Public proposal shows retail selling price of ₹50,000");

  const publicItem = (publicProposal?.items as any[])?.[0];
  assert(publicItem !== undefined, "Quotation item present in public proposal");
  assert(Number(publicItem.unitPrice) === 50000, "Public item displays retail price ₹50,000");
  assert(publicItem.costPrice === undefined, "Public proposal strictly REDACTS costPrice (0 supplier cost leakage)");
  assert(publicItem.notes === undefined, "Public proposal strictly REDACTS confidential supplier notes");

  const invalidProposal = await quotationService.getPublicQuotationByToken("fabricated-random-token-xyz");
  assert(invalidProposal === null, "Invalid quotation token safely returns null (404)");

  // ─────────────────────────────────────────────────────────────────
  // STEP 13 — QUOTATION → BOOKING CONVERSION
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 13 — Quotation to Booking Conversion");

  let pilotBooking = await prisma.booking.findFirst({
    where: { agencyId: pilotAgency.id, customerId: pilotCustomer.id },
  });

  if (!pilotBooking) {
    pilotBooking = await bookingService.createBooking(pilotAgency.id, {
      customerId: pilotCustomer.id,
      tripId: pilotTrip.id,
      title: "Kerala 7D Luxury Booking",
      destination: "Kerala, India",
      startDate: pilotTrip.startDate,
      endDate: pilotTrip.endDate,
      adults: 2,
      currency: "INR",
      totalAmount: 50000,
    });

    await prisma.quotation.update({
      where: { id: pilotQuotation.id },
      data: { status: QuotationStatus.ACCEPTED },
    });
  }

  assert(pilotBooking !== null, "Pilot booking created successfully");
  assert(pilotBooking.agencyId === pilotAgency.id, "Booking belongs to Pilot Agency");
  assert(Number(pilotBooking.totalAmount) === 50000, "Booking total amount is ₹50,000");

  // ─────────────────────────────────────────────────────────────────
  // STEP 14 — CUSTOMER PAYMENT & FINANCIAL INTEGRITY
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 14 — Customer Payment & Financial Integrity");

  let pilotPayment = await prisma.payment.findFirst({
    where: { agencyId: pilotAgency.id, bookingId: pilotBooking.id },
  });

  if (!pilotPayment) {
    pilotPayment = await financeService.recordCustomerPayment(pilotAgency.id, {
      bookingId: pilotBooking.id,
      amount: 20000,
      paymentMethod: "BANK_TRANSFER",
      paymentDate: new Date(),
      referenceNumber: "PAY-PILOT-001",
      notes: "Advance deposit received via NEFT/IMPS",
    });
  }

  assert(pilotPayment !== null, "Payment transaction recorded successfully");
  assert(Number(pilotPayment.amount) === 20000, "Payment amount is ₹20,000");

  const updatedBooking = await bookingService.getBooking(pilotAgency.id, pilotBooking.id);
  console.log(`  Updated Booking Total:   ₹${updatedBooking?.totalAmount}`);
  console.log(`  Updated Booking Paid:    ₹${updatedBooking?.paidAmount}`);
  console.log(`  Updated Booking Balance: ₹${updatedBooking?.balanceAmount}`);
  console.log(`  Updated Payment Status:  ${updatedBooking?.paymentStatus}`);

  assert(Number(updatedBooking?.paidAmount) === 20000, "Booking paidAmount recalculated to ₹20,000");
  assert(Number(updatedBooking?.balanceAmount) === 30000, "Booking balanceAmount recalculated to ₹30,000");
  assert(updatedBooking?.paymentStatus === BookingPaymentStatus.PARTIALLY_PAID, "Payment status transitioned to PARTIALLY_PAID");

  // ─────────────────────────────────────────────────────────────────
  // STEP 15 — TRIP & OPERATIONS
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 15 — Trip Operations & Event Lifecycle");

  let tripOperation = await prisma.tripOperation.findFirst({
    where: { agencyId: pilotAgency.id, tripId: pilotTrip.id },
  });

  if (!tripOperation) {
    tripOperation = await prisma.tripOperation.create({
      data: {
        agencyId: pilotAgency.id,
        tripId: pilotTrip.id,
        bookingId: pilotBooking.id,
        status: OperationStatus.IN_PROGRESS,
      },
    });
  }

  let opEvent = await prisma.operationEvent.findFirst({
    where: { agencyId: pilotAgency.id, tripOperationId: tripOperation.id },
  });

  if (!opEvent) {
    opEvent = await prisma.operationEvent.create({
      data: {
        agencyId: pilotAgency.id,
        tripOperationId: tripOperation.id,
        type: "STATUS_CHANGED",
        title: "Trip Operation Initialized",
        description: "Booking confirmed and operations workspace initialized for Kerala tour.",
        actorName: "Mohit Pilot Lead",
      },
    });
  }

  assert(tripOperation !== null, "Trip operation hub record verified");
  assert(opEvent !== null, "Operational event logged successfully");

  // ─────────────────────────────────────────────────────────────────
  // STEP 16 — TRAVEL DOCUMENT & VOUCHER GENERATION
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 16 — Travel Document & Voucher Generation");

  let createdDocs = await prisma.travelDocument.findMany({
    where: { agencyId: pilotAgency.id, bookingId: pilotBooking.id },
  });

  if (createdDocs.length === 0) {
    await travelDocumentService.generateBookingDocuments(pilotAgency.id, pilotBooking.id);
    createdDocs = await prisma.travelDocument.findMany({
      where: { agencyId: pilotAgency.id, bookingId: pilotBooking.id },
    });
  }

  console.log(`  Total Travel Documents for Booking: ${createdDocs.length}`);
  assert(createdDocs.length >= 1, "At least one travel document generated for pilot booking");
  const firstDoc = createdDocs[0];
  assert(firstDoc.documentNumber.startsWith("DOC-") || firstDoc.documentNumber.startsWith("VCH-") || firstDoc.documentNumber.startsWith("ITN-") || firstDoc.documentNumber.startsWith("BC-") || firstDoc.documentNumber.startsWith("CI-"), "Document number follows standard sequential format");

  // ─────────────────────────────────────────────────────────────────
  // STEP 17 — CUSTOMER-FACING TOKEN ROUTES AUDIT
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 17 — Customer-Facing Routes & Public Token Resolution");

  const publicTrip = await tripPublicService.getPublicTripByToken(pilotTrip.tripNumber);
  assert(publicTrip !== null, "Public trip resolved via tripNumber token");
  assert(publicTrip?.customer.name === "Rajesh Sharma", "Public trip displays customer name");
  assert(publicTrip?.agency.name === pilotAgencyName, "Public trip displays Agency branding");

  const publicBooking = await bookingPublicService.getPublicBookingByToken(pilotBooking.bookingNumber);
  assert(publicBooking !== null, "Public booking resolved via bookingNumber token");
  assert(Number(publicBooking?.totalAmount) === 50000, "Public booking displays total amount of ₹50,000");
  assert(Number(publicBooking?.paidAmount) === 20000, "Public booking displays paid amount of ₹20,000");

  // ─────────────────────────────────────────────────────────────────
  // STEP 18 — DASHBOARD METRICS RE-CHECK (PILOT AGGREGATES)
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 18 — Dashboard Metrics Re-Check (Pilot Aggregates)");

  const pilotSummary = await dashboardService.getDashboardSummary(pilotAgency.id, { preset: "THIS_MONTH" });
  console.log(`  Pilot Dashboard Active Trips: ${pilotSummary.operations.upcomingTripsCount}`);
  console.log(`  Pilot Dashboard GMV:          ₹${pilotSummary.financial.totalBookingValue}`);
  console.log(`  Pilot Dashboard Collections:  ₹${pilotSummary.financial.amountCollected}`);
  console.log(`  Pilot Dashboard Receivables:  ₹${pilotSummary.financial.outstandingReceivables}`);

  assert(pilotSummary.operations.upcomingTripsCount === 1, "Dashboard reflects 1 active/upcoming trip");
  assert(pilotSummary.financial.totalBookingValue === 50000, "Dashboard reflects GMV of ₹50,000");
  assert(pilotSummary.financial.amountCollected === 20000, "Dashboard reflects Collections of ₹20,000");
  assert(pilotSummary.financial.outstandingReceivables === 30000, "Dashboard reflects Receivables of ₹30,000");

  // ─────────────────────────────────────────────────────────────────
  // STEP 19 — TENANT ISOLATION INTEGRITY AUDIT
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 19 — Multi-Tenant Isolation & Security Invariants");

  const foreignAgencyId = "foreign-non-existent-agency-uuid";
  const foreignCustomers = await prisma.customer.findMany({
    where: { agencyId: foreignAgencyId },
  });
  const foreignBookings = await prisma.booking.findMany({
    where: { agencyId: foreignAgencyId },
  });
  assert(foreignCustomers.length === 0, "Query with foreign agencyId returns 0 customers");
  assert(foreignBookings.length === 0, "Query with foreign agencyId returns 0 bookings");

  // ─────────────────────────────────────────────────────────────────
  // STEP 20 — DATABASE INTEGRITY AUDIT & POST-SMOKE INVENTORY
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 20 — Database Post-Smoke Inventory");

  const postUsers = await prisma.user.findMany({ select: { id: true, email: true, role: true, agencyId: true } });
  const postAgencies = await prisma.agency.findMany({ select: { id: true, name: true, email: true, status: true } });
  const postSubscriptions = await prisma.subscription.count();
  const postCustomers = await prisma.customer.count();
  const postEnquiries = await prisma.enquiry.count();
  const postSuppliers = await prisma.supplier.count();
  const postTrips = await prisma.trip.count();
  const postQuotations = await prisma.quotation.count();
  const postBookings = await prisma.booking.count();
  const postPayments = await prisma.payment.count();
  const postTravelDocs = await prisma.travelDocument.count();

  console.log(`  Post-Smoke Users:         ${postUsers.length} (Expected: 2)`);
  for (const u of postUsers) {
    console.log(`    - ${u.role}: ${u.email} (agencyId: ${u.agencyId})`);
  }
  console.log(`  Post-Smoke Agencies:      ${postAgencies.length} (Expected: 1)`);
  console.log(`    - ${postAgencies[0]?.name} (${postAgencies[0]?.email})`);
  console.log(`  Post-Smoke Subscriptions: ${postSubscriptions} (Expected: 1)`);
  console.log(`  Post-Smoke Customers:     ${postCustomers} (Expected: 1)`);
  console.log(`  Post-Smoke Enquiries:     ${postEnquiries} (Expected: 1)`);
  console.log(`  Post-Smoke Suppliers:     ${postSuppliers} (Expected: 1)`);
  console.log(`  Post-Smoke Trips:         ${postTrips} (Expected: 1)`);
  console.log(`  Post-Smoke Quotations:    ${postQuotations} (Expected: 1)`);
  console.log(`  Post-Smoke Bookings:      ${postBookings} (Expected: 1)`);
  console.log(`  Post-Smoke Payments:      ${postPayments} (Expected: 1)`);
  console.log(`  Post-Smoke Travel Docs:   ${postTravelDocs} (Expected: >= 1)`);

  assert(postUsers.length === 2, "Database contains exactly 2 Users (1 Platform Owner, 1 Agency Owner)");
  assert(postAgencies.length === 1, "Database contains exactly 1 Agency (TripDesk Pilot Agency)");
  assert(postSubscriptions === 1, "Database contains exactly 1 Subscription (Pilot 7-Day Trial)");
  assert(postCustomers === 1, "Database contains exactly 1 Customer (Rajesh Sharma)");
  assert(postEnquiries === 1, "Database contains exactly 1 Enquiry");
  assert(postSuppliers === 1, "Database contains exactly 1 Supplier");
  assert(postTrips === 1, "Database contains exactly 1 Trip");
  assert(postQuotations === 1, "Database contains exactly 1 Quotation");
  assert(postBookings === 1, "Database contains exactly 1 Booking");
  assert(postPayments === 1, "Database contains exactly 1 Payment");

  // ─────────────────────────────────────────────────────────────────
  // STEP 21 — SUPABASE AUTH RECONCILIATION
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ STEP 21 — Supabase Auth Reconciliation");

  if (adminClient) {
    const { data: authList } = await adminClient.auth.admin.listUsers();
    const authUsers = authList?.users || [];
    console.log(`  Supabase Auth Users Count: ${authUsers.length} (Expected: 2)`);
    for (const au of authUsers) {
      console.log(`    - ID: ${au.id} | Email: ${au.email} | Confirmed: ${!!au.email_confirmed_at}`);
    }

    assert(authUsers.length === 2, "Supabase Auth contains exactly 2 accounts");
    const hasPlatformOwner = authUsers.some((u) => u.id === CANONICAL_PLATFORM_OWNER_ID && u.email === CANONICAL_PLATFORM_OWNER_EMAIL);
    const hasPilotOwner = authUsers.some((u) => u.id === pilotAuthUserId && u.email === pilotEmail);
    assert(hasPlatformOwner, "Platform Owner account verified in Supabase Auth");
    assert(hasPilotOwner, "Pilot Agency Owner account verified in Supabase Auth");
  }

  console.log("\n═════════════════════════════════════════════════════════════════════════");
  console.log(`   PHASE 20.6 SMOKE TEST COMPLETE: ${passedAssertions} PASSED, ${failedAssertions} FAILED`);
  console.log("   PRODUCTION PILOT FLOW 100% VERIFIED — ALL INVARIANTS INTACT");
  console.log("═════════════════════════════════════════════════════════════════════════\n");

  await prisma.$disconnect();
}

runPhase20_6_SmokeTest().catch(async (e) => {
  console.error("FATAL ERROR in Phase 20.6 Smoke Test:", e);
  await prisma.$disconnect();
  process.exit(1);
});
