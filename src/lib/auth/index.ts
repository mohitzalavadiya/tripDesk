import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { User, Agency, Subscription, SubscriptionPlan, UserRole, SubscriptionStatus } from "@prisma/client";

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

    const agency = dbUser.agency || null;
    const subscription = agency?.subscriptions[0] || null;

    const isPlatformOwner = dbUser.role === "PLATFORM_OWNER";
    const isAgencyOwner = dbUser.role === "AGENCY_OWNER" && !!dbUser.agencyId;

    // Determine subscription access
    let hasFullAccess = isPlatformOwner;
    let isReadOnly = false;
    let trialDaysRemaining = 0;

    if (subscription) {
      const now = new Date().getTime();
      if (subscription.status === "TRIAL" && subscription.trialEnd) {
        const end = new Date(subscription.trialEnd).getTime();
        trialDaysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
        hasFullAccess = trialDaysRemaining > 0;
        isReadOnly = trialDaysRemaining <= 0;
      } else if (subscription.status === "ACTIVE") {
        hasFullAccess = true;
        isReadOnly = false;
      } else {
        hasFullAccess = false;
        isReadOnly = true;
      }
    } else if (isAgencyOwner) {
      // If agency has no subscription record, default to read-only
      hasFullAccess = false;
      isReadOnly = true;
    }

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

  const sub = agency.subscriptions[0];
  if (!sub) {
    return { status: "EXPIRED" as SubscriptionStatus, hasFullAccess: false, isReadOnly: true };
  }

  const now = new Date().getTime();
  if (sub.status === "TRIAL" && sub.trialEnd) {
    const end = new Date(sub.trialEnd).getTime();
    const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    return {
      status: sub.status,
      hasFullAccess: daysLeft > 0,
      isReadOnly: daysLeft <= 0,
      daysLeft,
    };
  }

  const hasFullAccess = sub.status === "ACTIVE";
  return {
    status: sub.status,
    hasFullAccess,
    isReadOnly: !hasFullAccess,
  };
}
