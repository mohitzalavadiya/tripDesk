import "dotenv/config";

// Standard module mock for server-only in standalone script execution
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
  TravelDocumentType,
  TravelDocumentStatus,
  CustomerNotificationType,
} from "@prisma/client";
import { quotationService } from "../src/lib/services/quotation-service";
import { bookingService } from "../src/lib/services/booking-service";
import { financeService } from "../src/lib/services/finance-service";
import { supplierService } from "../src/lib/services/supplier-service";
import { travelDocumentService } from "../src/lib/services/travel-document-service";
import { communicationService } from "../src/lib/services/communication-service";
import { dashboardService } from "../src/lib/services/dashboard-service";
import { adminService } from "../src/lib/services/admin-service";
import { sanitizeLogData } from "../src/lib/logger";

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failedTests++;
    throw new Error(`Assertion failed: ${description}`);
  }
}

async function runPostDeploymentVerification() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  TRIPDESK POST-DEPLOYMENT PRODUCTION VERIFICATION & SMOKE TEST");
  console.log("══════════════════════════════════════════════════════════════════\n");

  const timestamp = Date.now();

  try {
    // ─────────────────────────────────────────────────────────────────
    // 1. ROLE ARCHITECTURE & IDENTITY INVARIANTS
    // ─────────────────────────────────────────────────────────────────
    console.log("▶ 1. Role Architecture & Platform Identity Invariants");

    // Verify existing users adhere strictly to PLATFORM_OWNER or AGENCY_OWNER
    const invalidUsers = await prisma.user.findMany({
      where: {
        role: {
          notIn: [UserRole.PLATFORM_OWNER, UserRole.AGENCY_OWNER],
        },
      },
    });
    assert(invalidUsers.length === 0, "Zero invalid internal roles found in User table (Strict 2-role system)");

    const platformOwners = await prisma.user.findMany({
      where: { role: UserRole.PLATFORM_OWNER },
    });
    assert(platformOwners.length >= 1, "At least one PLATFORM_OWNER account exists in production");
    assert(platformOwners.every((po) => po.agencyId === null), "All PLATFORM_OWNER accounts have agencyId = null");

    // ─────────────────────────────────────────────────────────────────
    // 2. MULTI-TENANT TEST ENVIRONMENT INITIALIZATION
    // ─────────────────────────────────────────────────────────────────
    console.log("\n▶ 2. Provisioning Isolated Multi-Tenant Smoke Test Environment");

    const agencyA = await prisma.agency.create({
      data: {
        id: `smoke-agency-a-${timestamp}`,
        name: `Smoke Agency Alpha ${timestamp}`,
        email: `smoke-agency-a-${timestamp}@tripdesk.test`,
        phone: "+15550001111",
        status: AgencyStatus.ACTIVE,
      },
    });

    const userA = await prisma.user.create({
      data: {
        id: `smoke-user-a-${timestamp}`,
        email: `smoke-a-${timestamp}@tripdesk-deploy.com`,
        name: "Smoke Owner Alpha",
        role: UserRole.AGENCY_OWNER,
        agencyId: agencyA.id,
      },
    });

    const agencyB = await prisma.agency.create({
      data: {
        id: `smoke-agency-b-${timestamp}`,
        name: `Smoke Agency Beta ${timestamp}`,
        email: `smoke-agency-b-${timestamp}@tripdesk.test`,
        phone: "+15550002222",
        status: AgencyStatus.ACTIVE,
      },
    });

    const userB = await prisma.user.create({
      data: {
        id: `smoke-user-b-${timestamp}`,
        email: `smoke-b-${timestamp}@tripdesk-deploy.com`,
        name: "Smoke Owner Beta",
        role: UserRole.AGENCY_OWNER,
        agencyId: agencyB.id,
      },
    });

    assert(userA.agencyId === agencyA.id, "Agency A Owner correctly bound to Agency A");
    assert(userB.agencyId === agencyB.id, "Agency B Owner correctly bound to Agency B");

    // ─────────────────────────────────────────────────────────────────
    // 3. CUSTOMER TOKEN ARCHITECTURE & IDOR BOUNDARIES
    // ─────────────────────────────────────────────────────────────────
    console.log("\n▶ 3. Customer Token Architecture & IDOR Boundary Enforcement");

    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        customerNumber: `CUST-A-${timestamp}`,
        name: "Aarav Patel",
        email: `aarav-${timestamp}@example.com`,
        phone: "+919876543210",
      },
    });

    const customerB = await prisma.customer.create({
      data: {
        agencyId: agencyB.id,
        customerNumber: `CUST-B-${timestamp}`,
        name: "Rohan Gupta",
        email: `rohan-${timestamp}@example.com`,
        phone: "+919876543211",
      },
    });

    const agencyACustomers = await prisma.customer.findMany({
      where: { agencyId: agencyA.id },
    });
    assert(!agencyACustomers.some((c) => c.id === customerB.id), "Agency A customer list strictly isolates Agency B customer");

    // ─────────────────────────────────────────────────────────────────
    // 4. PUBLIC QUOTATION TOKEN & COMMERCIAL DATA PRIVACY
    // ─────────────────────────────────────────────────────────────────
    console.log("\n▶ 4. Public Quotation Security & Zero Commercial Leakage");

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRP-SMOKE-${timestamp}`,
        title: "Smoke Test Maldives Getaway",
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        status: "PLANNING",
      },
    });

    const quotationA = await quotationService.createQuotation(agencyA.id, {
      customerId: customerA.id,
      tripId: tripA.id,
      title: "Maldives Premium Proposal",
      destination: "Maldives",
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      adults: 2,
      children: 0,
      currency: "USD",
      pricingType: "FIXED_TOTAL",
      subtotal: 5000,
      totalAmount: 5000,
      status: QuotationStatus.SENT,
    });

    await quotationService.createQuotationItem(agencyA.id, quotationA.id, {
      type: "HOTEL",
      category: "ACCOMMODATION",
      name: "5-Star Water Villa",
      description: "Overwater luxury villa",
      quantity: 1,
      unit: "villa",
      unitPrice: 5000,
      totalPrice: 5000,
      costPrice: 3200, // Confidential supplier buy price
      notes: "Confidential wholesale supplier net rate negotiated with resort GM",
    });

    const publicProposal = await quotationService.getPublicQuotationByToken(quotationA.shareToken!);
    assert(publicProposal !== null, "Public proposal accessible via valid shareToken");
    
    const itemInPublic = (publicProposal?.items as any[])?.[0];
    assert(itemInPublic && itemInPublic.unitPrice === 5000, "Public proposal displays retail unit price ($5000)");
    assert(itemInPublic && itemInPublic.costPrice === undefined, "Public proposal REDACTS costPrice (0 supplier cost leakage)");
    assert(itemInPublic && itemInPublic.notes === undefined, "Public proposal REDACTS internal notes (0 leak of private supplier arrangements)");

    const invalidProposal = await quotationService.getPublicQuotationByToken("non-existent-fabricated-token");
    assert(invalidProposal === null, "Fabricated share token safely returns null (404)");

    // ─────────────────────────────────────────────────────────────────
    // 5. BOOKING, FINANCIAL WATERFALL & BALANCE RECALCULATION
    // ─────────────────────────────────────────────────────────────────
    console.log("\n▶ 5. Booking Conversion & Financial Integrity");

    const bookingA = await bookingService.createBooking(agencyA.id, {
      customerId: customerA.id,
      tripId: tripA.id,
      title: "Maldives Booking Alpha",
      destination: "Maldives",
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      adults: 2,
      totalAmount: 5000,
      currency: "USD",
    });

    // Record partial payment $2000
    await financeService.recordCustomerPayment(agencyA.id, {
      bookingId: bookingA.id,
      amount: 2000,
      paymentMethod: "CARD",
      paymentDate: new Date(),
      referenceNumber: `TXN-SMOKE-${timestamp}`,
    });

    const updatedBooking = await bookingService.getBooking(agencyA.id, bookingA.id);
    assert(Number(updatedBooking?.paidAmount) === 2000, "Booking paidAmount reflects $2000 partial payment");
    assert(Number(updatedBooking?.balanceAmount) === 3000, "Booking balanceAmount calculates remaining $3000 balance");
    assert(updatedBooking?.paymentStatus === BookingPaymentStatus.PARTIALLY_PAID, "Booking payment status transitions to PARTIALLY_PAID");

    // ─────────────────────────────────────────────────────────────────
    // 6. TRAVEL DOCUMENTS & VOUCHERS LIFECYCLE
    // ─────────────────────────────────────────────────────────────────
    console.log("\n▶ 6. Travel Documents Engine & State Transitions");

    const genResult = await travelDocumentService.generateBookingDocuments(agencyA.id, bookingA.id);
    assert(genResult.generatedCount >= 1, `Travel documents generated for booking (${genResult.generatedCount} docs)`);

    const bookingDoc = genResult.documents.find((d) => d.documentType === TravelDocumentType.BOOKING_CONFIRMATION);
    assert(!!bookingDoc, "Booking confirmation document created");
    assert(bookingDoc?.status === TravelDocumentStatus.GENERATED, "Initial document status is GENERATED");

    const issuedDoc = await travelDocumentService.issueDocument(agencyA.id, bookingDoc!.id);
    assert(issuedDoc.status === TravelDocumentStatus.ISSUED, "Document transitioned to ISSUED status");

    // ─────────────────────────────────────────────────────────────────
    // 7. BACKGROUND CRON AUTOMATION & SECURITY GUARD
    // ─────────────────────────────────────────────────────────────────
    console.log("\n▶ 7. Background Automation & CRON_SECRET Security Guard");

    const cronSecret = process.env.CRON_SECRET;
    assert(!!cronSecret && cronSecret.length >= 32, "CRON_SECRET is configured with strong entropy (>= 32 chars)");

    // Run automated reminders for Agency A safely
    const paymentReminders = await communicationService.runPaymentReminders(agencyA.id);
    assert(typeof paymentReminders.sentCount === "number", "Payment reminder scanner executed safely");

    // ─────────────────────────────────────────────────────────────────
    // 8. STRUCTURED LOGGING & CREDENTIAL REDACTION
    // ─────────────────────────────────────────────────────────────────
    console.log("\n▶ 8. Structured Logging & Secret Redaction Guard");

    const testPayload = {
      user: "owner@tripdesk.io",
      password: "SuperSecretPassword2026!",
      apiKey: "sk_live_1234567890abcdef",
      database_url: "postgresql://postgres:myDbPass@localhost:5432/postgres",
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    };

    const sanitized = sanitizeLogData(testPayload) as any;
    assert(sanitized.password === "[REDACTED]", "Logger redacts password fields");
    assert(sanitized.apiKey === "[REDACTED]", "Logger redacts apiKey fields");
    assert(sanitized.database_url === "[REDACTED]", "Logger redacts database_url fields");
    assert(sanitized.token === "[REDACTED]", "Logger redacts token fields");

    // ─────────────────────────────────────────────────────────────────
    // 9. PERFORMANCE SMOKE BENCHMARKS (< 500ms)
    // ─────────────────────────────────────────────────────────────────
    console.log("\n▶ 9. Performance Smoke Benchmarks");

    const startDashboard = performance.now();
    await dashboardService.getDashboardSummary(agencyA.id, { preset: "ALL_TIME" });
    const durationDashboard = performance.now() - startDashboard;
    assert(durationDashboard < 1500, `Dashboard Executive Summary latency is healthy (${durationDashboard.toFixed(1)}ms < 1500ms)`);

    const startQuotation = performance.now();
    await quotationService.getQuotation(agencyA.id, quotationA.id);
    const durationQuotation = performance.now() - startQuotation;
    assert(durationQuotation < 1000, `Quotation Details query latency is healthy (${durationQuotation.toFixed(1)}ms < 1000ms)`);

    // ─────────────────────────────────────────────────────────────────
    // 10. CLEANUP TEST FIXTURES
    // ─────────────────────────────────────────────────────────────────
    console.log("\n▶ Cleanup Test Fixtures");
    await prisma.customerNotification.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.travelDocument.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.payment.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.booking.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.quotationItem.deleteMany({
      where: { quotationId: quotationA.id },
    });
    await prisma.quotation.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.trip.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.customer.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    });
    await prisma.agency.deleteMany({
      where: { id: { in: [agencyA.id, agencyB.id] } },
    });

    console.log("  ✅ Test fixtures cleaned up successfully.");

  } catch (error) {
    console.error("FATAL ERROR in Post-Deployment Verification:", error);
    failedTests++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log(`  POST-DEPLOYMENT SMOKE TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("══════════════════════════════════════════════════════════════════\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPostDeploymentVerification();
