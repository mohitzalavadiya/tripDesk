import prisma from "@/lib/prisma";
import { getAdminClient } from "@/lib/supabase/admin";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { destinationService } from "@/lib/services/destination-service";
import { internalNotificationService } from "@/lib/services/internal-notification-service";
import { UserNotificationType } from "@prisma/client";
import { isPlatformOwnerTargetSync } from "@/lib/auth/platform-owner-guard";

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
  supabase: SupabaseClient,
  explicitMetadata?: Record<string, any>
): Promise<OnboardingResult> {
  // 1. Verification Gate: Require confirmed email in Supabase Auth
  const isEmailConfirmed = !!(user.email_confirmed_at || (user as any).confirmed_at);
  if (!isEmailConfirmed) {
    console.error("Onboarding attempt with unconfirmed email for user:", user.id);
    return { success: false, error: "unverified_account" };
  }

  // PLATFORM OWNER HARD GUARD: Never allow a Platform Owner to be onboarded or converted into an agency
  if (isPlatformOwnerTargetSync({ userId: user.id, email: user.email })) {
    console.error("Blocked onboarding attempt for protected Platform Owner account:", user.email);
    return { success: false, error: "protected_account" };
  }

  // 2. Idempotency & Re-link Check: Has onboarding already been completed?
  // Check both by Supabase Auth user.id AND by verified user.email
  let existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        { email: user.email! },
      ],
    },
    include: {
      agency: {
        include: {
          subscriptions: true,
        },
      },
    },
  });

  if (existingUser) {
    // HARD GUARD: Never mutate or re-link a Platform Owner account
    if (
      existingUser.role === "PLATFORM_OWNER" ||
      isPlatformOwnerTargetSync({
        userId: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
      })
    ) {
      console.error("Blocked onboarding re-link for protected Platform Owner account:", existingUser.email);
      return { success: false, error: "protected_account" };
    }

    // ROLE INTEGRITY GUARD: If user has a non-owner role (e.g. AGENCY_USER staff), fail closed
    if (existingUser.role !== "AGENCY_OWNER") {
      console.error(`User ${existingUser.email} has role ${existingUser.role}; cannot onboard or re-link as AGENCY_OWNER.`);
      return { success: false, error: "account_already_registered_with_different_role" };
    }

    // If the database User has a different ID (e.g., Supabase Auth user was recreated),
    // update the database User ID to the active Supabase Auth user.id so that
    // all downstream auth queries (findUnique by authData.user.id) successfully resolve!
    if (existingUser.id !== user.id) {
      console.log(`[ONBOARDING RECOVERY] Re-linking database user ${existingUser.email} from ID ${existingUser.id} to active Supabase Auth ID ${user.id}`);
      existingUser = await prisma.user.update({
        where: { email: user.email! },
        data: {
          id: user.id,
          emailVerified: existingUser.emailVerified || new Date(),
        },
        include: {
          agency: {
            include: {
              subscriptions: true,
            },
          },
        },
      });
    }


    // Ensure the agency has a trial subscription and starter destinations if recovery is needed
    if (existingUser.agencyId) {
      if (!existingUser.agency?.subscriptions || existingUser.agency.subscriptions.length === 0) {
        let starterPlan = await prisma.subscriptionPlan.findFirst({
          where: { name: { equals: "Starter", mode: "insensitive" } },
        });
        if (!starterPlan) {
          starterPlan = await prisma.subscriptionPlan.findFirst({
            where: { isActive: true },
            orderBy: { price: "asc" },
          });
        }
        if (starterPlan) {
          const now = new Date();
          const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          await prisma.subscription.create({
            data: {
              agencyId: existingUser.agencyId,
              planId: starterPlan.id,
              status: "TRIAL",
              billingCycle: "MONTHLY",
              trialStart: now,
              trialEnd: trialEnd,
            },
          });
        }
      }

      // Ensure starter destinations are seeded idempotently
      await destinationService.seedStarterDestinations(existingUser.agencyId);

      return { success: true, alreadyOnboarded: true };
    }
  }

  // 3. Read and Validate Temporary Onboarding Metadata
  const metadata = {
    ...(user.user_metadata || {}),
    ...(explicitMetadata || {}),
  };
  const agencyName = metadata.agencyName?.trim();
  const agencyPhone = metadata.agencyPhone?.trim();
  const agencyEmail = metadata.agencyEmail?.trim();
  const address = metadata.address?.trim() || null;
  const city = metadata.city?.trim();
  const ownerName = metadata.ownerName?.trim() || existingUser?.name;
  const phone = metadata.phone?.trim() || existingUser?.phone || null;

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
      // Concurrency protection: Double check inside transaction by ID or Email
      const existingInTx = await tx.user.findFirst({
        where: {
          OR: [{ id: user.id }, { email: user.email! }],
        },
      });

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

      // B. Create or Update User
      if (existingInTx) {
        if (
          existingInTx.role === "PLATFORM_OWNER" ||
          isPlatformOwnerTargetSync({
            userId: existingInTx.id,
            email: existingInTx.email,
            role: existingInTx.role,
          })
        ) {
          throw new Error("Cannot mutate Platform Owner account in onboarding transaction");
        }
        if (existingInTx.role !== "AGENCY_OWNER") {
          throw new Error("Cannot reassign account with different role");
        }
        await tx.user.update({
          where: { email: user.email! },
          data: {
            id: user.id,
            agencyId: agency.id,
            name: ownerName,
            phone: phone,
            role: "AGENCY_OWNER",
            emailVerified: now,
          },
        });
      } else {
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
      }

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
      const recheckUser = await prisma.user.findFirst({
        where: {
          OR: [{ id: user.id }, { email: user.email! }],
        },
      });
      if (recheckUser) {
        if (recheckUser.id !== user.id) {
          await prisma.user.update({
            where: { email: user.email! },
            data: { id: user.id },
          });
        }
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
