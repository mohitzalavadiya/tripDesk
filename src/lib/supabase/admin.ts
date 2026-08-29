import "server-only";
import { createClient } from "@supabase/supabase-js";
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
 */
export async function deleteAuthUser(userId: string): Promise<boolean> {
  try {
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
