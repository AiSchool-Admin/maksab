/**
 * Server-signed session tokens for authenticating API requests.
 *
 * After OTP verification, the server issues a signed session token containing
 * the user_id. This token MUST be sent with requests that require authentication
 * (e.g., ad creation) so the server can verify the user's identity.
 *
 * Token format: base64url({ user_id, issued_at, hmac })
 * HMAC payload: user_id:issued_at
 */

import { createHmac } from "crypto";

const SESSION_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const secret = process.env.OTP_SECRET;
  if (!secret) {
    // In non-production environments (dev, preview, staging), use a dev-only secret.
    // Must match the same fallback in send-otp/route.ts and verify-otp/route.ts.
    if (process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV !== "production") {
      return "maksab-dev-otp-secret-not-for-production";
    }
    throw new Error("Missing OTP_SECRET environment variable. Set it in production.");
  }
  return secret;
}

/** Generate a signed session token for a verified user */
export function generateSessionToken(userId: string): string {
  const issuedAt = Date.now();
  const payload = `${userId}:${issuedAt}`;
  const hmac = createHmac("sha256", getSecret()).update(payload).digest("hex");

  return Buffer.from(
    JSON.stringify({ user_id: userId, issued_at: issuedAt, hmac }),
  ).toString("base64url");
}

/** Verify a session token and return the user_id if valid */
export function verifySessionToken(
  token: string,
): { valid: true; userId: string } | { valid: false; error: string } {
  try {
    const decoded = JSON.parse(
      Buffer.from(token, "base64url").toString("utf-8"),
    );

    const { user_id, issued_at, hmac } = decoded;

    if (!user_id || !issued_at || !hmac) {
      return { valid: false, error: "توكن الجلسة مش صحيح" };
    }

    // Check expiry
    if (Date.now() - issued_at > SESSION_TOKEN_MAX_AGE_MS) {
      return { valid: false, error: "الجلسة انتهت. سجل دخول تاني" };
    }

    // Verify HMAC
    const expectedHmac = createHmac("sha256", getSecret())
      .update(`${user_id}:${issued_at}`)
      .digest("hex");

    if (expectedHmac !== hmac) {
      return { valid: false, error: "توكن الجلسة مش صحيح" };
    }

    return { valid: true, userId: user_id };
  } catch {
    return { valid: false, error: "توكن الجلسة مش صحيح" };
  }
}
