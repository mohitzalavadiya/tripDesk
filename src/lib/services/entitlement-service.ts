import {
EntitlementConfigError,
FeatureNotAllowedError,
NoActiveSubscriptionError,
QuotaExceededError,
ReadOnlyAccessError,
} from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { evaluateEffectiveSubscriptionState } from "@/lib/auth/subscription-state";
import {
Prisma,
Subscription,
SubscriptionPlan,
SubscriptionStatus,
} from "@prisma/client";
import "server-only";

export type PrismaClientOrTx =
  | Prisma.TransactionClient
  | typeof prisma;

export interface ResolvedEntitlementContext {
  agencyId: string;
  subscription: Subscription & { plan: SubscriptionPlan };
  effectivePlanId: string;
  effectivePlanName: string;
  status: SubscriptionStatus;
  periodStart: Date;
  periodEnd: Date;
  isTrial: boolean;
}

export interface ResourceUsageInfo {
  resourceKey: string;
  limit: number | null; // null = unlimited
  currentUsage: number;
  remaining: number | null; // null = unlimited
  periodStart: Date;
  periodEnd: Date;
  isExceeded: boolean;
}

export const entitlementService = {
  /**
   * 1. Resolves the authoritative subscription context for an agency.
   * Uses latest Subscription row ordered by createdAt DESC.
   * Resolves Trial -> Professional plan entitlements.
   * Uses stored subscription/trial timestamps as authoritative billing period.
   * Fails closed if missing subscription or expired/cancelled status.
   */
  async resolveAgencySubscription(
    agencyId: string,
    client: PrismaClientOrTx = prisma,
    now: Date = new Date()
  ): Promise<ResolvedEntitlementContext> {
    if (!agencyId) {
      throw new NoActiveSubscriptionError("Agency ID is required for entitlement resolution.");
    }

    // Fetch authoritative latest subscription
    const sub = await client.subscription.findFirst({
      where: { agencyId },
      orderBy: { createdAt: "desc" },
      include: { plan: true },
    });

    if (!sub) {
      throw new NoActiveSubscriptionError(
        `No subscription record found for agency ${agencyId}. Write operations are restricted.`
      );
    }

    const evalState = evaluateEffectiveSubscriptionState({ subscription: sub }, now);

    // Handling TRIAL Status
    if (sub.status === SubscriptionStatus.TRIAL) {
      if (evalState.diagnosticReason === "INVALID_OR_MISSING_TRIAL_END" || !sub.trialStart || !sub.trialEnd) {
        throw new EntitlementConfigError("Trial subscription has invalid or missing trial dates.");
      }

      if (evalState.isExpired) {
        throw new ReadOnlyAccessError(
          "Your free trial has expired. Existing data is accessible in read-only mode. Upgrade your subscription to resume modifications."
        );
      }

      // Locate target Professional plan for Trial entitlements
      // Trial receives Professional entitlements even if Professional is currently marked isActive = false
      const proPlan = await client.subscriptionPlan.findFirst({
        where: { name: "Professional" },
      });

      if (!proPlan) {
        throw new EntitlementConfigError(
          "Target Professional subscription plan configuration was not found for trial entitlement resolution."
        );
      }

      return {
        agencyId,
        subscription: sub,
        effectivePlanId: proPlan.id,
        effectivePlanName: proPlan.name,
        status: SubscriptionStatus.TRIAL,
        periodStart: sub.trialStart,
        periodEnd: sub.trialEnd,
        isTrial: true,
      };
    }

    // Handling ACTIVE Status
    if (sub.status === SubscriptionStatus.ACTIVE) {
      if (evalState.diagnosticReason === "INVALID_OR_MISSING_SUBSCRIPTION_END" || !evalState.periodEnd) {
        console.warn(`[entitlementService] Agency ${agencyId} ACTIVE subscription has invalid/missing subscriptionEnd; failing closed.`);
        throw new ReadOnlyAccessError(
          "Your subscription end date is missing or invalid. Existing data is accessible in read-only mode. Please contact support or renew your subscription."
        );
      }

      if (evalState.isExpired) {
        throw new ReadOnlyAccessError(
          "Your active subscription period has expired. Existing data is accessible in read-only mode. Renew to resume modifications."
        );
      }

      return {
        agencyId,
        subscription: sub,
        effectivePlanId: sub.planId,
        effectivePlanName: sub.plan.name,
        status: SubscriptionStatus.ACTIVE,
        periodStart: evalState.periodStart || sub.createdAt,
        periodEnd: evalState.periodEnd,
        isTrial: false,
      };
    }

    // Handling EXPIRED or CANCELLED Status
    if (sub.status === SubscriptionStatus.EXPIRED || sub.status === SubscriptionStatus.CANCELLED) {
      throw new ReadOnlyAccessError(
        `Subscription status is ${sub.status}. Existing data is accessible in read-only mode. Renew subscription to perform modifications.`
      );
    }

    // Fallback security catch-all (Fail Closed)
    throw new NoActiveSubscriptionError("Subscription is not in a valid active state for write operations.");
  },

  /**
   * 2. Helper for Phase C: Locks authoritative agency subscription row FOR UPDATE inside an interactive transaction.
   */
  async lockAgencySubscription(
    agencyId: string,
    tx: Prisma.TransactionClient
  ): Promise<{ id: string } | null> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "subscriptions"
      WHERE "agencyId" = ${agencyId}
      ORDER BY "createdAt" DESC
      LIMIT 1
      FOR UPDATE
    `;
    return rows[0] || null;
  },

  /**
   * 3. Retired subscription feature gate (Free SaaS): all features are available to every agency.
   */
  async checkFeatureAllowed(
    agencyId: string,
    _featureKey: string,
    _client: PrismaClientOrTx = prisma
  ): Promise<boolean> {
    if (!agencyId) {
      throw new NoActiveSubscriptionError("Agency ID is required for feature access.");
    }
    return true;
  },

  /**
   * 4. Safe boolean query for feature permission (Free SaaS: always true for valid agency).
   */
  async isFeatureAllowed(
    agencyId: string,
    _featureKey: string,
    _client: PrismaClientOrTx = prisma
  ): Promise<boolean> {
    return Boolean(agencyId);
  },

  /**
   * 5. Resolves usage limit for a resource key and plan ID.
   * Returns limit (number or null for unlimited).
   * Throws EntitlementConfigError if missing row (Fail Closed).
   */
  async getUsageLimit(
    effectivePlanId: string,
    resourceKey: string,
    client: PrismaClientOrTx = prisma
  ): Promise<number | null> {
    const usageLimit = await client.planUsageLimit.findUnique({
      where: {
        planId_resourceKey: {
          planId: effectivePlanId,
          resourceKey,
        },
      },
    });

    if (!usageLimit) {
      if (resourceKey === "STAFF_MEMBERS") {
        // Fallback to confirmed plan limits if row is not yet seeded in plan_usage_limits
        const plan = client.subscriptionPlan
          ? await client.subscriptionPlan.findUnique({
              where: { id: effectivePlanId },
              select: { name: true },
            })
          : null;
        if (plan?.name?.toLowerCase().includes("starter")) return 5;
        if (plan?.name?.toLowerCase().includes("professional")) return 20;
        return 20;
      }
      throw new EntitlementConfigError(
        `Usage limit configuration for resource '${resourceKey}' is missing for plan ID '${effectivePlanId}'.`
      );
    }

    return usageLimit.limit;
  },

  /**
   * 6. Retired quota usage lookup (Free SaaS): returns unlimited usage without requiring subscription/usage rows.
   */
  async getResourceUsage(
    agencyId: string,
    resourceKey: string,
    _client: PrismaClientOrTx = prisma
  ): Promise<ResourceUsageInfo> {
    if (!agencyId) {
      throw new NoActiveSubscriptionError("Agency ID is required for resource usage.");
    }
    const now = new Date();
    return {
      resourceKey,
      limit: null,
      currentUsage: 0,
      remaining: null,
      periodStart: new Date(0),
      periodEnd: now,
      isExceeded: false,
    };
  },

  /**
   * 7. Retired creation quota enforcement (Free SaaS): never blocks creation.
   */
  async checkQuota(
    agencyId: string,
    resourceKey: string,
    client: PrismaClientOrTx = prisma
  ): Promise<ResourceUsageInfo> {
    return this.getResourceUsage(agencyId, resourceKey, client);
  },
};
