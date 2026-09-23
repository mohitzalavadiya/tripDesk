import prisma from "@/lib/prisma";
import { getAdminClient } from "@/lib/supabase/admin";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { destinationService } from "@/lib/services/destination-service";
import { internalNotificationService } from "@/lib/services/internal-notification-service";
import { UserNotificationType } from "@prisma/client";

export interface OnboardingResult {
  success: boolean;
  alreadyOnboarded?: boolean;
  error?: string;
}

/**
 * Reusable Atomic Onboarding Service for Verified Agency Owners.
 * Provisions Agency + User + Starter Subscription (7-Day Trial) in an atomic transaction,
 * guarantees idempotency, handles concurrency/race conditions (P2002), and clears staging metadata.
 */
export async function provisionOnboardedAgencyOwner(
  user: User,
  supabase: SupabaseClient
): Promise<OnboardingResult> {
  // 1. Verification Gate: Email must be confirmed in Supabase Auth
  const isEmailConfirmed = !!(user.email_confirmed_at || (user as any).confirmed_at);
  if (!isEmailConfirmed) {
    console.error("Onboarding attempt with unconfirmed email for user:", user.id);
    return { success: false, error: "unverified_account" };
  }

  // 2. Idempotency Check: Has onboarding already been completed?
  const existingUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (existingUser) {
    return { success: true, alreadyOnboarded: true };
  }

  // 3. Read and Validate Temporary Onboarding Metadata
  const metadata = user.user_metadata || {};
  const agencyName = metadata.agencyName?.trim();
  const agencyPhone = metadata.agencyPhone?.trim();
  const agencyEmail = metadata.agencyEmail?.trim();
  const address = metadata.address?.trim() || null;
  const city = metadata.city?.trim();
  const state = metadata.state?.trim() || null;
  const country = metadata.country?.trim() || "India";
  const ownerName = metadata.ownerName?.trim();
  const phone = metadata.phone?.trim() || null;

  if (!agencyName || !agencyPhone || !agencyEmail || !city || !ownerName) {
    console.error("Missing required onboarding metadata for verified user:", user.id);
    return { success: false, error: "missing_onboarding_data" };
  }

  // 4. Resolve Starter Subscription Plan from Catalog
  let starterPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: { equals: "Starter", mode: "insensitive" } },
  });

  if (!starterPlan) {
    starterPlan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });
  }

  if (!starterPlan) {
    console.error("No active Starter SubscriptionPlan found in catalog.");
    return { success: false, error: "plan_unavailable" };
  }

  // 5. Atomic Prisma Transaction: Agency + User + Starter Subscription (7-Day Trial)
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    await prisma.$transaction(async (tx) => {
      // Concurrency protection: Double check inside transaction
      const existingInTx = await tx.user.findUnique({
        where: { id: user.id },
      });
      if (existingInTx) {
        return;
      }

      // A. Create Agency
      const agency = await tx.agency.create({
        data: {
          name: agencyName,
          phone: agencyPhone,
          email: agencyEmail,
          address: address,
          status: "ACTIVE",
        },
      });

      // B. Create User
      await tx.user.create({
        data: {
          id: user.id,
          agencyId: agency.id,
          name: ownerName,
          email: user.email!,
          phone: phone,
          role: "AGENCY_OWNER",
          emailVerified: now,
        },
      });

      // C. Create Starter Trial Subscription
      await tx.subscription.create({
        data: {
          agencyId: agency.id,
          planId: starterPlan.id,
          status: "TRIAL",
          billingCycle: "MONTHLY",
          trialStart: now,
          trialEnd: trialEnd,
        },
      });

      // D. Seed 32 Starter Destinations for Agency
      await destinationService.seedStarterDestinations(agency.id, tx);
    });
  } catch (txError: any) {
    // Handle Prisma unique constraint race conditions (P2002)
    if (txError.code === "P2002") {
      const recheckUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      if (recheckUser) {
        return { success: true, alreadyOnboarded: true };
      }
    }

    console.error("Atomic onboarding transaction failed:", txError);
    return { success: false, error: "onboarding_failed" };
  }

  // 6. Wipe Temporary Onboarding Metadata ONLY After Successful Database Provisioning
  try {
    const adminClient = getAdminClient();
    if (adminClient) {
      await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: {},
      });
    } else {
      await supabase.auth.updateUser({
        data: {
          agencyName: null,
          agencyPhone: null,
          agencyEmail: null,
          address: null,
          city: null,
          state: null,
          country: null,
          ownerName: null,
          phone: null,
        },
      });
    }
  } catch (cleanErr) {
    console.warn("Failed to wipe onboarding staging metadata (non-fatal):", cleanErr);
  }

  // 7. Internal Notification Trigger for Platform Owner
  try {
    internalNotificationService.notifyPlatformOwners({
      type: UserNotificationType.AGENCY_SIGNUP,
      title: "New agency registered",
      message: `${agencyName} has registered and started a 7-day trial.`,
      linkUrl: `/admin/agencies`,
      idempotencyKeyPrefix: `agency-signup-${user.id}`,
      metadata: {
        agencyName,
        agencyEmail,
        ownerName,
      },
    }).catch((err) => {
      console.warn("[AGENCY_SIGNUP notification non-blocking warning]", err);
    });
  } catch {
    // Non-blocking notification
  }

  return { success: true, alreadyOnboarded: false };
}
