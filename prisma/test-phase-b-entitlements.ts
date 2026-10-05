import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, SubscriptionStatus } from "@prisma/client";
import { entitlementService } from "../src/lib/services/entitlement-service";
import {
  NoActiveSubscriptionError,
  FeatureNotAllowedError,
  EntitlementConfigError,
  QuotaExceededError,
  ReadOnlyAccessError,
} from "../src/lib/api/errors";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧪 Starting Phase B Entitlement Service Comprehensive Test Suite...\n");

  // Setup test mock agencies and plans
  const starterPlan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { name: "Starter" } });
  const proPlan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { name: "Professional" } });

  // Create isolated QA test agencies for testing
  const testAgencyTrial = await prisma.agency.create({
    data: {
      name: "QA Phase B Trial Agency",
      email: "qa-phaseb-trial@example.com",
      phone: "9998887771",
    },
  });

  const testAgencyStarter = await prisma.agency.create({
    data: {
      name: "QA Phase B Starter Agency",
      email: "qa-phaseb-starter@example.com",
      phone: "9998887772",
    },
  });

  const testAgencyExpired = await prisma.agency.create({
    data: {
      name: "QA Phase B Expired Agency",
      email: "qa-phaseb-expired@example.com",
      phone: "9998887773",
    },
  });

  const testAgencyNoSub = await prisma.agency.create({
    data: {
      name: "QA Phase B No Sub Agency",
      email: "qa-phaseb-nosub@example.com",
      phone: "9998887774",
    },
  });

  const now = new Date();
  const past = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const future = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  // 1. Create TRIAL subscription
  await prisma.subscription.create({
    data: {
      agencyId: testAgencyTrial.id,
      planId: starterPlan.id, // Trial references starter planId in DB, but resolves to Professional entitlements!
      status: SubscriptionStatus.TRIAL,
      trialStart: past,
      trialEnd: future,
    },
  });

  // 2. Create ACTIVE Starter subscription
  await prisma.subscription.create({
    data: {
      agencyId: testAgencyStarter.id,
      planId: starterPlan.id,
      status: SubscriptionStatus.ACTIVE,
      subscriptionStart: past,
      subscriptionEnd: future,
    },
  });

  // 3. Create EXPIRED subscription
  await prisma.subscription.create({
    data: {
      agencyId: testAgencyExpired.id,
      planId: starterPlan.id,
      status: SubscriptionStatus.EXPIRED,
      subscriptionStart: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
      subscriptionEnd: past,
    },
  });

  try {
    console.log("--------------------------------------------------");
    console.log("TEST 1: Valid Trial -> Professional Entitlements");
    const trialCtx = await entitlementService.resolveAgencySubscription(testAgencyTrial.id);
    console.log(`   Effective Plan: ${trialCtx.effectivePlanName} (Expected: Professional)`);
    console.log(`   Is Trial: ${trialCtx.isTrial} (Expected: true)`);
    if (trialCtx.effectivePlanName !== "Professional" || !trialCtx.isTrial) {
      throw new Error("FAIL: Trial did not resolve to Professional entitlements.");
    }
    console.log("   ✅ PASSED");

    console.log("--------------------------------------------------");
    console.log("TEST 2: Trial with Professional.isActive = false");
    await prisma.subscriptionPlan.update({
      where: { name: "Professional" },
      data: { isActive: false },
    });
    const trialCtxInactivePro = await entitlementService.resolveAgencySubscription(testAgencyTrial.id);
    console.log(`   Effective Plan: ${trialCtxInactivePro.effectivePlanName} (Expected: Professional)`);
    if (trialCtxInactivePro.effectivePlanName !== "Professional") {
      throw new Error("FAIL: Trial failed to resolve to Professional when Professional was inactive.");
    }
    await prisma.subscriptionPlan.update({
      where: { name: "Professional" },
      data: { isActive: true },
    });
    console.log("   ✅ PASSED");

    console.log("--------------------------------------------------");
    console.log("TEST 3: Active Starter -> Starter Entitlements");
    const starterCtx = await entitlementService.resolveAgencySubscription(testAgencyStarter.id);
    console.log(`   Effective Plan: ${starterCtx.effectivePlanName} (Expected: Starter)`);
    if (starterCtx.effectivePlanName !== "Starter") {
      throw new Error("FAIL: Active Starter did not resolve to Starter.");
    }
    console.log("   ✅ PASSED");

    console.log("--------------------------------------------------");
    console.log("TEST 4: Expired Subscription -> Blocked (ReadOnlyAccessError)");
    let expiredCaught = false;
    try {
      await entitlementService.resolveAgencySubscription(testAgencyExpired.id);
    } catch (err) {
      if (err instanceof ReadOnlyAccessError) {
        expiredCaught = true;
      }
    }
    if (!expiredCaught) {
      throw new Error("FAIL: Expired subscription did not throw ReadOnlyAccessError.");
    }
    console.log("   ✅ PASSED (Caught ReadOnlyAccessError)");

    console.log("--------------------------------------------------");
    console.log("TEST 5: Missing Subscription -> Blocked (NoActiveSubscriptionError)");
    let missingCaught = false;
    try {
      await entitlementService.resolveAgencySubscription(testAgencyNoSub.id);
    } catch (err) {
      if (err instanceof NoActiveSubscriptionError) {
        missingCaught = true;
      }
    }
    if (!missingCaught) {
      throw new Error("FAIL: Missing subscription did not throw NoActiveSubscriptionError.");
    }
    console.log("   ✅ PASSED (Caught NoActiveSubscriptionError)");

    console.log("--------------------------------------------------");
    console.log("TEST 6: Stored Billing Period Verification");
    if (
      trialCtx.periodStart.getTime() !== past.getTime() ||
      trialCtx.periodEnd.getTime() !== future.getTime()
    ) {
      throw new Error("FAIL: Trial stored billing dates were not matched exactly.");
    }
    console.log("   ✅ PASSED");

    console.log("--------------------------------------------------");
    console.log("TEST 7: Feature Entitlements Check");
    const starterLogoAllowed = await entitlementService.isFeatureAllowed(
      testAgencyStarter.id,
      "CUSTOM_AGENCY_LOGO"
    );
    const trialLogoAllowed = await entitlementService.isFeatureAllowed(
      testAgencyTrial.id,
      "CUSTOM_AGENCY_LOGO"
    );
    console.log(`   Starter Agency Custom Logo: ${starterLogoAllowed} (Expected: false)`);
    console.log(`   Trial Agency Custom Logo: ${trialLogoAllowed} (Expected: true)`);

    if (starterLogoAllowed !== false || trialLogoAllowed !== true) {
      throw new Error("FAIL: Feature entitlement checks failed.");
    }

    let missingFeatureCaught = false;
    try {
      await entitlementService.checkFeatureAllowed(testAgencyTrial.id, "NON_EXISTENT_FEATURE");
    } catch (err) {
      if (err instanceof FeatureNotAllowedError) {
        missingFeatureCaught = true;
      }
    }
    if (!missingFeatureCaught) {
      throw new Error("FAIL: Missing feature key did not fail closed.");
    }
    console.log("   ✅ PASSED (Missing feature key failed closed)");

    console.log("--------------------------------------------------");
    console.log("TEST 8: Resource Usage Limits & Quota Verification");
    const starterTripsUsage = await entitlementService.getResourceUsage(
      testAgencyStarter.id,
      "TRIPS"
    );
    console.log(
      `   Starter Trips Usage: ${starterTripsUsage.currentUsage} / ${starterTripsUsage.limit} (Remaining: ${starterTripsUsage.remaining})`
    );
    if (starterTripsUsage.limit !== 20) {
      throw new Error(`Expected limit 20 for Starter TRIPS, got ${starterTripsUsage.limit}`);
    }

    const trialTripsUsage = await entitlementService.getResourceUsage(
      testAgencyTrial.id,
      "TRIPS"
    );
    console.log(
      `   Trial Trips Usage: ${trialTripsUsage.currentUsage} / ${trialTripsUsage.limit === null ? "UNLIMITED" : trialTripsUsage.limit}`
    );
    if (trialTripsUsage.limit !== null) {
      throw new Error(`Expected unlimited (null) for Trial TRIPS, got ${trialTripsUsage.limit}`);
    }

    // Seed test trip for Starter Agency (including soft-deleted) to verify creation counting
    const customer = await prisma.customer.create({
      data: {
        agencyId: testAgencyStarter.id,
        name: "Test Customer Phase B",
        email: "phaseb-customer@example.com",
        phone: "9997776661",
      },
    });

    // Create 1 active trip and 1 archived trip
    await prisma.trip.create({
      data: {
        agencyId: testAgencyStarter.id,
        customerId: customer.id,
        tripNumber: "TRIP-PB-01",
        title: "Test Trip 1",
        startDate: now,
        endDate: future,
        createdAt: now,
      },
    });

    await prisma.trip.create({
      data: {
        agencyId: testAgencyStarter.id,
        customerId: customer.id,
        tripNumber: "TRIP-PB-02",
        title: "Test Trip 2 (Archived)",
        startDate: now,
        endDate: future,
        createdAt: now,
        archivedAt: now, // Archived trip MUST still be counted!
      },
    });

    const updatedStarterTripsUsage = await entitlementService.getResourceUsage(
      testAgencyStarter.id,
      "TRIPS"
    );
    console.log(
      `   Updated Starter Trips Usage (after 1 active + 1 archived): ${updatedStarterTripsUsage.currentUsage} / ${updatedStarterTripsUsage.limit}`
    );
    if (updatedStarterTripsUsage.currentUsage !== 2) {
      throw new Error(
        `Expected currentUsage = 2 (including archived trip), got ${updatedStarterTripsUsage.currentUsage}`
      );
    }
    console.log("   ✅ PASSED (Soft-deleted trips correctly counted towards quota)");

    console.log("--------------------------------------------------");
    console.log("TEST 9: Cross-Agency Isolation Verification");
    const trialTripsAfterStarter = await entitlementService.getResourceUsage(
      testAgencyTrial.id,
      "TRIPS"
    );
    if (trialTripsAfterStarter.currentUsage !== 0) {
      throw new Error("FAIL: Cross-agency trip records were counted.");
    }
    console.log("   ✅ PASSED (Cross-agency records isolated)");

    console.log("\n==================================================");
    console.log("🎉 ALL PHASE B ENTITLEMENT SERVICE TESTS PASSED!");
    console.log("==================================================");
  } finally {
    // Cleanup temporary QA agencies and records
    await prisma.trip.deleteMany({
      where: { agencyId: { in: [testAgencyTrial.id, testAgencyStarter.id, testAgencyExpired.id, testAgencyNoSub.id] } },
    });
    await prisma.customer.deleteMany({
      where: { agencyId: { in: [testAgencyTrial.id, testAgencyStarter.id, testAgencyExpired.id, testAgencyNoSub.id] } },
    });
    await prisma.subscription.deleteMany({
      where: { agencyId: { in: [testAgencyTrial.id, testAgencyStarter.id, testAgencyExpired.id, testAgencyNoSub.id] } },
    });
    await prisma.agency.deleteMany({
      where: { id: { in: [testAgencyTrial.id, testAgencyStarter.id, testAgencyExpired.id, testAgencyNoSub.id] } },
    });
  }
}

main()
  .catch((e) => {
    console.error("❌ Phase B QA Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
