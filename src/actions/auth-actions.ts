"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { provisionOnboardedAgencyOwner } from "@/lib/services/onboarding-service";
import prisma from "@/lib/prisma";

import {
  setRecoveryProofCookie,
  getVerifiedRecoveryProof,
  clearRecoveryProofCookie,
} from "@/lib/auth/recovery-proof";
import { sendVerificationEmail } from "@/lib/services/verification-service";

export interface AuthActionResult {
  success?: boolean;
  error?: string;
  unverified?: boolean;
  alreadyVerified?: boolean;
  email?: string;
  verified?: boolean;
  rateLimited?: boolean;
}

function getAuthCallbackUrl(): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${siteUrl.replace(/\/$/, "")}/auth/callback`;
}

/**
 * Public Agency Owner Registration with Native Supabase Auth & Onboarding Metadata Staging.
 * Creates an unconfirmed Supabase Auth user and stores temporary onboarding metadata.
 * Deferring database provisioning (Agency, User, Subscription) to the post-verification callback.
 */
export async function signupAgencyOwnerAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const agencyName = (formData.get("agencyName") as string)?.trim();
  const agencyPhone = (formData.get("agencyPhone") as string)?.trim();
  const agencyEmail = (formData.get("agencyEmail") as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim();
  const state = (formData.get("state") as string)?.trim() || null;
  const country = (formData.get("country") as string)?.trim() || "India";

  const ownerName = (formData.get("ownerName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim()?.toLowerCase();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // Validation
  if (!agencyName || !agencyPhone || !agencyEmail || !city) {
    return { error: "Please fill in all required Agency details." };
  }
  if (!ownerName || !email || !password) {
    return { error: "Please fill in all required Owner details and password." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  // 1. Native Supabase Auth Signup with temporary onboarding metadata
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthCallbackUrl(),
      data: {
        agencyName,
        agencyEmail,
        agencyPhone,
        address,
        city,
        state,
        country,
        ownerName,
        phone,
      },
    },
  });

  if (authError) {
    if (
      authError.message?.toLowerCase().includes("already registered") ||
      authError.message?.toLowerCase().includes("already exists")
    ) {
      return { error: "An account with this email already exists. Please log in instead." };
    }
    if (
      authError.message?.toLowerCase().includes("rate limit") ||
      authError.message?.toLowerCase().includes("security purposes") ||
      authError.status === 429
    ) {
      return { error: "Too many registration attempts. Please wait a moment before trying again." };
    }
    return { error: authError.message || "Failed to create authentication account." };
  }

  if (!authData.user) {
    return { error: "Authentication service did not return a valid user identity." };
  }

  // Supabase returns identities: [] if user already registered (when email confirmation is enabled)
  if (authData.user.identities && authData.user.identities.length === 0) {
    return { error: "An account with this email already exists. Please log in instead." };
  }

  // 2. Enforce "No Auto-Login" rule and redirect unconfirmed user to verify email
  await supabase.auth.signOut();
  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

/**
 * Standard Supabase Auth login for Agency Owners and Platform Owner.
 */
export async function loginAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim()?.toLowerCase();
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "";

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return classifyLoginError(authError, email);
  }

  // Fetch DB User to check role and route correctly
  let dbUser = await prisma.user.findUnique({
    where: { id: authData.user.id },
  });

  const isPlatformOwner = dbUser?.role === "PLATFORM_OWNER";
  const isEmailConfirmed = !!(authData.user.email_confirmed_at || (authData.user as any).confirmed_at);

  // Login Verification Gate: Enforced for all non-Platform Owner accounts
  if (!isPlatformOwner && !isEmailConfirmed) {
    await supabase.auth.signOut();
    return {
      error: "Please verify your email address before signing in to Your Travel Desk.",
      unverified: true,
      email,
    };
  }

  // Fallback onboarding ONLY if email is confirmed in Supabase Auth but DB User was not yet provisioned
  if (!dbUser && isEmailConfirmed && authData.user.user_metadata?.agencyName) {
    const onboardRes = await provisionOnboardedAgencyOwner(authData.user, supabase);
    if (onboardRes.success) {
      dbUser = await prisma.user.findUnique({
        where: { id: authData.user.id },
      });
    }
  }

  if (!dbUser) {
    // Explicitly destroy session to prevent orphaned access
    await supabase.auth.signOut();
    return {
      error:
        "Your authentication credentials are valid, but no Your Travel Desk workspace profile was found. Please contact support.",
    };
  }

  if (isPlatformOwner) {
    if (
      redirectTo &&
      redirectTo.startsWith("/admin") &&
      !redirectTo.startsWith("//") &&
      !redirectTo.includes(":")
    ) {
      redirect(redirectTo);
    }
    redirect("/admin");
  } else {
    // Agency User (AGENCY_OWNER, etc.)
    if (
      redirectTo &&
      redirectTo.startsWith("/") &&
      !redirectTo.startsWith("/admin") &&
      !redirectTo.startsWith("//") &&
      !redirectTo.includes(":")
    ) {
      redirect(redirectTo);
    }
    redirect("/dashboard");
  }
}

/**
 * Classifies Supabase Auth sign-in errors and maps them to safe, structured user-facing messages.
 */
export async function classifyLoginError(
  authError: any,
  email: string
): Promise<AuthActionResult> {
  // 1. Explicit unconfirmed email check (from Supabase Auth error code or message)
  const isUnconfirmed =
    (authError as any)?.code === "email_not_confirmed" ||
    (authError as any)?.code === "provider_email_needs_verification" ||
    authError?.message?.toLowerCase().includes("email not confirmed") ||
    authError?.message?.toLowerCase().includes("not confirmed") ||
    authError?.message?.toLowerCase().includes("unconfirmed");

  if (isUnconfirmed) {
    return {
      error: "Please verify your email address before signing in to Your Travel Desk.",
      unverified: true,
      email,
    };
  }

  // 2. Rate limit check
  const isRateLimit =
    (authError as any)?.code === "over_request_rate_limit" ||
    authError?.status === 429 ||
    authError?.message?.toLowerCase().includes("rate limit") ||
    authError?.message?.toLowerCase().includes("security purposes");

  if (isRateLimit) {
    return { error: "Too many sign-in attempts. Please wait a moment before trying again." };
  }

  // 3. Invalid credentials or generic auth error
  if (
    (authError as any)?.code === "invalid_credentials" ||
    authError?.message?.toLowerCase().includes("invalid login credentials") ||
    authError?.status === 400
  ) {
    return { error: "Invalid email or password. Please check your credentials and try again." };
  }

  return { error: "Invalid email or password. Please check your credentials and try again." };
}

/**
 * Secure logout action.
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Request password reset 6-digit OTP via Supabase Auth.
 * Returns a neutral success response to prevent account enumeration.
 */
export async function requestPasswordResetAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim()?.toLowerCase();

  if (!email) {
    return { error: "Please enter your registered email address." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    const isRateLimit =
      (error as any)?.code === "over_request_rate_limit" ||
      (error as any)?.code === "over_email_send_rate_limit" ||
      error?.status === 429 ||
      error?.message?.toLowerCase().includes("rate limit") ||
      error?.message?.toLowerCase().includes("security purposes");

    if (isRateLimit) {
      return {
        error:
          "A recovery code was recently requested for this email. Please check your inbox or wait 60 seconds before requesting another code.",
        rateLimited: true,
        email,
      };
    }

    // Operational logging for non-rate-limit errors without leaking account existence
    console.warn("[requestPasswordResetAction] Supabase reset request notice:", error.message);
  }

  // Provide neutral response preventing email enumeration
  return { success: true, email };
}

/**
 * Verifies the 6-digit recovery OTP with Supabase Auth (type: 'recovery').
 * Upon successful verification, writes a cryptographic recovery proof cookie
 * to bind authorization to the active session and intended email.
 */
export async function verifyRecoveryOtpAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim()?.toLowerCase();
  const token = (formData.get("token") as string)?.trim();

  if (!email) {
    return { error: "Please enter your registered email address." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  if (!token) {
    return { error: "Please enter the 6-digit verification code sent to your email." };
  }

  if (!/^\d{6}$/.test(token)) {
    return { error: "Verification code must be exactly 6 numeric digits." };
  }

  const supabase = await createClient();
  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "recovery",
  });

  if (verifyError) {
    return classifyOtpVerifyError(verifyError);
  }

  if (!data?.user || !data.user.email) {
    return { error: "Unable to establish recovery session. Please request a new code." };
  }

  // Bind server-side recovery authorization proof to user ID and email
  try {
    await setRecoveryProofCookie(data.user.id, data.user.email);
  } catch (proofErr: any) {
    console.error("[verifyRecoveryOtpAction] Failed to establish recovery authorization proof.");
    await supabase.auth.signOut();
    return { error: "Unable to establish recovery authorization. Please try again." };
  }

  return { success: true, verified: true, email: data.user.email };
}

/**
 * Resend password recovery 6-digit OTP code.
 * Invokes resetPasswordForEmail with rate-limit and enumeration protection.
 */
export async function resendRecoveryOtpAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim()?.toLowerCase();

  if (!email) {
    return { error: "Please enter your registered email address." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    const isRateLimit =
      (error as any)?.code === "over_request_rate_limit" ||
      (error as any)?.code === "over_email_send_rate_limit" ||
      error?.status === 429 ||
      error?.message?.toLowerCase().includes("rate limit") ||
      error?.message?.toLowerCase().includes("security purposes");

    if (isRateLimit) {
      return {
        error:
          "A recovery code was recently requested for this email. Please check your inbox or wait 60 seconds before requesting another code.",
        rateLimited: true,
        email,
      };
    }

    console.warn("[resendRecoveryOtpAction] Supabase resend notice:", error.message);
  }

  return { success: true, email };
}

/**
 * Inspects whether the active request has a verified recovery authorization session.
 */
export async function checkRecoveryStateAction(): Promise<AuthActionResult> {
  try {
    const recoveryProof = await getVerifiedRecoveryProof();
    if (!recoveryProof) {
      return { success: false, verified: false };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || !user.email) {
      return { success: false, verified: false };
    }

    if (
      user.id !== recoveryProof.userId ||
      user.email.toLowerCase() !== recoveryProof.email.toLowerCase()
    ) {
      return { success: false, verified: false };
    }

    return { success: true, verified: true, email: recoveryProof.email };
  } catch {
    return { success: false, verified: false };
  }
}

/**
 * Updates the user password after verifying that the active session
 * holds a valid, cryptographic recovery authorization proof.
 * Destroys the recovery session and cookies before redirecting to login.
 */
export async function resetPasswordAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const newPassword = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!newPassword || newPassword.length < 6) {
    return { error: "Password must be at least 6 characters long." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    return {
      error: "No active recovery session found. Please enter your verification code again.",
    };
  }

  // Strict Server-Side Recovery Authorization Gate
  const recoveryProof = await getVerifiedRecoveryProof();
  if (
    !recoveryProof ||
    recoveryProof.userId !== user.id ||
    recoveryProof.email.toLowerCase() !== user.email.toLowerCase()
  ) {
    return {
      error:
        "Password reset authorization is invalid or has expired. Please verify your recovery code again.",
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    console.error(
      "[resetPasswordAction] Supabase updateUser failed: status",
      updateError.status,
      "code",
      (updateError as any).code
    );
    return await classifyPasswordUpdateError(updateError);
  }

  // Cleanly clear recovery authorization proof cookie and sign out of recovery session
  await clearRecoveryProofCookie();
  await supabase.auth.signOut();

  redirect("/login?reset=success");
}

/**
 * Classifies Supabase Auth password update errors and maps them to safe, actionable messages
 * without leaking raw provider errors or stack traces.
 */
export async function classifyPasswordUpdateError(
  updateError: any
): Promise<AuthActionResult> {
  const msg = updateError?.message?.toLowerCase() || "";
  const code = (updateError as any)?.code?.toLowerCase() || "";

  if (
    code === "over_request_rate_limit" ||
    updateError?.status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("security purposes")
  ) {
    return { error: "Too many password update attempts. Please wait a moment before trying again." };
  }

  if (
    code === "same_password" ||
    msg.includes("same_password") ||
    msg.includes("should be different") ||
    msg.includes("must be different")
  ) {
    return { error: "New password must be different from your current password." };
  }

  if (
    code === "weak_password" ||
    msg.includes("weak") ||
    msg.includes("pwned") ||
    msg.includes("leaked") ||
    msg.includes("complexity")
  ) {
    return { error: "Password does not meet security requirements. Please choose a stronger password." };
  }

  if (
    code === "bad_jwt" ||
    code === "session_not_found" ||
    updateError?.status === 401 ||
    msg.includes("expired") ||
    msg.includes("session")
  ) {
    return { error: "Your recovery session has expired. Please verify your recovery code again." };
  }

  return { error: "Unable to update password at this time. Please try again." };
}

/**
 * Resend email verification link for an unconfirmed Agency Owner account.
 * Next.js Server Action called by useActionState in verify-email/page.tsx.
 * Strictly maintains standard Server Action signature: (prevState, formData).
 * Delegates to internal verification service with real production clients.
 */
export async function resendVerificationEmailAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim()?.toLowerCase();

  if (!email) {
    return { error: "Please enter your registered email address to resend verification." };
  }

  const supabase = await createClient();
  return sendVerificationEmail(email, {
    supabaseClient: supabase,
    redirectUrl: getAuthCallbackUrl(),
  });
}

/**
 * Verify Native Supabase Email OTP for Agency Owner registration.
 * Validates 6-digit OTP with Supabase Auth, retrieves confirmed identity, executes atomic onboarding,
 * wipes temporary metadata, and terminates the session to enforce no auto-login.
 */
export async function verifyEmailOtpAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim()?.toLowerCase();
  const token = (formData.get("token") as string)?.trim();

  if (!email) {
    return { error: "Please enter your registered email address." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  if (!token) {
    return { error: "Please enter the verification code sent to your email." };
  }

  if (!/^\d{6}$/.test(token)) {
    return { error: "Verification code must be 6 numeric digits." };
  }

  const supabase = await createClient();

  // 1. Verify OTP natively through Supabase Auth
  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (verifyError) {
    return classifyOtpVerifyError(verifyError);
  }

  // 2. Retrieve Authenticated User Identity (never trust client-supplied ID)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Failed to retrieve authenticated user after OTP verification:", userError?.message);
    await supabase.auth.signOut();
    return { error: "Authentication session could not be established. Please try again." };
  }

  // Confirm email is verified in Supabase Auth before proceeding with workspace provisioning
  const isConfirmed = !!(user.email_confirmed_at || (user as any).confirmed_at);
  if (!isConfirmed) {
    console.error("User retrieved after OTP verification is not confirmed:", user.id);
    await supabase.auth.signOut();
    return { error: "Email verification could not be confirmed. Please request a new code." };
  }

  // 3. Execute Atomic Onboarding Transaction
  const onboardingResult = await provisionOnboardedAgencyOwner(user, supabase);

  if (!onboardingResult.success) {
    await supabase.auth.signOut();
    if (onboardingResult.error === "unverified_account") {
      return { error: "Your email address is not yet confirmed by the authentication provider." };
    }
    if (onboardingResult.error === "missing_onboarding_data") {
      return { error: "Your registration details could not be found. Please contact support or sign up again." };
    }
    if (onboardingResult.error === "plan_unavailable") {
      return { error: "Starter subscription plan is currently unavailable in the catalog." };
    }
    return { error: "Failed to initialize agency workspace. Please try again or contact support." };
  }

  // 4. Sign Out to Enforce "No Auto-Login" Rule
  await supabase.auth.signOut();

  return { success: true };
}

/**
 * Classifies Supabase Auth verifyOtp errors and maps them to safe, clear user-facing messages.
 */
export async function classifyOtpVerifyError(verifyError: any): Promise<AuthActionResult> {
  console.error("Supabase OTP verification error:", verifyError?.message);
  const msg = verifyError?.message?.toLowerCase() || "";
  if (
    (verifyError as any)?.code === "over_request_rate_limit" ||
    verifyError?.status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("security purposes")
  ) {
    return { error: "Too many verification attempts. Please wait a moment before trying again." };
  }
  if (msg.includes("expired") || (verifyError as any)?.code === "otp_expired") {
    return { error: "This verification code has expired or is no longer valid. Please request a new code." };
  }
  if (msg.includes("invalid") || msg.includes("token") || verifyError?.status === 400) {
    return { error: "The verification code is incorrect. Please check the code and try again." };
  }
  return { error: "Unable to verify verification code. Please try again." };
}
