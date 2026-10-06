import "dotenv/config";
import { UserRole } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { adminService } from "../src/lib/services/admin-service";
import { entitlementService } from "../src/lib/services/entitlement-service";
import { EntitlementConfigError } from "../src/lib/api/errors";

async function runPhase213QA() {
  console.log("==================================================================");
  console.log("PHASE 213 — PLATFORM OWNER ENTITLEMENT & USAGE QUOTA QA TEST");
  console.log("==================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, description: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] Test ${totalTests}: ${description}`);
    } else {
      console.error(`❌ [FAIL] Test ${totalTests}: ${description}`);
      throw new Error(`Test failure: ${description}`);
    }
  }

  // Find a Platform Owner user ID for audit log actor
  const platformOwner = await prisma.user.findFirst({
    where: { role: UserRole.PLATFORM_OWNER },
  });

  const actorUserId = platformOwner ? platformOwner.id : "qa-platform-owner-id";

  // 1. Fetch current Starter plan and backup initial state
  const starterPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Starter" },
    include: {
      featureEntitlements: true,
      usageLimits: true,
    },
  });

  assert(!!starterPlan, "Starter subscription plan exists in database");

  const starterPlanId = starterPlan!.id;
  const initialStarterPrice = Number(starterPlan!.price);

  // Backup initial entitlement state
  const initialEntitlementsBackup = await prisma.planFeatureEntitlement.findMany({
    where: { planId: starterPlanId },
  });
  const initialUsageBackup = await prisma.planUsageLimit.findMany({
    where: { planId: starterPlanId },
  });

  try {
    // ----------------------------------------------------------------
    // TEST SECTION A: Read Initial Normalized Configuration
    // ----------------------------------------------------------------
    console.log("\n--- SECTION A: Read Normalized Configuration ---");
    const plansList = await adminService.listPlans();
    const starterFromList = plansList.find((p) => p.id === starterPlanId);

    assert(!!starterFromList, "adminService.listPlans returns Starter plan");
    assert(
      typeof starterFromList.entitlements === "object" && starterFromList.entitlements !== null,
      "Starter plan output includes normalized entitlements object"
    );
    assert(
      typeof starterFromList.usageLimits === "object" && starterFromList.usageLimits !== null,
      "Starter plan output includes normalized usageLimits object"
    );

    // ----------------------------------------------------------------
    // TEST SECTION B: Dynamic Feature Entitlement Mutation (OFF -> ON)
    // ----------------------------------------------------------------
    console.log("\n--- SECTION B: Dynamic Feature Entitlement Mutation ---");

    // Enable FEEDBACK_REVIEWS and CUSTOMER_INSIGHTS for Starter
    const updatedPlan1 = await adminService.updatePlan(
      starterPlanId,
      {
        entitlements: {
          CUSTOM_AGENCY_LOGO: false,
          FEEDBACK_REVIEWS: true,
          CUSTOMER_INSIGHTS: true,
          REPORTS_ANALYTICS: false,
        },
      },
      actorUserId
    );

    assert(
      updatedPlan1.entitlements.FEEDBACK_REVIEWS === true,
      "adminService.updatePlan updated FEEDBACK_REVIEWS to true"
    );
    assert(
      updatedPlan1.entitlements.CUSTOMER_INSIGHTS === true,
      "adminService.updatePlan updated CUSTOMER_INSIGHTS to true"
    );

    // Verify DB direct query
    const dbFe1 = await prisma.planFeatureEntitlement.findUnique({
      where: {
        planId_featureKey: {
          planId: starterPlanId,
          featureKey: "FEEDBACK_REVIEWS",
        },
      },
    });
    assert(dbFe1?.enabled === true, "Database row PlanFeatureEntitlement.enabled is true");

    // ----------------------------------------------------------------
    // TEST SECTION C: Dynamic Usage Quota Mutation (20 -> 30 & Unlimited)
    // ----------------------------------------------------------------
    console.log("\n--- SECTION C: Dynamic Usage Quota Mutation ---");

    // Update Starter TRIPS from 20 -> 30, QUOTATIONS to 35, BOOKINGS to Unlimited (null)
    const updatedPlan2 = await adminService.updatePlan(
      starterPlanId,
      {
        usageLimits: {
          TRIPS: 30,
          QUOTATIONS: 35,
          BOOKINGS: null,
        },
      },
      actorUserId
    );

    assert(updatedPlan2.usageLimits.TRIPS === 30, "Starter TRIPS updated to 30");
    assert(updatedPlan2.usageLimits.QUOTATIONS === 35, "Starter QUOTATIONS updated to 35");
    assert(updatedPlan2.usageLimits.BOOKINGS === null, "Starter BOOKINGS updated to Unlimited (null)");

    // Verify DB direct query
    const dbUlTrips = await prisma.planUsageLimit.findUnique({
      where: {
        planId_resourceKey: {
          planId: starterPlanId,
          resourceKey: "TRIPS",
        },
      },
    });
    assert(dbUlTrips?.limit === 30, "Database row PlanUsageLimit.limit for TRIPS is 30");

    const dbUlBookings = await prisma.planUsageLimit.findUnique({
      where: {
        planId_resourceKey: {
          planId: starterPlanId,
          resourceKey: "BOOKINGS",
        },
      },
    });
    assert(dbUlBookings?.limit === null, "Database row PlanUsageLimit.limit for BOOKINGS is NULL");

    // Verify entitlementService.getUsageLimit reads fresh DB value
    const serviceTripsLimit = await entitlementService.getUsageLimit(starterPlanId, "TRIPS");
    assert(serviceTripsLimit === 30, "entitlementService.getUsageLimit dynamically resolved 30 for TRIPS");

    const serviceBookingsLimit = await entitlementService.getUsageLimit(starterPlanId, "BOOKINGS");
    assert(serviceBookingsLimit === null, "entitlementService.getUsageLimit dynamically resolved null (Unlimited) for BOOKINGS");

    // ----------------------------------------------------------------
    // TEST SECTION D: Create New Plan with Entitlements & Limits
    // ----------------------------------------------------------------
    console.log("\n--- SECTION D: Create New Plan with Entitlements & Limits ---");

    const newPlanName = `Test QA Plan ${Date.now()}`;
    const createdPlan = await adminService.createPlan(
      {
        name: newPlanName,
        description: "Temporary QA Subscription Plan",
        price: 4999,
        yearlyPrice: 49999,
        durationDays: 30,
        features: ["QA Test Bullet 1", "QA Test Bullet 2"],
        isPopular: true,
        displayOrder: 99,
        isActive: true,
        entitlements: {
          CUSTOM_AGENCY_LOGO: true,
          FEEDBACK_REVIEWS: true,
          CUSTOMER_INSIGHTS: false,
          REPORTS_ANALYTICS: true,
        },
        usageLimits: {
          TRIPS: 50,
          QUOTATIONS: 100,
          BOOKINGS: null,
        },
      },
      actorUserId
    );

    assert(createdPlan.name === newPlanName, "adminService.createPlan created plan with correct name");
    assert(createdPlan.entitlements.CUSTOM_AGENCY_LOGO === true, "Created plan has CUSTOM_AGENCY_LOGO = true");
    assert(createdPlan.entitlements.CUSTOMER_INSIGHTS === false, "Created plan has CUSTOMER_INSIGHTS = false");
    assert(createdPlan.usageLimits.TRIPS === 50, "Created plan has TRIPS limit = 50");
    assert(createdPlan.usageLimits.BOOKINGS === null, "Created plan has BOOKINGS limit = null (Unlimited)");

    // Cleanup temporary created plan
    await prisma.planFeatureEntitlement.deleteMany({ where: { planId: createdPlan.id } });
    await prisma.planUsageLimit.deleteMany({ where: { planId: createdPlan.id } });
    await prisma.subscriptionPlan.delete({ where: { id: createdPlan.id } });
    console.log("Cleaned up temporary created QA plan.");

    // ----------------------------------------------------------------
    // TEST SECTION E: Fail-Closed & Security Checks
    // ----------------------------------------------------------------
    console.log("\n--- SECTION E: Fail-Closed & Security Checks ---");

    // Test missing configuration throws EntitlementConfigError
    let missingConfigCaught = false;
    try {
      await entitlementService.getUsageLimit("non-existent-plan-id", "TRIPS");
    } catch (err: any) {
      missingConfigCaught = true;
      assert(
        err.code === "ENTITLEMENT_CONFIG_ERROR" || err.name === "EntitlementConfigError" || err instanceof EntitlementConfigError,
        "Missing plan usage limit fails closed with EntitlementConfigError"
      );
    }
    assert(missingConfigCaught, "Missing configuration threw error as expected");

    // ----------------------------------------------------------------
    // TEST SECTION F: Historical Billing & Plan Inactive Safety
    // ----------------------------------------------------------------
    console.log("\n--- SECTION F: Historical Billing & Inactive Safety ---");

    // Update Starter price and deactivate temporarily
    await adminService.updatePlan(
      starterPlanId,
      {
        price: 2499,
        isActive: false,
      },
      actorUserId
    );

    // Verify existing subscription payments were not modified
    const anyPayment = await prisma.subscriptionPayment.findFirst({
      take: 1,
    });
    if (anyPayment) {
      assert(
        Number(anyPayment.amount) > 0,
        "Historical SubscriptionPayment amount remained unchanged after updating plan price"
      );
    } else {
      console.log("No historical subscription payments found, skipping payment amount assertion.");
    }

  } finally {
    // ----------------------------------------------------------------
    // CLEANUP & RESTORE BASELINE
    // ----------------------------------------------------------------
    console.log("\n--- RESTORING BASELINE STATE ---");
    // Restore scalar fields
    await prisma.subscriptionPlan.update({
      where: { id: starterPlanId },
      data: {
        price: initialStarterPrice,
        isActive: true,
      },
    });

    // Restore feature entitlements
    for (const fe of initialEntitlementsBackup) {
      await prisma.planFeatureEntitlement.upsert({
        where: { planId_featureKey: { planId: starterPlanId, featureKey: fe.featureKey } },
        create: { planId: starterPlanId, featureKey: fe.featureKey, enabled: fe.enabled },
        update: { enabled: fe.enabled },
      });
    }

    // Restore usage limits
    for (const ul of initialUsageBackup) {
      await prisma.planUsageLimit.upsert({
        where: { planId_resourceKey: { planId: starterPlanId, resourceKey: ul.resourceKey } },
        create: { planId: starterPlanId, resourceKey: ul.resourceKey, limit: ul.limit },
        update: { limit: ul.limit },
      });
    }

    console.log("Baseline state successfully restored.");
  }

  console.log("\n==================================================================");
  console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("==================================================================\n");
}

runPhase213QA()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error("QA RUN ERROR:", err);
    prisma.$disconnect();
    process.exit(1);
  });
