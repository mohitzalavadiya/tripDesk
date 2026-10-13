import "dotenv/config";

// Mock server-only for standalone audit test script execution
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
import { UserRole } from "@prisma/client";
import { customerPortalService } from "../src/lib/services/customer-portal-service";
import { customerNotificationService } from "../src/lib/services/customer-notification-service";
import { getCurrentUser, requireAgencyOwner, requirePlatformOwner } from "../src/lib/auth";
import { getAuthenticatedCustomer, requireCustomerAuth } from "../src/lib/auth/customer-auth";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runCustomerArchitectureAudit() {
  console.log("\n=======================================================");
  console.log("   TRIPDESK CUSTOMER ARCHITECTURE RECONCILIATION AUDIT");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  const agencyAId = `audit-agency-a-${timestamp}`;
  const agencyBId = `audit-agency-b-${timestamp}`;
  const customerAId = `audit-cust-a-${timestamp}`;
  const customerBId = `audit-cust-b-${timestamp}`;
  const tripAId = `audit-trip-a-${timestamp}`;
  const bookingAId = `audit-bkg-a-${timestamp}`;

  try {
    // ═══════════════════════════════════════════════════════════════════
    // 1. Prisma Schema & Internal Role Model Verification
    // ═══════════════════════════════════════════════════════════════════
    console.log("--- 1. Prisma Schema & Internal Role Model Verification ---");

    const validRoles = Object.values(UserRole);
    assert(validRoles.length === 2, `UserRole enum contains exactly 2 roles: [${validRoles.join(", ")}]`);
    assert(validRoles.includes("PLATFORM_OWNER" as any), "UserRole contains PLATFORM_OWNER");
    assert(validRoles.includes("AGENCY_OWNER" as any), "UserRole contains AGENCY_OWNER");
    assert(!validRoles.includes("CUSTOMER" as any), "CUSTOMER is ABSENT from UserRole enum");
    assert(!validRoles.includes("AGENT" as any), "AGENT is ABSENT from UserRole enum");
    assert(!validRoles.includes("TRAVEL_AGENT" as any), "TRAVEL_AGENT is ABSENT from UserRole enum");

    // ═══════════════════════════════════════════════════════════════════
    // 2. Multi-Tenant Fixtures Setup
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 2. Multi-Tenant Fixture Setup ---");

    await prisma.agency.create({
      data: {
        id: agencyAId,
        name: "Audit Agency Alpha",
        email: `alpha-${timestamp}@audit.test`,
        phone: "+91 9876543210",
        status: "ACTIVE",
      },
    });

    await prisma.agency.create({
      data: {
        id: agencyBId,
        name: "Audit Agency Beta",
        email: `beta-${timestamp}@audit.test`,
        phone: "+91 9876543211",
        status: "ACTIVE",
      },
    });

    const custA = await prisma.customer.create({
      data: {
        id: customerAId,
        agencyId: agencyAId,
        customerNumber: `AUD-CUST-A-${timestamp}`,
        name: "Vikram Malhotra",
        phone: "+91 9988776655",
        email: "vikram@audit.test",
      },
    });

    const custB = await prisma.customer.create({
      data: {
        id: customerBId,
        agencyId: agencyBId,
        customerNumber: `AUD-CUST-B-${timestamp}`,
        name: "Sunita Rao",
        phone: "+91 9988776644",
        email: "sunita@audit.test",
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        id: tripAId,
        agencyId: agencyAId,
        customerId: customerAId,
        tripNumber: `AUD-TRIP-${timestamp}`,
        title: "Ladakh Himalayan Expedition",
        startDate: new Date("2026-09-10"),
        endDate: new Date("2026-09-16"),
        status: "BOOKED",
      },
    });

    const bkgA = await prisma.booking.create({
      data: {
        id: bookingAId,
        agencyId: agencyAId,
        tripId: tripAId,
        customerId: customerAId,
        bookingNumber: `AUD-BKG-${timestamp}`,
        status: "CONFIRMED",
        paymentStatus: "PARTIALLY_PAID",
        totalAmount: 120000,
        paidAmount: 50000,
        balanceAmount: 70000,
      },
    });

    assert(true, "Fixtures created for Customer A (Alpha) and Customer B (Beta)");

    // ═══════════════════════════════════════════════════════════════════
    // 3. Customer Authentication & External Session Model
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 3. Customer Authentication & External Session Model ---");

    // 3.1 Verification that Customer record is NOT an internal User
    const userWithCustomerEmail = await prisma.user.findFirst({
      where: { email: custA.email! },
    });
    assert(userWithCustomerEmail === null, "Customer creation did NOT create an internal User record");

    // 3.2 Access lookup by booking number and phone
    const lookupRes = await customerPortalService.lookupCustomerAccess(
      bkgA.bookingNumber,
      custA.phone
    );
    assert(lookupRes !== null, "lookupCustomerAccess successfully resolves Customer A");
    assert(lookupRes?.customerId === customerAId, "Resolved customerId matches Customer A");
    assert(lookupRes?.agencyId === agencyAId, "Resolved agencyId matches Agency A");

    // 3.3 Access lookup with wrong phone is rejected
    const lookupFailed = await customerPortalService.lookupCustomerAccess(
      bkgA.bookingNumber,
      "+91 0000000000"
    );
    assert(lookupFailed === null, "lookupCustomerAccess rejects invalid phone number");

    // ═══════════════════════════════════════════════════════════════════
    // 4. Multi-Tenant Isolation & Customer IDOR Enforcement
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 4. Multi-Tenant Isolation & Customer IDOR Enforcement ---");

    // Customer A viewing own bookings
    const custABookings = await customerPortalService.getCustomerBookings(customerAId, agencyAId);
    assert(custABookings.length === 1, "Customer A sees exactly 1 booking");
    assert(custABookings[0].id === bookingAId, "Booking ID matches Booking A");

    // Customer B cannot see Customer A's bookings
    const custBBookings = await customerPortalService.getCustomerBookings(customerBId, agencyBId);
    assert(custBBookings.length === 0, "Customer B sees 0 bookings (Isolated from Customer A)");

    // Cross-agency lookup attempt (Customer A queried under Agency B)
    const crossAgencyBookings = await customerPortalService.getCustomerBookings(customerAId, agencyBId);
    assert(crossAgencyBookings.length === 0, "Cross-agency booking query returns 0 (Multi-Tenant boundary enforced)");

    // Customer A viewing own trip
    const custATrip = await customerPortalService.getCustomerTripDetail(customerAId, agencyAId, tripAId);
    assert(custATrip !== null, "Customer A accesses own trip detail");
    assert(custATrip?.title === "Ladakh Himalayan Expedition", "Trip title matches");

    // Customer B accessing Customer A's trip is blocked
    const custBTripAccess = await customerPortalService.getCustomerTripDetail(customerBId, agencyBId, tripAId);
    assert(custBTripAccess === null, "Customer B accessing Customer A trip returns NULL (IDOR BLOCKED)");

    // ═══════════════════════════════════════════════════════════════════
    // 5. Commercial Privacy & Zero-Data-Leakage Audit
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 5. Commercial Privacy & Zero-Data-Leakage Audit ---");

    const serializedTrip = JSON.stringify(custATrip);
    assert(!serializedTrip.includes("costPrice"), "Customer Trip View contains ZERO costPrice instances");
    assert(!serializedTrip.includes("supplierPayable"), "Customer Trip View contains ZERO supplierPayable instances");
    assert(!serializedTrip.includes("markupPercentage"), "Customer Trip View contains ZERO markupPercentage instances");
    assert(!serializedTrip.includes("markupAmount"), "Customer Trip View contains ZERO markupAmount instances");
    assert(!serializedTrip.includes("grossProfit"), "Customer Trip View contains ZERO grossProfit instances");
    assert(!serializedTrip.includes("profitMargin"), "Customer Trip View contains ZERO profitMargin instances");
    assert(!serializedTrip.includes("internalNotes"), "Customer Trip View contains ZERO internalNotes instances");
    assert(!serializedTrip.includes("operationalIssue"), "Customer Trip View contains ZERO operationalIssue instances");

    // ═══════════════════════════════════════════════════════════════════
    // 6. Customer Notifications & Preferences Isolation (10.15C)
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 6. Customer Notifications & Preferences Isolation ---");

    const notif = await customerNotificationService.createNotification(agencyAId, {
      customerId: customerAId,
      tripId: tripAId,
      bookingId: bookingAId,
      type: "TRIP_CONFIRMED" as any,
      title: "Trip Confirmed: Ladakh",
      message: "Your Himalayan tour is booked.",
      idempotencyKey: `audit-notif-${timestamp}`,
    });
    assert(notif !== null, "Customer Notification created successfully");

    // Customer B cannot see Customer A's notifications
    const custBNotifs = await customerNotificationService.listCustomerNotifications(agencyBId, customerBId);
    assert(custBNotifs.data.length === 0, "Customer B has 0 notifications (Isolated from Customer A)");

    // Customer B cannot mark Customer A's notification as read
    const crossRead = await customerNotificationService.markAsRead(agencyBId, customerBId, notif!.id);
    assert(crossRead === null, "Customer B marking Customer A notification as read is BLOCKED (IDOR)");

    // Customer A marks own notification as read
    const ownRead = await customerNotificationService.markAsRead(agencyAId, customerAId, notif!.id);
    assert(ownRead !== null && ownRead.isRead === true, "Customer A successfully marks own notification as read");

    // ═══════════════════════════════════════════════════════════════════
    // 7. Customer Feedback Isolation (10.15B)
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 7. Customer Feedback Isolation ---");

    const feedback = await customerPortalService.submitCustomerTripFeedback(
      customerAId,
      agencyAId,
      tripAId,
      { rating: 5, comments: "Incredible mountain adventure!" }
    );
    assert(feedback !== null, "Customer A submitted feedback for own trip");

    // Customer B attempting to submit feedback on Customer A's trip is blocked
    let crossFeedbackBlocked = false;
    try {
      await customerPortalService.submitCustomerTripFeedback(
        customerBId,
        agencyBId,
        tripAId,
        { rating: 1, comments: "Malicious submission" }
      );
    } catch {
      crossFeedbackBlocked = true;
    }
    assert(crossFeedbackBlocked, "Customer B submitting feedback on Customer A trip is BLOCKED (IDOR)");

  } catch (error) {
    console.error("Audit test error:", error);
    failed++;
  } finally {
    // Cleanup fixtures
    try {
      await prisma.customerFeedback.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.customerNotification.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.customerNotificationPreference.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.booking.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.trip.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.customer.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.agency.deleteMany({ where: { id: { in: [agencyAId, agencyBId] } } });
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr);
    }
    await prisma.$disconnect();
  }

  console.log("\n=======================================================");
  console.log("   CUSTOMER ARCHITECTURE AUDIT COMPLETE");
  console.log(`   RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runCustomerArchitectureAudit();
