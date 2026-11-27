/**
 * Deterministic Subscription Expiry Enforcement Test Suite (DB-Free / Mocked)
 * Verifies V3 §276.85 expiry correctness fix across:
 * 1. Shared authoritative state evaluator (paid boundaries, trial boundaries, invalid/missing dates)
 * 2. Server-side entitlementService (resolveAgencySubscription, checkQuota)
 * 3. Auth & Request Context (getRequestContext, requireWriteAccess, requireMemberWriteAccess, requireReadAccess, requireBillingRenewalAccess)
 * 4. Renewal route (POST /api/subscription/payment-request) role & suspension invariants
 * 5. Platform Owner reporting & active/expired regression invariants
 */
import assert from "node:assert/strict";
import Module from "node:module";
import { NextRequest } from "next/server";
import { AgencyStatus, SubscriptionStatus, UserRole } from "@prisma/client";
import { evaluateEffectiveSubscriptionState } from "../src/lib/auth/subscription-state";

let passed = 0;
let failed = 0;

function check(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

async function checkThrows(fn: () => Promise<unknown>, expectedName: string, label: string) {
  try {
    await fn();
    failed++;
    console.error(`  ✗ FAIL (expected ${expectedName}, did not throw): ${label}`);
  } catch (err: any) {
    if (err?.name === expectedName || err?.constructor?.name === expectedName) {
      passed++;
      console.log(`  ✓ ${label}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL (expected ${expectedName}, got ${err?.name}: ${err?.message}): ${label}`);
    }
  }
}

const mockState = {
  userRole: UserRole.AGENCY_OWNER as UserRole,
  agencyStatus: AgencyStatus.ACTIVE as AgencyStatus,
  subStatus: SubscriptionStatus.ACTIVE as SubscriptionStatus,
  subEnd: new Date("2026-11-23T05:43:26.912Z") as Date | null,
  createdPaymentCount: 0,
};

const mockPrisma: any = {
  user: {
    findUnique: async () => ({
      id: "u_1",
      email: "owner@agency.test",
      name: "Owner",
      role: mockState.userRole,
      isActive: true,
      sessionRevokedAt: null,
      agencyId: mockState.userRole === UserRole.PLATFORM_OWNER ? null : "ag_1",
      agency:
        mockState.userRole === UserRole.PLATFORM_OWNER
          ? null
          : {
              id: "ag_1",
              name: "Test Agency",
              status: mockState.agencyStatus,
              subscriptions: [
                {
                  id: "sub_1",
                  agencyId: "ag_1",
                  planId: "plan_pro",
                  status: mockState.subStatus,
                  trialStart: null,
                  trialEnd: null,
                  subscriptionStart: new Date("2026-10-24T05:43:26.912Z"),
                  subscriptionEnd: mockState.subEnd,
                  createdAt: new Date("2026-09-15T03:39:02.188Z"),
                  plan: { id: "plan_pro", name: "Professional", price: 999, yearlyPrice: 9999, durationDays: 30 },
                },
              ],
            },
    }),
  },
  subscriptionPlan: {
    findUnique: async ({ where }: any) =>
      where.id === "plan_pro"
        ? { id: "plan_pro", name: "Professional", price: 999, yearlyPrice: 9999, isActive: true, durationDays: 30 }
        : null,
  },
  subscription: {
    findFirst: async () => ({
      id: "sub_1",
      agencyId: "ag_1",
      planId: "plan_pro",
      status: mockState.subStatus,
      subscriptionStart: new Date("2026-10-24T05:43:26.912Z"),
      subscriptionEnd: mockState.subEnd,
      createdAt: new Date("2026-09-15T03:39:02.188Z"),
      plan: { id: "plan_pro", name: "Professional", price: 999, yearlyPrice: 9999, durationDays: 30 },
    }),
  },
  subscriptionPayment: {
    create: async ({ data }: any) => {
      mockState.createdPaymentCount++;
      return { id: "pay_1", ...data, createdAt: new Date(), subscription: { plan: { name: "Professional" } } };
    },
  },
  platformAuditLog: {
    create: async () => ({ id: "log_1" }),
  },
  agency: {
    findUnique: async () => ({ id: "ag_1", name: "Test Agency", status: mockState.agencyStatus }),
  },
  staffPermissionProfile: {
    findUnique: async () => null,
  },
};

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === "server-only") return {};
  if (request === "@/lib/supabase/server") {
    return {
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: "u_1", email: "owner@agency.test" } }, error: null }) },
      }),
    };
  }
  if (request === "@/lib/prisma") {
    return { __esModule: true, default: mockPrisma, prisma: mockPrisma };
  }
  return originalLoad.call(this, request, parent, isMain);
};

