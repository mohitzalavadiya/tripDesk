/**
 * TRIPDESK PHASE 21-F: AGENCY COMMUNICATION CENTER & NOTIFICATION ENGINE
 * Comprehensive Automated Verification Suite
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { communicationService } from "../src/lib/services/communication-service";
import { customerNotificationService } from "../src/lib/services/customer-notification-service";
import {
  sendManualMessageSchema,
  listCommunicationLogsSchema,
} from "../src/lib/validation/communication-schema";
import {
  CustomerNotificationType,
  NotificationChannel,
  NotificationDeliveryStatus,
  TripStatus,
  BookingStatus,
  BookingPaymentStatus,
} from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runSuite() {
  console.log("\n═════════════════════════════════════════════════════════════════════");
  console.log("TRIPDESK PHASE 21-F: COMMUNICATION & NOTIFICATION TEST SUITE");
  console.log("═════════════════════════════════════════════════════════════════════\n");

  let pilotAgency: any = null;
  let testCustomer: any = null;
  let testTrip: any = null;
  let testBooking: any = null;
  let testShareLink: any = null;
  const tokenA = `qa_token_phase21f_${Date.now()}`;

  // Isolation Tenant B
  let testAgencyB: any = null;
  let testCustomerB: any = null;
  let testTripB: any = null;
  const tokenB = `qa_token_phase21f_agencyb_${Date.now()}`;

  try {
    // ─────────────────────────────────────────────────────────────────
    // 1. BASELINE PILOT VERIFICATION & FIXTURES
    // ─────────────────────────────────────────────────────────────────
    console.log("--- 1. Baseline Pilot & Test Fixtures ---");
    pilotAgency = await prisma.agency.findFirst({
      where: { name: "TripDesk Pilot Agency" },
    });
    assert(!!pilotAgency, "TripDesk Pilot Agency exists");

    testCustomer = await prisma.customer.create({
      data: {
        agencyId: pilotAgency.id,
        name: "Vikram Malhotra",
        email: `vikram.malhotra.${Date.now()}@example.com`,
        phone: "+919876543210",
        city: "Mumbai",
      },
    });
    assert(!!testCustomer, "Test Customer created in Pilot Agency");

    testTrip = await prisma.trip.create({
      data: {
        agencyId: pilotAgency.id,
        customerId: testCustomer.id,
        title: "Golden Triangle Luxury Experience",
        tripNumber: `TRIP-QA-21F-${Date.now()}`,
        status: TripStatus.BOOKED,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
    assert(!!testTrip, "Test Trip created with status BOOKED");

    testBooking = await prisma.booking.create({
      data: {
        agencyId: pilotAgency.id,
        customerId: testCustomer.id,
        tripId: testTrip.id,
        bookingNumber: `BK-QA-21F-${Date.now()}`,
        status: BookingStatus.CONFIRMED,
        paymentStatus: BookingPaymentStatus.PARTIALLY_PAID,
        totalAmount: 150000,
        paidAmount: 50000,
        balanceAmount: 100000,
      },
    });
    assert(!!testBooking, "Test Booking created with status CONFIRMED");

    testShareLink = await prisma.publicShareLink.create({
      data: {
        agencyId: pilotAgency.id,
        tripId: testTrip.id,
        tokenHash: tokenA,
        status: "ACTIVE",
      },
    });
    assert(!!testShareLink, "PublicShareLink created for secure token A");

    // ─────────────────────────────────────────────────────────────────
    // 2. MANUAL COMMUNICATION DISPATCH
    // ─────────────────────────────────────────────────────────────────
    console.log("\n--- 2. Manual Communication Dispatch ---");
    const manualResult = await communicationService.sendManualMessage(pilotAgency.id, {
      customerId: testCustomer.id,
      tripId: testTrip.id,
      bookingId: testBooking.id,
      channel: NotificationChannel.IN_APP,
      type: CustomerNotificationType.OPERATIONS_ALERT,
      title: "Airport Pickup & Chauffeur Details",
      message: "Your private chauffeur (Rajesh, +919811223344) will receive you at Terminal 3.",
    });

    assert(!!manualResult, "Manual communication created successfully");
    assert(manualResult?.customerId === testCustomer.id, "Customer ID matched");
    assert(manualResult?.tripId === testTrip.id, "Trip ID matched");
    assert(manualResult?.title === "Airport Pickup & Chauffeur Details", "Title matched");
    assert(manualResult?.channel === NotificationChannel.IN_APP, "Channel recorded as IN_APP");
    assert(manualResult?.status === NotificationDeliveryStatus.SENT, "Status recorded as SENT");

    // Verify persistence in PostgreSQL
    const dbNotif = await prisma.customerNotification.findUnique({
      where: { id: manualResult!.id },
    });
    assert(!!dbNotif, "CustomerNotification persists in PostgreSQL");
    assert(dbNotif?.agencyId === pilotAgency.id, "agencyId correctly scoped to Pilot Agency");

    // ─────────────────────────────────────────────────────────────────
    // 3. MULTI-TENANT ISOLATION
    // ─────────────────────────────────────────────────────────────────
    console.log("\n--- 3. Multi-Tenant Isolation ---");
    testAgencyB = await prisma.agency.create({
      data: {
        name: "Phase 21F Isolated Agency B",
        email: `agencyb.phase21f.${Date.now()}@tripdesk.io`,
        phone: "+919988776655",
      },
    });

    testCustomerB = await prisma.customer.create({
      data: {
        agencyId: testAgencyB.id,
        name: "Agency B Customer",
        email: `custb.${Date.now()}@example.com`,
        phone: "+919123456789",
      },
    });

    testTripB = await prisma.trip.create({
      data: {
        agencyId: testAgencyB.id,
        customerId: testCustomerB.id,
        title: "Agency B Private Tour",
        tripNumber: `TRIP-B-${Date.now()}`,
        status: TripStatus.BOOKED,
        startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.publicShareLink.create({
      data: {
        agencyId: testAgencyB.id,
        tripId: testTripB.id,
        tokenHash: tokenB,
        status: "ACTIVE",
      },
    });

    // Create notification in Agency B
    const notifB = await communicationService.sendManualMessage(testAgencyB.id, {
      customerId: testCustomerB.id,
      tripId: testTripB.id,
      channel: NotificationChannel.IN_APP,
      type: CustomerNotificationType.OPERATIONS_ALERT,
      title: "Agency B Internal Notice",
      message: "Confidential Agency B data.",
    });

    // Query Pilot Agency logs: must contain 0 records from Agency B
    const pilotLogs = await communicationService.listCommunicationLogs(pilotAgency.id, { limit: 100 });
    const hasAgencyBData = pilotLogs.data.some((l) => l.agencyId === testAgencyB.id || l.id === notifB?.id);
    assert(!hasAgencyBData, "Multi-tenant isolation: Pilot Agency cannot view Agency B communications");

    // Direct access to Agency B record using Pilot Agency context must fail
    const crossTenantLookup = await communicationService.getCommunicationDetails(pilotAgency.id, notifB!.id);
    assert(crossTenantLookup === null, "Cross-tenant communication lookup returns null (IDOR prevented)");

    // ─────────────────────────────────────────────────────────────────
    // 4. CUSTOMER PORTAL SECURE NOTIFICATION RESOLUTION
    // ─────────────────────────────────────────────────────────────────
    console.log("\n--- 4. Customer Portal Secure Notifications ---");
    const portalNotifs = await communicationService.getPublicNotifications(tokenA);
    assert(portalNotifs.notifications.length > 0, "Public token A resolves customer notifications");
    assert(portalNotifs.customer.name === "Vikram Malhotra", "Resolved correct customer name");
    assert(portalNotifs.agency.name === "TripDesk Pilot Agency", "Resolved correct agency name");
    assert(portalNotifs.unreadCount >= 1, "Accurately reports unread notifications count");

    // Token B resolves Agency B customer notifications
    const portalNotifsB = await communicationService.getPublicNotifications(tokenB);
    assert(portalNotifsB.customer.name === "Agency B Customer", "Token B resolves exclusively to Agency B customer");
    assert(portalNotifsB.agency.name === "Phase 21F Isolated Agency B", "Token B resolves exclusively to Agency B");

    // Invalid Token Check
    let invalidTokenCaught = false;
    try {
      await communicationService.getPublicNotifications("invalid_fake_token_12345");
    } catch (err: any) {
      if (err.message.includes("INVALID_TOKEN")) invalidTokenCaught = true;
    }
    assert(invalidTokenCaught, "Invalid public token rejected with INVALID_TOKEN error");

    // ─────────────────────────────────────────────────────────────────
    // 5. NOTIFICATION READ STATE TRANSITIONS
    // ─────────────────────────────────────────────────────────────────
    console.log("\n--- 5. Notification Read State Transitions ---");
    const targetNotif = portalNotifs.notifications[0];
    assert(!targetNotif.isRead, "Initial notification state is unread (isRead: false)");

    const readResult = await communicationService.markPublicNotificationRead(tokenA, targetNotif.id);
    assert(readResult.isRead === true, "markPublicNotificationRead returns isRead: true");
    assert(!!readResult.readAt, "readAt timestamp populated");

    // Verify via public query
    const refreshedPortalNotifs = await communicationService.getPublicNotifications(tokenA);
    const updatedTargetNotif = refreshedPortalNotifs.notifications.find((n) => n.id === targetNotif.id);
    assert(updatedTargetNotif?.isRead === true, "Refreshed query reflects isRead: true");

    // Unauthorized mark read attempt with Token B on Token A's notification must fail
    let crossTenantReadCaught = false;
    try {
      await communicationService.markPublicNotificationRead(tokenB, targetNotif.id);
    } catch (err: any) {
      if (err.message.includes("NOTIFICATION_NOT_FOUND")) crossTenantReadCaught = true;
    }
    assert(crossTenantReadCaught, "Cross-token unauthorized mark-as-read strictly rejected");

    // ─────────────────────────────────────────────────────────────────
    // 6. IDEMPOTENCY & DUPLICATE PREVENTION
    // ─────────────────────────────────────────────────────────────────
    console.log("\n--- 6. Idempotency & Duplicate Prevention ---");
    const idempotencyKey = `qa-idem-booking-${testBooking.id}-${Date.now()}`;

    const dispatch1 = await communicationService.sendCommunication(pilotAgency.id, {
      agencyId: pilotAgency.id,
      customerId: testCustomer.id,
      bookingId: testBooking.id,
      type: CustomerNotificationType.BOOKING_CONFIRMED,
      channel: NotificationChannel.IN_APP,
      title: "Booking Confirmation #BK-21F",
      message: "Your luxury booking has been confirmed.",
      idempotencyKey,
    });

    const countBefore = await prisma.customerNotification.count({
      where: { agencyId: pilotAgency.id, idempotencyKey },
    });
    assert(countBefore === 1, "First dispatch created exactly 1 notification record");

    // Second dispatch with same idempotencyKey
    const dispatch2 = await communicationService.sendCommunication(pilotAgency.id, {
      agencyId: pilotAgency.id,
      customerId: testCustomer.id,
      bookingId: testBooking.id,
      type: CustomerNotificationType.BOOKING_CONFIRMED,
      channel: NotificationChannel.IN_APP,
      title: "Booking Confirmation #BK-21F",
      message: "Your luxury booking has been confirmed.",
      idempotencyKey,
    });

    const countAfter = await prisma.customerNotification.count({
      where: { agencyId: pilotAgency.id, idempotencyKey },
    });
    assert(countAfter === 1, "Duplicate dispatch prevented: count remains strictly 1");
    assert(dispatch1?.id === dispatch2?.id, "Idempotent dispatch returns existing record ID");

    // ─────────────────────────────────────────────────────────────────
    // 7. AUTOMATED EVENT GENERATION & TRIP LIFECYCLE
    // ─────────────────────────────────────────────────────────────────
    console.log("\n--- 7. Automated Event Generation ---");
    // Booking Confirmed Event
    await communicationService.notifyBookingConfirmed(
      pilotAgency.id,
      testBooking.id
    );
    const bookingNotif = await prisma.customerNotification.findFirst({
      where: {
        agencyId: pilotAgency.id,
        bookingId: testBooking.id,
        type: CustomerNotificationType.BOOKING_CONFIRMED,
      },
    });
    assert(!!bookingNotif, "Automated event generated: BOOKING_CONFIRMED");

    // Trip Completed & Feedback Request Event
    await customerNotificationService.notifyTripStatusChange(
      pilotAgency.id,
      testTrip.id,
      "COMPLETED"
    );
    const feedbackNotif = await prisma.customerNotification.findFirst({
      where: {
        agencyId: pilotAgency.id,
        tripId: testTrip.id,
        type: CustomerNotificationType.FEEDBACK_REQUEST,
      },
    });
    assert(!!feedbackNotif, "Automated event generated: FEEDBACK_REQUEST on tour completion");

    // ─────────────────────────────────────────────────────────────────
    // 8. COMMERCIAL SAFETY & ZERO LEAK VERIFICATION
    // ─────────────────────────────────────────────────────────────────
    console.log("\n--- 8. Commercial Safety & Zero Data Leak ---");
    const safePayload = await communicationService.getPublicNotifications(tokenA);
    const safeJson = JSON.stringify(safePayload);

    assert(!safeJson.includes("supplierCost"), "Public payload does NOT contain supplierCost");
    assert(!safeJson.includes("buyPrice"), "Public payload does NOT contain buyPrice");
    assert(!safeJson.includes("grossProfit"), "Public payload does NOT contain grossProfit");
    assert(!safeJson.includes("grossMargin"), "Public payload does NOT contain grossMargin");
    assert(!safeJson.includes("supplierPayable"), "Public payload does NOT contain supplierPayable");
    assert(!safeJson.includes("internalNotes"), "Public payload does NOT contain internalNotes");

    // ─────────────────────────────────────────────────────────────────
    // 9. INPUT VALIDATION & BOUNDARY CONSTRAINTS
    // ─────────────────────────────────────────────────────────────────
    console.log("\n--- 9. Input Validation & Boundaries ---");
    const validParsed = sendManualMessageSchema.safeParse({
      customerId: testCustomer.id,
      channel: NotificationChannel.IN_APP,
      title: "Valid Title",
      message: "Valid Message Content",
    });
    assert(validParsed.success, "Valid manual message payload passes Zod schema");

    const emptyMessageParsed = sendManualMessageSchema.safeParse({
      customerId: testCustomer.id,
      channel: NotificationChannel.IN_APP,
      title: "Valid Title",
      message: "",
    });
    assert(!emptyMessageParsed.success, "Empty message body rejected by Zod schema");

    const longMessageParsed = sendManualMessageSchema.safeParse({
      customerId: testCustomer.id,
      channel: NotificationChannel.IN_APP,
      title: "Valid Title",
      message: "x".repeat(5001),
    });
    assert(!longMessageParsed.success, "Message > 5000 characters rejected by Zod schema");

    // ─────────────────────────────────────────────────────────────────
    // 10. SUMMARY SCORECARDS TELEMETRY
    // ─────────────────────────────────────────────────────────────────
    console.log("\n--- 10. Communication Summary Telemetry ---");
    const summary = await communicationService.getCommunicationSummary(pilotAgency.id);
    assert(summary.totalCommunications > 0, "totalCommunications > 0");
    assert(summary.deliveredCount >= 0, "deliveredCount is a valid number");
    assert(summary.pendingCount >= 0, "pendingCount is a valid number");
    assert(summary.failedCount >= 0, "failedCount is a valid number");
    assert(summary.unreadCount >= 0, "unreadCount is a valid number");

    console.log("\n═════════════════════════════════════════════════════════════════════");
    console.log("PHASE 21-F TEST RESULTS: ALL ASSERTIONS PASSED (100%)");
    console.log("═════════════════════════════════════════════════════════════════════\n");
  } catch (error) {
    console.error("Test Suite Failure:", error);
    process.exit(1);
  } finally {
    console.log("🧹 Cleaning up test fixtures...");
    try {
      if (pilotAgency && testCustomer) {
        await prisma.customerNotification.deleteMany({
          where: { agencyId: pilotAgency.id, customerId: testCustomer.id },
        });
        await prisma.publicShareLink.deleteMany({
          where: { agencyId: pilotAgency.id, tokenHash: tokenA },
        });
        await prisma.booking.deleteMany({
          where: { agencyId: pilotAgency.id, customerId: testCustomer.id },
        });
        await prisma.trip.deleteMany({
          where: { agencyId: pilotAgency.id, customerId: testCustomer.id },
        });
        await prisma.customer.deleteMany({
          where: { id: testCustomer.id },
        });
      }
      if (testAgencyB) {
        await prisma.customerNotification.deleteMany({
          where: { agencyId: testAgencyB.id },
        });
        await prisma.publicShareLink.deleteMany({
          where: { agencyId: testAgencyB.id },
        });
        await prisma.booking.deleteMany({
          where: { agencyId: testAgencyB.id },
        });
        await prisma.trip.deleteMany({
          where: { agencyId: testAgencyB.id },
        });
        await prisma.customer.deleteMany({
          where: { agencyId: testAgencyB.id },
        });
        await prisma.agency.deleteMany({
          where: { id: testAgencyB.id },
        });
      }
      console.log("🧹 Teardown complete.");
    } catch (cleanupError) {
      console.error("Cleanup error:", cleanupError);
    }
  }
}

runSuite().catch(console.error);
