/**
 * Analytics Tracking Service — مكسب
 *
 * Lightweight analytics for tracking user behavior,
 * page views, conversions, and marketing events.
 *
 * Uses localStorage queue + Supabase batch sync.
 */

import { supabase } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────

export type AnalyticsEventType =
  | "page_view"
  | "ad_view"
  | "ad_create_start"
  | "ad_create_complete"
  | "search"
  | "filter_apply"
  | "favorite_add"
  | "favorite_remove"
  | "chat_start"
  | "bid_place"
  | "buy_now"
  | "share_whatsapp"
  | "share_facebook"
  | "share_copy_link"
  | "share_native"
  | "referral_link_click"
  | "referral_signup"
  | "commission_prompt_shown"
  | "commission_paid"
  | "commission_skipped"
  | "pre_launch_signup"
  | "pwa_install"
  | "push_permission_granted"
  | "push_permission_denied"
  | "login_start"
  | "login_complete"
  | "profile_complete"
  | "category_click"
  | "auction_view"
  | "exchange_match_view";

export interface AnalyticsEvent {
  id: string;
  eventType: AnalyticsEventType;
  userId?: string;
  sessionId: string;
  data?: Record<string, unknown>;
  page?: string;
  referrer?: string;
  timestamp: string;
}

// ── Constants ──────────────────────────────────────────

const STORAGE_KEY = "maksab_analytics_queue";
const SESSION_KEY = "maksab_analytics_session";
const BATCH_SIZE = 20;
const FLUSH_INTERVAL = 30_000; // 30 seconds

// ── Session Management ─────────────────────────────────

function getSessionId(): string {
  if (typeof window === "undefined") return "server";

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// ── Event Queue ────────────────────────────────────────

function getQueue(): AnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: AnalyticsEvent[]): void {
  if (typeof window === "undefined") return;
  // Keep only last 200 events to avoid storage bloat
  const trimmed = queue.slice(-200);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

// ── Core Tracking ──────────────────────────────────────

/**
 * Track an analytics event. Fire-and-forget — never blocks UI.
 */
export function trackEvent(
  eventType: AnalyticsEventType,
  data?: Record<string, unknown>,
  userId?: string,
): void {
  if (typeof window === "undefined") return;

  const event: AnalyticsEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    eventType,
    userId,
    sessionId: getSessionId(),
    data,
    page: window.location.pathname,
    referrer: document.referrer || undefined,
    timestamp: new Date().toISOString(),
  };

  const queue = getQueue();
  queue.push(event);
  saveQueue(queue);

  // Auto-flush if batch is full (skip if table is known to be missing)
  if (queue.length >= BATCH_SIZE && !isFlushDisabled()) {
    flushQueue();
  }
}

/**
 * Track page view — convenience wrapper
 */
export function trackPageView(pageName?: string, userId?: string): void {
  trackEvent("page_view", {
    pageName: pageName || document.title,
    url: window.location.href,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
  }, userId);
}

/**
 * Track share event with platform
 */
export function trackShare(
  platform: "whatsapp" | "facebook" | "copy_link" | "native",
  adId?: string,
  userId?: string,
): void {
  const eventMap: Record<string, AnalyticsEventType> = {
    whatsapp: "share_whatsapp",
    facebook: "share_facebook",
    copy_link: "share_copy_link",
    native: "share_native",
  };
  trackEvent(eventMap[platform], { adId }, userId);
}

/**
 * Track ad conversion funnel
 */
export function trackAdFunnel(
  step: "ad_create_start" | "ad_create_complete",
  data?: Record<string, unknown>,
  userId?: string,
): void {
  trackEvent(step, data, userId);
}

// ── Queue Flushing ─────────────────────────────────────

let flushTimer: ReturnType<typeof setInterval> | null = null;
const FLUSH_DISABLED_KEY = "maksab_analytics_flush_disabled";

/** When true, stop trying to flush (table doesn't exist yet).
 *  Uses a timestamp so the disable expires after 1 hour and re-checks. */
function isFlushDisabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = localStorage.getItem(FLUSH_DISABLED_KEY);
    if (!val) return false;
    // If it's the old "1" format, treat as disabled (will re-check after clear)
    if (val === "1") return true;
    // Timestamp format: disabled for 1 hour
    const ts = Number(val);
    if (Date.now() - ts < 3_600_000) return true;
    // Expired — clear and allow re-check
    localStorage.removeItem(FLUSH_DISABLED_KEY);
    return false;
  } catch {
    return false;
  }
}

function setFlushDisabled(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FLUSH_DISABLED_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

/** Guard to prevent concurrent flush calls */
let flushing = false;

/**
 * Flush queued events to Supabase.
 * If the analytics_events table doesn't exist (404), disable flushing
 * to avoid spamming console errors. Events stay in localStorage.
 */
async function flushQueue(): Promise<void> {
  if (isFlushDisabled() || flushing) return;
  flushing = true;

  const queue = getQueue();
  if (queue.length === 0) {
    flushing = false;
    return;
  }

  // Take ONE batch only — don't loop, to avoid multiple 404s if table is missing
  const batch = queue.splice(0, BATCH_SIZE);
  saveQueue(queue);

  try {
    const rows = batch.map((event) => ({
      id: event.id,
      event_type: event.eventType,
      user_id: event.userId || null,
      session_id: event.sessionId,
      event_data: event.data || {},
      page: event.page || null,
      referrer: event.referrer || null,
      created_at: event.timestamp,
    }));

    const { error } = await supabase
      .from("analytics_events" as never)
      .insert(rows as never) as { error: { code?: string; message?: string } | null };

    if (error) {
      // Table doesn't exist or permission issue — disable flushing
      setFlushDisabled();
      // Put batch back
      const currentQueue = getQueue();
      saveQueue([...batch, ...currentQueue]);
      flushing = false;
      return;
    }
  } catch {
    // Network error — put events back silently
    const currentQueue = getQueue();
    saveQueue([...batch, ...currentQueue]);
  } finally {
    flushing = false;
  }
}

/**
 * Start periodic flush timer (call once on app init)
 */
export function startAnalyticsFlush(): void {
  if (typeof window === "undefined") return;
  if (flushTimer) return;

  // Don't even start the timer if table is known to be missing
  if (isFlushDisabled()) return;

  flushTimer = setInterval(flushQueue, FLUSH_INTERVAL);

  // Also flush on page visibility change (user leaving)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushQueue();
    }
  });

  // Flush on page unload
  window.addEventListener("beforeunload", () => {
    flushQueue();
  });
}

/**
 * Get analytics summary from localStorage (for immediate display)
 */
export function getLocalAnalyticsSummary(): {
  totalEvents: number;
  sessionEvents: number;
  topEvents: { type: string; count: number }[];
} {
  const queue = getQueue();
  const sessionId = getSessionId();

  const sessionEvents = queue.filter((e) => e.sessionId === sessionId);

  const typeCounts: Record<string, number> = {};
  for (const event of queue) {
    typeCounts[event.eventType] = (typeCounts[event.eventType] || 0) + 1;
  }

  const topEvents = Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalEvents: queue.length,
    sessionEvents: sessionEvents.length,
    topEvents,
  };
}
