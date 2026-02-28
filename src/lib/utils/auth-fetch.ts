/**
 * Authenticated fetch helper for API requests that require a session token.
 * Automatically adds the Authorization header with the Bearer token.
 */

import { getSessionToken } from "@/lib/supabase/auth";

export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getSessionToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...options, headers });
}
