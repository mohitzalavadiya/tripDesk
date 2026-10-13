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
import { NotificationChannel, CustomerNotificationType, NotificationDeliveryStatus } from "@prisma/client";
import { communicationService } from "../src/lib/services/communication-service";
import { EmailTemplateEngine } from "../src/lib/communication/email/template-engine";
import { WhatsAppTemplateEngine } from "../src/lib/communication/whatsapp/template-engine";

async function runPhase15Tests() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING PHASE 15 AUTOMATION & COMMUNICATION VERIFICATION");
  console.log("══════════════════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, label: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${label}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${label}`);
      failed++;
    }
  }

  // Cleanup helper
  const uniqueRun = Date.now();
  const testEmailA = `owner-comm-a-${uniqueRun}@tripdesk.test`;
  const testEmailB = `owner-comm-b-${uniqueRun}@tripdesk.test`;

  let agencyA: any;
  let agencyB: any;
  let customerA: any;
  let tripA: any;
  let quoteA: any;
  let bookingA: any;
  let enquiryA: any;
  let paymentA: any;

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. SETUP TEST FIXTURES
    // ─────────────────────────────────────────────────────────────────────────
    console.log("1. Setting up test agencies and fixtures...");
    agencyA = await prisma.agency.create({
      data: {
        name: `Phase 15 Agency A ${uniqueRun}`,
        email: testEmailA,
        phone: "+919876500001",
      },
    });

    agencyB = await prisma.agency.create({
      data: {
        name: `Phase 15 Agency B ${uniqueRun}`,
        email: testEmailB,
        phone: "+919876500002",
      },
    });

    customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: "Aarav Sharma",
        phone: "+919876543210",
        email: "aarav.sharma@example.com",
        city: "Mumbai",
      },
    });

    tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-${uniqueRun}`,
        title: "Splendid Kashmir Holiday",
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // In 2 days
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "BOOKED",
      },
    });

    quoteA = await prisma.quotation.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        quotationNumber: `QT-${uniqueRun}`,
        version: 1,
        shareToken: `token-${uniqueRun}`,
        finalAmount: 75000,
        currency: "INR",
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    bookingA = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        quotationId: quoteA.id,
        bookingNumber: `BK-${uniqueRun}`,
        status: "CONFIRMED",
        paymentStatus: "PARTIALLY_PAID",
        bookingDate: new Date(),
        travelStartDate: tripA.startDate,
        travelEndDate: tripA.endDate,
        totalAmount: 75000,
        paidAmount: 25000,
        balanceAmount: 50000,
      },
    });

    enquiryA = await prisma.enquiry.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        title: "Kashmir Family Vacation",
        enquiryNumber: `ENQ-${uniqueRun}`,
        destination: "Kashmir Valley",
        adults: 2,
        status: "NEW",
      },
    });

    paymentA = await prisma.payment.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        bookingId: bookingA.id,
        tripId: tripA.id,
        paymentNumber: `PAY-${uniqueRun}`,
        amount: 25000,
        currency: "INR",
        paymentDate: new Date(),
        status: "COMPLETED",
      },
    });

    assert(Boolean(agencyA.id && agencyB.id && customerA.id), "Test fixtures created successfully");

    // ─────────────────────────────────────────────────────────────────────────
    // 2. AGENCY SETTINGS & MULTI-TENANT ISOLATION
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n2. Testing Agency Communication Settings & Multi-Tenant Isolation...");
    const settingsA = await communicationService.getAgencySettings(agencyA.id);
    assert(settingsA.agencyId === agencyA.id, "Agency A settings retrieved/initialized");
    assert(settingsA.emailEnabled === true && settingsA.whatsappEnabled === true, "Default channels are enabled");

    const updatedA = await communicationService.updateAgencySettings(agencyA.id, {
      defaultSenderName: "Royal Kashmir Tours",
      paymentReminderDays: 5,
    });
    assert(updatedA.defaultSenderName === "Royal Kashmir Tours", "Agency A sender name updated");
    assert(updatedA.paymentReminderDays === 5, "Agency A payment reminder threshold updated to 5 days");

    const settingsB = await communicationService.getAgencySettings(agencyB.id);
    assert(settingsB.defaultSenderName !== "Royal Kashmir Tours", "Multi-tenant isolation: Agency B unaffected by Agency A update");

    // ─────────────────────────────────────────────────────────────────────────
    // 3. ZERO COMMERCIAL LEAKAGE AUDIT (TEMPLATES & DTOs)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n3. Testing Zero Commercial Leakage across Email and WhatsApp Templates...");
    const emailOutput = EmailTemplateEngine.render(CustomerNotificationType.QUOTATION_SENT, {
      customerName: "Aarav Sharma",
      agencyName: "Royal Kashmir Tours",
      destination: "Kashmir Valley",
      quotationNumber: quoteA.quotationNumber,
      quotationTotal: "75,000",
      quotationUrl: `https://tripdesk.internal/q/${quoteA.shareToken}`,
    });

    assert(!emailOutput.html.includes("costPrice") && !emailOutput.html.includes("buyPrice"), "Email template contains 0 costPrice or buyPrice references");
    assert(!emailOutput.html.includes("markup") && !emailOutput.html.includes("supplierPayable"), "Email template contains 0 markup or supplierPayable references");
    assert(!emailOutput.html.includes("internalNotes") && !emailOutput.html.includes("grossProfit"), "Email template contains 0 internalNotes or grossProfit references");
    assert(emailOutput.html.includes("75,000") && emailOutput.html.includes("Royal Kashmir Tours"), "Email template correctly renders customer-facing variables");

    const waOutput = WhatsAppTemplateEngine.render(CustomerNotificationType.QUOTATION_SENT, {
      customerName: "Aarav Sharma",
      agencyName: "Royal Kashmir Tours",
      quotationNumber: quoteA.quotationNumber,
      quotationUrl: `https://tripdesk.internal/q/${quoteA.shareToken}`,
    });

    assert(!waOutput.text.includes("costPrice") && !waOutput.text.includes("markup"), "WhatsApp text contains 0 cost or markup data");
    assert(waOutput.text.includes(quoteA.quotationNumber) && waOutput.text.includes("Royal Kashmir Tours"), "WhatsApp template renders customer proposal info");

    // ─────────────────────────────────────────────────────────────────────────
    // 4. EVENT-DRIVEN AUTOMATION DISPATCHERS
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n4. Testing Event-Driven Automation Triggers...");

    // A. Enquiry Created
    await communicationService.notifyEnquiryCreated(agencyA.id, enquiryA.id);
    const enqNotifs = await prisma.customerNotification.findMany({
      where: { agencyId: agencyA.id, enquiryId: enquiryA.id },
    });
    assert(enqNotifs.length === 2, "Enquiry created triggered 2 notifications (Email + WhatsApp)");
    assert(enqNotifs.some(n => n.channel === "EMAIL") && enqNotifs.some(n => n.channel === "WHATSAPP"), "Both EMAIL and WHATSAPP dispatched for enquiry");

    // B. Quotation Sent
    await communicationService.notifyQuotationSent(agencyA.id, quoteA.id);
    const quoteNotifs = await prisma.customerNotification.findMany({
      where: { agencyId: agencyA.id, quotationId: quoteA.id, type: "QUOTATION_SENT" },
    });
    assert(quoteNotifs.length === 2, "Quotation sent triggered 2 notifications (Email + WhatsApp)");
    assert(quoteNotifs[0].status === "SENT" && Boolean(quoteNotifs[0].providerMessageId), "Quotation notification marked SENT with provider ID");

    // C. Quotation Viewed with Cooldown Protection
    const view1 = await communicationService.notifyQuotationViewed(agencyA.id, quoteA.id);
    assert(Boolean(view1 && view1.id), "Quotation viewed registered first audit notification");
    const view2 = await communicationService.notifyQuotationViewed(agencyA.id, quoteA.id);
    assert(view1?.id === view2?.id, "Quotation viewed cooldown prevents duplicate spamming within 2 hours");

    // D. Booking Confirmed
    await communicationService.notifyBookingConfirmed(agencyA.id, bookingA.id);
    const bookingNotifs = await prisma.customerNotification.findMany({
      where: { agencyId: agencyA.id, bookingId: bookingA.id, type: "BOOKING_CONFIRMED" },
    });
    assert(bookingNotifs.length === 2, "Booking confirmation triggered Email and WhatsApp alerts");

    // E. Payment Received
    await communicationService.notifyPaymentReceived(agencyA.id, paymentA.id);
    const payNotifs = await prisma.customerNotification.findMany({
      where: { agencyId: agencyA.id, type: "PAYMENT_RECEIVED" },
    });
    assert(payNotifs.length === 2, "Payment receipt triggered Email and WhatsApp alerts");

    // ─────────────────────────────────────────────────────────────────────────
    // 5. SCHEDULED REMINDER SCANNERS & AUTOMATION SWEEPS
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n5. Testing Scheduled Automation Scanners...");

    // Payment Reminders
    const paySweep = await communicationService.runPaymentReminders(agencyA.id);
    assert(paySweep.sentCount >= 1, "Payment reminder scanner detected booking with outstanding balance");

    // Travel Reminders (trip starts in 2 days, threshold is 3 days)
    const travelSweep = await communicationService.runTravelReminders(agencyA.id);
    assert(travelSweep.sentCount >= 1, "Travel reminder scanner detected upcoming departure within 3 days");

    // ─────────────────────────────────────────────────────────────────────────
    // 6. DETERMINISTIC IDEMPOTENCY & SAFE RETRY / RESEND
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n6. Testing Idempotency & Safe Retry / Resend...");

    const idempKey = `test-idemp-${uniqueRun}`;
    const initialSend = await communicationService.sendCommunication(agencyA.id, {
      agencyId: agencyA.id,
      customerId: customerA.id,
      channel: NotificationChannel.EMAIL,
      type: CustomerNotificationType.OPERATIONS_ALERT,
      title: "Weather Advisory",
      message: "Expect light snowfall in Gulmarg.",
      idempotencyKey: idempKey,
    });
    assert(Boolean(initialSend?.id), "Initial communication created");

    const duplicateSend = await communicationService.sendCommunication(agencyA.id, {
      agencyId: agencyA.id,
      customerId: customerA.id,
      channel: NotificationChannel.EMAIL,
      type: CustomerNotificationType.OPERATIONS_ALERT,
      title: "Weather Advisory",
      message: "Expect light snowfall in Gulmarg.",
      idempotencyKey: idempKey,
    });
    assert(initialSend?.id === duplicateSend?.id, "Deterministic Idempotency: Duplicate call returned exact existing record");

    // Test Resend / Retry
    const resent = await communicationService.resendCommunication(agencyA.id, initialSend!.id);
    assert(resent.id === initialSend!.id, "Resend updated existing record without creating duplicate row");
    assert(resent.retryCount === 1, "Retry count incremented to 1");

    // ─────────────────────────────────────────────────────────────────────────
    // 7. CUSTOMER CHANNEL OPT-OUT PREFERENCES
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n7. Testing Customer Opt-Out Preferences...");

    await prisma.customerNotificationPreference.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        emailEnabled: false, // Customer opted out of email
        whatsappEnabled: true,
      },
    });

    const optOutSend = await communicationService.sendCommunication(agencyA.id, {
      agencyId: agencyA.id,
      customerId: customerA.id,
      channel: NotificationChannel.EMAIL,
      type: CustomerNotificationType.TRIP_UPDATED,
      title: "Itinerary Update",
      message: "New hotel confirmed.",
    });

    assert(optOutSend?.status === NotificationDeliveryStatus.CANCELLED, "Communication marked CANCELLED when customer disabled email");
    assert(optOutSend?.failureReason?.includes("opted out") === true, "Skipped record notes customer opt-out reason");

    // ─────────────────────────────────────────────────────────────────────────
    // 8. DIRECT MANUAL MESSAGE
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n8. Testing Direct Manual Messages...");

    const manualMsg = await communicationService.sendManualMessage(agencyA.id, {
      customerId: customerA.id,
      channel: NotificationChannel.WHATSAPP,
      type: CustomerNotificationType.OPERATIONS_ALERT,
      title: "Flight PNR Update",
      message: "Your boarding passes have been issued.",
    });

    assert(Boolean(manualMsg?.id), "Manual WhatsApp message dispatched successfully");
    assert(manualMsg?.channel === "WHATSAPP" && manualMsg?.status === "SENT", "Manual message recorded as SENT with WHATSAPP channel");

    // ─────────────────────────────────────────────────────────────────────────
    // 9. LOGS LISTING & FILTERING
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n9. Testing Communication Log Query API & Scoping...");

    const logsResult = await communicationService.listCommunicationLogs(agencyA.id, {
      customerId: customerA.id,
      limit: 50,
    });

    assert(logsResult.total > 0, "Communication logs retrieved for customer");
    assert(logsResult.data.every(l => l.agencyId === agencyA.id), "All retrieved logs are strictly scoped to Agency A");

    const logsB = await communicationService.listCommunicationLogs(agencyB.id, {});
    assert(logsB.total === 0, "Agency B has 0 logs, complete multi-tenant separation confirmed");

    // ─────────────────────────────────────────────────────────────────────────
    // 10. ARCHITECTURAL INTEGRITY AUDIT (0 CUSTOMER AUTH ACCOUNTS)
    // ─────────────────────────────────────────────────────────────────────────
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true },
    });
    const invalidRoleUsers = users.filter(u => u.role !== "PLATFORM_OWNER" && u.role !== "AGENCY_OWNER");
    assert(invalidRoleUsers.length === 0, "All internal users have valid roles (PLATFORM_OWNER or AGENCY_OWNER); 0 Customer accounts");

  } catch (error: any) {
    console.error("❌ Unexpected Error in Phase 15 Test Suite:", error);
    failed++;
  } finally {
    // Cleanup fixtures
    console.log("\nCleaning up test fixtures...");
    try {
      if (agencyA?.id) {
        await prisma.customerNotification.deleteMany({ where: { agencyId: agencyA.id } });
        await prisma.customerNotificationPreference.deleteMany({ where: { agencyId: agencyA.id } });
        await prisma.agencyCommunicationSetting.deleteMany({ where: { agencyId: agencyA.id } });
        await prisma.payment.deleteMany({ where: { agencyId: agencyA.id } });
        await prisma.booking.deleteMany({ where: { agencyId: agencyA.id } });
        await prisma.quotation.deleteMany({ where: { agencyId: agencyA.id } });
        await prisma.enquiry.deleteMany({ where: { agencyId: agencyA.id } });
        await prisma.trip.deleteMany({ where: { agencyId: agencyA.id } });
        await prisma.customer.deleteMany({ where: { agencyId: agencyA.id } });
        await prisma.agency.delete({ where: { id: agencyA.id } });
      }
      if (agencyB?.id) {
        await prisma.agencyCommunicationSetting.deleteMany({ where: { agencyId: agencyB.id } });
        await prisma.agency.delete({ where: { id: agencyB.id } });
      }
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr);
    }
    await prisma.$disconnect();
  }

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log(`🏁 PHASE 15 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("══════════════════════════════════════════════════════════════");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase15Tests();
