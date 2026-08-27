"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient, deleteAuthUser } from "@/lib/supabase/admin";
import prisma from "@/lib/prisma";

export interface AuthActionResult {
  success?: boolean;
  error?: string;
}

/**
 * Hardened single unified Agency Onboarding + Supabase Auth signup.
 * Creates confirmed Supabase Auth User, TripDesk Agency, TripDesk User (AGENCY_OWNER), and 7-day TRIAL subscription.
 * Recovers safely from partial database failure by rolling back Prisma transactions and cleaning up orphaned Auth accounts.
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

  let supabaseUserId: string;

  // 1. Supabase Auth Account Creation
  const adminClient = getAdminClient();
  if (adminClient) {
    // Create confirmed user using Admin API to prevent email rate limit lockouts
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: ownerName,
        phone,
        role: "AGENCY_OWNER",
      },
    });

    if (authError || !authData.user) {
      if (
        authError?.message?.toLowerCase().includes("already registered") ||
        authError?.message?.toLowerCase().includes("already exists")
      ) {
        return { error: "An account with this email already exists. Please log in instead." };
      }
      return { error: authError?.message || "Failed to create authentication account." };
    }

    supabaseUserId = authData.user.id;
  } else {
    // Standard client fallback if service role key is not configured
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: ownerName,
          phone,
        },
      },
    });

    if (authError) {
      return { error: authError.message || "Failed to create authentication account." };
    }

    if (!authData.user) {
      return { error: "Authentication service did not return a valid user identity." };
    }

    if (authData.user.identities && authData.user.identities.length === 0) {
      return { error: "An account with this email already exists. Please log in instead." };
    }

    supabaseUserId = authData.user.id;
  }

  let isNewlyCreated = true;

  try {
    // 2. Atomic Prisma Transaction: Agency + User + 7-Day Trial Subscription
    await prisma.$transaction(async (tx) => {
      // Idempotency check: verify if DB User + Agency already exist
      const existingDbUser = await tx.user.findUnique({
        where: { id: supabaseUserId },
        include: { agency: true },
      });

      if (existingDbUser && existingDbUser.agencyId) {
        isNewlyCreated = false;
        return;
      }

      // Find or create default Starter subscription plan
      let defaultPlan = await tx.subscriptionPlan.findFirst({
        where: { name: "Starter" },
      });

      if (!defaultPlan) {
        defaultPlan = await tx.subscriptionPlan.create({
          data: {
            name: "Starter",
            description: "Essential travel planning & quotation workflow for boutique operators.",
            price: 1999.0,
            durationDays: 30,
            isActive: true,
          },
        });
      }

      const now = new Date();
      const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const fullAddress = [address, city, state, country].filter(Boolean).join(", ");

      // Create Agency
      const agency = await tx.agency.create({
        data: {
          name: agencyName,
          phone: agencyPhone,
          email: agencyEmail,
          address: fullAddress || null,
          status: "ACTIVE",
        },
      });

      // Create User
      await tx.user.create({
        data: {
          id: supabaseUserId,
          agencyId: agency.id,
          name: ownerName,
          email,
          phone,
          role: "AGENCY_OWNER",
        },
      });

      // Create 7-day TRIAL subscription
      await tx.subscription.create({
        data: {
          agencyId: agency.id,
          planId: defaultPlan.id,
          status: "TRIAL",
          trialStart: now,
          trialEnd: trialEnd,
        },
      });
    });
  } catch (err: any) {
    console.error("Agency onboarding failed during database transaction. Attempting cleanup of newly-created Auth user:", err);

    // Safe cleanup: Delete ONLY the newly created Auth user from this signup attempt
    if (isNewlyCreated) {
      await deleteAuthUser(supabaseUserId);
    }

    return {
      error: "Unable to complete your agency setup right now. Please try again.",
    };
  }

  // 3. Establish active session in cookies for seamless immediate onboarding
  const serverSupabase = await createClient();
  const { error: signInError } = await serverSupabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.warn("Auto-login after registration had notice:", signInError.message);
    redirect("/login?registered=true");
  }

  redirect("/dashboard");
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
    return {
      error:
        "Your authentication credentials are valid, but no TripDesk workspace profile was found. Please contact support.",
    };
  }

  // Role-specific redirect validation (prevents open redirects and cross-role routing)
  const isPlatformOwner = dbUser.role === "PLATFORM_OWNER";

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
