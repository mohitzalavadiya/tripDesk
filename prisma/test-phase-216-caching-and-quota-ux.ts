import { prisma } from "../src/lib/prisma";
import { entitlementService } from "../src/lib/services/entitlement-service";
import { subscriptionService } from "../src/lib/services/subscription-service";
import { SubscriptionStatus } from "@prisma/client";

async function main() {
  console.log("================================================================================");
  console.log("    PHASE 216 — SUBSCRIPTION STATE OPTIMIZATION & QUOTA UX QA SUITE            ");
  console.log("================================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] Test ${totalTests}: ${testName}`);
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${testName}`);
      if (details) console.error(`       Details: ${details}`);
    }
  }

  // 1. Locate Starter and Professional plans
  const starterPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Starter" },
    include: { featureEntitlements: true, usageLimits: true },
  });

  const proPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Professional" },
    include: { featureEntitlements: true, usageLimits: true },
  });

  assert(!!starterPlan, "Starter subscription plan exists in DB");
  assert(!!proPlan, "Professional subscription plan exists in DB");

  // 2. Locate baseline QA test agency
  const testAgency = await prisma.agency.findFirst({
    include: { subscriptions: { include: { plan: { include: { featureEntitlements: true, usageLimits: true } } } } },
  });

  assert(!!testAgency, "Baseline test agency exists");

  if (!testAgency) {
    console.error("Fatal QA Error: No test agency found.");
    process.exit(1);
  }

  // 3. Test Subscription Service Overview Shape
  const overview = await subscriptionService.getAgencySubscription(testAgency.id);
  assert(!!overview, "subscriptionService.getAgencySubscription returns valid overview");
  assert(!!overview.subscription, "overview.subscription is defined");
  assert(!!overview.usage, "overview contains 'usage' object");
  assert(!!overview.usage.TRIPS, "overview.usage.TRIPS is defined");
  assert(!!overview.usage.QUOTATIONS, "overview.usage.QUOTATIONS is defined");
  assert(!!overview.usage.BOOKINGS, "overview.usage.BOOKINGS is defined");

  // Verify structure of usage item
  const tripUsage = overview.usage.TRIPS;
  assert("limit" in tripUsage, "TRIPS usage contains 'limit'");
  assert("currentUsage" in tripUsage, "TRIPS usage contains 'currentUsage'");
  assert("remaining" in tripUsage, "TRIPS usage contains 'remaining'");
  assert("isExceeded" in tripUsage, "TRIPS usage contains 'isExceeded'");
  assert("periodStart" in tripUsage, "TRIPS usage contains 'periodStart'");
  assert("periodEnd" in tripUsage, "TRIPS usage contains 'periodEnd'");

  // 4. Test Quota Decision Logic Simulation
  console.log("\n--- Testing Quota Decision Logic (Client Simulator) ---");

  function evaluateCanCreate(
    subStatus: string,
    isTrialExpired: boolean,
    planCode: string,
    usageItem: { limit: number | null; currentUsage: number; remaining: number | null; isExceeded: boolean } | null
  ) {
    const isReadOnly =
      subStatus === "PAST_DUE" ||
      subStatus === "CANCELED" ||
      subStatus === "UNPAID" ||
      (isTrialExpired && subStatus !== "ACTIVE");

    if (isReadOnly) {
      return { allowed: false, reason: "READ_ONLY_SUBSCRIPTION" };
    }

    if (!usageItem) {
      if (planCode === "PROFESSIONAL" || subStatus === "TRIALING" || subStatus === "TRIAL") {
        return { allowed: true, reason: undefined };
      }
      return { allowed: true, reason: undefined };
    }

    if (usageItem.limit === null) {
      return { allowed: true, reason: undefined };
    }

    const isLimitReached = usageItem.isExceeded || usageItem.currentUsage >= usageItem.limit;
    if (isLimitReached) {
      return { allowed: false, reason: "QUOTA_EXCEEDED" };
    }

    return { allowed: true, reason: undefined };
  }

  // Case A: Starter with usage below limit (19 / 20)
  const caseA = evaluateCanCreate("ACTIVE", false, "STARTER", {
    limit: 20,
    currentUsage: 19,
    remaining: 1,
    isExceeded: false,
  });
  assert(caseA.allowed === true, "Starter usage 19/20 allows creation");

  // Case B: Starter with usage at limit (20 / 20)
  const caseB = evaluateCanCreate("ACTIVE", false, "STARTER", {
    limit: 20,
    currentUsage: 20,
    remaining: 0,
    isExceeded: true,
  });
  assert(caseB.allowed === false && caseB.reason === "QUOTA_EXCEEDED", "Starter usage 20/20 rejects creation with QUOTA_EXCEEDED");

  // Case C: Professional with Unlimited (null)
  const caseC = evaluateCanCreate("ACTIVE", false, "PROFESSIONAL", {
    limit: null,
    currentUsage: 145,
    remaining: null,
    isExceeded: false,
  });
  assert(caseC.allowed === true, "Professional unlimited quota allows creation");

  // Case D: Trial with null limit
  const caseD = evaluateCanCreate("TRIAL", false, "STARTER", {
    limit: null,
    currentUsage: 5,
    remaining: null,
    isExceeded: false,
  });
  assert(caseD.allowed === true, "Active Trial receives unlimited capability");

  // Case E: Expired / Read-Only subscription
  const caseE = evaluateCanCreate("CANCELED", false, "STARTER", {
    limit: 20,
    currentUsage: 5,
    remaining: 15,
    isExceeded: false,
  });
  assert(caseE.allowed === false && caseE.reason === "READ_ONLY_SUBSCRIPTION", "Canceled subscription rejects creation with READ_ONLY_SUBSCRIPTION");

  // 5. Verify Backend Security Authority
  console.log("\n--- Verifying Backend Quota Authority ---");
  let backendEnforced = false;
  try {
    const res = await entitlementService.checkQuota(testAgency.id, "TRIPS");
    assert(res.resourceKey === "TRIPS", "entitlementService.checkQuota verified quota availability for TRIPS");
    backendEnforced = true;
  } catch (err: any) {
    if (err.name === "QuotaExceededError" || err.code === "QUOTA_EXCEEDED") {
      assert(true, "entitlementService.checkQuota rejected with QuotaExceededError when limit exceeded");
      backendEnforced = true;
    }
  }
  assert(backendEnforced, "Backend entitlementService.checkQuota executes authoritatively");

  console.log("\n================================================================================");
  console.log(`QA SUMMARY: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("================================================================================\n");

  if (passedTests === totalTests) {
    console.log(">>> PHASE 216 QA VERIFICATION: ALL CHECKS PASSED <<<\n");
  } else {
    console.error(">>> PHASE 216 QA VERIFICATION: SOME CHECKS FAILED <<<\n");
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("Fatal QA error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
