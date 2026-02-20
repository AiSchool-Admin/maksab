/**
 * Gamification Service — مكسب
 *
 * Achievements, streaks, leaderboard integration.
 * Uses localStorage-first with Supabase sync (same pattern as loyalty-service).
 */

import { supabase } from "@/lib/supabase/client";
import { ga4Event } from "@/lib/analytics/ga4";

// ── Types ──────────────────────────────────────────────

export interface Achievement {
  id: string;
  name_ar: string;
  description_ar: string;
  emoji: string;
  points_reward: number;
  requirement_type: string;
  requirement_value: number;
  sort_order: number;
}

export interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
}

export interface UserStreak {
  current_streak: number;
  longest_streak: number;
  last_active_date: string;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  level: string;
  rank: number;
  ads_count: number;
  sales_count: number;
}

export interface GamificationProfile {
  achievements: Achievement[];
  unlockedIds: string[];
  streak: UserStreak;
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
}

// ── Achievement definitions (local fallback) ───────────

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_ad", name_ar: "أول إعلان", description_ar: "نشرت أول إعلان على مكسب", emoji: "📝", points_reward: 50, requirement_type: "first_ad", requirement_value: 1, sort_order: 1 },
  { id: "first_sale", name_ar: "أول بيعة", description_ar: "بعت أول حاجة على مكسب", emoji: "💰", points_reward: 100, requirement_type: "first_sale", requirement_value: 1, sort_order: 2 },
  { id: "first_bid", name_ar: "أول مزايدة", description_ar: "زايدت لأول مرة في مزاد", emoji: "🔨", points_reward: 30, requirement_type: "first_bid", requirement_value: 1, sort_order: 3 },
  { id: "seller_10", name_ar: "بائع نشط", description_ar: "نشرت 10 إعلانات", emoji: "🏪", points_reward: 200, requirement_type: "ads_count", requirement_value: 10, sort_order: 4 },
  { id: "seller_50", name_ar: "بائع محترف", description_ar: "نشرت 50 إعلان", emoji: "🏆", points_reward: 500, requirement_type: "ads_count", requirement_value: 50, sort_order: 5 },
  { id: "reviewer_5", name_ar: "مقيّم نشط", description_ar: "كتبت 5 تقييمات", emoji: "⭐", points_reward: 100, requirement_type: "reviews_count", requirement_value: 5, sort_order: 6 },
  { id: "referrer_5", name_ar: "داعي الخير", description_ar: "دعيت 5 أصدقاء", emoji: "🤝", points_reward: 200, requirement_type: "referrals_count", requirement_value: 5, sort_order: 7 },
  { id: "streak_7", name_ar: "مداوم أسبوعي", description_ar: "دخلت 7 أيام متتالية", emoji: "🔥", points_reward: 150, requirement_type: "streak_days", requirement_value: 7, sort_order: 8 },
  { id: "streak_30", name_ar: "مداوم شهري", description_ar: "دخلت 30 يوم متتالي", emoji: "💎", points_reward: 500, requirement_type: "streak_days", requirement_value: 30, sort_order: 9 },
];

// ── Local storage keys ─────────────────────────────────

const STREAK_KEY = "maksab_streak";
const ACHIEVEMENTS_KEY = "maksab_achievements_unlocked";

// ── Streak management ──────────────────────────────────

function getLocalStreak(): UserStreak {
  if (typeof window === "undefined") {
    return { current_streak: 0, longest_streak: 0, last_active_date: "" };
  }
  const raw = localStorage.getItem(STREAK_KEY);
  if (raw) {
    return JSON.parse(raw) as UserStreak;
  }
  return { current_streak: 0, longest_streak: 0, last_active_date: "" };
}

function saveLocalStreak(streak: UserStreak): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
}

/**
 * Update daily streak. Call on every app open / page load.
 * Returns the updated streak and any newly unlocked achievements.
 */
