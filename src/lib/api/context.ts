import "server-only";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import {
  UnauthorizedError,
  ForbiddenError,
  ReadOnlyAccessError,
} from "./errors";
import {
  User,
  Agency,
  Subscription,
  SubscriptionPlan,
  UserRole,
  SubscriptionStatus,
} from "@prisma/client";

export interface SubscriptionAccessInfo {
  status: SubscriptionStatus;
  hasFullAccess: boolean;
  isReadOnly: boolean;
  canRead: boolean;
  canWrite: boolean;
  trialDaysRemaining: number;
  trialStart?: Date | null;
  trialEnd?: Date | null;
  subscriptionEnd?: Date | null;
  planName?: string;
}

export interface RequestContext {
  supabaseUser: {
    id: string;
    email?: string;
  };
  dbUser: User;
  agency: Agency | null;
  subscription: (Subscription & { plan: SubscriptionPlan }) | null;
  subscriptionAccess: SubscriptionAccessInfo;
  isPlatformOwner: boolean;
  isAgencyOwner: boolean;
}

export interface AgencyOwnerRequestContext extends RequestContext {
  dbUser: User & { agencyId: string };
  agency: Agency;
  agencyId: string;
}

export interface PlatformOwnerRequestContext extends RequestContext {
  isPlatformOwner: true;
  agencyId: null;
}

/**
 * Resolves the trusted server-side authentication context from the Supabase session
 * and PostgreSQL database. Never trusts client-supplied headers, body, or URL params for identity.
 */
export async function getRequestContext(): Promise<RequestContext | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Retrieve database user with agency and latest subscription
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        agency: {
          include: {
            subscriptions: {
              where: {
                status: {
                  in: ["TRIAL", "ACTIVE", "EXPIRED", "CANCELLED"],
                },
              },
              include: {
                plan: true,
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!dbUser) {
      return null;
    }

    const agency = dbUser.agency || null;
    const subscription = agency?.subscriptions[0] || null;

    const isPlatformOwner = dbUser.role === UserRole.PLATFORM_OWNER;
    const isAgencyOwner = dbUser.role === UserRole.AGENCY_OWNER && !!dbUser.agencyId;

    // Calculate subscription access
    let status: SubscriptionStatus = SubscriptionStatus.TRIAL;
    let canWrite = isPlatformOwner;
    let canRead = true;
    let trialDaysRemaining = 0;

    if (subscription) {
      status = subscription.status;
      const now = Date.now();

      if (subscription.status === SubscriptionStatus.TRIAL && subscription.trialEnd) {
        const end = new Date(subscription.trialEnd).getTime();
        trialDaysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
        canWrite = trialDaysRemaining > 0;
      } else if (subscription.status === SubscriptionStatus.ACTIVE) {
        canWrite = true;
      } else {
        canWrite = false;
      }
    } else if (isAgencyOwner) {
      status = SubscriptionStatus.EXPIRED;
      canWrite = false;
    }

    const subscriptionAccess: SubscriptionAccessInfo = {
      status,
      hasFullAccess: canWrite,
      isReadOnly: !canWrite,
      canRead,
      canWrite,
      trialDaysRemaining,
      trialStart: subscription?.trialStart,
      trialEnd: subscription?.trialEnd,
      subscriptionEnd: subscription?.subscriptionEnd,
      planName: subscription?.plan.name,
    };

    return {
      supabaseUser: {
        id: user.id,
        email: user.email,
      },
      dbUser,
      agency,
      subscription,
      subscriptionAccess,
      isPlatformOwner,
      isAgencyOwner,
    };
  } catch (err) {
    console.error("Error evaluating request context:", err);
    return null;
  }
}

/**
 * Guard: Requires any authenticated user (Agency Owner or Platform Owner).
 * Throws 401 UnauthorizedError if unauthenticated.
 */
export async function requireAuthenticatedUser(): Promise<RequestContext> {
  const context = await getRequestContext();
  if (!context) {
    throw new UnauthorizedError("You must be logged in to perform this request.");
  }
  return context;
}

/**
 * Guard: Requires an authenticated Agency Owner with a valid agency assignment.
 * Throws 401 if not logged in, or 403 if user is not an agency owner.
 */
export async function requireAgencyOwnerContext(): Promise<AgencyOwnerRequestContext> {
  const context = await requireAuthenticatedUser();

  if (!context.isAgencyOwner || !context.agency || !context.dbUser.agencyId) {
    throw new ForbiddenError("This endpoint requires an active Agency Owner workspace session.");
  }

  return {
    ...context,
    agency: context.agency,
    agencyId: context.dbUser.agencyId,
    dbUser: context.dbUser as User & { agencyId: string },
  };
}

/**
 * Guard: Requires the single Platform Owner.
 * Throws 401 if not logged in, or 403 if user is an agency owner.
 */
export async function requirePlatformOwnerContext(): Promise<PlatformOwnerRequestContext> {
  const context = await requireAuthenticatedUser();

  if (!context.isPlatformOwner) {
    throw new ForbiddenError("Platform administrator privileges are required for this action.");
  }

  return {
    ...context,
    isPlatformOwner: true,
    agencyId: null,
  };
}

/**
 * Guard: Enforces read permissions on an agency workspace.
 */
export async function requireReadAccess(): Promise<AgencyOwnerRequestContext> {
  const context = await requireAgencyOwnerContext();
  if (!context.subscriptionAccess.canRead) {
    throw new ForbiddenError("Access to this workspace data has been suspended.");
  }
  return context;
}

/**
 * Guard: Enforces write/mutation permissions on an agency workspace.
 * Throws 403 ReadOnlyAccessError if subscription has expired or cancelled.
 */
export async function requireWriteAccess(): Promise<AgencyOwnerRequestContext> {
  const context = await requireAgencyOwnerContext();
  if (!context.subscriptionAccess.canWrite) {
    throw new ReadOnlyAccessError(
      "Your subscription or free trial has expired. Existing data is accessible in read-only mode. Renew to resume creating or modifying business records."
    );
  }
  return context;
}
