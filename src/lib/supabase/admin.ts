import { assertNotPlatformOwner } from "@/lib/auth/platform-owner-guard";
import { createClient } from "@supabase/supabase-js";
import "server-only";
import { normalizeSupabaseUrl } from "./normalize";

/**
 * Server-only Supabase Admin client initialized with the SUPABASE_SERVICE_ROLE_KEY.
 * Never import this file into Client Components or expose the service role key to the browser.
 */
export function getAdminClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawUrl || !serviceRoleKey) {
    return null;
  }

  const supabaseUrl = normalizeSupabaseUrl(rawUrl);

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Safely deletes a newly-created Supabase Auth user during onboarding cleanup.
 * Strictly guarded against targeting the permanent Platform Owner account.
 */
export async function deleteAuthUser(userId: string): Promise<boolean> {
  try {
    await assertNotPlatformOwner({ userId }, { context: "deleteAuthUser" });

    const adminClient = getAdminClient();
    if (!adminClient) {
      console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY not configured. Skipping Auth user cleanup.");
      return false;
    }

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      console.error("Failed to delete Auth user during cleanup:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Unexpected error during Auth user cleanup:", err);
    return false;
  }
}

/**
 * Bans a Supabase Auth user (100 years) to block new logins and refresh-token renewals.
 * Throws if Supabase Auth is configured and the revocation call fails.
 */
export async function revokeAuthUserSessionsAndBan(userId: string): Promise<{ invoked: boolean }> {
  await assertNotPlatformOwner({ userId }, { context: "revokeAuthUserSessionsAndBan" });

  const adminClient = getAdminClient();
  if (!adminClient) {
    return { invoked: false };
  }

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });

  if (error) {
    throw new Error(`Supabase Auth session revocation failed: ${error.message}`);
  }

  return { invoked: true };
}

/**
 * Removes the Supabase Auth login ban when an Agency Owner reactivates a staff member.
 * Existing old sessions remain invalid via application-side sessionRevokedAt checks.
 */
export async function unbanAuthUser(userId: string): Promise<{ invoked: boolean }> {
  await assertNotPlatformOwner({ userId }, { context: "unbanAuthUser" });

  const adminClient = getAdminClient();
  if (!adminClient) {
    return { invoked: false };
  }

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });

  if (error) {
    throw new Error(`Supabase Auth reactivation failed: ${error.message}`);
  }

  return { invoked: true };
}
