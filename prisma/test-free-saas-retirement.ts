/**
 * Free SaaS Subscription Retirement Verification Suite (DB-Free / Mocked)
 *
 * Verifies in-memory (zero DB writes) that:
 * 1. Agency Owner has full access with no subscription, expired subscription, or cancelled subscription.
 * 2. Agency Staff has full access with no subscription, while delegated staff permissions remain enforced.
 * 3. Missing usage records and subscription quotas no longer block TRIPS, QUOTATIONS, BOOKINGS, STAFF_MEMBERS.
 * 4. All feature entitlements (CUSTOM_AGENCY_LOGO, FEEDBACK_REVIEWS, CUSTOMER_INSIGHTS, REPORTS_ANALYTICS) are allowed.
 * 5. Account security (SUSPENDED agency, deactivated user isActive=false) still blocks access.
 * 6. Platform Owner access remains unaffected.
 * 7. Retired subscription API endpoints return 410 FEATURE_RETIRED without modifying records.
 */

import assert from "node:assert/strict";
import Module from "node:module";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err?.message || err}`);
    failed++;
  }
}

let mockAuthUser: any = { id: "owner-1", email: "owner@example.com" };
let mockDbUser: any = null;
let mockAgencyRecord: any = null;

const mockPrisma: any = {
  user: {
    findUnique: async () => mockDbUser,
  },
  agency: {
    findUnique: async () => mockAgencyRecord,
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
        auth: {
          getUser: async () => ({ data: { user: mockAuthUser }, error: null }),
          getSession: async () => ({ data: { session: { access_token: "mock" } }, error: null }),
        },
      }),
    };
  }
  if (request === "@/lib/prisma") {
    return { __esModule: true, default: mockPrisma, prisma: mockPrisma };
  }
  return originalLoad.call(this, request, parent, isMain);
};

async function main() {
  // Load modules after Module._load hook is active
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getRequestContext, requireMemberWriteAccess, requireWriteAccess } = require("../src/lib/api/context");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getCurrentUser, getSubscriptionAccess } = require("../src/lib/auth/index");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { entitlementService } = require("../src/lib/services/entitlement-service");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GET: getSubscriptionRoute } = require("../src/app/api/subscription/route");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { POST: postPaymentRequestRoute } = require("../src/app/api/subscription/payment-request/route");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GET: getAdminSubscriptionsRoute } = require("../src/app/api/admin/subscriptions/route");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { POST: postExtendTrialRoute } = require("../src/app/api/admin/agencies/[id]/extend-trial/route");

  console.log("\n=== Free SaaS Subscription Retirement Verification ===");

  const baseAgency = {
    id: "ag-free-1",
    name: "Free Agency",
    status: "ACTIVE",
    subscriptions: [],
  };

  await test("Agency Owner with NO subscription record gets full read/write access", async () => {
    mockAuthUser = { id: "owner-1", email: "owner@example.com" };
    mockDbUser = {
      id: "owner-1",
      email: "owner@example.com",
      name: "Owner",
      role: "AGENCY_OWNER",
      agencyId: "ag-free-1",
      isActive: true,
      sessionRevokedAt: null,
      agency: { ...baseAgency, subscriptions: [] },
    };
    const ctx = await getRequestContext();
    assert.ok(ctx);
    assert.equal(ctx.subscriptionAccess.hasFullAccess, true);
    assert.equal(ctx.subscriptionAccess.isReadOnly, false);
    assert.equal(ctx.subscriptionAccess.canWrite, true);
    const writeCtx = await requireWriteAccess();
    assert.equal(writeCtx.agencyId, "ag-free-1");
    const authUser = await getCurrentUser();
    assert.equal(authUser?.hasFullAccess, true);
    assert.equal(authUser?.isReadOnly, false);
  });

  await test("Agency Owner with EXPIRED subscription still gets full access", async () => {
    mockDbUser = {
      ...mockDbUser,
      agency: {
        ...baseAgency,
        subscriptions: [
          {
            id: "sub-exp",
            status: "ACTIVE",
            subscriptionStart: new Date("2025-01-01T00:00:00Z"),
            subscriptionEnd: new Date("2025-02-01T00:00:00Z"),
            plan: { id: "p1", name: "Starter", price: 499 },
          },
        ],
      },
    };
    const ctx = await getRequestContext();
    assert.equal(ctx?.subscriptionAccess.hasFullAccess, true);
    assert.equal(ctx?.subscriptionAccess.isReadOnly, false);
    assert.equal(ctx?.subscriptionAccess.canWrite, true);
    await requireWriteAccess();
  });

  await test("Agency Owner with CANCELLED or SUSPENDED subscription still gets full access", async () => {
    for (const status of ["CANCELLED", "SUSPENDED"]) {
      mockDbUser = {
        ...mockDbUser,
        agency: {
          ...baseAgency,
          subscriptions: [
            {
              id: `sub-${status.toLowerCase()}`,
              status,
              subscriptionStart: new Date("2025-01-01T00:00:00Z"),
              subscriptionEnd: new Date("2025-02-01T00:00:00Z"),
              plan: { id: "p1", name: "Professional", price: 999 },
            },
          ],
        },
      };
      const ctx = await getRequestContext();
      assert.equal(ctx?.subscriptionAccess.hasFullAccess, true);
      assert.equal(ctx?.subscriptionAccess.isReadOnly, false);
      assert.equal(ctx?.subscriptionAccess.canWrite, true);
      await requireWriteAccess();
    }
  });

  await test("Agency Staff with NO subscription record gets member write access", async () => {
    mockAuthUser = { id: "staff-1", email: "staff@example.com" };
    mockDbUser = {
      id: "staff-1",
      email: "staff@example.com",
      name: "Staff",
      role: "AGENCY_STAFF",
      agencyId: "ag-free-1",
      isActive: true,
      sessionRevokedAt: null,
      agency: { ...baseAgency, subscriptions: [] },
    };
    const memberCtx = await requireMemberWriteAccess();
    assert.equal(memberCtx.isAgencyStaff, true);
    assert.equal(memberCtx.subscriptionAccess.canWrite, true);
  });

  await test("entitlementService quotas and features are unlimited/allowed without subscription or usage rows", async () => {
    for (const key of ["TRIPS", "QUOTATIONS", "BOOKINGS", "STAFF_MEMBERS"]) {
      const usage = await entitlementService.checkQuota("ag-free-1", key);
      assert.equal(usage.limit, null);
      assert.equal(usage.isExceeded, false);
    }
    for (const feat of ["CUSTOM_AGENCY_LOGO", "FEEDBACK_REVIEWS", "CUSTOMER_INSIGHTS", "REPORTS_ANALYTICS"]) {
      assert.equal(await entitlementService.checkFeatureAllowed("ag-free-1", feat), true);
      assert.equal(await entitlementService.isFeatureAllowed("ag-free-1", feat), true);
    }
  });

  await test("Security preserved: SUSPENDED agency still blocked from writes", async () => {
    mockDbUser = {
      ...mockDbUser,
      role: "AGENCY_OWNER",
      agency: { ...baseAgency, status: "SUSPENDED" },
    };
    mockAgencyRecord = { status: "SUSPENDED" };
    const subAccess = await getSubscriptionAccess("ag-free-1");
    assert.equal(subAccess.isReadOnly, true);
    assert.equal(subAccess.hasFullAccess, false);
    await assert.rejects(() => requireWriteAccess(), /suspended/i);
  });

  await test("Security preserved: Deactivated user (isActive=false) is rejected by getRequestContext", async () => {
    mockDbUser = {
      ...mockDbUser,
      isActive: false,
      agency: { ...baseAgency, status: "ACTIVE" },
    };
    const ctx = await getRequestContext();
    assert.equal(ctx, null);
  });

  await test("Platform Owner access remains unaffected", async () => {
    mockAuthUser = { id: "po-1", email: "platform@example.com" };
    mockDbUser = {
      id: "po-1",
      email: "platform@example.com",
      name: "Platform Owner",
      role: "PLATFORM_OWNER",
      agencyId: null,
      isActive: true,
      sessionRevokedAt: null,
      agency: null,
    };
    const ctx = await getRequestContext();
    assert.equal(ctx?.isPlatformOwner, true);
    assert.equal(ctx?.subscriptionAccess.hasFullAccess, true);
    assert.equal(ctx?.subscriptionAccess.isReadOnly, false);
  });

  await test("Retired subscription API endpoints return 410 FEATURE_RETIRED", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET: getSubPlans } = require("../src/app/api/subscription/plans/route");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET: getSubBillingSettings } = require("../src/app/api/subscription/billing-settings/route");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET: getAdminPlans, POST: postAdminPlans } = require("../src/app/api/admin/plans/route");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PATCH: patchAdminPlan } = require("../src/app/api/admin/plans/[id]/route");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET: getAdminSubPayments, POST: postAdminSubPayments } = require("../src/app/api/admin/subscription-payments/route");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET: getAdminSubPaymentById } = require("../src/app/api/admin/subscription-payments/[id]/route");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { POST: postVerifySubPayment } = require("../src/app/api/admin/subscription-payments/[id]/verify/route");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { POST: postRejectSubPayment } = require("../src/app/api/admin/subscription-payments/[id]/reject/route");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET: getAdminBillingSettings, PATCH: patchAdminBillingSettings } = require("../src/app/api/admin/billing-settings/route");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { POST: postAdminBillingQr, DELETE: deleteAdminBillingQr } = require("../src/app/api/admin/billing-settings/qr/route");

    mockAuthUser = { id: "owner-1", email: "owner@example.com" };
    mockDbUser = {
      id: "owner-1",
      email: "owner@example.com",
      name: "Owner",
      role: "AGENCY_OWNER",
      agencyId: "ag-free-1",
      isActive: true,
      sessionRevokedAt: null,
      agency: { ...baseAgency, status: "ACTIVE" },
    };

    const agencyCalls = [
      () => getSubscriptionRoute(),
      () => getSubPlans(new Request("http://localhost/api/subscription/plans") as any),
      () => getSubBillingSettings(),
      () => postPaymentRequestRoute(new Request("http://localhost/api/subscription/payment-request", { method: "POST" }) as any),
    ];
    for (const call of agencyCalls) {
      const res = await call();
      assert.equal(res.status, 410);
      const body = await res.json();
      assert.equal(body?.error?.code, "FEATURE_RETIRED");
    }

    mockDbUser = { ...mockDbUser, role: "PLATFORM_OWNER", agencyId: null, agency: null };
    const idCtx = { params: Promise.resolve({ id: "test-id" }) };
    const adminCalls = [
      () => getAdminSubscriptionsRoute(new Request("http://localhost/api/admin/subscriptions") as any),
      () => getAdminPlans(new Request("http://localhost/api/admin/plans") as any),
      () => postAdminPlans(new Request("http://localhost/api/admin/plans", { method: "POST" }) as any),
      () => patchAdminPlan(new Request("http://localhost/api/admin/plans/p1", { method: "PATCH" }) as any, idCtx),
      () => getAdminSubPayments(new Request("http://localhost/api/admin/subscription-payments") as any),
      () => postAdminSubPayments(new Request("http://localhost/api/admin/subscription-payments", { method: "POST" }) as any),
      () => getAdminSubPaymentById(new Request("http://localhost/api/admin/subscription-payments/sp1") as any, idCtx),
      () => postVerifySubPayment(new Request("http://localhost/api/admin/subscription-payments/sp1/verify", { method: "POST" }) as any, idCtx),
      () => postRejectSubPayment(new Request("http://localhost/api/admin/subscription-payments/sp1/reject", { method: "POST" }) as any, idCtx),
      () => postExtendTrialRoute(new Request("http://localhost/api/admin/agencies/ag-free-1/extend-trial", { method: "POST" }) as any, idCtx),
      () => getAdminBillingSettings(),
      () => patchAdminBillingSettings(new Request("http://localhost/api/admin/billing-settings", { method: "PATCH" }) as any),
      () => postAdminBillingQr(new Request("http://localhost/api/admin/billing-settings/qr", { method: "POST" }) as any),
      () => deleteAdminBillingQr(),
    ];
    for (const call of adminCalls) {
      const res = await call();
      assert.equal(res.status, 410);
      const body = await res.json();
      assert.equal(body?.error?.code, "FEATURE_RETIRED");
    }
  });

  await test("Retired subscription APIs preserve 401/403 auth guards before returning 410", async () => {
    mockAuthUser = null;
    mockDbUser = null;
    const unauthAgencySub = await getSubscriptionRoute();
    assert.equal(unauthAgencySub.status, 401);
    const unauthAdminSub = await getAdminSubscriptionsRoute(new Request("http://localhost/api/admin/subscriptions") as any);
    assert.equal(unauthAdminSub.status, 401);

    mockAuthUser = { id: "owner-1", email: "owner@example.com" };
    mockDbUser = {
      id: "owner-1",
      email: "owner@example.com",
      name: "Owner",
      role: "AGENCY_OWNER",
      agencyId: "ag-free-1",
      isActive: true,
      sessionRevokedAt: null,
      agency: { ...baseAgency, status: "ACTIVE" },
    };
    const forbiddenAdminSub = await getAdminSubscriptionsRoute(new Request("http://localhost/api/admin/subscriptions") as any);
    assert.equal(forbiddenAdminSub.status, 403);
  });

  console.log(`\nFREE SAAS RETIREMENT SUITE SUMMARY: ${passed} passed, ${failed} failed (total ${passed + failed})`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
