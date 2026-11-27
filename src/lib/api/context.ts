import prisma from "@/lib/prisma";
import { isDbUserSessionValid } from "@/lib/auth/session-validation";
import { createClient } from "@/lib/supabase/server";
import {
Agency,
AgencyStatus,
Subscription,
SubscriptionPlan,
SubscriptionStatus,
User,
UserRole,
} from "@prisma/client";
import "server-only";
import {
ForbiddenError,
ReadOnlyAccessError,
UnauthorizedError,
} from "./errors";

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
  isAgencyStaff: boolean;
}

export interface AgencyOwnerRequestContext extends RequestContext {
  dbUser: User & { agencyId: string };
  agency: Agency;
  agencyId: string;
}

export interface AgencyMemberRequestContext extends RequestContext {
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

    const sessionValid = await isDbUserSessionValid(dbUser, supabase, user);
    if (!sessionValid) {
      return null;
    }

    const agency = dbUser.agency || null;
    const subscription = agency?.subscriptions[0] || null;

    const isPlatformOwner = dbUser.role === UserRole.PLATFORM_OWNER && !dbUser.agencyId;
    const isAgencyOwner = dbUser.role === UserRole.AGENCY_OWNER && !!dbUser.agencyId;
    const isAgencyStaff = dbUser.role === UserRole.AGENCY_STAFF && !!dbUser.agencyId;

    // Subscription feature retired (Free SaaS): only SUSPENDED agency status restricts access
    const isSuspendedAgency = !isPlatformOwner && agency?.status === AgencyStatus.SUSPENDED;

    const subscriptionAccess: SubscriptionAccessInfo = {
      status: (isSuspendedAgency ? "EXPIRED" : "ACTIVE") as SubscriptionStatus,
      hasFullAccess: !isSuspendedAgency,
      isReadOnly: isSuspendedAgency,
      canRead: !isSuspendedAgency,
      canWrite: !isSuspendedAgency,
      trialDaysRemaining: 0,
      trialStart: null,
      trialEnd: null,
      subscriptionEnd: null,
      planName: undefined,
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
      isAgencyStaff,
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
 * Guard: Enforces read permissions on an agency workspace for any agency member (Owner or Staff).
 */
export async function requireReadAccess(): Promise<AgencyMemberRequestContext> {
  const context = await requireAgencyMemberContext();
  if (!context.subscriptionAccess.canRead) {
    throw new ForbiddenError("Access to this workspace data has been suspended.");
  }
  return context;
}

/**
 * Guard: Enforces write/mutation permissions on an agency workspace for any agency member (Owner or Staff).
 * Throws 403 ReadOnlyAccessError if agency is suspended or subscription has expired/cancelled.
 */
export async function requireWriteAccess(): Promise<AgencyMemberRequestContext> {
  const context = await requireAgencyMemberContext();
  if (context.agency.status === AgencyStatus.SUSPENDED) {
    throw new ReadOnlyAccessError(
      "Your agency workspace is currently suspended. Creating or modifying business records is restricted. Please contact Your Travel Desk support to reactivate your workspace."
    );
  }
  if (!context.subscriptionAccess.canWrite) {
    throw new ReadOnlyAccessError(
      "Your subscription or free trial has expired. Existing data is accessible in read-only mode. Renew to resume creating or modifying business records."
    );
  }
  return context;
}

/**
 * Guard: Enforces access to Platform Support Chat for Agency Members (Owner or Staff).
 * Allows authenticated Agency Members to chat with Platform Support even if trial/subscription is EXPIRED or CANCELLED.
 */
export async function requireAgencyOwnerChatAccess(): Promise<AgencyMemberRequestContext> {
  return requireAgencyMemberContext();
}

export const requireAgencyMemberChatAccess = requireAgencyOwnerChatAccess;

/**
 * Guard: Allows authenticated non-suspended Agency Members to submit subscription renewal payment requests
 * even when the agency's trial or paid subscription is EXPIRED or CANCELLED.
 * Strictly blocks SUSPENDED agencies and relies on route-level role/permission checks.
 */
export async function requireBillingRenewalAccess(): Promise<AgencyMemberRequestContext> {
  const context = await requireAgencyMemberContext();
  if (context.agency.status === AgencyStatus.SUSPENDED) {
    throw new ReadOnlyAccessError(
      "Your agency workspace is currently suspended. Subscription renewal requests are disabled. Please contact Your Travel Desk support."
    );
  }
  return context;
}

/**
 * Guard: Requires an authenticated Agency Member (Owner or Staff) with a valid agency assignment.
 * Throws 401 if not logged in, or 403 if user is not an agency owner or staff member.
 */
export async function requireAgencyMemberContext(): Promise<AgencyMemberRequestContext> {
  const context = await requireAuthenticatedUser();

  if ((!context.isAgencyOwner && !context.isAgencyStaff) || !context.agency || !context.dbUser.agencyId) {
    throw new ForbiddenError("This endpoint requires an active Agency workspace session.");
  }

  return {
    ...context,
    agency: context.agency,
    agencyId: context.dbUser.agencyId,
    dbUser: context.dbUser as User & { agencyId: string },
  };
}

/**
 * Guard: Enforces read permissions on an agency workspace for any agency member (Owner or Staff).
 */
export async function requireMemberReadAccess(): Promise<AgencyMemberRequestContext> {
  const context = await requireAgencyMemberContext();
  if (!context.subscriptionAccess.canRead) {
    throw new ForbiddenError("Access to this workspace data has been suspended.");
  }
  return context;
}

/**
 * Guard: Enforces write/mutation permissions on an agency workspace for any agency member (Owner or Staff).
 * Throws 403 ReadOnlyAccessError if agency is suspended or subscription has expired/cancelled.
 */
export async function requireMemberWriteAccess(): Promise<AgencyMemberRequestContext> {
  const context = await requireAgencyMemberContext();
  if (context.agency.status === AgencyStatus.SUSPENDED) {
    throw new ReadOnlyAccessError(
      "Your agency workspace is currently suspended. Creating or modifying business records is restricted. Please contact Your Travel Desk support to reactivate your workspace."
    );
  }
  if (!context.subscriptionAccess.canWrite) {
    throw new ReadOnlyAccessError(
      "Your subscription or free trial has expired. Existing data is accessible in read-only mode. Renew to resume creating or modifying business records."
    );
  }
  return context;
}

