/**
 * Loyalty & Rewards Service
 *
 * Handles points accumulation, level calculation, referral codes,
 * and benefits management.
 *
 * Uses localStorage with Supabase sync.
 */

import { supabase } from "@/lib/supabase/client";
import {
  LOYALTY_LEVELS,
  POINT_ACTIONS,
  type LoyaltyLevel,
  type PointAction,
  type PointTransaction,
  type UserLoyaltyProfile,
} from "./types";

const STORAGE_KEY = "maksab_loyalty_points";
const REFERRAL_STORAGE_KEY = "maksab_referral_data";

// ── Helpers ────────────────────────────────────────────

function getLevelForPoints(points: number): LoyaltyLevel {
  if (points >= LOYALTY_LEVELS.diamond.minPoints) return "diamond";
  if (points >= LOYALTY_LEVELS.gold.minPoints) return "gold";
  if (points >= LOYALTY_LEVELS.silver.minPoints) return "silver";
  return "member";
}

function getNextLevel(current: LoyaltyLevel): LoyaltyLevel | null {
  const order: LoyaltyLevel[] = ["member", "silver", "gold", "diamond"];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : null;
}

function generateReferralCode(userId: string): string {
  // Short referral code: first 4 chars of userId + random 4 chars
  const prefix = userId.replace(/-/g, "").slice(0, 4).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MKS-${prefix}${suffix}`;
}

// ── Local Storage Persistence ──────────────────────────

interface StoredLoyaltyData {
  points: number;
  transactions: PointTransaction[];
  referralCode: string;
  referralCount: number;
  referredBy: string | null;
  freeFeatureAdsUsedThisMonth: number;
  lastMonthReset: string;
}

function getStoredData(userId: string): StoredLoyaltyData {
  if (typeof window === "undefined") {
    return {
      points: 0,
      transactions: [],
      referralCode: generateReferralCode(userId),
      referralCount: 0,
      referredBy: null,
      freeFeatureAdsUsedThisMonth: 0,
      lastMonthReset: new Date().toISOString().slice(0, 7),
    };
  }

  const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
  if (raw) {
    const data = JSON.parse(raw) as StoredLoyaltyData;
    // Reset monthly counter if new month
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (data.lastMonthReset !== currentMonth) {
      data.freeFeatureAdsUsedThisMonth = 0;
      data.lastMonthReset = currentMonth;
    }
    return data;
  }

  const newData: StoredLoyaltyData = {
    points: 0,
    transactions: [],
    referralCode: generateReferralCode(userId),
    referralCount: 0,
    referredBy: null,
    freeFeatureAdsUsedThisMonth: 0,
    lastMonthReset: new Date().toISOString().slice(0, 7),
  };
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(newData));
  return newData;
}

function saveStoredData(userId: string, data: StoredLoyaltyData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(data));
}

// ── Core Functions ─────────────────────────────────────

/**
 * Award points to a user for an action.
 * Respects daily rate limits per action type.
 */
export async function awardPoints(
  userId: string,
  action: PointAction,
  referenceId?: string,
): Promise<{ success: boolean; pointsAwarded: number; newTotal: number; levelUp?: LoyaltyLevel }> {
  if (!userId) {
    return { success: false, pointsAwarded: 0, newTotal: 0 };
  }

  const config = POINT_ACTIONS[action];
  const data = getStoredData(userId);

  // Check daily rate limit
  if (config.maxPerDay) {
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = data.transactions.filter(
      (t) => t.action === action && t.createdAt.startsWith(today),
    ).length;
    if (todayCount >= config.maxPerDay) {
      return { success: false, pointsAwarded: 0, newTotal: data.points };
    }
  }

  const prevLevel = getLevelForPoints(data.points);
  const points = config.points;

  const transaction: PointTransaction = {
    id: crypto.randomUUID(),
    userId,
    action,
    points,
    description: config.nameAr,
    referenceId,
    createdAt: new Date().toISOString(),
  };

  data.points += points;
  data.transactions.unshift(transaction);
  // Keep last 100 transactions
  if (data.transactions.length > 100) {
    data.transactions = data.transactions.slice(0, 100);
  }

  saveStoredData(userId, data);

  const newLevel = getLevelForPoints(data.points);
  const levelUp = newLevel !== prevLevel ? newLevel : undefined;

  // Also try to persist to Supabase (fire and forget)
  supabase
    .from("loyalty_points" as never)
    .insert({
      user_id: userId,
      action,
      points,
      reference_id: referenceId || null,
    } as never)
    .then(() => {
      // Update total on profile
      supabase
        .from("profiles" as never)
        .update({
          loyalty_points: data.points,
          loyalty_level: newLevel,
        } as never)
        .eq("id" as never, userId as never)
        .then();
    });

  return { success: true, pointsAwarded: points, newTotal: data.points, levelUp };
}

/**
 * Get full loyalty profile for a user.
 */
export function getUserLoyaltyProfile(userId: string): UserLoyaltyProfile {
  const data = getStoredData(userId);
  const currentLevel = getLevelForPoints(data.points);
  const nextLevel = getNextLevel(currentLevel);
  const currentConfig = LOYALTY_LEVELS[currentLevel];
  const nextConfig = nextLevel ? LOYALTY_LEVELS[nextLevel] : null;

  const pointsToNextLevel = nextConfig
    ? nextConfig.minPoints - data.points
    : 0;

  const progressPercent = nextConfig
    ? Math.min(
        100,
        Math.round(
          ((data.points - currentConfig.minPoints) /
            (nextConfig.minPoints - currentConfig.minPoints)) *
            100,
        ),
      )
    : 100;

  const freeAdsTotal = currentConfig.freeFeatureAdsPerMonth;
  const freeFeatureAdsRemaining = Math.max(
    0,
    freeAdsTotal - data.freeFeatureAdsUsedThisMonth,
  );

  return {
    userId,
    totalPoints: data.points,
    currentLevel,
    nextLevel,
    pointsToNextLevel,
    progressPercent,
    referralCode: data.referralCode,
    referralCount: data.referralCount,
    freeFeatureAdsRemaining,
    recentTransactions: data.transactions.slice(0, 20),
  };
}

/**
 * Use a free featured ad slot (for eligible levels).
 */
export function useFreeFeatureAd(userId: string): boolean {
  const data = getStoredData(userId);
  const level = getLevelForPoints(data.points);
  const config = LOYALTY_LEVELS[level];

  if (data.freeFeatureAdsUsedThisMonth >= config.freeFeatureAdsPerMonth) {
    return false;
  }

  data.freeFeatureAdsUsedThisMonth++;
  saveStoredData(userId, data);
  return true;
}

/**
 * Apply a referral code (new user was referred by someone).
 */
export async function applyReferralCode(
  newUserId: string,
  referralCode: string,
): Promise<{ success: boolean; referrerName?: string; error?: string }> {
  if (!newUserId || !referralCode) {
    return { success: false, error: "بيانات ناقصة" };
  }

  // Find who owns this referral code
  // Check in localStorage (all users)
  if (typeof window !== "undefined") {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(STORAGE_KEY),
    );

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw) as StoredLoyaltyData;
        if (data.referralCode === referralCode) {
          const referrerId = key.replace(`${STORAGE_KEY}_`, "");

          // Prevent self-referral
          if (referrerId === newUserId) {
            return { success: false, error: "مش ممكن تستخدم كود الدعوة بتاعك" };
          }

          // Mark new user as referred
          const newUserData = getStoredData(newUserId);
          if (newUserData.referredBy) {
            return { success: false, error: "انت مسجّل بدعوة قبل كده" };
          }
          newUserData.referredBy = referrerId;
          saveStoredData(newUserId, newUserData);

          // Award referrer
          data.referralCount++;
          saveStoredData(referrerId, data);
          await awardPoints(referrerId, "referral_signup", newUserId);

          return { success: true, referrerName: "صاحب الدعوة" };
        }
      } catch {
        continue;
      }
    }
  }

  // Also check Supabase
  const { data: referrerRow } = await supabase
    .from("loyalty_referrals" as never)
    .select("referrer_id")
    .eq("referral_code" as never, referralCode as never)
    .maybeSingle();

  if (referrerRow) {
    const referrerId = (referrerRow as Record<string, unknown>).referrer_id as string;
    if (referrerId === newUserId) {
      return { success: false, error: "مش ممكن تستخدم كود الدعوة بتاعك" };
    }
    await awardPoints(referrerId, "referral_signup", newUserId);
    return { success: true };
  }

  return { success: false, error: "كود الدعوة مش صحيح" };
}

/**
 * Check if referrer should get bonus points when their referral posts first ad.
 */
export async function checkReferralFirstAd(userId: string): Promise<void> {
  const data = getStoredData(userId);
  if (!data.referredBy) return;

  // Only award once
  const referrerData = getStoredData(data.referredBy);
  const alreadyAwarded = referrerData.transactions.some(
    (t) => t.action === "referral_first_ad" && t.referenceId === userId,
  );
  if (alreadyAwarded) return;

  await awardPoints(data.referredBy, "referral_first_ad", userId);
}

/**
 * Get referral link for sharing.
 */
export function getReferralLink(referralCode: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/?ref=${referralCode}`;
  }
  return `https://maksab.app/?ref=${referralCode}`;
}

/**
 * Get stored referral code from URL (for new signups).
 */
export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFERRAL_STORAGE_KEY);
}

/**
 * Store referral code from URL params.
 */
export function storeReferralCode(code: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REFERRAL_STORAGE_KEY, code);
}

/**
 * Clear stored referral code after use.
 */
export function clearStoredReferralCode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
}
