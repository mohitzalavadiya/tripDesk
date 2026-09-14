import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Supabase Auth Verification Callback Handler (Batch 3)
 * Exchanges authorization code for session, validates user identity,
 * and atomically provisions Agency + User + Starter Trial Subscription.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // 1. Upstream Auth Failure from Supabase
  if (error) {
    console.error("Auth callback received upstream error:", error, errorDescription);
    return NextResponse.redirect(new URL("/login?error=verification_link_invalid", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_verification_code", request.url));
  }

  // 2. Exchange Authorization Code for Session
  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("Auth code exchange error:", exchangeError.message);
    return NextResponse.redirect(new URL("/verify-email?error=link_expired", request.url));
  }

  // 3. Retrieve Verified Supabase User Identity
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    console.error("Auth callback failed to retrieve verified user:", userError?.message);
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }

  // 4. Idempotency Check: Has onboarding already been completed?
  const existingUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (existingUser) {
    // Idempotent recovery: Do NOT recreate Agency/User/Subscription or reset trial dates
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?verified=true", request.url));
  }

  // 5. Read and Validate Temporary Onboarding Metadata
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
    console.error("Missing onboarding metadata for verified user:", user.id);
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=missing_onboarding_data", request.url));
  }

  // 6. Resolve Starter Subscription Plan from Catalog
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
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=plan_unavailable", request.url));
  }

  // 7. Atomic Prisma Transaction: Agency + User + Starter Subscription (7-Day Trial)
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
    });
  } catch (txError: any) {
    // Handle Prisma unique constraint race conditions (P2002)
    if (txError.code === "P2002") {
      const recheckUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      if (recheckUser) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/login?verified=true", request.url));
      }
    }

    console.error("Atomic onboarding transaction failed:", txError);
    // Preserve onboarding metadata so callback can be retried safely
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/verify-email?error=onboarding_failed", request.url));
  }

  // 8. Wipe Temporary Onboarding Metadata ONLY After Successful Database Provisioning
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
  } catch (metaErr) {
    console.warn("Could not wipe temporary metadata after onboarding:", metaErr);
  }

  // 9. Sign Out to Prevent Auto-Login and Redirect to Login with Verified Indicator
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login?verified=true", request.url));
}
