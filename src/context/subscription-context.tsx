"use client";

import * as React from "react";
import { subscriptionClient } from "@/lib/api-client/subscription-client";

export interface EntitlementsState {
  CUSTOM_AGENCY_LOGO: boolean;
  FEEDBACK_REVIEWS: boolean;
  CUSTOMER_INSIGHTS: boolean;
  REPORTS_ANALYTICS: boolean;
}

export interface EntitlementUsageItem {
  resourceKey: string;
  limit: number | null;
  currentUsage: number;
  remaining: number | null;
  periodStart: string;
  periodEnd: string;
  isExceeded: boolean;
}

export interface UsageState {
  TRIPS: EntitlementUsageItem | null;
  QUOTATIONS: EntitlementUsageItem | null;
  BOOKINGS: EntitlementUsageItem | null;
}

export type ReadOnlyReason = "SUSPENDED" | "EXPIRED" | "CANCELLED" | "PAST_DUE" | "UNPAID" | null;

export interface QuotaDecision {
  allowed: boolean;
  reason?: "QUOTA_EXCEEDED" | "READ_ONLY_SUBSCRIPTION";
  currentUsage: number;
  limit: number | null;
  remaining: number | null;
  isExceeded: boolean;
  loading: boolean;
}

export interface SubscriptionContextType {
  overview: any | null;
  entitlements: EntitlementsState;
  usage: UsageState;
  loading: boolean;
  error: string | null;
  isReadOnly: boolean;
  readOnlyReason: ReadOnlyReason;
  canWrite: boolean;
  refreshSubscription: () => Promise<void>;
  isFeatureAllowed: (featureKey: keyof EntitlementsState) => boolean;
  canCreate: (resourceKey: "TRIPS" | "QUOTATIONS" | "BOOKINGS") => QuotaDecision;
  incrementUsage: (resourceKey: "TRIPS" | "QUOTATIONS" | "BOOKINGS") => void;
}

const defaultEntitlements: EntitlementsState = {
  CUSTOM_AGENCY_LOGO: false,
  FEEDBACK_REVIEWS: false,
  CUSTOMER_INSIGHTS: false,
  REPORTS_ANALYTICS: false,
};

const defaultUsage: UsageState = {
  TRIPS: null,
  QUOTATIONS: null,
  BOOKINGS: null,
};

