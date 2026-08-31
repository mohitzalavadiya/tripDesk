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
import { customerNotificationService } from "../src/lib/services/customer-notification-service";
import { operationsService } from "../src/lib/services/operations-service";
import { CustomerNotificationType, NotificationChannel, NotificationDeliveryStatus } from "@prisma/client";

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

async function runPhase1015CTests() {
  console.log("\n=======================================================");
  console.log("   TRIPDESK PHASE 10.15C: CUSTOMER NOTIFICATIONS & COMMS");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  const agencyAId = `agency-notif-a-${timestamp}`;
  const agencyBId = `agency-notif-b-${timestamp}`;
  const customerAId = `cust-notif-a-${timestamp}`;
  const customerBId = `cust-notif-b-${timestamp}`;
  const tripAId = `trip-notif-a-${timestamp}`;
  const tripBId = `trip-notif-b-${timestamp}`;
  const bookingAId = `bkg-notif-a-${timestamp}`;
  const bookingBId = `bkg-notif-b-${timestamp}`;

  try {
    // ═══════════════════════════════════════════════════════════════════
    // 1. Multi-Tenant Fixture Setup
    // ═══════════════════════════════════════════════════════════════════
    console.log("--- 1. Multi-Tenant Fixture Setup ---");

    await prisma.agency.create({
      data: {
        id: agencyAId,
        name: "Alpha Alpine Trails",
        email: `alpha-notif-${timestamp}@tripdesk.test`,
        phone: "+91 9876543210",
        status: "ACTIVE",
      },
    });

    await prisma.agency.create({
      data: {
        id: agencyBId,
        name: "Beta Coastal Journeys",
        email: `beta-notif-${timestamp}@tripdesk.test`,
        phone: "+91 9876543211",
        status: "ACTIVE",
      },
    });

    const customerA = await prisma.customer.create({
      data: {
        id: customerAId,
        agencyId: agencyAId,
        customerNumber: `CUST-A-${timestamp}`,
        name: "Arjun Verma",
        phone: "+91 9811223344",
        email: "arjun@example.com",
      },
    });

    const customerB = await prisma.customer.create({
      data: {
        id: customerBId,
        agencyId: agencyBId,
        customerNumber: `CUST-B-${timestamp}`,
        name: "Divya Pillai",
        phone: "+91 9811223355",
        email: "divya@example.com",
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        id: tripAId,
        agencyId: agencyAId,
        customerId: customerAId,
        tripNumber: `TRIP-A-${timestamp}`,
        title: "Kashmir Paradise Tour",
        startDate: new Date("2026-10-15"),
        endDate: new Date("2026-10-20"),
        status: "BOOKED",
      },
    });

    const bookingA = await prisma.booking.create({
      data: {
        id: bookingAId,
        agencyId: agencyAId,
        tripId: tripAId,
        customerId: customerAId,
        bookingNumber: `BKG-A-${timestamp}`,
        status: "CONFIRMED",
        paymentStatus: "PARTIALLY_PAID",
        totalAmount: 75000,
        paidAmount: 25000,
        balanceAmount: 50000,
      },
    });

    const hotelA = await prisma.hotel.create({
      data: {
        agencyId: agencyAId,
        name: "The Khyber Himalayan Resort",
        city: "Gulmarg",
      },
    });

    const tripHotelA = await prisma.tripHotel.create({
      data: {
        tripId: tripAId,
        hotelId: hotelA.id,
        checkIn: new Date("2026-10-15"),
        checkOut: new Date("2026-10-18"),
        roomType: "Luxury Valley View",
        rooms: 1,
        totalAmount: 30000,
      },
    });

    const tripVehicleA = await prisma.tripVehicle.create({
      data: {
        tripId: tripAId,
        vehicleName: "Toyota Fortuner 4x4",
        vehicleType: "SUV",
        driverName: "Tariq Ahmad",
        driverPhone: "+91 9900112233",
        startDate: new Date("2026-10-15"),
        endDate: new Date("2026-10-20"),
      },
    });

    const tripActivityA = await prisma.tripActivity.create({
      data: {
        tripId: tripAId,
        name: "Gulmarg Gondola Phase 2 Cable Car",
        date: new Date("2026-10-16"),
        numberOfParticipants: 2,
      },
    });

    const opA = await operationsService.initializeOperation(agencyAId, {
      tripId: tripAId,
      bookingId: bookingAId,
    });

    const hotelConfA = await prisma.hotelConfirmation.update({
      where: { id: opA.hotelConfirmations[0].id },
      data: {
        confirmationNumber: "KHY-8899",
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
    });

    const vehicleDispatchA = await prisma.vehicleDispatch.update({
      where: { id: opA.vehicleDispatches[0].id },
      data: {
        driverName: "Tariq Ahmad",
        driverPhone: "+91 9900112233",
        vehicleNumber: "JK-01-AB-1234",
        status: "ASSIGNED",
      },
    });

    const activityConfA = await prisma.activityConfirmation.update({
      where: { id: opA.activityConfirmations[0].id },
      data: {
        confirmationNumber: "GON-7744",
        ticketNumber: "TCK-551122",
        status: "CONFIRMED",
      },
    });

    const paymentA = await prisma.payment.create({
      data: {
        agencyId: agencyAId,
        bookingId: bookingAId,
        tripId: tripAId,
        customerId: customerAId,
        paymentNumber: `PAY-A-${timestamp}`,
        amount: 25000,
        paymentMethod: "UPI",
        status: "COMPLETED",
        receiptNumber: `REC-A-${timestamp}`,
      },
    });

    assert(true, "Fixtures initialized for Customer A (Alpha) and Customer B (Beta)");

    // ═══════════════════════════════════════════════════════════════════
    // 2. Notification Creation & Deterministic Idempotency
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 2. Notification Creation & Idempotency ---");

    const idempotencyKey = `manual-notif-${timestamp}`;
    const notif1 = await customerNotificationService.createNotification(agencyAId, {
      customerId: customerAId,
      tripId: tripAId,
      bookingId: bookingAId,
      type: CustomerNotificationType.TRIP_CONFIRMED,
      title: "Trip Confirmed: Kashmir Paradise Tour",
      message: "Your booking is confirmed and vouchers are being prepared.",
      idempotencyKey,
      linkUrl: `/customer/trips/${tripAId}`,
    });

    assert(notif1 !== null, "Notification 1 created successfully");
    assert(notif1?.title === "Trip Confirmed: Kashmir Paradise Tour", "Notification title matches");
    assert(notif1?.isRead === false, "Initial notification is unread");

    // Re-dispatch same idempotency key (must return existing record without duplicate creation)
    const notifDuplicate = await customerNotificationService.createNotification(agencyAId, {
      customerId: customerAId,
      tripId: tripAId,
      bookingId: bookingAId,
      type: CustomerNotificationType.TRIP_CONFIRMED,
      title: "DUPLICATE TITLE",
      message: "DUPLICATE MESSAGE",
      idempotencyKey,
    });

    assert(notifDuplicate?.id === notif1?.id, "Idempotent dispatch returned existing notification ID");
    assert(notifDuplicate?.title === notif1?.title, "Idempotent duplicate did NOT overwrite original title");

    const totalInDb = await prisma.customerNotification.count({
      where: { agencyId: agencyAId, idempotencyKey },
    });
    assert(totalInDb === 1, "Database contains exactly 1 record for unique idempotency key");

    // ═══════════════════════════════════════════════════════════════════
    // 3. Multi-Tenant Isolation & Customer IDOR Protection
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 3. Multi-Tenant Isolation & IDOR Protection ---");

    // Customer B listing should not see Customer A notifications
    const custBNotifs = await customerNotificationService.listCustomerNotifications(agencyBId, customerBId);
    assert(custBNotifs.data.length === 0, "Customer B has 0 notifications (Isolated from Customer A)");

    // Customer A listing
    const custANotifs = await customerNotificationService.listCustomerNotifications(agencyAId, customerAId);
    assert(custANotifs.data.length === 1, "Customer A has exactly 1 notification");
    assert(custANotifs.data[0].id === notif1?.id, "Customer A notification ID matches");

    // Cross-agency lookup attempts
    const crossAgencyListing = await customerNotificationService.listCustomerNotifications(agencyBId, customerAId);
    assert(crossAgencyListing.data.length === 0, "Customer A lookup under Agency B returns 0 (Multi-Tenant Isolated)");

    // ═══════════════════════════════════════════════════════════════════
    // 4. Read State & Unread Counts
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 4. Read State & Unread Count Management ---");

    const unreadCountInitial = await customerNotificationService.getUnreadCount(agencyAId, customerAId);
    assert(unreadCountInitial === 1, "Unread count for Customer A is exactly 1");

    // IDOR Protection on Mark As Read: Customer B attempts to mark Customer A's notification as read
    const crossMarkRead = await customerNotificationService.markAsRead(agencyBId, customerBId, notif1!.id);
    assert(crossMarkRead === null, "Customer B marking Customer A notification as read is BLOCKED (IDOR)");

    // Customer A marks own notification as read
    const markedRead = await customerNotificationService.markAsRead(agencyAId, customerAId, notif1!.id);
    assert(markedRead !== null, "Customer A marks own notification as read");
    assert(markedRead?.isRead === true, "Notification isRead is now true");
    assert(markedRead?.status === NotificationDeliveryStatus.READ, "Status transitioned to READ");

    const unreadCountAfter = await customerNotificationService.getUnreadCount(agencyAId, customerAId);
    assert(unreadCountAfter === 0, "Unread count for Customer A is now 0");

    // ═══════════════════════════════════════════════════════════════════
    // 5. Event-Driven Notification Pipelines
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 5. Event-Driven Notification Dispatchers ---");

    // 5.1 Hotel Confirmation Event
    const hotelNotif = await customerNotificationService.notifyHotelConfirmation(agencyAId, hotelConfA.id);
    assert(hotelNotif !== null, "Hotel confirmation notification created");
    assert(hotelNotif?.type === CustomerNotificationType.HOTEL_CONFIRMED, "Type is HOTEL_CONFIRMED");
    assert(hotelNotif?.title.includes("The Khyber Himalayan Resort"), "Title includes Hotel name");
    assert(hotelNotif?.message.includes("KHY-8899"), "Message includes confirmation ref");

    // 5.2 Vehicle Dispatch Event
    const vehicleNotif = await customerNotificationService.notifyVehicleDispatch(agencyAId, vehicleDispatchA.id);
    assert(vehicleNotif !== null, "Vehicle dispatch notification created");
    assert(vehicleNotif?.type === CustomerNotificationType.VEHICLE_ASSIGNED, "Type is VEHICLE_ASSIGNED");
    assert(vehicleNotif?.message.includes("Tariq Ahmad"), "Message includes chauffeur name");

    // 5.3 Activity Confirmation Event
    const activityNotif = await customerNotificationService.notifyActivityConfirmation(agencyAId, activityConfA.id);
    assert(activityNotif !== null, "Activity confirmation notification created");
    assert(activityNotif?.type === CustomerNotificationType.ACTIVITY_CONFIRMED, "Type is ACTIVITY_CONFIRMED");
    assert(activityNotif?.title.includes("Gulmarg Gondola"), "Title includes Activity name");

    // 5.4 Payment Received Event
    const paymentNotif = await customerNotificationService.notifyPaymentReceived(agencyAId, paymentA.id);
    assert(paymentNotif !== null, "Payment received notification created");
    assert(paymentNotif?.type === CustomerNotificationType.PAYMENT_RECEIVED, "Type is PAYMENT_RECEIVED");
    assert(paymentNotif?.title.includes("₹25,000"), "Title contains formatted amount ₹25,000");

    // 5.5 Document Ready Event
    const docNotif = await customerNotificationService.notifyDocumentReady(
      agencyAId,
      tripAId,
      "HOTEL_VOUCHER",
      "The Khyber Hotel Voucher"
    );
    assert(docNotif !== null, "Document ready notification created");
    assert(docNotif?.type === CustomerNotificationType.DOCUMENT_READY, "Type is DOCUMENT_READY");
    assert(docNotif?.linkUrl === `/customer/trips/${tripAId}/documents`, "Link points to customer document center");

    // 5.6 Trip Lifecycle (Completion / Feedback Request)
    const tripCompNotif = await customerNotificationService.notifyTripStatusChange(agencyAId, tripAId, "COMPLETED");
    assert(tripCompNotif !== null, "Trip completion notification created");
    assert(tripCompNotif?.type === CustomerNotificationType.FEEDBACK_REQUEST, "Type is FEEDBACK_REQUEST");
    assert(tripCompNotif?.linkUrl === `/customer/trips/${tripAId}/feedback`, "Link points to customer feedback page");

    // ═══════════════════════════════════════════════════════════════════
    // 6. Bulk Mark All Read & Listing Filters
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 6. Bulk Read & Category Queries ---");

    const currentUnread = await customerNotificationService.getUnreadCount(agencyAId, customerAId);
    assert(currentUnread === 6, `Customer A has ${currentUnread} unread event notifications`);

    // Mark all as read
    const bulkReadRes = await customerNotificationService.markAllAsRead(agencyAId, customerAId);
    assert(bulkReadRes.count === 6, `Bulk read marked all 6 notifications as read`);

    const finalUnread = await customerNotificationService.getUnreadCount(agencyAId, customerAId);
    assert(finalUnread === 0, "Unread count after bulk read is 0");

    // Filter by type
    const paymentOnly = await customerNotificationService.listCustomerNotifications(agencyAId, customerAId, {
      type: CustomerNotificationType.PAYMENT_RECEIVED,
    });
    assert(paymentOnly.data.length === 1, "Filter by PAYMENT_RECEIVED returned exactly 1 notification");

    // ═══════════════════════════════════════════════════════════════════
    // 7. Customer Preferences Management
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 7. Customer Notification Preferences ---");

    const initialPrefs = await customerNotificationService.getPreferences(agencyAId, customerAId);
    assert(initialPrefs.inAppEnabled === true, "In-app channel enabled by default");
    assert(initialPrefs.marketingMessages === false, "Marketing messages disabled by default");

    const updatedPrefs = await customerNotificationService.updatePreferences(agencyAId, customerAId, {
      marketingMessages: true,
      smsEnabled: false,
    });
    assert(updatedPrefs.marketingMessages === true, "Marketing messages preference updated to true");
    assert(updatedPrefs.smsEnabled === false, "SMS preference updated to false");

    // Multi-tenant check on preferences
    const crossPrefLookup = await customerNotificationService.getPreferences(agencyBId, customerBId);
    assert(crossPrefLookup.smsEnabled === true, "Customer B preferences unaffected by Customer A edits");

    // ═══════════════════════════════════════════════════════════════════
    // 8. Commercial Privacy & Zero-Data-Leakage Scan
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 8. Commercial Privacy Scan ---");

    const allNotifs = await customerNotificationService.listCustomerNotifications(agencyAId, customerAId, {
      limit: 50,
    });
    const serialized = JSON.stringify(allNotifs);

    assert(!serialized.includes("costPrice"), "Notification payloads contain ZERO costPrice instances");
    assert(!serialized.includes("supplierPayable"), "Notification payloads contain ZERO supplierPayable instances");
    assert(!serialized.includes("markupPercentage"), "Notification payloads contain ZERO markupPercentage instances");
    assert(!serialized.includes("markupAmount"), "Notification payloads contain ZERO markupAmount instances");
    assert(!serialized.includes("grossProfit"), "Notification payloads contain ZERO grossProfit instances");
    assert(!serialized.includes("profitMargin"), "Notification payloads contain ZERO profitMargin instances");
    assert(!serialized.includes("internalNotes"), "Notification payloads contain ZERO internalNotes instances");
    assert(!serialized.includes("operationalIssue"), "Notification payloads contain ZERO operationalIssue instances");

  } catch (error) {
    console.error("Test execution failed with error:", error);
    failed++;
  } finally {
    // Cleanup fixtures
    try {
      await prisma.customerNotification.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.customerNotificationPreference.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.payment.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.hotelConfirmation.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.vehicleDispatch.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.activityConfirmation.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.tripHotel.deleteMany({ where: { trip: { agencyId: { in: [agencyAId, agencyBId] } } } });
      await prisma.tripVehicle.deleteMany({ where: { trip: { agencyId: { in: [agencyAId, agencyBId] } } } });
      await prisma.tripActivity.deleteMany({ where: { trip: { agencyId: { in: [agencyAId, agencyBId] } } } });
      await prisma.hotel.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
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
  console.log("   PHASE 10.15C TEST SUITE COMPLETE");
  console.log(`   RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase1015CTests();