export async function updateStreak(userId: string): Promise<{
  streak: UserStreak;
  newAchievements: string[];
}> {
  const today = new Date().toISOString().slice(0, 10);
  const local = getLocalStreak();

  // Already updated today
  if (local.last_active_date === today) {
    return { streak: local, newAchievements: [] };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let current = local.current_streak;

  if (local.last_active_date === yesterday) {
    current += 1;
  } else {
    current = 1;
  }

  const longest = Math.max(current, local.longest_streak);
  const updatedStreak: UserStreak = {
    current_streak: current,
    longest_streak: longest,
    last_active_date: today,
  };

  saveLocalStreak(updatedStreak);

  // Check streak achievements
  const newAchievements: string[] = [];
  const unlockedIds = getLocalUnlockedIds();

  if (current >= 7 && !unlockedIds.includes("streak_7")) {
    newAchievements.push("streak_7");
    unlockAchievementLocal("streak_7");
  }
  if (current >= 30 && !unlockedIds.includes("streak_30")) {
    newAchievements.push("streak_30");
    unlockAchievementLocal("streak_30");
  }

  // Sync to Supabase (fire and forget)
  if (userId) {
    supabase
      .rpc("update_user_streak" as never, { p_user_id: userId } as never)
      .then();
  }

  // Track in GA4
  if (newAchievements.length > 0) {
    newAchievements.forEach((id) => {
      ga4Event("achievement_unlocked", { achievement_id: id, method: "streak" });
    });
  }

  return { streak: updatedStreak, newAchievements };
}

// ── Achievement management ─────────────────────────────

function getLocalUnlockedIds(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
  if (raw) return JSON.parse(raw) as string[];
  return [];
}

function unlockAchievementLocal(achievementId: string): void {
  if (typeof window === "undefined") return;
  const ids = getLocalUnlockedIds();
  if (!ids.includes(achievementId)) {
    ids.push(achievementId);
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(ids));
  }
}

/**
 * Try to unlock an achievement.
 * Returns true if newly unlocked, false if already had.
 */
export async function tryUnlockAchievement(
  userId: string,
  achievementId: string,
): Promise<boolean> {
  const unlockedIds = getLocalUnlockedIds();
  if (unlockedIds.includes(achievementId)) return false;

  unlockAchievementLocal(achievementId);

  // Sync to Supabase
  if (userId) {
    supabase
      .rpc("check_achievement" as never, {
        p_user_id: userId,
        p_achievement_id: achievementId,
      } as never)
      .then();
  }

  ga4Event("achievement_unlocked", { achievement_id: achievementId });
  return true;
}

/**
 * Check count-based achievements (ads_count, reviews_count, referrals_count).
 */
export async function checkCountAchievements(
  userId: string,
  type: "ads_count" | "reviews_count" | "referrals_count" | "sales_count",
  currentCount: number,
): Promise<string[]> {
  const newlyUnlocked: string[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (achievement.requirement_type === type && currentCount >= achievement.requirement_value) {
      const unlocked = await tryUnlockAchievement(userId, achievement.id);
      if (unlocked) newlyUnlocked.push(achievement.id);
    }
  }

  // Check first_ad / first_sale / first_bid
  if (type === "ads_count" && currentCount >= 1) {
    const unlocked = await tryUnlockAchievement(userId, "first_ad");
    if (unlocked) newlyUnlocked.push("first_ad");
  }
  if (type === "sales_count" && currentCount >= 1) {
    const unlocked = await tryUnlockAchievement(userId, "first_sale");
    if (unlocked) newlyUnlocked.push("first_sale");
  }

  return newlyUnlocked;
}

/**
 * Unlock a one-off achievement (first_bid, etc).
 */
export async function unlockOneOff(
  userId: string,
  achievementId: "first_ad" | "first_sale" | "first_bid",
): Promise<boolean> {
  return tryUnlockAchievement(userId, achievementId);
}

// ── Leaderboard ────────────────────────────────────────

/**
 * Fetch leaderboard from Supabase cache.
 */
export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("leaderboard_cache" as never)
    .select("*" as never)
    .order("rank" as never, { ascending: true } as never)
    .limit(limit);

  if (error || !data) return [];
  return (data as unknown as LeaderboardEntry[]);
}

/**
 * Get the user's rank from leaderboard cache.
 */
export async function getUserRank(userId: string): Promise<number | null> {
  const { data } = await supabase
    .from("leaderboard_cache" as never)
    .select("rank" as never)
    .eq("user_id" as never, userId as never)
    .maybeSingle();

  if (!data) return null;
  return (data as unknown as { rank: number }).rank;
}

// ── Full profile ───────────────────────────────────────

/**
 * Get full gamification profile for display.
 */
export async function getGamificationProfile(userId: string): Promise<GamificationProfile> {
  const unlockedIds = getLocalUnlockedIds();
  const streak = getLocalStreak();

  // Fetch leaderboard
  const leaderboard = await getLeaderboard(20);
  const userRank = userId ? await getUserRank(userId) : null;

  // Also try to sync unlocked achievements from Supabase
  if (userId) {
    const { data } = await supabase
      .from("user_achievements" as never)
      .select("achievement_id" as never)
      .eq("user_id" as never, userId as never);

    if (data) {
      const remoteIds = (data as unknown as UserAchievement[]).map((a) => a.achievement_id);
      for (const id of remoteIds) {
        if (!unlockedIds.includes(id)) {
          unlockAchievementLocal(id);
          unlockedIds.push(id);
        }
      }
    }
  }

  return {
    achievements: ACHIEVEMENTS,
    unlockedIds,
    streak,
    leaderboard,
    userRank,
  };
}
