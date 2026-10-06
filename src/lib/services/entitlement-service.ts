import "server-only";
import { prisma } from "@/lib/prisma";
import {
  Prisma,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import {
  NoActiveSubscriptionError,
  FeatureNotAllowedError,
  EntitlementConfigError,
  QuotaExceededError,
  ReadOnlyAccessError,
} from "@/lib/api/errors";

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
    client: PrismaClientOrTx = prisma
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

    const now = new Date();

    // Handling TRIAL Status
    if (sub.status === SubscriptionStatus.TRIAL) {
      if (!sub.trialStart || !sub.trialEnd) {
        throw new EntitlementConfigError("Trial subscription has invalid or missing trial dates.");
      }

      if (now.getTime() >= sub.trialEnd.getTime()) {
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
      const periodStart = sub.subscriptionStart || sub.createdAt;
      const periodEnd = sub.subscriptionEnd;

      if (!periodEnd) {
        throw new EntitlementConfigError("Active subscription has invalid or missing subscription end date.");
      }

      if (now.getTime() >= periodEnd.getTime()) {
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
        periodStart,
        periodEnd,
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
   * 3. Checks whether a feature key is allowed for the agency.
   * Throws FeatureNotAllowedError or EntitlementConfigError if missing or disabled (Fail Closed).
   */
  async checkFeatureAllowed(
    agencyId: string,
    featureKey: string,
    client: PrismaClientOrTx = prisma
  ): Promise<boolean> {
    const ctx = await this.resolveAgencySubscription(agencyId, client);

    const feature = await client.planFeatureEntitlement.findUnique({
      where: {
        planId_featureKey: {
          planId: ctx.effectivePlanId,
          featureKey,
        },
      },
    });

    if (!feature) {
      throw new FeatureNotAllowedError(
        featureKey,
        `Feature configuration '${featureKey}' is missing for plan '${ctx.effectivePlanName}'. Access denied.`
      );
    }

    if (!feature.enabled) {
      throw new FeatureNotAllowedError(
        featureKey,
        `Feature '${featureKey}' is not included in the ${ctx.effectivePlanName} plan. Upgrade to access.`
      );
    }

    return true;
  },

  /**
   * 4. Safe boolean query for feature permission.
   * Returns false if unauthenticated, missing subscription, expired, or feature disabled/missing.
   */
  async isFeatureAllowed(
    agencyId: string,
    featureKey: string,
    client: PrismaClientOrTx = prisma
  ): Promise<boolean> {
    try {
      await this.checkFeatureAllowed(agencyId, featureKey, client);
      return true;
    } catch {
      return false;
    }
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
      throw new EntitlementConfigError(
        `Usage limit configuration for resource '${resourceKey}' is missing for plan ID '${effectivePlanId}'.`
      );
    }

    return usageLimit.limit;
  },

  /**
   * 6. Resolves current resource usage and remaining count within authoritative billing period.
   * Counts creations in half-open interval: createdAt >= periodStart AND createdAt < periodEnd.
   * Includes soft-deleted/archived rows (creation-based quota).
   */
  async getResourceUsage(
    agencyId: string,
    resourceKey: string,
    client: PrismaClientOrTx = prisma
  ): Promise<ResourceUsageInfo> {
    const ctx = await this.resolveAgencySubscription(agencyId, client);
    const limit = await this.getUsageLimit(ctx.effectivePlanId, resourceKey, client);

    let currentUsage = 0;
    const { periodStart, periodEnd } = ctx;

    if (resourceKey === "TRIPS") {
      currentUsage = await client.trip.count({
        where: {
          agencyId,
          createdAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
      });
    } else if (resourceKey === "QUOTATIONS") {
      currentUsage = await client.quotation.count({
        where: {
          agencyId,
          createdAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
      });
    } else if (resourceKey === "BOOKINGS") {
      currentUsage = await client.booking.count({
        where: {
          agencyId,
          createdAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
      });
    } else {
      throw new EntitlementConfigError(`Unsupported resource key for usage calculation: '${resourceKey}'.`);
    }

    const remaining = limit === null ? null : Math.max(0, limit - currentUsage);
    const isExceeded = limit !== null && currentUsage >= limit;

    return {
      resourceKey,
      limit,
      currentUsage,
      remaining,
      periodStart,
      periodEnd,
      isExceeded,
    };
  },

  /**
   * 7. Enforces creation quota limit.
   * Throws QuotaExceededError if current usage >= limit.
   */
  async checkQuota(
    agencyId: string,
    resourceKey: string,
    client: PrismaClientOrTx = prisma
  ): Promise<ResourceUsageInfo> {
    const usage = await this.getResourceUsage(agencyId, resourceKey, client);

    if (usage.isExceeded) {
      throw new QuotaExceededError(
        resourceKey,
        usage.limit!,
        usage.currentUsage,
        `Creation limit of ${usage.limit} reached for ${resourceKey} in current billing period.`
      );
    }

    return usage;
  },
};
