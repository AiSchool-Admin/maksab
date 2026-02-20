/**
 * Referral System — مكسب
 *
 * Full referral tracking: code generation, link building,
 * click tracking, and referrer rewards.
 */

import { supabase } from "@/lib/supabase/client";
import { ga4Event } from "@/lib/analytics/ga4";
import { fbShare } from "@/lib/meta-pixel";

// ── Types ──────────────────────────────────────────────

export type ReferralEventType = "click" | "signup" | "first_ad" | "first_sale";

export type ReferralLevel = "bronze" | "silver" | "gold" | "ambassador";

export interface ReferralProfile {
  code: string;
  totalPoints: number;
  level: ReferralLevel;
  referralCount: number;
}

// Points awarded per event
const REFERRAL_POINTS: Record<ReferralEventType, number> = {
  click: 0,
  signup: 10,
  first_ad: 25,
  first_sale: 50,
};

const REFERRAL_STORAGE_KEY = "maksab_ref_code";

// ── Code Generation ────────────────────────────────────

/**
 * Generate a referral code from user ID.
 * Format: MKS + first 6 chars of UUID uppercased.
 */
export function generateReferralCode(userId: string): string {
  return "MKS" + userId.replace(/-/g, "").slice(0, 6).toUpperCase();
}

// ── Link Building ──────────────────────────────────────

/**
 * Build a referral link with the user's code.
 */
export function getReferralLink(code: string): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://maksab.app";
  return `${base}/invite/${code}`;
}

// ── Local Storage ──────────────────────────────────────

/**
 * Store a referral code from URL (for attribution on signup).
 */
export function storeReferralCode(code: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REFERRAL_STORAGE_KEY, code);
}

/**
 * Get stored referral code.
 */
export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFERRAL_STORAGE_KEY);
}

/**
 * Clear stored referral code after use.
 */
export function clearStoredReferralCode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
}

// ── Tracking ───────────────────────────────────────────

/**
 * Track a referral event (click, signup, first_ad, first_sale).
 */
export async function trackReferralEvent(
  code: string,
  eventType: ReferralEventType,
  referredUserId?: string,
  metadata?: Record<string, unknown>,
): Promise<boolean> {
  try {
    // Insert event
    await supabase.from("referral_events" as never).insert({
      referral_code: code,
      event_type: eventType,
      referred_user_id: referredUserId || null,
      metadata: metadata || {},
    } as never);

    // Award points to referrer if applicable
    if (REFERRAL_POINTS[eventType] > 0) {
      const { data: codeRow } = await supabase
        .from("referral_codes" as never)
        .select("user_id")
        .eq("code" as never, code as never)
        .maybeSingle();

      if (codeRow) {
        const referrerId = (codeRow as Record<string, unknown>).user_id as string;
        await supabase.rpc("add_referral_points" as never, {
          p_user_id: referrerId,
          p_points: REFERRAL_POINTS[eventType],
          p_reason: `referral_${eventType}`,
        } as never);
      }
    }

    // Track in GA4
    ga4Event("referral_event", {
      referral_code: code,
      event_type: eventType,
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Track a referral share action in analytics.
 */
export function trackReferralShare(
  method: "whatsapp" | "facebook" | "copy" | "native",
  code: string,
): void {
  ga4Event("referral_share", { method, referral_code: code });
  fbShare(code);
}

// ── Profile ────────────────────────────────────────────

/**
 * Get the referral profile for the current user.
 */
export async function getReferralProfile(
  userId: string,
): Promise<ReferralProfile | null> {
  try {
    const [codeResult, pointsResult] = await Promise.all([
      supabase
        .from("referral_codes" as never)
        .select("code")
        .eq("user_id" as never, userId as never)
        .maybeSingle(),
      supabase
        .from("user_points" as never)
        .select("total_points, level, referral_count")
        .eq("user_id" as never, userId as never)
        .maybeSingle(),
    ]);

    const code =
      (codeResult.data as Record<string, unknown> | null)?.code as string ||
      generateReferralCode(userId);
    const points = pointsResult.data as Record<string, unknown> | null;

    return {
      code,
      totalPoints: (points?.total_points as number) || 0,
      level: (points?.level as ReferralLevel) || "bronze",
      referralCount: (points?.referral_count as number) || 0,
    };
  } catch {
    return {
      code: generateReferralCode(userId),
      totalPoints: 0,
      level: "bronze",
      referralCount: 0,
    };
  }
}

/**
 * Reward a referrer when their referred user completes an action.
 * Called from ad creation, first sale, etc.
 */
export async function rewardReferrer(
  userId: string,
  eventType: ReferralEventType,
): Promise<void> {
  const storedCode = getStoredReferralCode();
  if (!storedCode) return;

  await trackReferralEvent(storedCode, eventType, userId);

  // Clear after first_sale (final event in funnel)
  if (eventType === "first_sale") {
    clearStoredReferralCode();
  }
}
