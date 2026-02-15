/**
 * Badge Service — manages earning and displaying user badges
 *
 * Uses localStorage for instant UI + Supabase sync
 */

import { supabase } from "@/lib/supabase/client";
import { BADGES, type BadgeId, type UserBadge, type UserBadgesProfile } from "./types";

const STORAGE_KEY = "maksab_user_badges";

// ── Local Storage ──────────────────────────────────────

function getStoredBadges(userId: string): UserBadge[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
  if (raw) {
    try {
      return JSON.parse(raw) as UserBadge[];
    } catch {
      return [];
    }
  }
  return [];
}

function saveStoredBadges(userId: string, badges: UserBadge[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(badges));
}

// ── Core Functions ─────────────────────────────────────

/**
 * Check if a user has a specific badge
 */
export function hasBadge(userId: string, badgeId: BadgeId): boolean {
  const badges = getStoredBadges(userId);
  return badges.some((b) => b.badgeId === badgeId);
}

/**
 * Get all badges for a user
 */
export function getUserBadges(userId: string): UserBadgesProfile {
  const badges = getStoredBadges(userId);
  return { userId, badges };
}

/**
 * Award a badge to a user (if they don't already have it)
 */
export async function awardBadge(
  userId: string,
  badgeId: BadgeId,
): Promise<{ success: boolean; alreadyHad: boolean }> {
  if (!userId) return { success: false, alreadyHad: false };

  const badges = getStoredBadges(userId);
  const existing = badges.find((b) => b.badgeId === badgeId);

  if (existing) {
    return { success: true, alreadyHad: true };
  }

  const newBadge: UserBadge = {
    badgeId,
    earnedAt: new Date().toISOString(),
  };

  badges.push(newBadge);
  saveStoredBadges(userId, badges);

  // Persist to Supabase (fire and forget)
  supabase
    .from("user_badges" as never)
    .insert({
      user_id: userId,
      badge_id: badgeId,
      earned_at: newBadge.earnedAt,
    } as never)
    .then();

  return { success: true, alreadyHad: false };
}

/**
 * Check and award Pioneer badge (for early adopters)
 * Should be called on user registration
 */
export async function checkAndAwardPioneerBadge(userId: string): Promise<boolean> {
  if (hasBadge(userId, "pioneer")) return false;

  // Check total users count from Supabase
  const { count } = await supabase
    .from("profiles" as never)
    .select("id", { count: "exact", head: true });

  if (count !== null && count <= 1000) {
    await awardBadge(userId, "pioneer");
    return true;
  }
  return false;
}

/**
 * Check and award Supporter badge (when user pays commission)
 * Should be called after commission payment
 */
export async function checkAndAwardSupporterBadge(userId: string): Promise<boolean> {
  if (hasBadge(userId, "supporter")) return false;
  await awardBadge(userId, "supporter");
  return true;
}

/**
 * Check and award Ambassador badge (when user has 5+ referrals)
 * Should be called after each referral signup
 */
export async function checkAndAwardAmbassadorBadge(
  userId: string,
  referralCount: number,
): Promise<boolean> {
  if (hasBadge(userId, "ambassador")) return false;

  if (referralCount >= 5) {
    await awardBadge(userId, "ambassador");
    return true;
  }
  return false;
}

/**
 * Get badge display info for a list of badge IDs
 */
export function getBadgeConfigs(badgeIds: BadgeId[]) {
  return badgeIds.map((id) => BADGES[id]).filter(Boolean);
}

/**
 * Load badges from Supabase and sync with localStorage
 */
export async function syncBadgesFromServer(userId: string): Promise<void> {
  const { data } = await supabase
    .from("user_badges" as never)
    .select("badge_id, earned_at")
    .eq("user_id" as never, userId as never);

  if (data && (data as unknown[]).length > 0) {
    const serverBadges: UserBadge[] = (data as Record<string, unknown>[]).map((row) => ({
      badgeId: row.badge_id as BadgeId,
      earnedAt: row.earned_at as string,
    }));

    // Merge with local badges (keep both, deduplicate)
    const localBadges = getStoredBadges(userId);
    const merged = [...serverBadges];

    for (const local of localBadges) {
      if (!merged.some((b) => b.badgeId === local.badgeId)) {
        merged.push(local);
      }
    }

    saveStoredBadges(userId, merged);
  }
}
