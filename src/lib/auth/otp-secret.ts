/**
 * Shared OTP secret provider.
 *
 * Centralizes the retrieval of OTP_SECRET so that
 * send-otp, verify-otp, and session-token all use the same logic.
 */

import { createHash, randomBytes } from "crypto";

/**
 * Dev fallback secret — generated once per process to avoid hardcoded secrets.
 * Tokens will NOT survive server restarts in dev, which is acceptable.
 */
let _devFallback: string | null = null;
function getDevFallback(): string {
  if (!_devFallback) {
    _devFallback = randomBytes(32).toString("hex");
    console.warn("[otp-secret] Using random dev fallback. Set OTP_SECRET for persistent sessions.");
  }
  return _devFallback;
}

/** Whether the current environment is non-production (dev/preview/staging). */
export function isNonProduction(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.VERCEL_ENV !== "production"
  );
}

/**
 * Derive a stable fallback secret from other available env vars.
 * This ensures tokens survive across serverless cold starts when OTP_SECRET
 * is not explicitly set. NOT as secure as a dedicated secret, but prevents
 * session breakage.
 */
function getStableFallback(): string | null {
  const material =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!material) return null;
  return createHash("sha256")
    .update(`maksab-otp-fallback:${material}`)
    .digest("hex");
}

/**
 * Return the OTP signing secret.
 *
 * Priority:
 * 1. OTP_SECRET env var (best — set this in production!)
 * 2. Stable fallback derived from Supabase keys (works across cold starts)
 * 3. Random per-process secret (dev only — tokens don't survive restarts)
 */
export function getOtpSecret(): string {
  const secret = process.env.OTP_SECRET;
  if (secret) return secret;

  // Try stable fallback so sessions survive serverless cold starts
  const stable = getStableFallback();
  if (stable) {
    if (!isNonProduction()) {
      console.warn(
        "[otp-secret] ⚠️ OTP_SECRET مش موجود — بنستخدم مفتاح مشتق. " +
        "حط OTP_SECRET في Vercel Environment Variables عشان الأمان: " +
        "openssl rand -hex 32"
      );
    }
    return stable;
  }

  if (isNonProduction()) {
    return getDevFallback();
  }

  throw new Error("Missing OTP_SECRET environment variable. Set it in production.");
}
