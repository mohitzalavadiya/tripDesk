import prisma from "@/lib/prisma";
import { isDbUserSessionValid } from "@/lib/auth/session-validation";
import { evaluateEffectiveSubscriptionState } from "@/lib/auth/subscription-state";
import { createClient } from "@/lib/supabase/server";
import { Agency,Subscription,SubscriptionPlan,SubscriptionStatus,User } from "@prisma/client";
import { redirect } from "next/navigation";

export interface AuthenticatedContext {
  supabaseUser: {
    id: string;
    email?: string;
  };
  dbUser: User;
  agency: Agency | null;
  subscription: (Subscription & { plan: SubscriptionPlan }) | null;
  isPlatformOwner: boolean;
  isAgencyOwner: boolean;
  isAgencyStaff: boolean;
  hasFullAccess: boolean;
  isReadOnly: boolean;
  trialDaysRemaining: number;
}

/**
 * Retrieves the currently authenticated Supabase session and associated TripDesk DB User + Agency + Subscription.
 */
export async function getCurrentUser(): Promise<AuthenticatedContext | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Find TripDesk DB User matching Supabase Auth UUID
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

    const isPlatformOwner = dbUser.role === "PLATFORM_OWNER" && !dbUser.agencyId;
    const isAgencyOwner = dbUser.role === "AGENCY_OWNER" && !!dbUser.agencyId;
    const isAgencyStaff = dbUser.role === "AGENCY_STAFF" && !!dbUser.agencyId;

    // Determine authoritative effective subscription access
    const evalState = evaluateEffectiveSubscriptionState({
      agencyStatus: agency?.status,
      subscription,
      isPlatformOwner,
    });
    const hasFullAccess = evalState.hasFullAccess;
    const isReadOnly = evalState.isReadOnly;
    const trialDaysRemaining = evalState.daysRemaining;

    return {
      supabaseUser: {
        id: user.id,
        email: user.email,
      },
      dbUser,
      agency,
      subscription,
      isPlatformOwner,
      isAgencyOwner,
      isAgencyStaff,
      hasFullAccess,
      isReadOnly,
      trialDaysRemaining,
    };
  } catch (err) {
    console.error("Error in getCurrentUser:", err);
    return null;
  }
}

/**
 * Server-side guard: Ensures the user is logged in.
 */
export async function requireAuth(): Promise<AuthenticatedContext> {
  const auth = await getCurrentUser();
  if (!auth) {
    redirect("/login");
  }
  return auth;
}

/**
 * Server-side guard: Ensures the user is the PLATFORM_OWNER.
 * Redirects unauthenticated users to /login and agency users to /dashboard.
 */
export async function requirePlatformOwner(): Promise<AuthenticatedContext> {
  const auth = await getCurrentUser();
  if (!auth) {
    redirect("/login");
  }
  if (!auth.isPlatformOwner) {
    redirect("/dashboard");
  }
  return auth;
}

/**
 * Server-side guard: Ensures the user is an AGENCY_OWNER with a valid agency.
 * Redirects unauthenticated users to /login and PLATFORM_OWNER to /admin.
 */
export async function requireAgencyOwner(): Promise<AuthenticatedContext> {
  const auth = await getCurrentUser();
  if (!auth) {
    redirect("/login");
  }
  if (auth.isPlatformOwner) {
    redirect("/admin");
  }
  if (!auth.isAgencyOwner || !auth.agency) {
    redirect("/login");
  }
  return auth;
}

/**
 * Server-side guard: Ensures the user is an AGENCY_OWNER or AGENCY_STAFF with a valid agency.
 * Redirects unauthenticated users to /login and PLATFORM_OWNER to /admin.
 */
export async function requireAgencyMember(): Promise<AuthenticatedContext> {
  const auth = await getCurrentUser();
  if (!auth) {
    redirect("/login");
  }
  if (auth.isPlatformOwner) {
    redirect("/admin");
  }
  if ((!auth.isAgencyOwner && !auth.isAgencyStaff) || !auth.agency) {
    redirect("/login");
  }
  return auth;
}

/**
 * Helper to compute subscription access rules for an agency.
 */
export async function getSubscriptionAccess(agencyId: string) {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    include: {
      subscriptions: {
        include: {
          plan: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!agency) {
    return { status: "EXPIRED" as SubscriptionStatus, hasFullAccess: false, isReadOnly: true };
  }

  const sub = agency.subscriptions[0] || null;
  const evalState = evaluateEffectiveSubscriptionState({
    agencyStatus: agency.status,
    subscription: sub,
  });

  return {
    status: evalState.effectiveStatus,
    hasFullAccess: evalState.hasFullAccess,
    isReadOnly: evalState.isReadOnly,
    daysLeft: evalState.daysRemaining,
  };
}
