import { createBrowserClient } from "@supabase/ssr";
import { normalizeSupabaseUrl } from "./normalize";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (typeof window !== "undefined" && browserClient) {
    return browserClient;
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseUrl = normalizeSupabaseUrl(rawUrl);
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  if (typeof window !== "undefined") {
    browserClient = client;
  }
  return client;
}

