/**
 * Supabase-based rate limiting service.
 * Persists across server restarts (unlike in-memory limiters).
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

export type RateLimitAction =
  | "otp_send"
  | "ad_create"
  | "report"
  | "message"
  | "ai_request"
  | "search"
  | "chatbot";

interface RateLimitConfig {
  maxCount: number;
  windowMinutes: number;
}

const RATE_LIMITS: Record<RateLimitAction, RateLimitConfig> = {
  otp_send: { maxCount: 5, windowMinutes: 60 },       // 5 OTPs per hour
  ad_create: { maxCount: 10, windowMinutes: 1440 },    // 10 ads per day
  report: { maxCount: 10, windowMinutes: 1440 },       // 10 reports per day
  message: { maxCount: 100, windowMinutes: 60 },       // 100 messages per hour
  ai_request: { maxCount: 20, windowMinutes: 60 },     // 20 AI requests per hour
  search: { maxCount: 60, windowMinutes: 60 },         // 60 searches per hour
  chatbot: { maxCount: 30, windowMinutes: 60 },        // 30 chatbot requests per hour
};

/**
 * Check if an action is rate limited.
 * Returns { allowed: true } if within limits, or { allowed: false, retryAfter } if limited.
 */
export async function checkRateLimit(
  identifier: string,
  action: RateLimitAction,
): Promise<{ allowed: boolean; remaining?: number; retryAfterSeconds?: number }> {
  try {
    const config = RATE_LIMITS[action];
    const supabase = getServiceClient();

    const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000).toISOString();

    const { count } = await supabase
      .from("rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("identifier", identifier)
      .eq("action", action)
      .gte("created_at", windowStart);

    const currentCount = count ?? 0;

    if (currentCount >= config.maxCount) {
      // Find the oldest record in the window to calculate retry time
      const { data: oldest } = await supabase
        .from("rate_limits")
        .select("created_at")
        .eq("identifier", identifier)
        .eq("action", action)
        .gte("created_at", windowStart)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const retryAfterSeconds = oldest
        ? Math.ceil((new Date(oldest.created_at).getTime() + config.windowMinutes * 60 * 1000 - Date.now()) / 1000)
        : config.windowMinutes * 60;

      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(retryAfterSeconds, 0),
      };
    }

    return {
      allowed: true,
      remaining: config.maxCount - currentCount - 1,
    };
  } catch (err) {
    console.error("[rate-limit] Check error:", err);
    // Fail closed for sensitive actions (OTP, ad creation) to prevent abuse
    const sensitiveActions: RateLimitAction[] = ["otp_send", "ad_create", "report"];
    if (sensitiveActions.includes(action)) {
      return { allowed: false, remaining: 0, retryAfterSeconds: 60 };
    }
    // Fail open for non-sensitive actions (search, chatbot) to avoid blocking users
    return { allowed: true };
  }
}

/**
 * Record a rate limit usage after the action is performed.
 */
export async function recordRateLimit(
  identifier: string,
  action: RateLimitAction,
): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase.from("rate_limits").insert({
      identifier,
      action,
    });
  } catch (err) {
    console.error("[rate-limit] Record error:", err);
  }
}

/**
 * Clean up old rate limit records (call from a cron job).
 */
export async function cleanupRateLimits(): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase
      .from("rate_limits")
      .delete()
      .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  } catch (err) {
    console.error("[rate-limit] Cleanup error:", err);
  }
}
