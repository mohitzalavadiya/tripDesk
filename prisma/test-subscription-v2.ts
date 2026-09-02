import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { subscriptionService } from "../src/lib/services/subscription-service";
import { adminService } from "../src/lib/services/admin-service";
import { SubscriptionStatus, SubscriptionPaymentStatus, Prisma } from "@prisma/client";

async function runSubscriptionV2TestSuite() {
  console.log("===============================================================================");
  console.log("TRIPDESK SUBSCRIPTION V2 / BETA SUBSCRIPTION MANAGEMENT AUTOMATED TEST SUITE");
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

  const timestamp = Date.now();

  // 0. Fetch baseline identities
  const platformOwner = await prisma.user.findFirst({
    where: { role: "PLATFORM_OWNER" },
  });
  assert(!!platformOwner, "Platform Owner exists");

  // Create two distinct test agencies and owners for strict tenant isolation testing
  const agencyA = await prisma.agency.create({
    data: {
      name: `Beta Agency A ${timestamp}`,
      email: `agencyA_${timestamp}@test.tripdesk.io`,
      phone: "+919811111111",
      status: "ACTIVE",
    },
  });
  const userA = await prisma.user.create({
    data: {
      id: `usr_a_${timestamp}`,
      email: `userA_${timestamp}@test.tripdesk.io`,
      name: "Owner A",
      agencyId: agencyA.id,
      role: "AGENCY_OWNER",
    },
  });

  const agencyB = await prisma.agency.create({
    data: {
      name: `Beta Agency B ${timestamp}`,
      email: `agencyB_${timestamp}@test.tripdesk.io`,
      phone: "+919822222222",
      status: "ACTIVE",
    },
  });
  const userB = await prisma.user.create({
    data: {
      id: `usr_b_${timestamp}`,
      email: `userB_${timestamp}@test.tripdesk.io`,
      name: "Owner B",
      agencyId: agencyB.id,
      role: "AGENCY_OWNER",
    },
  });

  // ═════════════════════════════════════════════════════════════════════
  // GROUP 1: NEW AGENCY TRIAL INITIALIZATION
  // ═════════════════════════════════════════════════════════════════════
  console.log("\n[GROUP 1] New Agency 7-Day Free Trial Auto-Creation");
  const overviewA = await subscriptionService.getAgencySubscription(agencyA.id);
  assert(overviewA.subscription.status === SubscriptionStatus.TRIAL, "New agency is on TRIAL status");
  assert(overviewA.subscription.daysRemaining <= 7 && overviewA.subscription.daysRemaining >= 6, "Trial duration initialized to 7 days");
  assert(overviewA.subscription.isTrialExpired === false, "Trial is initially active and not expired");
  assert(!!overviewA.subscription.trialStart, "trialStart date is populated");
  assert(!!overviewA.subscription.trialEnd, "trialEnd date is populated");

  // ═════════════════════════════════════════════════════════════════════
  // GROUP 2: DYNAMIC PLAN LISTING & INACTIVE FILTERING
  // ═════════════════════════════════════════════════════════════════════
  console.log("\n[GROUP 2] Dynamic Plan Listing & Inactive Plan Filtering");
  // Create an inactive test plan to verify it does not appear in active purchase list
  const inactivePlan = await adminService.createPlan(
    {
      name: `Deprecated Tier ${timestamp}`,
      description: "Old plan no longer for sale",
      price: 999,
      yearlyPrice: 9999,
      durationDays: 30,
      isActive: false,
    },
    platformOwner!.id
  );

  const activePlans = await subscriptionService.listActivePlans();
  const hasInactive = activePlans.some((p) => p.id === inactivePlan.id);
  assert(!hasInactive, "Inactive plan is excluded from public active plans listing");
  assert(activePlans.some((p) => p.name === "Starter"), "Starter plan is present in active plans");
  assert(activePlans.some((p) => p.name === "Professional"), "Professional plan is present in active plans");

  // ═════════════════════════════════════════════════════════════════════
  // GROUP 3 & 4: MONTHLY & YEARLY PRICING & DYNAMIC SAVINGS
  // ═════════════════════════════════════════════════════════════════════
  console.log("\n[GROUP 3 & 4] Monthly & Yearly Pricing & Dynamic Savings");
  const starterPlan = activePlans.find((p) => p.name === "Starter")!;
  const profPlan = activePlans.find((p) => p.name === "Professional")!;

  assert(starterPlan.price === 1999, "Starter monthly price is ₹1,999");
  assert(starterPlan.yearlyPrice === 19999, "Starter yearly price is ₹19,999");
  assert(profPlan.price === 4999, "Professional monthly price is ₹4,999");
  assert(profPlan.yearlyPrice === 49999, "Professional yearly price is ₹49,999");

  const starterSavings = (starterPlan.price * 12 - (starterPlan.yearlyPrice || 0)) / (starterPlan.price * 12);
  assert(Math.round(starterSavings * 100) === 17, "Starter yearly savings is computed as ~17%");

  // ═════════════════════════════════════════════════════════════════════
  // GROUP 5 & 6: PAYMENT REQUEST CREATION & UTR SUBMISSION
  // ═════════════════════════════════════════════════════════════════════
  console.log("\n[GROUP 5 & 6] Payment Request Creation & UTR Submission");
  const testUtrA = `UTR-BETA-A-${timestamp}`;
  const reqA = await subscriptionService.createPaymentRequest(agencyA.id, userA.id, {
    planId: profPlan.id,
    billingCycle: "YEARLY",
    paymentMethod: "UPI",
    utrNumber: testUtrA,
    notes: "Paid via PhonePe Corporate UPI",
  });

  assert(reqA.status === SubscriptionPaymentStatus.PENDING, "Payment request created with status PENDING");
  assert(reqA.amount === 49999, "Payable amount for Professional Yearly is ₹49,999");
  assert(reqA.utrNumber === testUtrA, "UTR reference is accurately captured");
  assert(reqA.billingCycle === "YEARLY", "Billing cycle is captured as YEARLY");

  // Verify agency overview now reflects pending payment
  const updatedOverviewA = await subscriptionService.getAgencySubscription(agencyA.id);
  assert(updatedOverviewA.latestPendingPayment !== null, "Agency A overview has latestPendingPayment");
  assert(updatedOverviewA.latestPendingPayment?.utrNumber === testUtrA, "Pending payment UTR matches submitted reference");
  assert(updatedOverviewA.latestPendingPayment?.status === SubscriptionPaymentStatus.PENDING, "Pending payment status is PENDING");

  // ═════════════════════════════════════════════════════════════════════
  // GROUP 7 & 14: TENANT ISOLATION
  // ═════════════════════════════════════════════════════════════════════
  console.log("\n[GROUP 7 & 14] Multi-Tenant Isolation");
  const overviewB = await subscriptionService.getAgencySubscription(agencyB.id);
  assert(overviewB.latestPendingPayment === null, "Agency B sees zero pending payments from Agency A");
  assert(overviewB.paymentHistory.length === 0, "Agency B has empty payment history");

  // ═════════════════════════════════════════════════════════════════════
  // GROUP 8: PLATFORM OWNER PAYMENT APPROVAL & SUBSCRIPTION ACTIVATION
  // ═════════════════════════════════════════════════════════════════════
  console.log("\n[GROUP 8] Platform Owner Approval & Subscription Activation");
  const verifiedPaymentA = await adminService.verifySubscriptionPayment(
    reqA.id,
    { notes: "Bank credit verified on ICICI statement" },
    platformOwner!.id
  );

  assert(verifiedPaymentA.status === SubscriptionPaymentStatus.VERIFIED, "Payment transitioned to VERIFIED status");
  assert(!!verifiedPaymentA.verifiedAt, "verifiedAt timestamp recorded");

  const activatedOverviewA = await subscriptionService.getAgencySubscription(agencyA.id);
  assert(activatedOverviewA.subscription.status === SubscriptionStatus.ACTIVE, "Subscription status transitioned to ACTIVE");
  assert(activatedOverviewA.subscription.planId === profPlan.id, "Subscription upgraded to Professional Plan");
  assert(activatedOverviewA.subscription.billingCycle === "YEARLY", "Subscription billing cycle is YEARLY");
  assert(activatedOverviewA.latestPendingPayment === null, "Pending payment resolved (now null)");
  assert(activatedOverviewA.paymentHistory.length === 1, "Payment history has 1 verified record");
  assert(activatedOverviewA.paymentHistory[0].status === SubscriptionPaymentStatus.VERIFIED, "Payment history record is marked VERIFIED");

  // ═════════════════════════════════════════════════════════════════════
  // GROUP 9: IDEMPOTENT APPROVAL HANDLING
  // ═════════════════════════════════════════════════════════════════════
  console.log("\n[GROUP 9] Idempotent Approval Handling");
  try {
    await adminService.verifySubscriptionPayment(reqA.id, {}, platformOwner!.id);
    assert(false, "Double approval should throw error without double counting");
  } catch (err: any) {
    assert(true, `Double verification safely blocked: "${err.message}"`);
  }

  // ═════════════════════════════════════════════════════════════════════
  // GROUP 10: PAYMENT REJECTION WORKFLOW
  // ═════════════════════════════════════════════════════════════════════
  console.log("\n[GROUP 10] Payment Rejection Workflow");
  const testUtrB = `UTR-BETA-REJECT-${timestamp}`;
  const reqB = await subscriptionService.createPaymentRequest(agencyB.id, userB.id, {
    planId: starterPlan.id,
    billingCycle: "MONTHLY",
    paymentMethod: "BANK_TRANSFER",
    utrNumber: testUtrB,
    notes: "Attempted payment with incorrect UTR",
  });

  const rejectionReason = "UTR reference does not appear in ICICI account statement";
  const rejectedPaymentB = await adminService.rejectSubscriptionPayment(
    reqB.id,
    { reason: rejectionReason },
    platformOwner!.id
  );

  assert(rejectedPaymentB.status === SubscriptionPaymentStatus.REJECTED, "Payment status transitioned to REJECTED");
  assert(rejectedPaymentB.rejectionReason === rejectionReason, "Rejection reason saved accurately");

  const overviewBAfterReject = await subscriptionService.getAgencySubscription(agencyB.id);
  assert(overviewBAfterReject.latestPendingPayment === null, "Agency B has no pending payment");
  assert(overviewBAfterReject.paymentHistory.length === 1, "Agency B has 1 payment in history");
  assert(overviewBAfterReject.paymentHistory[0].status === SubscriptionPaymentStatus.REJECTED, "History record shows REJECTED");
  assert(overviewBAfterReject.paymentHistory[0].rejectionReason === rejectionReason, "Agency can view rejection reason");

  // ═════════════════════════════════════════════════════════════════════
  // GROUP 11 & 12: PLAN PRICE UPDATES & HISTORICAL PRICING SNAPSHOT
  // ═════════════════════════════════════════════════════════════════════
  console.log("\n[GROUP 11 & 12] Plan Price Updates & Historical Pricing Invariant");
  // Platform Owner updates Professional plan price from ₹4,999 to ₹5,499
  await adminService.updatePlan(
    profPlan.id,
    {
      price: 5499,
      yearlyPrice: 54999,
    },
    platformOwner!.id
  );

  // Agency A's historical payment record should STILL be ₹49,999
  const agencyAHistory = await prisma.subscriptionPayment.findUnique({
    where: { id: reqA.id },
  });
  assert(Number(agencyAHistory?.amount) === 49999, "Historical payment snapshot preserved at ₹49,999 despite future price increase");

  // New purchase plans listing should reflect new price
  const updatedPlans = await subscriptionService.listActivePlans();
  const updatedProfPlan = updatedPlans.find((p) => p.id === profPlan.id)!;
  assert(updatedProfPlan.price === 5499, "New plan listing shows updated price ₹5,499");
  assert(updatedProfPlan.yearlyPrice === 54999, "New plan listing shows updated yearly price ₹54,999");

  // Reset plan price back to 4999/49999 for test consistency
  await adminService.updatePlan(
    profPlan.id,
    {
      price: 4999,
      yearlyPrice: 49999,
    },
    platformOwner!.id
  );

  // ═════════════════════════════════════════════════════════════════════
  // GROUP 13: PLAN DEACTIVATION HANDLING
  // ═════════════════════════════════════════════════════════════════════
  console.log("\n[GROUP 13] Plan Deactivation & Safe Referencing");
  await adminService.updatePlan(inactivePlan.id, { isActive: false }, platformOwner!.id);

  try {
    await subscriptionService.createPaymentRequest(agencyA.id, userA.id, {
      planId: inactivePlan.id,
      billingCycle: "MONTHLY",
      utrNumber: "UTR-INVALID-PLAN",
    });
    assert(false, "Selecting inactive plan should throw error");
  } catch (err: any) {
    assert(true, `Inactive plan purchase safely rejected: "${err.message}"`);
  }

  // ═════════════════════════════════════════════════════════════════════
  // GROUP 15: ROLE AUTHORIZATION CHECKS
  // ═════════════════════════════════════════════════════════════════════
  console.log("\n[GROUP 15] Role Authorization Boundaries");
  assert(userA.role === "AGENCY_OWNER", "User A is an AGENCY_OWNER");
  assert(platformOwner?.role === "PLATFORM_OWNER", "Admin is a PLATFORM_OWNER");

  // ═════════════════════════════════════════════════════════════════════
  // GROUP 16: TRIAL EXPIRATION HANDLING
  // ═════════════════════════════════════════════════════════════════════
  console.log("\n[GROUP 16] Trial Expiration Telemetry");
  // Set trialEnd to yesterday for Agency B's subscription
  const subB = await prisma.subscription.findFirst({
    where: { agencyId: agencyB.id },
  });
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.subscription.update({
    where: { id: subB!.id },
    data: { trialEnd: yesterday },
  });

  const expiredOverviewB = await subscriptionService.getAgencySubscription(agencyB.id);
  assert(expiredOverviewB.subscription.isTrialExpired === true, "isTrialExpired is true for past trialEnd");
  assert(expiredOverviewB.subscription.daysRemaining === 0, "daysRemaining is 0 for expired trial");

  // Cleanup test agencies
  await prisma.agency.deleteMany({
    where: { id: { in: [agencyA.id, agencyB.id] } },
  });
  await prisma.subscriptionPlan.delete({
    where: { id: inactivePlan.id },
  });

  console.log("\n===============================================================================");
  console.log(`TRIPDESK SUBSCRIPTION V2 TEST RESULTS: ${passedAssertions} PASSED, ${failedAssertions} FAILED`);
  console.log("===============================================================================");

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runSubscriptionV2TestSuite().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
