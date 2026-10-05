import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { quotationService } from "../src/lib/services/quotation-service";
import { bookingService } from "../src/lib/services/booking-service";
import { tripService } from "../src/lib/services/trip-service";
import { entitlementService } from "../src/lib/services/entitlement-service";
import { QuotaExceededError } from "../src/lib/api/errors";
import { SubscriptionStatus } from "@prisma/client";

async function runPhase214QA() {
  console.log("==================================================================");
  console.log("PHASE 214 — SUBSCRIPTION QUOTA BYPASS REMEDIATION QA TEST");
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

  // 1. Locate Starter and Professional plans
  const starterPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Starter" },
  });
  const proPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Professional" },
  });

  assert(!!starterPlan, "Starter subscription plan exists");
  assert(!!proPlan, "Professional subscription plan exists");

  const starterPlanId = starterPlan!.id;
  const proPlanId = proPlan!.id;

  // Backup original PlanUsageLimit for Starter plan
  const originalStarterLimits = await prisma.planUsageLimit.findMany({
    where: { planId: starterPlanId },
  });

  async function restoreLimits() {
    for (const limitRow of originalStarterLimits) {
      await prisma.planUsageLimit.upsert({
        where: { planId_resourceKey: { planId: starterPlanId, resourceKey: limitRow.resourceKey } },
        create: { planId: starterPlanId, resourceKey: limitRow.resourceKey, limit: limitRow.limit },
        update: { limit: limitRow.limit },
      });
    }
  }

  // 2. Create an isolated QA test agency on Starter plan for clean quota testing
  const qaAgency = await prisma.agency.create({
    data: {
      name: "QA Phase 214 Remediated Agency",
      email: `qa-phase-214-${Date.now()}@tripdesk-qa.internal`,
      phone: "+919999999999",
    },
  });

  const agencyId = qaAgency.id;

  // Create active subscription on Starter plan
  await prisma.subscription.create({
    data: {
      agencyId,
      planId: starterPlanId,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: "MONTHLY",
      subscriptionStart: new Date(Date.now() - 86400000),
      subscriptionEnd: new Date(Date.now() + 30 * 86400000),
    },
  });

  const qaCustomer = await prisma.customer.create({
    data: {
      agencyId,
      name: "QA Remediation Customer",
      email: `customer-${Date.now()}@qa.internal`,
      phone: "+919876543210",
    },
  });

  const qaTrip = await tripService.createTrip(agencyId, {
    customerId: qaCustomer.id,
    title: "QA Remediation Trip",
    startDate: new Date(),
    endDate: new Date(Date.now() + 5 * 86400000),
  });

  try {
    // ----------------------------------------------------------------
    // SECTION A: Quotation Forking Quota Enforcement (createQuotationVersion)
    // ----------------------------------------------------------------
    console.log("\n--- SECTION A: Quotation Forking Quota Enforcement ---");

    // Create base quotation (usage = 1)
    const baseQuotation = await quotationService.createQuotation(agencyId, {
      tripId: qaTrip.id,
      customerId: qaCustomer.id,
      title: "Base Proposal for Version Forking",
      currency: "INR",
      subtotal: 10000,
    });
    assert(!!baseQuotation, "Base quotation created successfully (usage = 1)");

    const quoteUsage1 = await entitlementService.getResourceUsage(agencyId, "QUOTATIONS");
    assert(quoteUsage1.currentUsage === 1, "QUOTATIONS usage count is 1 after base quotation creation");

    // Set Starter limit for QUOTATIONS to 2 (allowing 1 more creation)
    await prisma.planUsageLimit.upsert({
      where: { planId_resourceKey: { planId: starterPlanId, resourceKey: "QUOTATIONS" } },
      create: { planId: starterPlanId, resourceKey: "QUOTATIONS", limit: 2 },
      update: { limit: 2 },
    });

    // Fork version v2 -> Usage becomes 2/2 (100% capacity)
    const forkedVersion = await quotationService.createQuotationVersion(agencyId, baseQuotation.id);
    assert(!!forkedVersion, "Forking quotation version succeeded below quota limit (1/2 -> 2/2)");
    assert(forkedVersion.version === 2, "Forked quotation version number incremented to 2");

    const quoteUsage2 = await entitlementService.getResourceUsage(agencyId, "QUOTATIONS");
    assert(quoteUsage2.currentUsage === 2 && quoteUsage2.isExceeded, "QUOTATIONS usage reached capacity (2/2)");

    // Record total quotation count before blocked attempt
    const countBeforeForkBlock = await prisma.quotation.count({ where: { agencyId } });

    // Attempt Fork version v3 when quota is full (2/2) -> MUST BE BLOCKED
    let forkBlocked = false;
    try {
      await quotationService.createQuotationVersion(agencyId, forkedVersion.id);
    } catch (err: any) {
      if (err instanceof QuotaExceededError || err.code === "QUOTA_EXCEEDED" || err.message?.includes("Creation limit")) {
        forkBlocked = true;
      }
    }
    assert(forkBlocked, "Forking quotation version when quota is exhausted (2/2) is REJECTED with QuotaExceededError");

    const countAfterForkBlock = await prisma.quotation.count({ where: { agencyId } });
    assert(countAfterForkBlock === countBeforeForkBlock, "Database quotation count did NOT increase after blocked fork attempt");

    // ----------------------------------------------------------------
    // SECTION B: Quotation -> Booking Conversion Quota Enforcement (convertQuotationToBooking)
    // ----------------------------------------------------------------
    console.log("\n--- SECTION B: Quotation -> Booking Conversion Quota Enforcement ---");

    // Create 2 quotations for conversion testing
    // Temporarily increase QUOTATIONS limit to allow setting up test quotations
    await prisma.planUsageLimit.upsert({
      where: { planId_resourceKey: { planId: starterPlanId, resourceKey: "QUOTATIONS" } },
      create: { planId: starterPlanId, resourceKey: "QUOTATIONS", limit: 10 },
      update: { limit: 10 },
    });

    const quoteForBooking1 = await quotationService.createQuotation(agencyId, {
      tripId: qaTrip.id,
      customerId: qaCustomer.id,
      title: "Proposal 1 for Booking Conversion",
      currency: "INR",
      subtotal: 15000,
    });

    const quoteForBooking2 = await quotationService.createQuotation(agencyId, {
      tripId: qaTrip.id,
      customerId: qaCustomer.id,
      title: "Proposal 2 for Booking Conversion",
      currency: "INR",
      subtotal: 20000,
    });

    // Set BOOKINGS limit to 1
    await prisma.planUsageLimit.upsert({
      where: { planId_resourceKey: { planId: starterPlanId, resourceKey: "BOOKINGS" } },
      create: { planId: starterPlanId, resourceKey: "BOOKINGS", limit: 1 },
      update: { limit: 1 },
    });

    // Convert quote 1 -> Booking 1 (Usage = 1/1, 100% capacity)
    const booking1 = await bookingService.convertQuotationToBooking(agencyId, quoteForBooking1.id);
    assert(!!booking1, "Converting quotation to booking succeeded below limit (0/1 -> 1/1)");

    const bookingUsage1 = await entitlementService.getResourceUsage(agencyId, "BOOKINGS");
    assert(bookingUsage1.currentUsage === 1 && bookingUsage1.isExceeded, "BOOKINGS usage reached capacity (1/1)");

    const bookingCountBeforeBlock = await prisma.booking.count({ where: { agencyId } });

    // Convert quote 2 -> Attempt when BOOKINGS quota is full (1/1) -> MUST BE BLOCKED
    let conversionBlocked = false;
    try {
      await bookingService.convertQuotationToBooking(agencyId, quoteForBooking2.id);
    } catch (err: any) {
      if (err instanceof QuotaExceededError || err.code === "QUOTA_EXCEEDED" || err.message?.includes("Creation limit")) {
        conversionBlocked = true;
      }
    }
    assert(conversionBlocked, "Converting quotation to booking when quota is exhausted (1/1) is REJECTED with QuotaExceededError");

    const bookingCountAfterBlock = await prisma.booking.count({ where: { agencyId } });
    assert(bookingCountAfterBlock === bookingCountBeforeBlock, "Database booking count did NOT increase after blocked conversion attempt");

    // ----------------------------------------------------------------
    // SECTION C: Concurrency Protection Test (Row Lock + Quota)
    // ----------------------------------------------------------------
    console.log("\n--- SECTION C: Concurrency Protection Test ---");

    // Currently QUOTATIONS usage is 4 (baseQuotation, forkedVersion, quoteForBooking1, quoteForBooking2)
    const currentQUsage = await entitlementService.getResourceUsage(agencyId, "QUOTATIONS");
    const concLimit = currentQUsage.currentUsage + 1; // Exactly 1 spot remaining

    await prisma.planUsageLimit.upsert({
      where: { planId_resourceKey: { planId: starterPlanId, resourceKey: "QUOTATIONS" } },
      create: { planId: starterPlanId, resourceKey: "QUOTATIONS", limit: concLimit },
      update: { limit: concLimit },
    });

    console.log(`Executing 2 concurrent createQuotationVersion requests when 1 spot remains (${currentQUsage.currentUsage}/${concLimit})...`);
    const results = await Promise.allSettled([
      quotationService.createQuotationVersion(agencyId, baseQuotation.id),
      quotationService.createQuotationVersion(agencyId, baseQuotation.id),
    ]);

    const fulfilledCount = results.filter((r) => r.status === "fulfilled").length;
    const rejectedCount = results.filter((r) => r.status === "rejected").length;

    assert(fulfilledCount === 1, "Exactly 1 concurrent fork request succeeded");
    assert(rejectedCount === 1, "Exactly 1 concurrent fork request was rejected with quota error");

    const finalConcUsage = await entitlementService.getResourceUsage(agencyId, "QUOTATIONS");
    assert(finalConcUsage.currentUsage === concLimit, `Final QUOTATIONS usage is exactly at capacity (${finalConcUsage.currentUsage}/${concLimit}), no over-quota race condition`);

    // ----------------------------------------------------------------
    // SECTION D: Dynamic Limit Test (Phase 213 Integration)
    // ----------------------------------------------------------------
    console.log("\n--- SECTION D: Dynamic Limit Test (Phase 213 Integration) ---");

    const dynamicLimit = finalConcUsage.currentUsage + 5;
    await prisma.planUsageLimit.upsert({
      where: { planId_resourceKey: { planId: starterPlanId, resourceKey: "QUOTATIONS" } },
      create: { planId: starterPlanId, resourceKey: "QUOTATIONS", limit: dynamicLimit },
      update: { limit: dynamicLimit },
    });

    const dynamicFork = await quotationService.createQuotationVersion(agencyId, baseQuotation.id);
    assert(!!dynamicFork, `Forking quotation version succeeds when limit is dynamically increased to ${dynamicLimit}`);

    // ----------------------------------------------------------------
    // SECTION E: Professional Plan Unlimited Test
    // ----------------------------------------------------------------
    console.log("\n--- SECTION E: Professional Plan Unlimited Test ---");

    const proLimit = await entitlementService.getUsageLimit(proPlanId, "QUOTATIONS");
    assert(proLimit === null, "Professional plan QUOTATIONS usage limit is null (unlimited)");

    const proBookingLimit = await entitlementService.getUsageLimit(proPlanId, "BOOKINGS");
    assert(proBookingLimit === null, "Professional plan BOOKINGS usage limit is null (unlimited)");

    // ----------------------------------------------------------------
    // SECTION F: Creation-Path Matrix Regression Verification
    // ----------------------------------------------------------------
    console.log("\n--- SECTION F: Full Creation-Path Matrix Regression ---");

    // Verify Trips quota enforcement
    await prisma.planUsageLimit.upsert({
      where: { planId_resourceKey: { planId: starterPlanId, resourceKey: "TRIPS" } },
      create: { planId: starterPlanId, resourceKey: "TRIPS", limit: 1 },
      update: { limit: 1 },
    });

    let tripBlocked = false;
    try {
      await tripService.createTrip(agencyId, {
        customerId: qaCustomer.id,
        title: "Blocked Trip Test",
        startDate: new Date(),
        endDate: new Date(),
      });
    } catch (err: any) {
      if (err instanceof QuotaExceededError || err.code === "QUOTA_EXCEEDED" || err.message?.includes("Creation limit")) {
        tripBlocked = true;
      }
    }
    assert(tripBlocked, "New Trip creation when TRIPS quota is full (1/1) is REJECTED with QuotaExceededError");

  } finally {
    // Restore original limits
    console.log("\nRestoring original plan usage limits...");
    await restoreLimits();

    // Clean up QA test agency records
    console.log("Cleaning up QA test agency records...");
    await prisma.booking.deleteMany({ where: { agencyId } });
    await prisma.quotationItem.deleteMany({ where: { quotation: { agencyId } } });
    await prisma.quotationProposalItem.deleteMany({ where: { quotation: { agencyId } } });
    await prisma.quotationPaymentMilestone.deleteMany({ where: { quotation: { agencyId } } });
    await prisma.quotation.deleteMany({ where: { agencyId } });
    await prisma.trip.deleteMany({ where: { agencyId } });
    await prisma.customer.deleteMany({ where: { agencyId } });
    await prisma.subscription.deleteMany({ where: { agencyId } });
    await prisma.agency.delete({ where: { id: agencyId } });
  }

  console.log("\n==================================================================");
  console.log(`PHASE 214 QA PASSED: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("==================================================================\n");
}

runPhase214QA()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Phase 214 QA Test Failed:", err);
    process.exit(1);
  });
