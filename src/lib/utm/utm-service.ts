/**
 * UTM Tracking Service — مكسب
 *
 * Captures UTM parameters from URL on first visit,
 * stores them in localStorage, and syncs to Supabase.
 */

import { supabase } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
}

// ── Constants ──────────────────────────────────────────

const UTM_STORAGE_KEY = "maksab_utm_params";
const UTM_SESSION_KEY = "maksab_utm_session";
const UTM_SYNCED_KEY = "maksab_utm_synced";

// ── Capture UTM from URL ───────────────────────────────

/**
 * Extract UTM parameters from the current URL.
 * Should be called once on page load.
 */
export function captureUTMParams(): UTMParams | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);

  const utm: UTMParams = {};
  let hasUTM = false;

  const keys: (keyof UTMParams)[] = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];

  for (const key of keys) {
    const value = params.get(key);
    if (value) {
      utm[key] = value;
      hasUTM = true;
    }
  }

  // Also capture referrer and landing page
  utm.referrer = document.referrer || undefined;
  utm.landing_page = window.location.pathname;

  if (!hasUTM && !utm.referrer) return null;

  // Store in localStorage (first-touch attribution)
  const existing = getStoredUTM();
  if (!existing) {
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
  }

  // Always store as current session UTM (last-touch)
  sessionStorage.setItem(UTM_SESSION_KEY, JSON.stringify(utm));

  return utm;
}

/**
 * Get stored UTM params (first-touch attribution)
 */
export function getStoredUTM(): UTMParams | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UTMParams) : null;
  } catch {
    return null;
  }
}

/**
 * Get current session UTM params (last-touch attribution)
 */
export function getSessionUTM(): UTMParams | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(UTM_SESSION_KEY);
    return raw ? (JSON.parse(raw) as UTMParams) : null;
  } catch {
    return null;
  }
}

/**
 * Get the session ID for UTM tracking
 */
function getUTMSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = sessionStorage.getItem("maksab_analytics_session");
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem("maksab_analytics_session", id);
  }
  return id;
}

// ── Sync to Supabase ───────────────────────────────────

/**
 * Sync UTM visit to Supabase. Fire-and-forget.
 * Only syncs once per session.
 */
export async function syncUTMVisit(userId?: string): Promise<void> {
  if (typeof window === "undefined") return;

  // Don't double-sync in same session
  const synced = sessionStorage.getItem(UTM_SYNCED_KEY);
  if (synced) return;

  const utm = getSessionUTM() || getStoredUTM();
  if (!utm) return;

  sessionStorage.setItem(UTM_SYNCED_KEY, "1");

  try {
    await supabase.from("utm_visits" as never).insert({
      session_id: getUTMSessionId(),
      utm_source: utm.utm_source || null,
      utm_medium: utm.utm_medium || null,
      utm_campaign: utm.utm_campaign || null,
      utm_term: utm.utm_term || null,
      utm_content: utm.utm_content || null,
      referrer: utm.referrer || null,
      landing_page: utm.landing_page || null,
      user_agent: navigator.userAgent,
      user_id: userId || null,
    } as never);
  } catch {
    // Silent fail — UTM tracking is non-critical
    sessionStorage.removeItem(UTM_SYNCED_KEY);
  }
}

/**
 * Build a URL with UTM params for sharing
 */
export function buildUTMUrl(
  baseUrl: string,
  source: string,
  medium: string,
  campaign: string,
  extraParams?: Record<string, string>,
): string {
  const url = new URL(baseUrl, window.location.origin);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", campaign);
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}
