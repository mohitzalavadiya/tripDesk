"use client";

import { useAuth } from "@/context/auth-context";
import * as React from "react";

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
  unlimited?: boolean;
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

export interface SubscriptionOverviewStub {
  subscription?: {
    plan?: { name?: string };
  };
  agency?: {
    customLogoUrl?: string | null;
    logo?: string | null;
  };
  logo?: {
    customLogoUrl?: string | null;
    logo?: string | null;
  };
  usage?: Record<string, { currentUsage?: number; limit?: number | null }>;
}

export interface SubscriptionContextType {
  overview: SubscriptionOverviewStub | null;
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

const fullEntitlements: EntitlementsState = {
  CUSTOM_AGENCY_LOGO: true,
  FEEDBACK_REVIEWS: true,
  CUSTOMER_INSIGHTS: true,
  REPORTS_ANALYTICS: true,
};

const defaultUsage: UsageState = {
  TRIPS: null,
  QUOTATIONS: null,
  BOOKINGS: null,
};

const SubscriptionContext = React.createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { subscriptionAccess, isLoading: authLoading } = useAuth();

  const refreshSubscription = React.useCallback(async () => {
    // Subscription feature retired (Free SaaS)
  }, []);

  const entitlements: EntitlementsState = fullEntitlements;
  const usage: UsageState = defaultUsage;

  const isFeatureAllowed = React.useCallback(
    (_featureKey: keyof EntitlementsState) => true,
    []
  );

  // Only SUSPENDED agency status triggers read-only mode (account security, not subscription)
  const isReadOnly = Boolean(subscriptionAccess?.isReadOnly);
  const readOnlyReason: ReadOnlyReason = isReadOnly ? "SUSPENDED" : null;

  const canCreate = React.useCallback(
    (_resourceKey: "TRIPS" | "QUOTATIONS" | "BOOKINGS"): QuotaDecision => {
      if (isReadOnly) {
        return {
          allowed: false,
          reason: "READ_ONLY_SUBSCRIPTION",
          currentUsage: 0,
          limit: null,
          remaining: null,
          isExceeded: false,
          loading: authLoading,
        };
      }
      return {
        allowed: true,
        currentUsage: 0,
        limit: null,
        remaining: null,
        isExceeded: false,
        loading: authLoading,
      };
    },
    [isReadOnly, authLoading]
  );

  const incrementUsage = React.useCallback((_resourceKey: "TRIPS" | "QUOTATIONS" | "BOOKINGS") => {
    // No-op: quotas retired
  }, []);

  const value = React.useMemo(
    () => ({
      overview: null,
      entitlements,
      usage,
      loading: authLoading,
      error: null,
      isReadOnly,
      readOnlyReason,
      canWrite: !isReadOnly,
      refreshSubscription,
      isFeatureAllowed,
      canCreate,
      incrementUsage,
    }),
    [entitlements, usage, authLoading, isReadOnly, readOnlyReason, refreshSubscription, isFeatureAllowed, canCreate, incrementUsage]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextType {
  const context = React.useContext(SubscriptionContext);
  if (!context) {
    // Graceful fallback for non-dashboard wrappers (Free SaaS: no subscription gate)
    return {
      overview: null,
      entitlements: fullEntitlements,
      usage: defaultUsage,
      loading: false,
      error: null,
      isReadOnly: false,
      readOnlyReason: null,
      canWrite: true,
      refreshSubscription: async () => {},
      isFeatureAllowed: () => true,
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
