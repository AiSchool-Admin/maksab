/**
 * Helper to extract and verify session token from request headers.
 * Returns the userId if valid, or null with an error message.
 */

import { NextRequest } from "next/server";
import { verifySessionToken } from "./session-token";

type AuthSuccess = { userId: string; error?: undefined };
type AuthFailure = { userId: null; error: string; status: 401 };

export function requireAuth(
  request: NextRequest,
): AuthSuccess | AuthFailure {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return { userId: null, error: "غير مصرح — سجل دخول الأول", status: 401 };
  }

  const session = verifySessionToken(token);
  if (!session.valid) {
    return { userId: null, error: session.error, status: 401 };
  }

  return { userId: session.userId };
}

/**
 * Extract client IP from request for rate limiting public endpoints.
 */
export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
