import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, SubscriptionStatus } from "@prisma/client";
import { entitlementService } from "../src/lib/services/entitlement-service";
import { feedbackService } from "../src/lib/services/feedback-service";
import { customerInsightsService } from "../src/lib/services/customer-insights-service";
import { reportingService } from "../src/lib/services/reporting-service";
import {
  FeatureNotAllowedError,
  NoActiveSubscriptionError,
  ReadOnlyAccessError,
} from "../src/lib/api/errors";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 Starting Phase D Feature Entitlement Enforcement Test Suite...\n");

  const timestamp = Date.now();
  const testEmailStarter = `phase-d-starter-${timestamp}@example.com`;
  const testEmailPro = `phase-d-pro-${timestamp}@example.com`;
  const testEmailTrial = `phase-d-trial-${timestamp}@example.com`;

  // 1. Fetch Plan IDs from DB
  const starterPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Starter" },
  });
  const proPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Professional" },
  });

  if (!starterPlan || !proPlan) {
    throw new Error("Required subscription plans (Starter/Professional) not found in database.");
  }

  // 2. Setup Test Agencies and Subscriptions
  const agencyStarter = await prisma.agency.create({
    data: {
      name: `Phase D Starter Agency ${timestamp}`,
      email: testEmailStarter,
      phone: "+1000000001",
      status: "ACTIVE",
    },
  });

  const subStarter = await prisma.subscription.create({
    data: {
      agencyId: agencyStarter.id,
      planId: starterPlan.id,
      status: SubscriptionStatus.ACTIVE,
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const agencyPro = await prisma.agency.create({
    data: {
      name: `Phase D Pro Agency ${timestamp}`,
      email: testEmailPro,
      phone: "+1000000002",
      status: "ACTIVE",
    },
  });

  const subPro = await prisma.subscription.create({
    data: {
      agencyId: agencyPro.id,
      planId: proPlan.id,
      status: SubscriptionStatus.ACTIVE,
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const agencyTrial = await prisma.agency.create({
    data: {
      name: `Phase D Trial Agency ${timestamp}`,
      email: testEmailTrial,
      phone: "+1000000003",
      status: "ACTIVE",
    },
  });

  const subTrial = await prisma.subscription.create({
    data: {
      agencyId: agencyTrial.id,
      planId: starterPlan.id, // Trial on starter plan ID resolves to Pro entitlements
      status: SubscriptionStatus.TRIAL,
      trialStart: new Date(),
      trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("--------------------------------------------------");
  console.log("TEST 1: Starter Agency Denials for All 4 Professional Feature Keys");
  const featureKeys = [
    "CUSTOM_AGENCY_LOGO",
    "FEEDBACK_REVIEWS",
    "CUSTOMER_INSIGHTS",
    "REPORTS_ANALYTICS",
  ];

  for (const key of featureKeys) {
    let thrown = false;
    try {
      await entitlementService.checkFeatureAllowed(agencyStarter.id, key, prisma);
    } catch (err: any) {
      if (err instanceof FeatureNotAllowedError && err.code === "FEATURE_NOT_ALLOWED") {
        thrown = true;
      } else {
        console.error(`Unexpected error for ${key}:`, err);
      }
    }
    if (!thrown) {
      throw new Error(`TEST 1 FAILED: Starter agency was NOT denied feature key '${key}'.`);
    }
  }
  console.log("   ✅ PASSED: All 4 feature keys denied for Starter Agency (FEATURE_NOT_ALLOWED)");

  console.log("--------------------------------------------------");
  console.log("TEST 2: Professional Agency Allowed for All 4 Feature Keys");
  for (const key of featureKeys) {
    const isAllowed = await entitlementService.checkFeatureAllowed(agencyPro.id, key, prisma);
    if (!isAllowed) {
      throw new Error(`TEST 2 FAILED: Pro agency was denied feature key '${key}'.`);
    }
  }
  console.log("   ✅ PASSED: All 4 feature keys allowed for Professional Agency");

  console.log("--------------------------------------------------");
  console.log("TEST 3: Valid Trial Receives Professional Entitlements");
  for (const key of featureKeys) {
    const isAllowed = await entitlementService.checkFeatureAllowed(agencyTrial.id, key, prisma);
    if (!isAllowed) {
      throw new Error(`TEST 3 FAILED: Trial agency was denied feature key '${key}'.`);
    }
  }
  console.log("   ✅ PASSED: Valid Trial agency granted all Professional feature entitlements");

  console.log("--------------------------------------------------");
  console.log("TEST 4: Disabled Database Entitlement Row Test");
  // Temporarily disable CUSTOM_AGENCY_LOGO for Pro Plan
  await prisma.planFeatureEntitlement.update({
    where: { planId_featureKey: { planId: proPlan.id, featureKey: "CUSTOM_AGENCY_LOGO" } },
    data: { enabled: false },
  });

  let proDisabledCaught = false;
  try {
    await entitlementService.checkFeatureAllowed(agencyPro.id, "CUSTOM_AGENCY_LOGO", prisma);
  } catch (err: any) {
    if (err instanceof FeatureNotAllowedError) {
      proDisabledCaught = true;
    }
  }

  // Restore Pro entitlement row immediately
  await prisma.planFeatureEntitlement.update({
    where: { planId_featureKey: { planId: proPlan.id, featureKey: "CUSTOM_AGENCY_LOGO" } },
    data: { enabled: true },
  });

  if (!proDisabledCaught) {
    throw new Error("TEST 4 FAILED: Disabling database feature entitlement row did NOT block Pro agency.");
  }
  console.log("   ✅ PASSED: Dynamically disabled DB entitlement row correctly denied access (Fail Closed)");

  console.log("--------------------------------------------------");
  console.log("TEST 5: Missing Database Entitlement Row Test");
  // Temporarily delete a feature entitlement row
  const backupEntitlement = await prisma.planFeatureEntitlement.findUnique({
    where: { planId_featureKey: { planId: proPlan.id, featureKey: "CUSTOM_AGENCY_LOGO" } },
  });

  await prisma.planFeatureEntitlement.delete({
    where: { planId_featureKey: { planId: proPlan.id, featureKey: "CUSTOM_AGENCY_LOGO" } },
  });

  let missingRowCaught = false;
  try {
    await entitlementService.checkFeatureAllowed(agencyPro.id, "CUSTOM_AGENCY_LOGO", prisma);
  } catch (err: any) {
    if (err instanceof FeatureNotAllowedError) {
      missingRowCaught = true;
    }
  }

  // Restore deleted entitlement row
  if (backupEntitlement) {
    await prisma.planFeatureEntitlement.create({
      data: {
        planId: backupEntitlement.planId,
        featureKey: backupEntitlement.featureKey,
        enabled: backupEntitlement.enabled,
      },
    });
  }

  if (!missingRowCaught) {
    throw new Error("TEST 5 FAILED: Missing entitlement row did NOT fail closed.");
  }
  console.log("   ✅ PASSED: Missing feature entitlement row correctly failed closed (FEATURE_NOT_ALLOWED)");

  console.log("--------------------------------------------------");
  console.log("TEST 6: Missing Subscription & Expired Subscription Fail-Closed Behavior");
  // Agency without subscription
  const agencyNoSub = await prisma.agency.create({
    data: {
      name: `Phase D NoSub Agency ${timestamp}`,
      email: `nosub-${timestamp}@example.com`,
      phone: "+1000000004",
      status: "ACTIVE",
    },
  });

  let noSubCaught = false;
  try {
    await entitlementService.checkFeatureAllowed(agencyNoSub.id, "CUSTOM_AGENCY_LOGO", prisma);
  } catch (err: any) {
    if (err instanceof NoActiveSubscriptionError) {
      noSubCaught = true;
    }
  }

  // Agency with expired subscription
  const agencyExpired = await prisma.agency.create({
    data: {
      name: `Phase D Expired Agency ${timestamp}`,
      email: `expired-${timestamp}@example.com`,
      phone: "+1000000005",
      status: "ACTIVE",
    },
  });

  await prisma.subscription.create({
    data: {
      agencyId: agencyExpired.id,
      planId: proPlan.id,
      status: SubscriptionStatus.EXPIRED,
      subscriptionStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      subscriptionEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  });

  let expiredCaught = false;
  try {
    await entitlementService.checkFeatureAllowed(agencyExpired.id, "CUSTOM_AGENCY_LOGO", prisma);
  } catch (err: any) {
    if (err instanceof ReadOnlyAccessError) {
      expiredCaught = true;
    }
  }

  if (!noSubCaught) {
    throw new Error("TEST 6 FAILED: Agency with missing subscription did NOT throw NoActiveSubscriptionError.");
  }
  if (!expiredCaught) {
    throw new Error("TEST 6 FAILED: Agency with expired subscription did NOT throw ReadOnlyAccessError.");
  }
  console.log("   ✅ PASSED: Missing subscription throws NO_ACTIVE_SUBSCRIPTION, expired throws READ_ONLY_ACCESS");

  console.log("--------------------------------------------------");
  console.log("TEST 7: Protected Service Endpoints Direct Testing");
  
  // Feedback Service - Agency Side
  let starterFeedbackCaught = false;
  try {
    await feedbackService.listFeedbacks(agencyStarter.id);
  } catch (err: any) {
    if (err instanceof FeatureNotAllowedError) {
      starterFeedbackCaught = true;
    }
  }
  if (!starterFeedbackCaught) {
    throw new Error("TEST 7 FAILED: feedbackService.listFeedbacks did NOT block Starter agency.");
  }

  // Customer Insights Service
  let starterInsightsCaught = false;
  try {
    await customerInsightsService.getCustomerInsights(agencyStarter.id);
  } catch (err: any) {
    if (err instanceof FeatureNotAllowedError) {
      starterInsightsCaught = true;
    }
  }
  if (!starterInsightsCaught) {
    throw new Error("TEST 7 FAILED: customerInsightsService.getCustomerInsights did NOT block Starter agency.");
  }

  // Reporting Service
  let starterReportCaught = false;
  try {
    await reportingService.getAgencyBIReport(agencyStarter.id, { preset: "THIS_MONTH" });
  } catch (err: any) {
    if (err instanceof FeatureNotAllowedError) {
      starterReportCaught = true;
    }
  }
  if (!starterReportCaught) {
    throw new Error("TEST 7 FAILED: reportingService.getAgencyBIReport did NOT block Starter agency.");
  }

  console.log("   ✅ PASSED: Server services directly enforce feature entitlements");

  console.log("--------------------------------------------------");
  console.log("TEST 8: Public Feedback & Customer Portal Safety Verification");
  // Ensure getPublicFeedbackStatus works without requiring subscription check
  const publicStatus = await feedbackService.getPublicFeedbackStatus("non-existent-token");
  if (typeof publicStatus !== "object" || publicStatus === null) {
    throw new Error("TEST 8 FAILED: getPublicFeedbackStatus returned unexpected result.");
  }
  console.log("   ✅ PASSED: Public customer feedback routes remain open without entitlement restrictions");

  // Clean up temporary test data
  console.log("--------------------------------------------------");
  console.log("Cleaning up temporary test data...");
  await prisma.subscription.deleteMany({
    where: {
      agencyId: {
        in: [agencyStarter.id, agencyPro.id, agencyTrial.id, agencyNoSub.id, agencyExpired.id],
      },
    },
  });
  await prisma.agency.deleteMany({
    where: {
      id: {
        in: [agencyStarter.id, agencyPro.id, agencyTrial.id, agencyNoSub.id, agencyExpired.id],
      },
    },
  });
  console.log("   ✅ Cleanup complete.");

  console.log("\n==================================================");
  console.log("🎉 ALL PHASE D FEATURE ENTITLEMENT TESTS PASSED!");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("❌ Test Suite Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
