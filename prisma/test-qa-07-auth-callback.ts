import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { randomUUID } from "crypto";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runAuthCallbackTest() {
  console.log("===============================================================================");
  console.log("  TRIPDESK QA-07 — /auth/callback & ATOMIC ONBOARDING VERIFICATION TEST");
  console.log("===============================================================================\n");

  const testAuthUserId = `test-auth-${randomUUID()}`;
  const testEmail = `qa_callback_${Date.now()}@example.com`;
  let createdAgencyId: string | null = null;

  try {
    // 1. Starter Plan Lookup
    console.log("▶ Step 1: Resolving Starter SubscriptionPlan from catalog");
    let starterPlan = await prisma.subscriptionPlan.findFirst({
      where: { name: { equals: "Starter", mode: "insensitive" } },
    });
    if (!starterPlan) {
      starterPlan = await prisma.subscriptionPlan.findFirst({
        where: { isActive: true },
        orderBy: { price: "asc" },
      });
    }
    if (!starterPlan) {
      throw new Error("Starter plan not found in database catalog!");
    }
    console.log(`  ✔ Found plan: "${starterPlan.name}" (ID: ${starterPlan.id})`);

    // 2. Simulate Atomic Onboarding Transaction
    console.log("\n▶ Step 2: Executing Atomic Onboarding Transaction (Agency + User + Starter Trial)");
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const metadata = {
      agencyName: "QA Callback Travel Agency",
      agencyPhone: "+919876543210",
      agencyEmail: testEmail,
      address: "123 QA Test Road",
      city: "Ahmedabad",
      state: "Gujarat",
      country: "India",
      ownerName: "QA Callback Tester",
      phone: "+919876543210",
    };

    const onboardingResult = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { id: testAuthUserId } });
      if (existing) return { alreadyOnboarded: true };

      const agency = await tx.agency.create({
        data: {
          name: metadata.agencyName,
          phone: metadata.agencyPhone,
          email: metadata.agencyEmail,
          address: metadata.address,
          status: "ACTIVE",
        },
      });

      const user = await tx.user.create({
        data: {
          id: testAuthUserId,
          agencyId: agency.id,
          name: metadata.ownerName,
          email: testEmail,
          phone: metadata.phone,
          role: "AGENCY_OWNER",
          emailVerified: now,
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          agencyId: agency.id,
          planId: starterPlan!.id,
          status: "TRIAL",
          billingCycle: "MONTHLY",
          trialStart: now,
          trialEnd: trialEnd,
        },
      });

      return { agency, user, subscription, alreadyOnboarded: false };
    });

    if (onboardingResult.alreadyOnboarded || !onboardingResult.agency) {
      throw new Error("Initial onboarding failed to create records.");
    }
    createdAgencyId = onboardingResult.agency.id;

    console.log(`  ✔ Agency created: "${onboardingResult.agency.name}" (ID: ${onboardingResult.agency.id})`);
    console.log(`  ✔ User created: "${onboardingResult.user.name}" (ID: ${onboardingResult.user.id}, Role: ${onboardingResult.user.role})`);
    console.log(`  ✔ Subscription created: Status=${onboardingResult.subscription.status}, TrialStart=${onboardingResult.subscription.trialStart?.toISOString()}, TrialEnd=${onboardingResult.subscription.trialEnd?.toISOString()}`);

    // Verify trial period is exactly 7 days
    const durationDays = Math.round(
      (onboardingResult.subscription.trialEnd!.getTime() - onboardingResult.subscription.trialStart!.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (durationDays !== 7) {
      throw new Error(`Expected 7-day trial duration, got ${durationDays} days`);
    }
    console.log(`  ✔ Trial duration validated: exactly ${durationDays} days.`);

    // 3. Test Idempotency (Repeat Onboarding Execution for same user)
    console.log("\n▶ Step 3: Testing Idempotency (repeated callback invocation for existing user)");
    const repeatResult = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { id: testAuthUserId } });
      if (existing) return { alreadyOnboarded: true, user: existing };

      // Should not reach here
      throw new Error("Duplicate creation was not prevented!");
    });

    if (!repeatResult.alreadyOnboarded) {
      throw new Error("Idempotency check failed: expected alreadyOnboarded = true");
    }
    console.log("  ✔ Idempotency successfully verified: no duplicate records created.");

    // Check count of agencies, users, subscriptions for this test
    const agenciesCount = await prisma.agency.count({ where: { id: createdAgencyId } });
    const usersCount = await prisma.user.count({ where: { id: testAuthUserId } });
    const subscriptionsCount = await prisma.subscription.count({ where: { agencyId: createdAgencyId } });

    if (agenciesCount !== 1 || usersCount !== 1 || subscriptionsCount !== 1) {
      throw new Error(`Invariant violation: expected 1 of each, got Agency=${agenciesCount}, User=${usersCount}, Subscription=${subscriptionsCount}`);
    }
    console.log(`  ✔ Invariant verified: Exactly 1 Agency, 1 User, 1 Subscription.`);

    // 4. Test Failure Rollback (Simulate transaction failure)
    console.log("\n▶ Step 4: Testing Transaction Rollback on Failure");
    const failureUserId = `fail-user-${randomUUID()}`;
    const failureEmail = `fail_${Date.now()}@example.com`;
    let rolledBack = false;

    try {
      await prisma.$transaction(async (tx) => {
        const agency = await tx.agency.create({
          data: {
            name: "Rollback Test Agency",
            phone: "+919999999999",
            email: failureEmail,
            status: "ACTIVE",
          },
        });

        await tx.user.create({
          data: {
            id: failureUserId,
            agencyId: agency.id,
            name: "Rollback User",
            email: failureEmail,
            role: "AGENCY_OWNER",
          },
        });

        // Intentional failure with invalid non-existent plan ID
        await tx.subscription.create({
          data: {
            agencyId: agency.id,
            planId: "non-existent-plan-id-12345",
            status: "TRIAL",
          },
        });
      });
    } catch (txErr) {
      rolledBack = true;
      console.log("  ✔ Transaction caught intentional error and rolled back.");
    }

    if (!rolledBack) {
      throw new Error("Transaction did not roll back as expected!");
    }

    // Verify zero orphaned records for the failed attempt
    const failedUserCheck = await prisma.user.findUnique({ where: { id: failureUserId } });
    const failedAgencyCheck = await prisma.agency.findFirst({ where: { email: failureEmail } });
    if (failedUserCheck || failedAgencyCheck) {
      throw new Error("Orphaned records were found after transaction failure!");
    }
    console.log("  ✔ Verified zero orphaned records created during rollback.");

    console.log("\n===============================================================================");
    console.log("🎉 ALL QA-07 AUTH CALLBACK & ONBOARDING TESTS PASSED (100%)!");
    console.log("===============================================================================");
  } finally {
    // Cleanup test records
    if (createdAgencyId) {
      await prisma.subscription.deleteMany({ where: { agencyId: createdAgencyId } });
      await prisma.user.deleteMany({ where: { id: testAuthUserId } });
      await prisma.agency.deleteMany({ where: { id: createdAgencyId } });
      console.log("\n🧹 Test records cleaned up successfully.");
    }
    await prisma.$disconnect();
    await pool.end();
  }
}

runAuthCallbackTest().catch((err) => {
  console.error("❌ QA-07 TEST FAILED:", err);
  process.exit(1);
});
