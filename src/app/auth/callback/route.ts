import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provisionOnboardedAgencyOwner } from "@/lib/services/onboarding-service";

export const dynamic = "force-dynamic";

/**
 * Supabase Auth Verification Callback Handler (Batch 3)
 * Exchanges authorization code for session, validates user identity,
 * and atomically provisions Agency + User + Starter Trial Subscription.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // 1. Upstream Auth Failure from Supabase
  if (error) {
    console.error("Auth callback received upstream error:", error, errorDescription);
    return NextResponse.redirect(new URL("/login?error=verification_link_invalid", request.url));
  }

  if (!code && !token_hash) {
    return NextResponse.redirect(new URL("/login?error=missing_verification_code", request.url));
  }

  // 2. Verify Confirmation Token (via token_hash / verifyOtp) or Exchange Authorization Code for Session
  const supabase = await createClient();

  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });
    if (verifyError) {
      console.error("Auth token_hash verification error:", verifyError.message);
      return NextResponse.redirect(new URL("/login?error=verification_link_invalid", request.url));
    }
  } else if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error("Auth code exchange error:", exchangeError.message);
      // Check if session or user identity is already established before failing
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
      }
    }
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

  // Verify email is confirmed
  const isEmailConfirmed = !!(user.email_confirmed_at || (user as any).confirmed_at);
  if (!isEmailConfirmed) {
    console.error("Auth callback received unconfirmed user:", user.id);
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/verify-email?error=unverified_account", request.url));
  }

  // 4. Execute Atomic Onboarding Transaction
  const onboardingResult = await provisionOnboardedAgencyOwner(user, supabase);

  if (!onboardingResult.success) {
    await supabase.auth.signOut();
    if (onboardingResult.error === "unverified_account") {
      return NextResponse.redirect(new URL("/verify-email?error=unverified_account", request.url));
    }
    if (onboardingResult.error === "missing_onboarding_data") {
      return NextResponse.redirect(new URL("/login?error=missing_onboarding_data", request.url));
    }
    if (onboardingResult.error === "plan_unavailable") {
      return NextResponse.redirect(new URL("/login?error=plan_unavailable", request.url));
    }
    return NextResponse.redirect(new URL("/verify-email?error=onboarding_failed", request.url));
  }

  // 5. Sign Out to Prevent Auto-Login and Redirect to Login with Verified Indicator
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login?verified=true", request.url));
}
