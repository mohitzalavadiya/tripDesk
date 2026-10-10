import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AuthActionResult } from "@/actions/auth-actions";

export type AuthLookupResult =
  | { status: "confirmed"; user: any }
  | { status: "unconfirmed"; user: any }
  | { status: "conclusive_not_found" }
  | { status: "inconclusive"; reason: string; error?: any };

/**
 * Authoritatively searches for an account in Supabase Auth across pagination pages.
 * Conclusively determines whether the user exists and their confirmation state.
 * Returns 'inconclusive' if the Admin client is unavailable, an API error occurs,
 * an exception is thrown, pagination metadata is ambiguous/invalid, or pagination limits are exceeded.
 */
export async function lookupAuthUserByEmail(
  email: string,
  adminClientOverride?: any
): Promise<AuthLookupResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { status: "conclusive_not_found" };
  }

  let adminClient: any = null;
  try {
    adminClient = adminClientOverride !== undefined ? adminClientOverride : getAdminClient();
  } catch (err) {
    return { status: "inconclusive", reason: "admin_client_init_error", error: err };
  }

  if (!adminClient) {
    return { status: "inconclusive", reason: "admin_client_missing" };
  }

  const perPage = 1000;
  const maxPages = 50;
  let currentPage = 1;

  try {
    while (currentPage <= maxPages) {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page: currentPage,
        perPage,
      });

      if (error) {
        return { status: "inconclusive", reason: "admin_api_error", error };
      }

      if (!data || !Array.isArray(data.users)) {
        return { status: "inconclusive", reason: "malformed_response" };
      }

      const match = data.users.find(
        (u: any) => u.email?.trim().toLowerCase() === normalizedEmail
      );

      if (match) {
        const isConfirmed = !!(match.email_confirmed_at || (match as any).confirmed_at);
        return isConfirmed
          ? { status: "confirmed", user: match }
          : { status: "unconfirmed", user: match };
      }

      const isFullPage = data.users.length === perPage;
      const nextPageValue = data.nextPage;

      // When can we safely advance to the next page?
      // Only when nextPage is a strictly forward number.
      if (typeof nextPageValue === "number" && nextPageValue > currentPage) {
        currentPage = nextPageValue;
        continue;
      }

      // If we are not advancing, we must determine if this is a definitive exhaustion
      // or an ambiguous/invalid pagination response.
      // 1. If nextPage is non-null/non-undefined but not a valid forward number:
      // (e.g. nextPage <= currentPage, non-numeric, NaN) -> malformed/looping metadata!
      if (nextPageValue !== null && nextPageValue !== undefined) {
        return { status: "inconclusive", reason: "invalid_pagination_metadata" };
      }

      // 2. Here nextPage is null or undefined (indicating no forward link header).
      // If the current page returned fewer than perPage items (or 0),
      // we have conclusively reached the end of the directory.
      if (!isFullPage) {
        return { status: "conclusive_not_found" };
      }

      // 3. If the page is full (1000 items) and nextPage is null:
      // Check total if available:
      if (typeof data.total === "number") {
        if (data.total <= currentPage * perPage) {
          // Total users in Auth directory exactly equals or is less than users examined
          return { status: "conclusive_not_found" };
        } else {
          // data.total indicates more users exist, but nextPage is null (contradictory)
          return { status: "inconclusive", reason: "ambiguous_pagination" };
        }
      }

      // Full page with missing nextPage and no total confirmation is ambiguous
      return { status: "inconclusive", reason: "ambiguous_pagination" };
    }

    // Exceeded maximum allowable pages without finding the user or exhausting the directory
    return { status: "inconclusive", reason: "pagination_limit_exceeded" };
  } catch (err) {
    return { status: "inconclusive", reason: "lookup_exception", error: err };
  }
}

/**
 * Classifies Supabase Auth resend errors and maps them to safe, friendly feedback.
 */
export function classifyResendError(error: any): AuthActionResult {
  const isRateLimit =
    (error as any)?.code === "over_request_rate_limit" ||
    (error as any)?.code === "over_email_send_rate_limit" ||
    error?.status === 429 ||
    error?.message?.toLowerCase().includes("rate limit") ||
    error?.message?.toLowerCase().includes("security purposes");

  if (isRateLimit) {
    return {
      error: "Please wait a moment before requesting another verification code.",
      rateLimited: true,
    };
  }

  const isAlreadyConfirmed =
    (error as any)?.code === "email_already_confirmed" ||
    error?.message?.toLowerCase().includes("already confirmed") ||
    error?.message?.toLowerCase().includes("already verified");

  if (isAlreadyConfirmed) {
    return {
      error: "This email address is already verified. Please sign in to access your workspace.",
      alreadyVerified: true,
    };
  }

  const isUserNotFound =
    (error as any)?.code === "user_not_found" ||
    error?.message?.toLowerCase().includes("user not found");

  if (isUserNotFound) {
    return {
      error: "No registration found with this email. Please check the address or sign up.",
    };
  }

  return {
    error: error?.message || "Failed to resend verification code. Please try again.",
  };
}

export interface SendVerificationOptions {
  adminClient?: any;
  supabaseClient?: any;
  redirectUrl?: string;
}

/**
 * Internal business logic for resending email verification code.
 * Not a Next.js Server Action — pure server-side service.
 * Supports mock dependency injection for offline testing.
 */
export async function sendVerificationEmail(
  email: string,
  dependencies?: SendVerificationOptions
): Promise<AuthActionResult> {
  const normalizedEmail = email?.trim()?.toLowerCase();

  if (!normalizedEmail) {
    return { error: "Please enter your registered email address to resend verification." };
  }

  // 1. Authoritative check: Search Supabase Auth directory across all pages
  const authLookup = await lookupAuthUserByEmail(normalizedEmail, dependencies?.adminClient);

  // If Auth user is found and confirmed: return safe already-verified guidance
  if (authLookup.status === "confirmed") {
    return {
      error: "This email address is already verified. Please sign in to access your workspace.",
      alreadyVerified: true,
      email: normalizedEmail,
    };
  }

  // 2. Supabase Auth is the sole authority for email verification status.
  // If the user is unconfirmed, inconclusive, or not found in Supabase Auth,
  // proceed directly to native Supabase signup OTP resend.
  // Real authentication flows NEVER consult Prisma emailVerified as proof of verification,
  // eliminating stale database overrides and domain-pattern heuristics completely.
  const supabase = dependencies?.supabaseClient ?? (await createClient());
  const redirectUrl = dependencies?.redirectUrl;

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: normalizedEmail,
    options: redirectUrl ? { emailRedirectTo: redirectUrl } : undefined,
  });

  if (error) {
    const classified = classifyResendError(error);
    return { ...classified, email: normalizedEmail };
  }

  return { success: true, email: normalizedEmail };
}
