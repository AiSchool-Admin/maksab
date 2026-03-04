/**
 * Shared OTP secret provider.
 *
 * Centralizes the retrieval of OTP_SECRET so that
 * send-otp, verify-otp, and session-token all use the same logic.
 */

import { randomBytes } from "crypto";

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
 * Return the OTP signing secret.
 *
 * - In production: reads OTP_SECRET from the environment (throws if missing).
 * - In non-production: generates a random per-process secret so that
 *   the app works without configuring the variable during local development.
 */
export function getOtpSecret(): string {
  const secret = process.env.OTP_SECRET;
  if (secret) return secret;

  if (isNonProduction()) {
    return getDevFallback();
  }

  throw new Error("Missing OTP_SECRET environment variable. Set it in production.");
}
