import "dotenv/config";
import assert from "assert";
import {
  validateRepairEnvironment,
  repairSubscriptionCatalog,
  CANONICAL_PLANS,
  CANONICAL_TAX_RATES,
} from "./repair-subscription-catalog";
import {
  PRODUCTION_TARGET_SUPABASE_PROJECT_REF,
  LOCAL_QA_SUPABASE_PROJECT_REF,
} from "./bootstrap-owner";

async function runCatalogRepairTestSuite() {
  console.log("===============================================================================");
  console.log("  TRIPDESK — SUBSCRIPTION CATALOG REPAIR SAFETY & ENVIRONMENT TEST SUITE");
  console.log("===============================================================================\n");

  let passed = 0;
  let total = 0;

  function recordPass(testName: string, detail: string) {
    passed++;
    total++;
    console.log(`✔ [PASS] ${testName}`);
    console.log(`   Evidence: ${detail}\n`);
  }

  function recordFail(testName: string, detail: string) {
    total++;
    console.error(`❌ [FAIL] ${testName}: ${detail}\n`);
    throw new Error(`Test failed: ${testName} - ${detail}`);
  }

  // -------------------------------------------------------------------------
  // Scenario 1: Rejects execution without explicit REPAIR_TARGET_MODE="production"
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 1: Missing REPAIR_TARGET_MODE Fails Closed");
  try {
    assert.throws(
      () => {
        validateRepairEnvironment({
          targetMode: "",
          allowProductionCatalogRepair: true,
          supabaseUrl: `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`,
          databaseUrl: `postgresql://postgres.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}:pass@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
        });
      },
      (err: any) => err.message.includes("Target Mode Authorization Required")
    );

    recordPass(
      "Scenario 1 — Missing targetMode fails closed",
      "Explicit REPAIR_TARGET_MODE='production' is required; empty mode throws immediate abort."
    );
  } catch (e: any) {
    recordFail("Scenario 1", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 2: NODE_ENV=production alone is rejected
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 2: NODE_ENV=production Alone Is Rejected");
  try {
    const oldNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    assert.throws(
      () => {
        validateRepairEnvironment({
          targetMode: undefined,
          allowProductionCatalogRepair: true,
          supabaseUrl: `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`,
          databaseUrl: `postgresql://postgres.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}:pass@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
        });
      },
      (err: any) => err.message.includes("Target Mode Authorization Required")
    );

    process.env.NODE_ENV = oldNodeEnv;
    recordPass(
      "Scenario 2 — NODE_ENV=production alone rejected",
      "Ambient NODE_ENV does not grant target authorization; fails closed."
    );
  } catch (e: any) {
    recordFail("Scenario 2", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 3: Missing ALLOW_PRODUCTION_CATALOG_REPAIR fails closed
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 3: Missing Repair Authorization Fails Closed");
  try {
    assert.throws(
      () => {
        validateRepairEnvironment({
          targetMode: "production",
          allowProductionCatalogRepair: false,
          supabaseUrl: `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`,
          databaseUrl: `postgresql://postgres.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}:pass@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
        });
      },
      (err: any) => err.message.includes("Production Catalog Repair Authorization Required")
    );

    recordPass(
      "Scenario 3 — Missing ALLOW_PRODUCTION_CATALOG_REPAIR fails closed",
      "Explicit authorization parameter required before any database connection or write."
    );
  } catch (e: any) {
    recordFail("Scenario 3", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 4: Rejects Staging/QA project targeting
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 4: Staging / Local QA Project Ref Rejected");
  try {
    assert.throws(
      () => {
        validateRepairEnvironment({
          targetMode: "production",
          allowProductionCatalogRepair: true,
          supabaseUrl: `https://${LOCAL_QA_SUPABASE_PROJECT_REF}.supabase.co`,
          databaseUrl: `postgresql://postgres.${LOCAL_QA_SUPABASE_PROJECT_REF}:pass@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`,
        });
      },
      (err: any) => err.message.includes("Cannot target Local/QA project ref")
    );

    recordPass(
      "Scenario 4 — Staging / QA project ref fails closed",
      `Targeting '${LOCAL_QA_SUPABASE_PROJECT_REF}' triggers Environment Lock rejection.`
    );
  } catch (e: any) {
    recordFail("Scenario 4", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 5: Auth URL and Database URL mismatch fails closed
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 5: Auth Project Ref and DB Project Ref Mismatch Fails Closed");
  try {
    assert.throws(
      () => {
        validateRepairEnvironment({
          targetMode: "production",
          allowProductionCatalogRepair: true,
          supabaseUrl: `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`,
          databaseUrl: `postgresql://postgres.otherprojectref:pass@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
        });
      },
      (err: any) => err.message.includes("Target Project Mismatch")
    );

    recordPass(
      "Scenario 5 — Cross-target project mismatch rejected",
      "Supabase Auth URL ref must match PostgreSQL username project ref exactly."
    );
  } catch (e: any) {
    recordFail("Scenario 5", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 6: Malformed URL structures fail closed
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 6: Malformed URLs Fail Closed");
  try {
    assert.throws(
      () => {
        validateRepairEnvironment({
          targetMode: "production",
          allowProductionCatalogRepair: true,
          supabaseUrl: "https://invalid-host.com",
          databaseUrl: `postgresql://postgres.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}:pass@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
        });
      },
      (err: any) => err.message.includes("Malformed URL structure")
    );

    recordPass(
      "Scenario 6 — Non-Supabase host rejected",
      "Hostnames not ending strictly in .supabase.co fail closed."
    );
  } catch (e: any) {
    recordFail("Scenario 6", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 7: Arbitrary/Spoofed project ref fails closed
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 7: Arbitrary Project Ref Rejected");
  try {
    const arbitraryRef = "arbitrary-spoofed-ref-123";
    assert.throws(
      () => {
        validateRepairEnvironment({
          targetMode: "production",
          allowProductionCatalogRepair: true,
          supabaseUrl: `https://${arbitraryRef}.supabase.co`,
          databaseUrl: `postgresql://postgres.${arbitraryRef}:pass@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
          expectedProjectRef: PRODUCTION_TARGET_SUPABASE_PROJECT_REF,
        });
      },
      (err: any) => err.message.includes("!= expected")
    );

    recordPass(
      "Scenario 7 — Arbitrary project ref rejected",
      "Ref must strictly equal PRODUCTION_TARGET_SUPABASE_PROJECT_REF ('qypkowejgqrmilckemcr')."
    );
  } catch (e: any) {
    recordFail("Scenario 7", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 8: Valid Production environment passes validation
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 8: Valid Production Target Configuration Passes");
  try {
    const valid = validateRepairEnvironment({
      targetMode: "production",
      allowProductionCatalogRepair: true,
      supabaseUrl: `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`,
      databaseUrl: `postgresql://postgres.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}:pass@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
    });

    assert.strictEqual(valid.projectRef, PRODUCTION_TARGET_SUPABASE_PROJECT_REF);
    assert.strictEqual(valid.dbProjectRef, PRODUCTION_TARGET_SUPABASE_PROJECT_REF);
    assert.strictEqual(valid.targetMode, "production");

    recordPass(
      "Scenario 8 — Valid production target passes",
      `Verified detected projectRef: ${valid.projectRef}, targetMode: ${valid.targetMode}.`
    );
  } catch (e: any) {
    recordFail("Scenario 8", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 9: Canonical Plan Specifications Validation
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 9: Canonical Plan Specifications Integrity");
  try {
    const starter = CANONICAL_PLANS.find((p) => p.name === "Starter");
    const pro = CANONICAL_PLANS.find((p) => p.name === "Professional");

    assert(starter, "Starter plan must be present in CANONICAL_PLANS");
    assert(pro, "Professional plan must be present in CANONICAL_PLANS");

    // Starter invariants
    assert.strictEqual(starter.price, 499.0);
    assert.strictEqual(starter.yearlyPrice, 4999.0);
    assert.strictEqual(starter.durationDays, 30);
    assert.strictEqual(starter.isActive, true);
    assert.strictEqual(starter.displayOrder, 1);

    const starterLimits = Object.fromEntries(
      starter.usageLimits.map((u) => [u.resourceKey, u.limit])
    );
    assert.strictEqual(starterLimits.TRIPS, 20);
    assert.strictEqual(starterLimits.QUOTATIONS, 20);
    assert.strictEqual(starterLimits.BOOKINGS, 20);

    const starterEntitlements = Object.fromEntries(
      starter.featureEntitlements.map((f) => [f.featureKey, f.enabled])
    );
    assert.strictEqual(starterEntitlements.CUSTOM_AGENCY_LOGO, false);
    assert.strictEqual(starterEntitlements.FEEDBACK_REVIEWS, false);
    assert.strictEqual(starterEntitlements.CUSTOMER_INSIGHTS, false);
    assert.strictEqual(starterEntitlements.REPORTS_ANALYTICS, false);

    // Professional invariants
    assert.strictEqual(pro.price, 999.0);
    assert.strictEqual(pro.yearlyPrice, 9999.0);
    assert.strictEqual(pro.durationDays, 30);
    assert.strictEqual(pro.isActive, true);
    assert.strictEqual(pro.displayOrder, 2);

    const proLimits = Object.fromEntries(
      pro.usageLimits.map((u) => [u.resourceKey, u.limit])
    );
    assert.strictEqual(proLimits.TRIPS, null);
    assert.strictEqual(proLimits.QUOTATIONS, null);
    assert.strictEqual(proLimits.BOOKINGS, null);

    const proEntitlements = Object.fromEntries(
      pro.featureEntitlements.map((f) => [f.featureKey, f.enabled])
    );
    assert.strictEqual(proEntitlements.CUSTOM_AGENCY_LOGO, true);
    assert.strictEqual(proEntitlements.FEEDBACK_REVIEWS, true);
    assert.strictEqual(proEntitlements.CUSTOMER_INSIGHTS, true);
    assert.strictEqual(proEntitlements.REPORTS_ANALYTICS, true);

    recordPass(
      "Scenario 9 — Plan specifications align with approved business rules",
      "Starter: ₹499/₹4999 (20/20/20 limits, 4 disabled features). Professional: ₹999/₹9999 (unlimited, 4 enabled features)."
    );
  } catch (e: any) {
    recordFail("Scenario 9", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 10: Canonical Tax Rates Integrity
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 10: Canonical Tax Rate Catalog Integrity");
  try {
    assert.strictEqual(CANONICAL_TAX_RATES.length, 5);
    const expectedRates = [0, 5, 12, 18, 28];
    const actualRates = CANONICAL_TAX_RATES.map((r) => r.rate);
    assert.deepStrictEqual(actualRates, expectedRates);

    const defaultRate = CANONICAL_TAX_RATES.find((r) => r.isDefault);
    assert(defaultRate, "Must have a default tax rate");
    assert.strictEqual(defaultRate.rate, 0);

    recordPass(
      "Scenario 10 — Tax rates align with Tax V1 catalog presets",
      "5 standard presets: 0% (default), 5%, 12%, 18%, 28% with active=true."
    );
  } catch (e: any) {
    recordFail("Scenario 10", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 11: Mock Catalog Repair Execution & Idempotency
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 11: Idempotent Mock Catalog Repair Execution");
  try {
    // In-memory mock database state
    const mockDb: {
      plans: any[];
      entitlements: any[];
      usageLimits: any[];
      taxRates: any[];
      users: any[];
      agencies: any[];
      subscriptions: any[];
    } = {
      plans: [],
      entitlements: [],
      usageLimits: [],
      taxRates: [],
      users: [{ id: "owner-1", role: "PLATFORM_OWNER" }],
      agencies: [],
      subscriptions: [],
    };

    const mockPrisma = {
      user: {
        count: async ({ where }: any) => {
          if (where?.role === "PLATFORM_OWNER") return mockDb.users.filter((u) => u.role === "PLATFORM_OWNER").length;
          return mockDb.users.length;
        },
      },
      agency: { count: async () => mockDb.agencies.length },
      subscription: { count: async () => mockDb.subscriptions.length },
      subscriptionPlan: {
        findUnique: async ({ where }: any) => mockDb.plans.find((p) => p.name === where.name) || null,
        create: async ({ data }: any) => {
          const row = { id: `plan-${mockDb.plans.length + 1}`, ...data };
          mockDb.plans.push(row);
          return row;
        },
        update: async ({ where, data }: any) => {
          const idx = mockDb.plans.findIndex((p) => p.id === where.id);
          mockDb.plans[idx] = { ...mockDb.plans[idx], ...data };
          return mockDb.plans[idx];
        },
      },
      planFeatureEntitlement: {
        findUnique: async ({ where }: any) => {
          const { planId, featureKey } = where.planId_featureKey;
          return mockDb.entitlements.find((e) => e.planId === planId && e.featureKey === featureKey) || null;
        },
        create: async ({ data }: any) => {
          const row = { id: `fe-${mockDb.entitlements.length + 1}`, ...data };
          mockDb.entitlements.push(row);
          return row;
        },
        update: async ({ where, data }: any) => {
          const idx = mockDb.entitlements.findIndex((e) => e.id === where.id);
          mockDb.entitlements[idx] = { ...mockDb.entitlements[idx], ...data };
          return mockDb.entitlements[idx];
        },
      },
      planUsageLimit: {
        findUnique: async ({ where }: any) => {
          const { planId, resourceKey } = where.planId_resourceKey;
          return mockDb.usageLimits.find((u) => u.planId === planId && u.resourceKey === resourceKey) || null;
        },
        create: async ({ data }: any) => {
          const row = { id: `ul-${mockDb.usageLimits.length + 1}`, ...data };
          mockDb.usageLimits.push(row);
          return row;
        },
        update: async ({ where, data }: any) => {
          const idx = mockDb.usageLimits.findIndex((u) => u.id === where.id);
          mockDb.usageLimits[idx] = { ...mockDb.usageLimits[idx], ...data };
          return mockDb.usageLimits[idx];
        },
      },
      taxRate: {
        findUnique: async ({ where }: any) => mockDb.taxRates.find((t) => t.rate === where.rate) || null,
        create: async ({ data }: any) => {
          const row = { id: `tr-${mockDb.taxRates.length + 1}`, ...data };
          mockDb.taxRates.push(row);
          return row;
        },
        update: async ({ where, data }: any) => {
          const idx = mockDb.taxRates.findIndex((t) => t.id === where.id);
          mockDb.taxRates[idx] = { ...mockDb.taxRates[idx], ...data };
          return mockDb.taxRates[idx];
        },
      },
    };

    // First Pass: Missing records created
    const pass1 = await repairSubscriptionCatalog({
      targetMode: "production",
      allowProductionCatalogRepair: true,
      supabaseUrl: `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`,
      databaseUrl: `postgresql://postgres.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}:pass@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
      prismaClient: mockPrisma,
    });

    assert.strictEqual(pass1.success, true);
    assert.strictEqual(mockDb.plans.length, 2);
    assert.strictEqual(mockDb.entitlements.length, 8);
    assert.strictEqual(mockDb.usageLimits.length, 6);
    assert.strictEqual(mockDb.taxRates.length, 5);
    assert(pass1.plans.every((p) => p.action === "created"));

    // Second Pass: All records verified existing, zero new records created
    const pass2 = await repairSubscriptionCatalog({
      targetMode: "production",
      allowProductionCatalogRepair: true,
      supabaseUrl: `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`,
      databaseUrl: `postgresql://postgres.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}:pass@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
      prismaClient: mockPrisma,
    });

    assert.strictEqual(pass2.success, true);
    assert.strictEqual(mockDb.plans.length, 2);
    assert.strictEqual(mockDb.entitlements.length, 8);
    assert.strictEqual(mockDb.usageLimits.length, 6);
    assert.strictEqual(mockDb.taxRates.length, 5);
    assert(pass2.plans.every((p) => p.action === "verified_existing"));
    assert(pass2.entitlements.every((e) => e.action === "verified_existing"));
    assert(pass2.usageLimits.every((u) => u.action === "verified_existing"));
    assert(pass2.taxRates.every((t) => t.action === "verified_existing"));

    recordPass(
      "Scenario 11 — Mock catalog repair is fully idempotent",
      "Pass 1 creates missing records. Pass 2 verifies existing records without mutating database."
    );
  } catch (e: any) {
    recordFail("Scenario 11", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 12: Business Data Invariant Protection
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 12: Business Data Invariant Protection");
  try {
    const mockPrismaCorrupt = {
      user: { count: async () => 1 },
      agency: { count: async () => 0 },
      subscription: {
        count: async () => {
          // Simulate an unauthorized mutation occurring
          return 99;
        },
      },
      subscriptionPlan: {
        findUnique: async () => null,
        create: async ({ data }: any) => ({ id: "p1", ...data }),
      },
      planFeatureEntitlement: {
        findUnique: async () => null,
        create: async ({ data }: any) => ({ id: "fe1", ...data }),
      },
      planUsageLimit: {
        findUnique: async () => null,
        create: async ({ data }: any) => ({ id: "ul1", ...data }),
      },
      taxRate: {
        findUnique: async () => null,
        create: async ({ data }: any) => ({ id: "tr1", ...data }),
      },
    };

    let postCheckRun = 0;
    // Intercept subscription count to simulate count drift
    mockPrismaCorrupt.subscription.count = async () => {
      postCheckRun++;
      return postCheckRun === 1 ? 0 : 5; // changes on second call
    };

    await assert.rejects(
      async () => {
        await repairSubscriptionCatalog({
          targetMode: "production",
          allowProductionCatalogRepair: true,
          supabaseUrl: `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`,
          databaseUrl: `postgresql://postgres.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}:pass@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
          prismaClient: mockPrismaCorrupt,
        });
      },
      (err: any) => err.message.includes("CRITICAL SAFETY VIOLATION")
    );

    recordPass(
      "Scenario 12 — Business data count modification aborts immediately",
      "If user, agency, or subscription counts drift during repair, script raises CRITICAL SAFETY VIOLATION."
    );
  } catch (e: any) {
    recordFail("Scenario 12", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 13: Canonical Plan Features Specifications & Truthful Support
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 13: Canonical Plan Features Specifications & Truthful Support");
  try {
    const starter = CANONICAL_PLANS.find((p) => p.name === "Starter");
    const pro = CANONICAL_PLANS.find((p) => p.name === "Professional");

    assert(starter, "Starter plan must exist in CANONICAL_PLANS");
    assert(pro, "Professional plan must exist in CANONICAL_PLANS");

    assert.strictEqual(starter.features.length, 7, "Starter must have exactly 7 canonical features");
    assert.strictEqual(pro.features.length, 9, "Professional must have exactly 9 canonical features");

    // Truthfulness verification: Pro support must NOT claim unsupported 24/7 phone SLA
    const proSupportItem = pro.features.find((f: string) => f.toLowerCase().includes("support"));
    assert(proSupportItem, "Professional must have a support feature");
    assert(
      !proSupportItem.includes("24/7"),
      "Must not advertise unsupported 24/7 phone SLA"
    );
    assert.strictEqual(proSupportItem, "Priority Email & Helpdesk Support");

    // Pro must cover all 4 gated features in marketing bullets
    assert(pro.features.includes("Custom Agency Branding & Logo"));
    assert(pro.features.includes("Customer Feedback & Service Recovery"));
    assert(pro.features.includes("Customer Insights & Lifetime Analytics"));
    assert(pro.features.includes("Agency Business Intelligence & Reports"));

    recordPass(
      "Scenario 13 — Canonical plan features adhere to verified product architecture",
      "Starter: 7 items. Pro: 9 items with truthful 'Priority Email & Helpdesk Support' and zero 24/7 phone claims."
    );
  } catch (e: any) {
    recordFail("Scenario 13", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 14: Reconciles Null Features Strictly In-Place Without Mutating Other Fields
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 14: Reconciles Null Features Strictly In-Place");
  try {
    // Simulate exact Production state: plans exist with null features, correct prices, correct entitlements
    const simulatedDb: any = {
      plans: [
        {
          id: "cmv9bi4kg00002cferrjxe1mu",
          name: "Starter",
          description: "Essential travel planning & quotation workflow for boutique operators.",
          price: 499.0,
          yearlyPrice: 4999.0,
          durationDays: 30,
          features: null, // Production null state
          isActive: true,
          isPopular: false,
          displayOrder: 1,
        },
        {
          id: "cmv9bi6le00082cfe6nkbvgdf",
          name: "Professional",
          description: "Comprehensive operating suite for established agencies and tour desks.",
          price: 999.0,
          yearlyPrice: 9999.0,
          durationDays: 30,
          features: null, // Production null state
          isActive: true,
          isPopular: false,
          displayOrder: 2,
        },
      ],
      entitlements: CANONICAL_PLANS.flatMap((p) =>
        p.featureEntitlements.map((fe) => ({
          id: `fe-${p.name}-${fe.featureKey}`,
          planId: p.name === "Starter" ? "cmv9bi4kg00002cferrjxe1mu" : "cmv9bi6le00082cfe6nkbvgdf",
          featureKey: fe.featureKey,
          enabled: fe.enabled,
        }))
      ),
      usageLimits: CANONICAL_PLANS.flatMap((p) =>
        p.usageLimits.map((ul) => ({
          id: `ul-${p.name}-${ul.resourceKey}`,
          planId: p.name === "Starter" ? "cmv9bi4kg00002cferrjxe1mu" : "cmv9bi6le00082cfe6nkbvgdf",
          resourceKey: ul.resourceKey,
          limit: ul.limit,
        }))
      ),
      taxRates: CANONICAL_TAX_RATES.map((tr, idx) => ({ id: `tr-${idx}`, ...tr })),
      users: [{ id: "owner-prod", role: "PLATFORM_OWNER" }],
      agencies: [{ id: "agency-prod", name: "Travel desk test agency" }],
      subscriptions: [{ id: "sub-prod", agencyId: "agency-prod", planId: "cmv9bi4kg00002cferrjxe1mu", status: "TRIAL" }],
    };

    const capturedUpdates: { id: string; data: any }[] = [];

    const mockPrismaProduction = {
      user: { count: async () => simulatedDb.users.length },
      agency: { count: async () => simulatedDb.agencies.length },
      subscription: { count: async () => simulatedDb.subscriptions.length },
      subscriptionPlan: {
        findUnique: async ({ where }: any) => simulatedDb.plans.find((p: any) => p.name === where.name) || null,
        create: async () => { throw new Error("Create should not be called when plans exist"); },
        update: async ({ where, data }: any) => {
          capturedUpdates.push({ id: where.id, data });
          const idx = simulatedDb.plans.findIndex((p: any) => p.id === where.id);
          simulatedDb.plans[idx] = { ...simulatedDb.plans[idx], ...data };
          return simulatedDb.plans[idx];
        },
      },
      planFeatureEntitlement: {
        findUnique: async ({ where }: any) => {
          const { planId, featureKey } = where.planId_featureKey;
          return simulatedDb.entitlements.find((e: any) => e.planId === planId && e.featureKey === featureKey) || null;
        },
        create: async () => { throw new Error("No new entitlements should be created"); },
        update: async () => { throw new Error("No entitlements should be modified"); },
      },
      planUsageLimit: {
        findUnique: async ({ where }: any) => {
          const { planId, resourceKey } = where.planId_resourceKey;
          return simulatedDb.usageLimits.find((u: any) => u.planId === planId && u.resourceKey === resourceKey) || null;
        },
        create: async () => { throw new Error("No new usage limits should be created"); },
        update: async () => { throw new Error("No usage limits should be modified"); },
      },
      taxRate: {
        findUnique: async ({ where }: any) => simulatedDb.taxRates.find((t: any) => t.rate === where.rate) || null,
        create: async () => { throw new Error("No new tax rates should be created"); },
        update: async () => { throw new Error("No tax rates should be modified"); },
      },
    };

    const repairResult = await repairSubscriptionCatalog({
      targetMode: "production",
      allowProductionCatalogRepair: true,
      supabaseUrl: `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`,
      databaseUrl: `postgresql://postgres.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}:pass@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
      prismaClient: mockPrismaProduction,
    });

    assert.strictEqual(repairResult.success, true);
    assert.strictEqual(capturedUpdates.length, 2, "Must perform exactly 2 plan updates for the 2 existing plans");

    // Crucial check: updateData MUST contain ONLY 'features'
    for (const update of capturedUpdates) {
      const keys = Object.keys(update.data);
      assert.deepStrictEqual(keys, ["features"], `Update must ONLY touch 'features' field. Keys: ${keys.join(", ")}`);
    }

    assert(repairResult.entitlements.every((e) => e.action === "verified_existing"));
    assert(repairResult.usageLimits.every((u) => u.action === "verified_existing"));
    assert(repairResult.taxRates.every((t) => t.action === "verified_existing"));

    recordPass(
      "Scenario 14 — Strictly scoped update modifies ONLY 'features' field",
      "Prices, IDs, entitlements, usage limits, tax rates, users, agencies, and subscriptions are 100% untouched."
    );
  } catch (e: any) {
    recordFail("Scenario 14", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 15: Post-Reconciliation Idempotency with Populated Features
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 15: Post-Reconciliation Idempotency with Populated Features");
  try {
    const populatedDb: any = {
      plans: CANONICAL_PLANS.map((p, idx) => ({
        id: `plan-${idx + 1}`,
        name: p.name,
        description: p.description,
        price: p.price,
        yearlyPrice: p.yearlyPrice,
        durationDays: p.durationDays,
        features: p.features,
        isActive: p.isActive,
        isPopular: p.isPopular,
        displayOrder: p.displayOrder,
      })),
      entitlements: CANONICAL_PLANS.flatMap((p, pIdx) =>
        p.featureEntitlements.map((fe) => ({
          id: `fe-${pIdx}-${fe.featureKey}`,
          planId: `plan-${pIdx + 1}`,
          featureKey: fe.featureKey,
          enabled: fe.enabled,
        }))
      ),
      usageLimits: CANONICAL_PLANS.flatMap((p, pIdx) =>
        p.usageLimits.map((ul) => ({
          id: `ul-${pIdx}-${ul.resourceKey}`,
          planId: `plan-${pIdx + 1}`,
          resourceKey: ul.resourceKey,
          limit: ul.limit,
        }))
      ),
      taxRates: CANONICAL_TAX_RATES.map((tr, idx) => ({ id: `tr-${idx}`, ...tr })),
      users: [{ id: "owner-1", role: "PLATFORM_OWNER" }],
      agencies: [],
      subscriptions: [],
    };

    let updateCount = 0;
    const mockPrismaIdempotent = {
      user: { count: async () => 1 },
      agency: { count: async () => 0 },
      subscription: { count: async () => 0 },
      subscriptionPlan: {
        findUnique: async ({ where }: any) => populatedDb.plans.find((p: any) => p.name === where.name) || null,
        create: async () => { throw new Error("Should not create"); },
        update: async () => { updateCount++; throw new Error("Should not update when features already match"); },
      },
      planFeatureEntitlement: {
        findUnique: async ({ where }: any) => {
          const { planId, featureKey } = where.planId_featureKey;
          return populatedDb.entitlements.find((e: any) => e.planId === planId && e.featureKey === featureKey) || null;
        },
        create: async () => { throw new Error("Should not create"); },
        update: async () => { throw new Error("Should not update"); },
      },
      planUsageLimit: {
        findUnique: async ({ where }: any) => {
          const { planId, resourceKey } = where.planId_resourceKey;
          return populatedDb.usageLimits.find((u: any) => u.planId === planId && u.resourceKey === resourceKey) || null;
        },
        create: async () => { throw new Error("Should not create"); },
        update: async () => { throw new Error("Should not update"); },
      },
      taxRate: {
        findUnique: async ({ where }: any) => populatedDb.taxRates.find((t: any) => t.rate === where.rate) || null,
        create: async () => { throw new Error("Should not create"); },
        update: async () => { throw new Error("Should not update"); },
      },
    };

    const idempotentResult = await repairSubscriptionCatalog({
      targetMode: "production",
      allowProductionCatalogRepair: true,
      supabaseUrl: `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`,
      databaseUrl: `postgresql://postgres.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}:pass@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
      prismaClient: mockPrismaIdempotent,
    });

    assert.strictEqual(idempotentResult.success, true);
    assert.strictEqual(updateCount, 0, "Zero database updates performed on already-reconciled catalog");
    assert(idempotentResult.plans.every((p) => p.action === "verified_existing"));
    assert(idempotentResult.entitlements.every((e) => e.action === "verified_existing"));
    assert(idempotentResult.usageLimits.every((u) => u.action === "verified_existing"));
    assert(idempotentResult.taxRates.every((t) => t.action === "verified_existing"));

    recordPass(
      "Scenario 15 — Full idempotency on catalog with reconciled features",
      "Subsequent executions verify all 2 plans, 8 entitlements, 6 limits, and 5 tax rates with zero database writes."
    );
  } catch (e: any) {
    recordFail("Scenario 15", e.message);
  }

  console.log("===============================================================================");
  console.log(`  ALL ${total} SCENARIOS PASSED WITH ZERO FAILURES (${passed}/${total})`);
  console.log("===============================================================================\n");
}

runCatalogRepairTestSuite().catch((e) => {
  console.error("FATAL ERROR in test suite:", e);
  process.exit(1);
});