async function main() {
  console.log("=== 1. Paid Subscription Exact Timestamp Boundaries ===");
  const baseNow = new Date("2026-11-26T12:00:00.000Z");
  const oneSecFuture = new Date(baseNow.getTime() + 1000);
  const exactNow = new Date(baseNow.getTime());
  const oneSecPast = new Date(baseNow.getTime() - 1000);

  const active1s = evaluateEffectiveSubscriptionState(
    {
      agencyStatus: AgencyStatus.ACTIVE,
      subscription: {
        status: SubscriptionStatus.ACTIVE,
        subscriptionStart: new Date("2026-10-27T12:00:00.000Z"),
        subscriptionEnd: oneSecFuture,
      },
    },
    baseNow
  );
  check(active1s.effectiveStatus === SubscriptionStatus.ACTIVE, "1s future: effectiveStatus === ACTIVE");
  check(active1s.canWrite === true && active1s.isReadOnly === false, "1s future: canWrite=true, isReadOnly=false");

  const expiredExact = evaluateEffectiveSubscriptionState(
    {
      agencyStatus: AgencyStatus.ACTIVE,
      subscription: {
        status: SubscriptionStatus.ACTIVE,
        subscriptionStart: new Date("2026-10-27T12:00:00.000Z"),
        subscriptionEnd: exactNow,
      },
    },
    baseNow
  );
  check(expiredExact.effectiveStatus === SubscriptionStatus.EXPIRED, "Exact boundary (end === now): effectiveStatus === EXPIRED");
  check(expiredExact.canWrite === false && expiredExact.isReadOnly === true && expiredExact.isSubscriptionExpired === true, "Exact boundary: canWrite=false, isReadOnly=true");

  const expired1s = evaluateEffectiveSubscriptionState(
    {
      agencyStatus: AgencyStatus.ACTIVE,
      subscription: {
        status: SubscriptionStatus.ACTIVE,
        subscriptionStart: new Date("2026-10-27T12:00:00.000Z"),
        subscriptionEnd: oneSecPast,
      },
    },
    baseNow
  );
  check(expired1s.effectiveStatus === SubscriptionStatus.EXPIRED && !expired1s.canWrite, "1s past: effectiveStatus === EXPIRED, canWrite=false");

  const missingEnd = evaluateEffectiveSubscriptionState(
    {
      agencyStatus: AgencyStatus.ACTIVE,
      subscription: {
        status: SubscriptionStatus.ACTIVE,
        subscriptionStart: new Date("2026-10-27T12:00:00.000Z"),
        subscriptionEnd: null,
      },
    },
    baseNow
  );
  check(missingEnd.effectiveStatus === SubscriptionStatus.EXPIRED && !missingEnd.canWrite, "Missing subscriptionEnd: fails closed to EXPIRED");
  check(missingEnd.diagnosticReason === "INVALID_OR_MISSING_SUBSCRIPTION_END", "Missing subscriptionEnd records safe diagnosticReason");

  const invalidEnd = evaluateEffectiveSubscriptionState(
    {
      agencyStatus: AgencyStatus.ACTIVE,
      subscription: {
        status: SubscriptionStatus.ACTIVE,
        subscriptionStart: new Date("2026-10-27T12:00:00.000Z"),
        subscriptionEnd: "not-a-valid-date",
      },
    },
    baseNow
  );
  check(invalidEnd.effectiveStatus === SubscriptionStatus.EXPIRED && !invalidEnd.canWrite, "Invalid subscriptionEnd: fails closed to EXPIRED");
  check(invalidEnd.diagnosticReason === "INVALID_OR_MISSING_SUBSCRIPTION_END", "Invalid subscriptionEnd records safe diagnosticReason");

  console.log("\n=== 2. Trial & Platform Owner & Suspended Boundaries ===");
  const validTrial = evaluateEffectiveSubscriptionState(
    {
      agencyStatus: AgencyStatus.ACTIVE,
      subscription: {
        status: SubscriptionStatus.TRIAL,
        trialStart: new Date(baseNow.getTime() - 2 * 86400000),
        trialEnd: oneSecFuture,
      },
    },
    baseNow
  );
  check(validTrial.effectiveStatus === SubscriptionStatus.TRIAL && validTrial.canWrite && validTrial.isTrial && !validTrial.isTrialExpired, "Valid trial: TRIAL, canWrite=true");

  const expiredTrial = evaluateEffectiveSubscriptionState(
    {
      agencyStatus: AgencyStatus.ACTIVE,
      subscription: {
        status: SubscriptionStatus.TRIAL,
        trialStart: new Date(baseNow.getTime() - 7 * 86400000),
        trialEnd: exactNow,
      },
    },
    baseNow
  );
  check(expiredTrial.effectiveStatus === SubscriptionStatus.EXPIRED && !expiredTrial.canWrite && expiredTrial.isTrialExpired, "Trial at boundary: EXPIRED, isTrialExpired=true, canWrite=false");

  const platformOwner = evaluateEffectiveSubscriptionState({ isPlatformOwner: true, subscription: null }, baseNow);
  check(platformOwner.effectiveStatus === SubscriptionStatus.ACTIVE && platformOwner.canWrite, "Platform Owner unaffected by agency subscription state");

  const suspendedActive = evaluateEffectiveSubscriptionState(
    {
      agencyStatus: AgencyStatus.SUSPENDED,
      subscription: {
        status: SubscriptionStatus.ACTIVE,
        subscriptionEnd: oneSecFuture,
      },
    },
    baseNow
  );
  check(!suspendedActive.canWrite && suspendedActive.isReadOnly && suspendedActive.isSuspended, "Suspended agency blocked even with active paid subscription");

  console.log("\n=== 3. EntitlementService Deterministic Resolution ===");
  const { entitlementService } = await import("../src/lib/services/entitlement-service");

  const makeMockClient = (subOverrides: any, planName = "Professional", limitVal: number | null = null, usageCount = 0) => {
    const plan = { id: `plan_${planName.toLowerCase()}`, name: planName, durationDays: 30 };
    return {
      subscription: {
        findFirst: async () => ({
          id: "sub_1",
          agencyId: "ag_1",
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          trialStart: null,
          trialEnd: null,
          subscriptionStart: new Date("2026-10-24T05:43:26.912Z"),
          subscriptionEnd: new Date("2026-11-23T05:43:26.912Z"),
          createdAt: new Date("2026-09-15T03:39:02.188Z"),
          plan,
          ...subOverrides,
        }),
      },
      subscriptionPlan: {
        findFirst: async () => ({ id: "plan_pro", name: "Professional" }),
        findUnique: async () => plan,
      },
      planFeatureEntitlement: {
        findUnique: async ({ where }: any) => ({
          planId: where.planId_featureKey.planId,
          featureKey: where.planId_featureKey.featureKey,
          enabled: where.planId_featureKey.planId === "plan_professional" || where.planId_featureKey.planId === "plan_pro",
        }),
      },
      planUsageLimit: {
        findUnique: async () => ({ planId: plan.id, resourceKey: "TRIPS", limit: limitVal }),
      },
      trip: { count: async () => usageCount },
      quotation: { count: async () => usageCount },
      booking: { count: async () => usageCount },
    } as any;
  };

  await checkThrows(
    () => entitlementService.resolveAgencySubscription("ag_1", makeMockClient({}), baseNow),
    "ReadOnlyAccessError",
    "entitlementService denies ACTIVE subscription past subscriptionEnd with ReadOnlyAccessError"
  );
  await checkThrows(
    () => entitlementService.resolveAgencySubscription("ag_1", makeMockClient({ subscriptionEnd: null }), baseNow),
    "ReadOnlyAccessError",
    "entitlementService fails closed with ReadOnlyAccessError when subscriptionEnd is missing"
  );

  const validProCtx = await entitlementService.resolveAgencySubscription(
    "ag_1",
    makeMockClient({ subscriptionEnd: oneSecFuture }),
    baseNow
  );
  check(validProCtx.effectivePlanName === "Professional" && validProCtx.status === SubscriptionStatus.ACTIVE, "Valid ACTIVE Professional resolves correctly");

  const validTrialCtx = await entitlementService.resolveAgencySubscription(
    "ag_1",
    makeMockClient({ status: SubscriptionStatus.TRIAL, trialStart: oneSecPast, trialEnd: oneSecFuture }, "Starter"),
    baseNow
  );
  check(validTrialCtx.effectivePlanName === "Professional" && validTrialCtx.isTrial, "Valid TRIAL grants Professional entitlements");

  await checkThrows(
    () =>
      entitlementService.resolveAgencySubscription(
        "ag_1",
        makeMockClient({ status: SubscriptionStatus.TRIAL, trialStart: oneSecPast, trialEnd: exactNow }, "Starter"),
        baseNow
      ),
    "ReadOnlyAccessError",
    "Expired TRIAL throws ReadOnlyAccessError and does not grant paid access"
  );

  const activeFutureEnd = new Date(Date.now() + 86_400_000);
  await checkThrows(
    () => entitlementService.checkQuota("ag_1", "TRIPS", makeMockClient({ subscriptionEnd: activeFutureEnd }, "Starter", 20, 20)),
    "QuotaExceededError",
    "Starter 20/20 TRIPS quota enforces limit per V3"
  );
  const belowUsage = await entitlementService.checkQuota("ag_1", "TRIPS", makeMockClient({ subscriptionEnd: activeFutureEnd }, "Starter", 20, 19));
  check(belowUsage.remaining === 1 && !belowUsage.isExceeded, "Starter 19/20 TRIPS allows creation with 1 remaining");

  console.log("\n=== 4. Request Context, Write/Renewal Guards & Route Checks ===");
  const {
    getRequestContext,
    requireReadAccess,
    requireWriteAccess,
    requireMemberWriteAccess,
    requireBillingRenewalAccess,
  } = await import("../src/lib/api/context");
  const { POST: postPaymentRequest } = await import("../src/app/api/subscription/payment-request/route");

  // A. Expired ACTIVE Agency Owner
  mockState.userRole = UserRole.AGENCY_OWNER;
  mockState.agencyStatus = AgencyStatus.ACTIVE;
  mockState.subStatus = SubscriptionStatus.ACTIVE;
  mockState.subEnd = new Date("2026-11-23T05:43:26.912Z");

  const ownerCtx = await getRequestContext();
  check(ownerCtx?.subscriptionAccess.status === SubscriptionStatus.EXPIRED, "Expired ACTIVE owner: getRequestContext returns status=EXPIRED");
  check(
    ownerCtx?.subscriptionAccess.canWrite === false &&
      ownerCtx?.subscriptionAccess.isReadOnly === true &&
      ownerCtx?.subscriptionAccess.hasFullAccess === false,
    "Expired ACTIVE owner: canWrite=false, isReadOnly=true, hasFullAccess=false"
  );
  const ownerRead = await requireReadAccess();
  check(ownerRead.agencyId === "ag_1", "Expired ACTIVE owner retains read-only access");
  await checkThrows(() => requireWriteAccess(), "ReadOnlyAccessError", "Expired ACTIVE owner blocked by requireWriteAccess()");

  // B. Expired ACTIVE Agency Staff
  mockState.userRole = UserRole.AGENCY_STAFF;
  const staffCtx = await getRequestContext();
  check(staffCtx?.subscriptionAccess.status === SubscriptionStatus.EXPIRED && !staffCtx?.subscriptionAccess.canWrite, "Expired ACTIVE staff inherits EXPIRED restriction");
  await checkThrows(() => requireMemberWriteAccess(), "ReadOnlyAccessError", "Expired ACTIVE staff blocked by requireMemberWriteAccess()");

  // C. Renewal payment request exception for Expired Owner
  mockState.userRole = UserRole.AGENCY_OWNER;
  const renewalCtx = await requireBillingRenewalAccess();
  check(renewalCtx.agencyId === "ag_1", "Expired Agency Owner permitted by requireBillingRenewalAccess()");

  const validReq = new NextRequest("http://localhost:3001/api/subscription/payment-request", {
    method: "POST",
    body: JSON.stringify({ planId: "plan_pro", billingCycle: "MONTHLY", paymentMethod: "UPI", utrNumber: "UTR99887766" }),
    headers: { "content-type": "application/json" },
  });
  const renewalRes = await postPaymentRequest(validReq);
  const renewalJson = await renewalRes.json();
  check(
    renewalRes.status === 200 && renewalJson.success === true && renewalJson.data?.status === "PENDING",
    "Expired Owner can submit renewal payment request (PENDING, does not auto-activate)"
  );
  check(mockState.createdPaymentCount === 1, "Payment request persisted once without changing subscription status");

  // D. Invalid payment request rejected
  const invalidReq = new NextRequest("http://localhost:3001/api/subscription/payment-request", {
    method: "POST",
    body: JSON.stringify({ planId: "plan_pro", billingCycle: "MONTHLY", paymentMethod: "UPI", utrNumber: "12" }),
    headers: { "content-type": "application/json" },
  });
  const invalidRes = await postPaymentRequest(invalidReq);
  check(invalidRes.status === 400, "Invalid UTR rejected with 400");

  // E. Staff cannot submit payment request without explicit permission
  mockState.userRole = UserRole.AGENCY_STAFF;
  const staffPayReq = new NextRequest("http://localhost:3001/api/subscription/payment-request", {
    method: "POST",
    body: JSON.stringify({ planId: "plan_pro", billingCycle: "MONTHLY", paymentMethod: "UPI", utrNumber: "UTR11223344" }),
    headers: { "content-type": "application/json" },
  });
  const staffPayRes = await postPaymentRequest(staffPayReq);
  check(staffPayRes.status === 403, "Default AGENCY_STAFF denied from submitting payment request (403)");

  // F. Suspended agency blocked from renewal bypass
  mockState.userRole = UserRole.AGENCY_OWNER;
  mockState.agencyStatus = AgencyStatus.SUSPENDED;
  const suspPayReq = new NextRequest("http://localhost:3001/api/subscription/payment-request", {
    method: "POST",
    body: JSON.stringify({ planId: "plan_pro", billingCycle: "MONTHLY", paymentMethod: "UPI", utrNumber: "UTR55667788" }),
    headers: { "content-type": "application/json" },
  });
  const suspPayRes = await postPaymentRequest(suspPayReq);
  check(suspPayRes.status === 403, "SUSPENDED agency cannot bypass suspension via payment-request (403)");

  // G. Active unexpired subscription still allows writes
  mockState.agencyStatus = AgencyStatus.ACTIVE;
  mockState.subEnd = new Date(Date.now() + 86400000);
  const activeWriteCtx = await requireWriteAccess();
  check(activeWriteCtx.subscriptionAccess.canWrite === true, "Unexpired ACTIVE subscription continues allowing writes");

  // H. Platform Owner unaffected
  mockState.userRole = UserRole.PLATFORM_OWNER;
  const poCtx = await getRequestContext();
  check(poCtx?.isPlatformOwner === true && poCtx.subscriptionAccess.canWrite === true, "Platform Owner context unaffected");

  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed (total ${passed + failed}) ===`);
  assert.equal(failed, 0, `${failed} subscription expiry tests failed`);
}

main().catch((err) => {
  console.error("Test suite fatal error:", err);
  process.exit(1);
});
