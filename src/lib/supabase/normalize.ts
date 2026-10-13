/**
 * Normalizes Supabase base URL, defensively stripping mistakenly appended /rest/v1, /auth/v1, or trailing slashes.
 * Safe for use in both Client and Server Components.
 */
export function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return "";
  let url = rawUrl.trim();
  url = url.replace(/\/(rest|auth|storage)\/v1\/?$/i, "");
  url = url.replace(/\/+$/, "");
  return url;
}
