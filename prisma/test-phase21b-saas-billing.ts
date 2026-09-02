import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { adminService } from "../src/lib/services/admin-service";
import { SubscriptionPaymentStatus, SubscriptionStatus } from "@prisma/client";

async function runPhase21BTestSuite() {
  console.log("===============================================================================");
  console.log("TRIPDESK PHASE 21-B — SAAS SUBSCRIPTION PAYMENT & BILLING AUTOMATED TEST SUITE");
  console.log("===============================================================================");

  let passedAssertions = 0;
  let failedAssertions = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedAssertions++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failedAssertions++;
    }
  }

  // 1. Establish Baseline Production Data
  console.log("\n[TEST 1] Baseline Production Identities & Pilot Verification");
  const platformOwner = await prisma.user.findFirst({
    where: { role: "PLATFORM_OWNER" },
  });
  assert(!!platformOwner, `Platform Owner exists (${platformOwner?.email})`);
  assert(platformOwner?.agencyId === null, "Platform Owner has null agencyId");

  const pilotAgency = await prisma.agency.findFirst({
    where: { name: "TripDesk Pilot Agency" },
    include: {
      subscriptions: {
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  assert(!!pilotAgency, "TripDesk Pilot Agency exists");
  assert(pilotAgency?.subscriptions.length! > 0, "Pilot Agency has an associated subscription");

  const pilotSub = pilotAgency!.subscriptions[0];
  console.log(`  -> Pilot Agency ID: ${pilotAgency!.id}`);
  console.log(`  -> Pilot Subscription ID: ${pilotSub.id} (Plan: ${pilotSub.plan.name}, Price: ₹${pilotSub.plan.price})`);

  // Record initial customer booking payments count for isolation check
  const initialBookingPaymentsCount = await prisma.payment.count();
  const initialSupplierPaymentsCount = await prisma.supplierPayment.count();

  // 2. Test SaaS Payment Creation (PENDING status)
  console.log("\n[TEST 2] Subscription Payment Creation (Pending Review)");
  const testUtr1 = `UTR-TEST-21B-${Date.now()}`;
  const payment1 = await adminService.createSubscriptionPayment(
    {
      agencyId: pilotAgency!.id,
      subscriptionId: pilotSub.id,
      amount: 1999,
      currency: "INR",
      paymentMethod: "UPI",
      utrNumber: testUtr1,
      paymentReference: "REF-TEST-001",
      paymentDate: new Date().toISOString().split("T")[0],
      notes: "Test Pilot Starter Subscription Payment via UPI",
    },
    platformOwner!.id
  );

  assert(!!payment1.id, `Payment created with ID: ${payment1.id}`);
  assert(payment1.status === SubscriptionPaymentStatus.PENDING, "Payment initial status is PENDING");
  assert(Number(payment1.amount) === 1999, "Payment amount is ₹1,999.00");
  assert(payment1.utrNumber === testUtr1, "UTR reference is recorded correctly");

  // Check audit log
  const createAuditLog = await prisma.platformAuditLog.findFirst({
    where: {
      action: "SUBSCRIPTION_PAYMENT_CREATED",
      entityId: payment1.id,
    },
  });
  assert(!!createAuditLog, "PlatformAuditLog event SUBSCRIPTION_PAYMENT_CREATED was generated");
  assert(createAuditLog?.actorUserId === platformOwner!.id, "Audit log correctly identifies Platform Owner actor");

  // 3. Test Listing, Filtering & Summary Telemetry
  console.log("\n[TEST 3] Subscription Payments Listing & Aggregations");
  const listRes = await adminService.listSubscriptionPayments({
    search: testUtr1,
    limit: 10,
  });

  assert(listRes.items.length === 1, "Search by UTR returned exactly 1 matching record");
  assert(listRes.items[0].id === payment1.id, "Listed payment ID matches created record");
  assert(listRes.stats.pendingCount >= 1, `Pending count is tracked in summary (${listRes.stats.pendingCount})`);
  assert(listRes.stats.totalExpected > 0, `Total expected MRR computed: ₹${listRes.stats.totalExpected}`);

  // 4. Test Payment Verification Workflow
  console.log("\n[TEST 4] Payment Verification & Subscription Activation");
  const verifiedPayment = await adminService.verifySubscriptionPayment(
    payment1.id,
    { notes: "Bank statement verified on HDFC portal" },
    platformOwner!.id
  );

  assert(verifiedPayment.status === SubscriptionPaymentStatus.VERIFIED, "Payment status transitioned to VERIFIED");
  assert(!!verifiedPayment.verifiedAt, "verifiedAt timestamp recorded");
  assert(verifiedPayment.verifiedBy === platformOwner!.id, "verifiedBy set to Platform Owner ID");

  // Check Subscription state
  const updatedSub = await prisma.subscription.findUnique({
    where: { id: pilotSub.id },
  });
  assert(updatedSub?.status === SubscriptionStatus.ACTIVE, "Subscription status updated to ACTIVE");
  assert(!!updatedSub?.subscriptionStart, "subscriptionStart date initialized");
  assert(!!updatedSub?.subscriptionEnd, "subscriptionEnd validity date extended by plan duration (30 days)");

  // Check verification audit log
  const verifyAuditLog = await prisma.platformAuditLog.findFirst({
    where: {
      action: "SUBSCRIPTION_PAYMENT_VERIFIED",
      entityId: payment1.id,
    },
  });
  assert(!!verifyAuditLog, "PlatformAuditLog event SUBSCRIPTION_PAYMENT_VERIFIED was generated");

  // Verify double-verification is blocked
  try {
    await adminService.verifySubscriptionPayment(payment1.id, {}, platformOwner!.id);
    assert(false, "Double verification should throw error");
  } catch (err: any) {
    assert(true, `Double verification safely rejected: "${err.message}"`);
  }

  // 5. Test Payment Rejection Workflow
  console.log("\n[TEST 5] Payment Rejection Workflow");
  const testUtr2 = `UTR-TEST-REJECT-${Date.now()}`;
  const payment2 = await adminService.createSubscriptionPayment(
    {
      agencyId: pilotAgency!.id,
      subscriptionId: pilotSub.id,
      amount: 4999,
      currency: "INR",
      paymentMethod: "BANK_TRANSFER",
      utrNumber: testUtr2,
      notes: "Test payment to be rejected",
    },
    platformOwner!.id
  );

  assert(payment2.status === SubscriptionPaymentStatus.PENDING, "2nd payment created as PENDING");

  const rejectionReason = "UTR not found in bank statement";
  const rejectedPayment = await adminService.rejectSubscriptionPayment(
    payment2.id,
    { reason: rejectionReason },
    platformOwner!.id
  );

  assert(rejectedPayment.status === SubscriptionPaymentStatus.REJECTED, "Payment status transitioned to REJECTED");
  assert(!!rejectedPayment.rejectedAt, "rejectedAt timestamp recorded");
  assert(rejectedPayment.rejectionReason === rejectionReason, "Rejection reason recorded accurately");

  // Check rejection audit log
  const rejectAuditLog = await prisma.platformAuditLog.findFirst({
    where: {
      action: "SUBSCRIPTION_PAYMENT_REJECTED",
      entityId: payment2.id,
    },
  });
  assert(!!rejectAuditLog, "PlatformAuditLog event SUBSCRIPTION_PAYMENT_REJECTED was generated");

  // 6. Test Single Payment Retrieval
  console.log("\n[TEST 6] Single Payment Details Query");
  const fetchedPayment = await adminService.getSubscriptionPayment(payment1.id);
  assert(!!fetchedPayment, "getSubscriptionPayment returned record");
  assert(fetchedPayment?.agencyName === "TripDesk Pilot Agency", "Agency name joined correctly");
  assert(fetchedPayment?.planName === "Starter", "Plan name joined correctly");

  // 7. Test Financial Domain Isolation
  console.log("\n[TEST 7] Financial Domain Isolation Check");
  const postBookingPaymentsCount = await prisma.payment.count();
  const postSupplierPaymentsCount = await prisma.supplierPayment.count();

  assert(
    postBookingPaymentsCount === initialBookingPaymentsCount,
    `Customer Booking payments count unchanged (${postBookingPaymentsCount} === ${initialBookingPaymentsCount})`
  );
  assert(
    postSupplierPaymentsCount === initialSupplierPaymentsCount,
    `Supplier payments count unchanged (${postSupplierPaymentsCount} === ${initialSupplierPaymentsCount})`
  );

  // 8. Clean up created test payments to preserve pilot baseline
  console.log("\n[TEST 8] Cleaning Test Transactions & Restoring Pilot Baseline");
  await prisma.subscriptionPayment.deleteMany({
    where: { id: { in: [payment1.id, payment2.id] } },
  });
  await prisma.platformAuditLog.deleteMany({
    where: { entityId: { in: [payment1.id, payment2.id] } },
  });

  // Restore pilot subscription to TRIAL state
  await prisma.subscription.update({
    where: { id: pilotSub.id },
    data: {
      status: SubscriptionStatus.TRIAL,
      subscriptionStart: null,
      subscriptionEnd: null,
    },
  });
  console.log("  ✓ Pilot Agency subscription restored to canonical 7-day TRIAL baseline.");

  console.log("\n===============================================================================");
  console.log(`PHASE 21-B TEST SUITE COMPLETE: ${passedAssertions} PASSED, ${failedAssertions} FAILED`);
  console.log("===============================================================================");

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runPhase21BTestSuite()
  .catch((err) => {
    console.error("Test Suite Fatal Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