const SubscriptionContext = React.createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [overview, setOverview] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchSubscription = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await subscriptionClient.getSubscription();
      if (res.success && res.data) {
        setOverview(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Throttled window focus revalidation (5-minute cooldown) to capture multi-tab or dynamic admin changes
  React.useEffect(() => {
    let lastFetchTime = Date.now();
    const handleFocus = () => {
      if (Date.now() - lastFetchTime > 5 * 60 * 1000) {
        lastFetchTime = Date.now();
        fetchSubscription();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchSubscription]);

  const entitlements: EntitlementsState = React.useMemo(() => {
    if (!overview) {
      return defaultEntitlements;
    }

    // Direct entitlement payload from /api/subscription overview
    if (overview.entitlements) {
      return {
        CUSTOM_AGENCY_LOGO: !!overview.entitlements.CUSTOM_AGENCY_LOGO,
        FEEDBACK_REVIEWS: !!overview.entitlements.FEEDBACK_REVIEWS,
        CUSTOMER_INSIGHTS: !!overview.entitlements.CUSTOMER_INSIGHTS,
        REPORTS_ANALYTICS: !!overview.entitlements.REPORTS_ANALYTICS,
      };
    }

    // Fallback to legacy features structure if present
    if (overview.features) {
      return {
        CUSTOM_AGENCY_LOGO: !!overview.features.CUSTOM_AGENCY_LOGO?.allowed,
        FEEDBACK_REVIEWS: !!overview.features.FEEDBACK_REVIEWS?.allowed,
        CUSTOMER_INSIGHTS: !!overview.features.CUSTOMER_INSIGHTS?.allowed,
        REPORTS_ANALYTICS: !!overview.features.REPORTS_ANALYTICS?.allowed,
      };
    }

    return defaultEntitlements;
  }, [overview]);

  const usage: UsageState = React.useMemo(() => {
    if (!overview?.usage) return defaultUsage;
    return {
      TRIPS: overview.usage.TRIPS || null,
      QUOTATIONS: overview.usage.QUOTATIONS || null,
      BOOKINGS: overview.usage.BOOKINGS || null,
    };
  }, [overview]);

  const isFeatureAllowed = React.useCallback(
    (featureKey: keyof EntitlementsState) => {
      return !!entitlements[featureKey];
    },
    [entitlements]
  );

  const { isReadOnly, readOnlyReason } = React.useMemo(() => {
    if (loading || !overview) {
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
  }, [loading, overview]);

  const canCreate = React.useCallback(
    (resourceKey: "TRIPS" | "QUOTATIONS" | "BOOKINGS"): QuotaDecision => {
      if (loading) {
        return {
          allowed: true,
          currentUsage: 0,
          limit: null,
          remaining: null,
          isExceeded: false,
          loading: true,
        };
      }

      if (isReadOnly) {
        return {
          allowed: false,
          reason: "READ_ONLY_SUBSCRIPTION",
          currentUsage: usage[resourceKey]?.currentUsage ?? 0,
          limit: usage[resourceKey]?.limit ?? null,
          remaining: usage[resourceKey]?.remaining ?? null,
          isExceeded: false,
          loading: false,
        };
      }

      const sub = overview?.subscription;

      const item = usage[resourceKey];
      if (!item) {
        if (sub?.plan?.code === "PROFESSIONAL" || sub?.status === "TRIALING" || sub?.status === "TRIAL") {
          return {
            allowed: true,
            currentUsage: 0,
            limit: null,
            remaining: null,
            isExceeded: false,
            loading: false,
          };
        }
        return {
          allowed: true,
          currentUsage: 0,
          limit: null,
          remaining: null,
          isExceeded: false,
          loading: false,
        };
      }

      if (item.limit === null) {
        return {
          allowed: true,
          currentUsage: item.currentUsage,
          limit: null,
          remaining: null,
          isExceeded: false,
          loading: false,
        };
      }

      const isLimitReached = item.isExceeded || item.currentUsage >= item.limit;
      if (isLimitReached) {
        return {
          allowed: false,
          reason: "QUOTA_EXCEEDED",
          currentUsage: item.currentUsage,
          limit: item.limit,
          remaining: item.remaining ?? 0,
          isExceeded: true,
          loading: false,
        };
      }

      return {
        allowed: true,
        currentUsage: item.currentUsage,
        limit: item.limit,
        remaining: item.remaining,
        isExceeded: false,
        loading: false,
      };
    },
    [isReadOnly, loading, overview, usage]
  );

  const incrementUsage = React.useCallback(
    (resourceKey: "TRIPS" | "QUOTATIONS" | "BOOKINGS") => {
      setOverview((prev: any) => {
        if (!prev || !prev.usage || !prev.usage[resourceKey]) return prev;

        const currentItem = prev.usage[resourceKey];
        const newUsage = (currentItem.currentUsage || 0) + 1;
        const limit = currentItem.limit;
        const remaining = limit !== null ? Math.max(0, limit - newUsage) : null;
        const isExceeded = limit !== null && newUsage >= limit;

        return {
          ...prev,
          usage: {
            ...prev.usage,
            [resourceKey]: {
              ...currentItem,
              currentUsage: newUsage,
              remaining,
              isExceeded,
            },
          },
        };
      });
    },
    []
  );

  return (
    <SubscriptionContext.Provider
      value={{
        overview,
        entitlements,
        usage,
        loading,
        error,
        isReadOnly,
        readOnlyReason,
        canWrite: !isReadOnly,
        refreshSubscription: fetchSubscription,
        isFeatureAllowed,
        canCreate,
        incrementUsage,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const context = React.useContext(SubscriptionContext);
  if (!context) {
    // Graceful fallback for non-dashboard wrappers
    return {
      overview: null,
      entitlements: defaultEntitlements,
      usage: defaultUsage,
      loading: false,
      error: null,
      isReadOnly: false,
      readOnlyReason: null,
      canWrite: true,
      refreshSubscription: async () => {},
      isFeatureAllowed: () => false,
      canCreate: (_resourceKey: "TRIPS" | "QUOTATIONS" | "BOOKINGS"): QuotaDecision => ({
        allowed: true,
        currentUsage: 0,
        limit: null,
        remaining: null,
        isExceeded: false,
        loading: false,
      }),
      incrementUsage: () => {},
    };
  }
  return context;
}
