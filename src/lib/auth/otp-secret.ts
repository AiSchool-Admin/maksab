/**
 * Shared OTP secret provider.
 *
 * Centralizes the retrieval of OTP_SECRET so that
 * send-otp, verify-otp, and session-token all use the same logic.
 */

const DEV_FALLBACK = "maksab-dev-otp-secret-not-for-production";

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
 * - In non-production: falls back to a deterministic dev-only string so that
 *   the app works without configuring the variable during local development.
 */
export function getOtpSecret(): string {
  const secret = process.env.OTP_SECRET;
  if (secret) return secret;

  if (isNonProduction()) {
    return DEV_FALLBACK;
  }

  throw new Error("Missing OTP_SECRET environment variable. Set it in production.");
}
