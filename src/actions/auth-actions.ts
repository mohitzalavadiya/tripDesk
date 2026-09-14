"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export interface AuthActionResult {
  success?: boolean;
  error?: string;
  unverified?: boolean;
  email?: string;
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

  // 2. Redirect to /verify-email without creating database records or auto-logging in
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
    if (
      authError?.message?.toLowerCase().includes("email not confirmed") ||
      authError?.message?.toLowerCase().includes("email_not_confirmed")
    ) {
      return {
        error: "Please verify your email address before signing in to TripDesk.",
        unverified: true,
        email,
      };
     }
    if (
      authError?.message?.toLowerCase().includes("invalid login credentials") ||
      authError?.status === 400
    ) {
      return { error: "Invalid email or password. Please check your credentials and try again." };
    }
    return { error: authError?.message || "Invalid email or password." };
  }

  // Fetch DB User to check role and route correctly
  const dbUser = await prisma.user.findUnique({
    where: { id: authData.user.id },
  });

  if (!dbUser) {
    // Explicitly destroy session to prevent orphaned access
    await supabase.auth.signOut();
    return {
      error:
        "Your authentication credentials are valid, but no TripDesk workspace profile was found. Please contact support.",
    };
  }

  const isPlatformOwner = dbUser.role === "PLATFORM_OWNER";

  // Login Verification Gate (Agency Users must be confirmed in Supabase Auth; Platform Owner is exempt)
  const isEmailConfirmed = !!(
    authData.user.email_confirmed_at ||
    (authData.user as any).confirmed_at
  );

  if (!isPlatformOwner && !isEmailConfirmed) {
    // Unverified Agency Owner: safely destroy the session and block workspace access
    await supabase.auth.signOut();
    return {
      error: "Please verify your email address before signing in to TripDesk.",
      unverified: true,
      email,
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
 * Secure logout action.
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Request password reset link via Supabase Auth.
 */
export async function requestPasswordResetAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim()?.toLowerCase();

  if (!email) {
    return { error: "Please enter your registered email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Update user password after navigating from reset link.
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
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/login?reset=success");
}

/**
 * Resend email verification link for an unconfirmed Agency Owner account.
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
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: getAuthCallbackUrl(),
    },
  });

  if (error) {
    if (
      error.message?.toLowerCase().includes("rate limit") ||
      error.message?.toLowerCase().includes("security purposes") ||
      error.status === 429
    ) {
      return { error: "Please wait a moment before requesting another verification email." };
    }
    return { error: "Unable to resend verification email right now. Please try again." };
  }

  return { success: true };
}
