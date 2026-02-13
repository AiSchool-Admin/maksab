/**
 * Admin Settings Service — Read/write app-level configuration.
 * Uses service role key (server-side only).
 */

import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// In-memory cache with TTL (5 minutes)
const cache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Get a setting value. Checks in-memory cache first, then DB.
 */
export async function getSetting(key: string): Promise<string | null> {
  // Check cache first
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const sb = getServiceClient();
    const { data, error } = await sb
      .from("app_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error || !data) return null;

    // Cache the value
    cache.set(key, {
      value: data.value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return data.value;
  } catch {
    return null;
  }
}

/**
 * Set a setting value.
 */
export async function setSetting(
  key: string,
  value: string,
  description?: string,
  isSecret?: boolean,
  updatedBy?: string,
): Promise<boolean> {
  try {
    const sb = getServiceClient();
    const { error } = await sb.from("app_settings").upsert(
      {
        key,
        value,
        description: description || undefined,
        is_secret: isSecret ?? false,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy || undefined,
      },
      { onConflict: "key" },
    );

    if (error) {
      console.error("[settings] Error saving:", error);
      return false;
    }

    // Update cache
    cache.set(key, {
      value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a setting.
 */
export async function deleteSetting(key: string): Promise<boolean> {
  try {
    const sb = getServiceClient();
    const { error } = await sb.from("app_settings").delete().eq("key", key);

    if (error) return false;

    cache.delete(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all settings (for admin page).
 * Masks secret values.
 */
export async function getAllSettings(): Promise<
  Array<{
    key: string;
    value: string;
    description: string | null;
    is_secret: boolean;
    updated_at: string;
  }>
> {
  try {
    const sb = getServiceClient();
    const { data, error } = await sb
      .from("app_settings")
      .select("key, value, description, is_secret, updated_at")
      .order("key");

    if (error || !data) return [];

    // Mask secret values — show only last 4 chars
    return data.map((s) => ({
      ...s,
      value: s.is_secret && s.value.length > 8
        ? "•".repeat(s.value.length - 4) + s.value.slice(-4)
        : s.value,
    }));
  } catch {
    return [];
  }
}

// ── Specific setting helpers ────────────────────────────

/**
 * Get OpenAI API key — checks env var first, then DB.
 */
export async function getOpenAIKey(): Promise<string | null> {
  // 1. Check environment variable (highest priority)
  const envKey = process.env.OPENAI_API_KEY;
  if (envKey) return envKey;

  // 2. Check database
  return getSetting("OPENAI_API_KEY");
}
