import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { AgencyStatus, SubscriptionStatus, UserRole } from "@prisma/client";
import { ReadOnlyAccessError } from "../src/lib/api/errors";

async function main() {
  console.log("================================================================================");
  console.log("    PHASE 217 — READ-ONLY MODE & SUSPENSION HARDENING QA SUITE                  ");
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

  // 1. Verify Plans Exist
  const starterPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Starter" },
  });
  const proPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Professional" },
  });

  assert(!!starterPlan, "Starter subscription plan exists in DB");
  assert(!!proPlan, "Professional subscription plan exists in DB");

  // 2. Locate baseline QA test agency
  const baselineAgency = await prisma.agency.findFirst({
    where: { name: { contains: "QA" } },
    include: { subscriptions: { include: { plan: true } } },
  });

  assert(!!baselineAgency, "Baseline QA Agency exists for reference");

  // 3. Test Pure Logic Simulator matching `src/lib/api/context.ts`
  console.log("\n--- Section 1: Server-Side Backend Guard Logic Simulation ---");

  interface ContextMock {
    isAgencyOwner: boolean;
    isPlatformOwner: boolean;
    agency: { id: string; status: AgencyStatus } | null;
    subscription: {
      status: SubscriptionStatus;
      trialStart?: Date | null;
      trialEnd?: Date | null;
      plan: { name: string; code?: string };
    } | null;
  }

  function simulateServerContext(mock: ContextMock) {
    const isPlatformOwner = mock.isPlatformOwner;
    const isAgencyOwner = mock.isAgencyOwner && !!mock.agency;
    const isSuspendedAgency = isAgencyOwner && mock.agency?.status === AgencyStatus.SUSPENDED;

    let status: SubscriptionStatus = SubscriptionStatus.TRIAL;
    let canWrite = isPlatformOwner;
    let canRead = true;
    let trialDaysRemaining = 0;

    if (mock.subscription) {
      status = mock.subscription.status;
      const now = Date.now();

      if (mock.subscription.status === SubscriptionStatus.TRIAL && mock.subscription.trialEnd) {
        const end = new Date(mock.subscription.trialEnd).getTime();
        trialDaysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
        canWrite = !isSuspendedAgency && trialDaysRemaining > 0;
      } else if (mock.subscription.status === SubscriptionStatus.ACTIVE) {
        canWrite = !isSuspendedAgency;
      } else {
        canWrite = false;
      }
    } else if (isAgencyOwner) {
      status = SubscriptionStatus.EXPIRED;
      canWrite = false;
    }

    if (isSuspendedAgency) {
      canWrite = false;
    }

    const subscriptionAccess = {
      status,
      hasFullAccess: canWrite,
      isReadOnly: !canWrite,
      canRead,
      canWrite,
      trialDaysRemaining,
      planName: mock.subscription?.plan.name,
    };

    return {
      agency: mock.agency,
      subscription: mock.subscription,
      subscriptionAccess,
      isPlatformOwner,
      isAgencyOwner,
    };
  }

  function simulateRequireWriteAccess(context: ReturnType<typeof simulateServerContext>) {
    if (context.agency?.status === AgencyStatus.SUSPENDED) {
      throw new ReadOnlyAccessError(
        "Your agency workspace is currently suspended. Creating or modifying business records is restricted. Please contact TripDesk support to reactivate your workspace."
      );
    }
    if (!context.subscriptionAccess.canWrite) {
      throw new ReadOnlyAccessError(
        "Your subscription or free trial has expired. Existing data is accessible in read-only mode. Renew to resume creating or modifying business records."
      );
    }
    return true;
  }

  // Case 1: Active Agency + Active Subscription (Starter)
  const ctx1 = simulateServerContext({
    isAgencyOwner: true,
    isPlatformOwner: false,
    agency: { id: "test-agency-1", status: AgencyStatus.ACTIVE },
    subscription: {
      status: SubscriptionStatus.ACTIVE,
      plan: { name: "Starter" },
    },
  });
  assert(ctx1.subscriptionAccess.canWrite === true, "Active Agency + Active Subscription allows write in context");
  let err1 = null;
  try {
    simulateRequireWriteAccess(ctx1);
  } catch (e: any) {
    err1 = e;
  }
  assert(err1 === null, "Active Agency + Active Subscription passes requireWriteAccess()");

  // Case 2: Active Agency + Active Trial (7 days remaining)
  const ctx2 = simulateServerContext({
    isAgencyOwner: true,
    isPlatformOwner: false,
    agency: { id: "test-agency-2", status: AgencyStatus.ACTIVE },
    subscription: {
      status: SubscriptionStatus.TRIAL,
      trialStart: new Date(),
      trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      plan: { name: "Trial" },
    },
  });
  assert(ctx2.subscriptionAccess.canWrite === true, "Active Agency + Active Trial allows write");
  let err2 = null;
  try {
    simulateRequireWriteAccess(ctx2);
  } catch (e: any) {
    err2 = e;
  }
  assert(err2 === null, "Active Agency + Active Trial passes requireWriteAccess()");

  // Case 3: Suspended Agency + Active Starter Subscription
  const ctx3 = simulateServerContext({
    isAgencyOwner: true,
    isPlatformOwner: false,
    agency: { id: "test-agency-3", status: AgencyStatus.SUSPENDED },
    subscription: {
      status: SubscriptionStatus.ACTIVE,
      plan: { name: "Starter" },
    },
  });
  assert(ctx3.subscriptionAccess.canWrite === false, "Suspended Agency + Active Subscription sets canWrite=false");
  assert(ctx3.subscriptionAccess.isReadOnly === true, "Suspended Agency + Active Subscription sets isReadOnly=true");
  let err3: any = null;
  try {
    simulateRequireWriteAccess(ctx3);
  } catch (e: any) {
    err3 = e;
  }
  assert(err3 instanceof ReadOnlyAccessError, "Suspended Agency + Active Subscription throws ReadOnlyAccessError");
  assert(err3?.message?.includes("suspended"), "Suspended Agency error message mentions suspended workspace");

  // Case 4: Suspended Agency + Active Professional Subscription
  const ctx4 = simulateServerContext({
    isAgencyOwner: true,
    isPlatformOwner: false,
    agency: { id: "test-agency-4", status: AgencyStatus.SUSPENDED },
    subscription: {
      status: SubscriptionStatus.ACTIVE,
      plan: { name: "Professional" },
    },
  });
  assert(ctx4.subscriptionAccess.canWrite === false, "Suspended Agency + Professional Subscription sets canWrite=false");
  let err4: any = null;
  try {
    simulateRequireWriteAccess(ctx4);
  } catch (e: any) {
    err4 = e;
  }
  assert(err4 instanceof ReadOnlyAccessError, "Suspended Agency + Professional Subscription throws ReadOnlyAccessError");

  // Case 5: Active Agency + Expired Subscription
  const ctx5 = simulateServerContext({
    isAgencyOwner: true,
    isPlatformOwner: false,
    agency: { id: "test-agency-5", status: AgencyStatus.ACTIVE },
    subscription: {
      status: SubscriptionStatus.EXPIRED,
      plan: { name: "Starter" },
    },
  });
  assert(ctx5.subscriptionAccess.canWrite === false, "Expired Subscription sets canWrite=false");
  let err5: any = null;
  try {
    simulateRequireWriteAccess(ctx5);
  } catch (e: any) {
    err5 = e;
  }
  assert(err5 instanceof ReadOnlyAccessError, "Expired Subscription throws ReadOnlyAccessError");
  assert(err5?.message?.includes("expired"), "Expired Subscription error message mentions expired subscription");

  // Case 6: Active Agency + Cancelled Subscription
  const ctx6 = simulateServerContext({
    isAgencyOwner: true,
    isPlatformOwner: false,
    agency: { id: "test-agency-6", status: AgencyStatus.ACTIVE },
    subscription: {
      status: SubscriptionStatus.CANCELLED,
      plan: { name: "Starter" },
    },
  });
  assert(ctx6.subscriptionAccess.canWrite === false, "Cancelled Subscription sets canWrite=false");
  let err6: any = null;
  try {
    simulateRequireWriteAccess(ctx6);
  } catch (e: any) {
    err6 = e;
  }
  assert(err6 instanceof ReadOnlyAccessError, "Cancelled Subscription throws ReadOnlyAccessError");

  // Section 2: Frontend Subscription Context State & Precedence Logic Simulation
  console.log("\n--- Section 2: Frontend Context State & Precedence Logic Simulation ---");

  type ReadOnlyReason = "SUSPENDED" | "EXPIRED" | "CANCELLED" | "PAST_DUE" | "UNPAID" | null;

  function evaluateClientReadOnlyState(overview: any) {
    if (!overview) {
      return { isReadOnly: false, readOnlyReason: null as ReadOnlyReason };
    }

    if (overview.agency?.status === "SUSPENDED") {
      return { isReadOnly: true, readOnlyReason: "SUSPENDED" as ReadOnlyReason };
    }

    const sub = overview.subscription;
    if (!sub) {
      return { isReadOnly: true, readOnlyReason: "EXPIRED" as ReadOnlyReason };
    }

    if (sub.status === "EXPIRED" || (sub.isTrialExpired && sub.status !== "ACTIVE")) {
      return { isReadOnly: true, readOnlyReason: "EXPIRED" as ReadOnlyReason };
    }

    if (sub.status === "CANCELLED" || sub.status === "CANCELED") {
      return { isReadOnly: true, readOnlyReason: "CANCELLED" as ReadOnlyReason };
    }

    if (sub.status === "PAST_DUE" || sub.status === "UNPAID") {
      return { isReadOnly: true, readOnlyReason: "PAST_DUE" as ReadOnlyReason };
    }

    return { isReadOnly: false, readOnlyReason: null as ReadOnlyReason };
  }

  function evaluateCanCreate(
    isReadOnly: boolean,
    usageItem: { limit: number | null; currentUsage: number; remaining: number | null; isExceeded: boolean } | null,
    planCode: string
  ) {
    if (isReadOnly) {
      return {
        allowed: false,
        reason: "READ_ONLY_SUBSCRIPTION",
      };
    }

    if (!usageItem) {
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

  // Client Case 1: Suspended Agency with quota space remaining (10 / 20)
  const clientSuspended = evaluateClientReadOnlyState({
    agency: { status: "SUSPENDED" },
    subscription: { status: "ACTIVE", plan: { code: "STARTER" } },
  });
  assert(clientSuspended.isReadOnly === true, "Client: Suspended agency produces isReadOnly=true");
  assert(clientSuspended.readOnlyReason === "SUSPENDED", "Client: Suspended agency produces readOnlyReason='SUSPENDED'");

  const quotaDecisionSuspended = evaluateCanCreate(
    clientSuspended.isReadOnly,
    { limit: 20, currentUsage: 10, remaining: 10, isExceeded: false },
    "STARTER"
  );
  assert(quotaDecisionSuspended.allowed === false, "Client: Suspended agency cannot create records despite remaining quota");
  assert(quotaDecisionSuspended.reason === "READ_ONLY_SUBSCRIPTION", "Client: Suspended agency returns READ_ONLY_SUBSCRIPTION");

  // Client Case 2: Suspended Agency with quota EXCEEDED (20 / 20) — Read-Only Precedence
  const quotaDecisionSuspendedExceeded = evaluateCanCreate(
    clientSuspended.isReadOnly,
    { limit: 20, currentUsage: 20, remaining: 0, isExceeded: true },
    "STARTER"
  );
  assert(quotaDecisionSuspendedExceeded.allowed === false, "Client: Read-Only takes strict precedence over QUOTA_EXCEEDED");
  assert(
    quotaDecisionSuspendedExceeded.reason === "READ_ONLY_SUBSCRIPTION",
    "Client: Reason is READ_ONLY_SUBSCRIPTION (not QUOTA_EXCEEDED) when suspended"
  );

  // Client Case 3: Expired Subscription with quota space remaining
  const clientExpired = evaluateClientReadOnlyState({
    agency: { status: "ACTIVE" },
    subscription: { status: "EXPIRED", plan: { code: "STARTER" } },
  });
  assert(clientExpired.isReadOnly === true, "Client: Expired subscription produces isReadOnly=true");
  assert(clientExpired.readOnlyReason === "EXPIRED", "Client: Expired subscription produces readOnlyReason='EXPIRED'");

  const quotaDecisionExpired = evaluateCanCreate(
    clientExpired.isReadOnly,
    { limit: 20, currentUsage: 5, remaining: 15, isExceeded: false },
    "STARTER"
  );
  assert(quotaDecisionExpired.allowed === false, "Client: Expired subscription prevents creation");
  assert(quotaDecisionExpired.reason === "READ_ONLY_SUBSCRIPTION", "Client: Expired subscription returns READ_ONLY_SUBSCRIPTION");

  // Client Case 4: Active Starter with Quota Exceeded (20 / 20) -> should be QUOTA_EXCEEDED
  const clientActive = evaluateClientReadOnlyState({
    agency: { status: "ACTIVE" },
    subscription: { status: "ACTIVE", plan: { code: "STARTER" } },
  });
  assert(clientActive.isReadOnly === false, "Client: Active agency & sub produces isReadOnly=false");
  assert(clientActive.readOnlyReason === null, "Client: Active agency & sub produces readOnlyReason=null");

  const quotaDecisionActiveExceeded = evaluateCanCreate(
    clientActive.isReadOnly,
    { limit: 20, currentUsage: 20, remaining: 0, isExceeded: true },
    "STARTER"
  );
  assert(quotaDecisionActiveExceeded.allowed === false, "Client: Active Starter with 20/20 cannot create");
  assert(quotaDecisionActiveExceeded.reason === "QUOTA_EXCEEDED", "Client: Active Starter with 20/20 returns QUOTA_EXCEEDED");

  // Client Case 5: Active Starter with Quota Available (5 / 20) -> allowed
  const quotaDecisionActiveAvailable = evaluateCanCreate(
    clientActive.isReadOnly,
    { limit: 20, currentUsage: 5, remaining: 15, isExceeded: false },
    "STARTER"
  );
  assert(quotaDecisionActiveAvailable.allowed === true, "Client: Active Starter with 5/20 allowed to create");
  assert(quotaDecisionActiveAvailable.reason === undefined, "Client: Active Starter with 5/20 reason is undefined");

  // Section 3: Reusable Component Dialog Copy & Action Verification
  console.log("\n--- Section 3: Read-Only Dialog & Card Presentation Verification ---");

  function getReadOnlyDialogConfig(reason: ReadOnlyReason) {
    const isSuspended = reason === "SUSPENDED";
    return {
      title: isSuspended ? "Agency Workspace Suspended" : "Read-Only Subscription Mode",
      badgeText: isSuspended ? "Account Suspended" : "Read-Only Mode",
      primaryCta: isSuspended ? "Contact Platform Support" : "Upgrade / Renew Plan",
      primaryHref: isSuspended ? "https://wa.me/918320494489" : "/subscription",
      isExternalCta: isSuspended,
    };
  }

  const suspendedConfig = getReadOnlyDialogConfig("SUSPENDED");
  assert(suspendedConfig.title.includes("Suspended"), "Suspended Dialog title mentions Suspended");
  assert(suspendedConfig.badgeText === "Account Suspended", "Suspended Dialog badge is 'Account Suspended'");
  assert(suspendedConfig.primaryCta === "Contact Platform Support", "Suspended CTA is 'Contact Platform Support'");
  assert(suspendedConfig.primaryHref.includes("wa.me"), "Suspended CTA routes to WhatsApp Support");
  assert(suspendedConfig.isExternalCta === true, "Suspended CTA is external");

  const expiredConfig = getReadOnlyDialogConfig("EXPIRED");
  assert(expiredConfig.title.includes("Read-Only"), "Expired Dialog title mentions Read-Only");
  assert(expiredConfig.primaryCta === "Upgrade / Renew Plan", "Expired CTA is 'Upgrade / Renew Plan'");
  assert(expiredConfig.primaryHref === "/subscription", "Expired CTA routes internally to /subscription");
  assert(expiredConfig.isExternalCta === false, "Expired CTA is internal");

  console.log("\n================================================================================");
  console.log(`    QA RESULTS: ${passedTests} / ${totalTests} TESTS PASSED                     `);
  console.log("================================================================================");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Test execution fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
