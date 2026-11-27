import { AgencyStatus, SubscriptionStatus } from "@prisma/client";

export type EffectiveSubscriptionDiagnosticReason =
  | "PLATFORM_OWNER"
  | "AGENCY_SUSPENDED"
  | "MISSING_SUBSCRIPTION"
  | "INVALID_OR_MISSING_TRIAL_END"
  | "TRIAL_ENDED"
  | "INVALID_OR_MISSING_SUBSCRIPTION_END"
  | "SUBSCRIPTION_ENDED"
  | "SUBSCRIPTION_INACTIVE"
  | null;

export interface SubscriptionStateInput {
  agencyStatus?: AgencyStatus | string | null;
  subscription?: {
    status: SubscriptionStatus | string;
    trialStart?: Date | string | null;
    trialEnd?: Date | string | null;
    subscriptionStart?: Date | string | null;
    subscriptionEnd?: Date | string | null;
    createdAt?: Date | string | null;
    plan?: { name?: string | null } | null;
  } | null;
  isPlatformOwner?: boolean;
}

export interface EffectiveSubscriptionState {
  storedStatus: SubscriptionStatus | null;
  effectiveStatus: SubscriptionStatus;
  canRead: boolean;
  canWrite: boolean;
  hasFullAccess: boolean;
  isReadOnly: boolean;
  isSuspended: boolean;
  isTrial: boolean;
  isTrialExpired: boolean;
  isSubscriptionExpired: boolean;
  isExpired: boolean;
  daysRemaining: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  diagnosticReason: EffectiveSubscriptionDiagnosticReason;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function parseValidDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Authoritative, deterministic subscription-state evaluator.
 * Uses exact UTC millisecond timestamps and fails closed on missing or invalid dates.
 * Does not introduce any undocumented grace period.
 */
export function evaluateEffectiveSubscriptionState(
  input: SubscriptionStateInput,
  now: Date = new Date()
): EffectiveSubscriptionState {
  const nowMs = now.getTime();

  if (input.isPlatformOwner) {
    return {
      storedStatus: null,
      effectiveStatus: SubscriptionStatus.ACTIVE,
      canRead: true,
      canWrite: true,
      hasFullAccess: true,
      isReadOnly: false,
      isSuspended: false,
      isTrial: false,
      isTrialExpired: false,
      isSubscriptionExpired: false,
      isExpired: false,
      daysRemaining: 0,
      periodStart: null,
      periodEnd: null,
      diagnosticReason: "PLATFORM_OWNER",
    };
  }

  const isSuspended = input.agencyStatus === AgencyStatus.SUSPENDED;
  const sub = input.subscription;

  if (!sub) {
    return {
      storedStatus: null,
      effectiveStatus: SubscriptionStatus.EXPIRED,
      canRead: true,
      canWrite: false,
      hasFullAccess: false,
      isReadOnly: true,
      isSuspended,
      isTrial: false,
      isTrialExpired: false,
      isSubscriptionExpired: false,
      isExpired: true,
      daysRemaining: 0,
      periodStart: null,
      periodEnd: null,
      diagnosticReason: isSuspended ? "AGENCY_SUSPENDED" : "MISSING_SUBSCRIPTION",
    };
  }

  const storedStatus = sub.status as SubscriptionStatus;

  if (sub.status === SubscriptionStatus.TRIAL) {
    const periodStart = parseValidDate(sub.trialStart) || parseValidDate(sub.createdAt);
    const trialEnd = parseValidDate(sub.trialEnd);

    if (!trialEnd) {
      return {
        storedStatus,
        effectiveStatus: SubscriptionStatus.EXPIRED,
        canRead: true,
        canWrite: false,
        hasFullAccess: false,
        isReadOnly: true,
        isSuspended,
        isTrial: true,
        isTrialExpired: true,
        isSubscriptionExpired: false,
        isExpired: true,
        daysRemaining: 0,
        periodStart,
        periodEnd: null,
        diagnosticReason: isSuspended ? "AGENCY_SUSPENDED" : "INVALID_OR_MISSING_TRIAL_END",
      };
    }

    const diffMs = trialEnd.getTime() - nowMs;
    if (diffMs <= 0) {
      return {
        storedStatus,
        effectiveStatus: SubscriptionStatus.EXPIRED,
        canRead: true,
        canWrite: false,
        hasFullAccess: false,
        isReadOnly: true,
        isSuspended,
        isTrial: true,
        isTrialExpired: true,
        isSubscriptionExpired: false,
        isExpired: true,
        daysRemaining: 0,
        periodStart,
        periodEnd: trialEnd,
        diagnosticReason: isSuspended ? "AGENCY_SUSPENDED" : "TRIAL_ENDED",
      };
    }

    const daysRemaining = Math.max(1, Math.ceil(diffMs / MS_PER_DAY));
    return {
      storedStatus,
      effectiveStatus: SubscriptionStatus.TRIAL,
      canRead: true,
      canWrite: !isSuspended,
      hasFullAccess: !isSuspended,
      isReadOnly: isSuspended,
      isSuspended,
      isTrial: true,
      isTrialExpired: false,
      isSubscriptionExpired: false,
      isExpired: false,
      daysRemaining,
      periodStart,
      periodEnd: trialEnd,
      diagnosticReason: isSuspended ? "AGENCY_SUSPENDED" : null,
    };
  }

  if (sub.status === SubscriptionStatus.ACTIVE) {
    const periodStart = parseValidDate(sub.subscriptionStart) || parseValidDate(sub.createdAt);
    const subscriptionEnd = parseValidDate(sub.subscriptionEnd);

    if (!subscriptionEnd) {
      return {
        storedStatus,
        effectiveStatus: SubscriptionStatus.EXPIRED,
        canRead: true,
        canWrite: false,
        hasFullAccess: false,
        isReadOnly: true,
        isSuspended,
        isTrial: false,
        isTrialExpired: false,
        isSubscriptionExpired: true,
        isExpired: true,
        daysRemaining: 0,
        periodStart,
        periodEnd: null,
        diagnosticReason: isSuspended ? "AGENCY_SUSPENDED" : "INVALID_OR_MISSING_SUBSCRIPTION_END",
      };
    }

    const diffMs = subscriptionEnd.getTime() - nowMs;
    if (diffMs <= 0) {
      return {
        storedStatus,
        effectiveStatus: SubscriptionStatus.EXPIRED,
        canRead: true,
        canWrite: false,
        hasFullAccess: false,
        isReadOnly: true,
        isSuspended,
        isTrial: false,
        isTrialExpired: false,
        isSubscriptionExpired: true,
        isExpired: true,
        daysRemaining: 0,
        periodStart,
        periodEnd: subscriptionEnd,
        diagnosticReason: isSuspended ? "AGENCY_SUSPENDED" : "SUBSCRIPTION_ENDED",
      };
    }

    const daysRemaining = Math.max(1, Math.ceil(diffMs / MS_PER_DAY));
    return {
      storedStatus,
      effectiveStatus: SubscriptionStatus.ACTIVE,
      canRead: true,
      canWrite: !isSuspended,
      hasFullAccess: !isSuspended,
      isReadOnly: isSuspended,
      isSuspended,
      isTrial: false,
      isTrialExpired: false,
      isSubscriptionExpired: false,
      isExpired: false,
      daysRemaining,
      periodStart,
      periodEnd: subscriptionEnd,
      diagnosticReason: isSuspended ? "AGENCY_SUSPENDED" : null,
    };
  }

  const effectiveStatus =
    sub.status === SubscriptionStatus.CANCELLED
      ? SubscriptionStatus.CANCELLED
      : SubscriptionStatus.EXPIRED;

  return {
    storedStatus,
    effectiveStatus,
    canRead: true,
    canWrite: false,
    hasFullAccess: false,
    isReadOnly: true,
    isSuspended,
    isTrial: false,
    isTrialExpired: false,
    isSubscriptionExpired: effectiveStatus === SubscriptionStatus.EXPIRED,
    isExpired: true,
    daysRemaining: 0,
    periodStart: parseValidDate(sub.subscriptionStart) || parseValidDate(sub.createdAt),
    periodEnd: parseValidDate(sub.subscriptionEnd),
    diagnosticReason: isSuspended ? "AGENCY_SUSPENDED" : "SUBSCRIPTION_INACTIVE",
  };
}
