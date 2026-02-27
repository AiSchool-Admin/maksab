import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// During build time, env vars may not be available — create a lazy client
let _supabase: SupabaseClient<Database> | null = null;

function getSupabaseClient(): SupabaseClient<Database> {
  if (_supabase) return _supabase;

  // Read env vars at runtime (not module-level) so they are available in edge/serverless
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey;

  if (!url || !key) {
    // During SSG/build time, return a dummy client that will fail gracefully at runtime.
    // Log a warning so misconfiguration is visible.
    if (typeof window !== "undefined") {
      console.error("[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    _supabase = createClient<Database>(
      "https://placeholder.supabase.co",
      "placeholder-key",
    );
  } else {
    _supabase = createClient<Database>(url, key);
  }
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    return (getSupabaseClient() as unknown as Record<string, unknown>)[prop as string];
  },
});
