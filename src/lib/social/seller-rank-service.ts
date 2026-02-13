/**
 * Seller Rank System ("رتبة البائع")
 *
 * Progressive ranking: مبتدئ → شاطر → محترف → مكسب Elite
 * Score is calculated from seller activity: ads posted, ads sold,
 * positive reviews, average rating, response rate, account age,
 * and commission payments.
 *
 * Uses Supabase for data queries with localStorage caching (1 hour).
 */

import { supabase } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────

export type SellerRank = "beginner" | "good" | "pro" | "elite";

export interface SellerRankConfig {
  rank: SellerRank;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  minScore: number;
  perks: string[];
}

export interface SellerScoreBreakdown {
  totalScore: number;
  rank: SellerRank;
  nextRank: SellerRank | null;
  pointsToNext: number;
  progressPercent: number;
  breakdown: {
    adsPosted: { count: number; score: number };
    adsSold: { count: number; score: number };
    positiveReviews: { count: number; score: number };
    avgRating: { value: number; score: number };
    responseRate: { value: number; score: number };
    accountAge: { days: number; score: number };
    commissionsCount: { count: number; score: number };
  };
}

export interface SellerRankProfile {
  userId: string;
  rank: SellerRank;
  rankConfig: SellerRankConfig;
  score: number;
  nextRank: SellerRankConfig | null;
  progressPercent: number;
  memberSince: string;
  stats: {
    totalAds: number;
    totalSold: number;
    avgRating: number;
    totalReviews: number;
    responseRate: number;
  };
}

// ── Rank Configurations ──────────────────────────────────

export const SELLER_RANKS: SellerRankConfig[] = [
  {
    rank: "beginner",
    name: "مبتدئ",
    icon: "\u{1F331}",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    minScore: 0,
    perks: ["نشر إعلانات مجاني", "شات مع المشترين"],
  },
  {
    rank: "good",
    name: "شاطر",
    icon: "\u{2B50}",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    minScore: 100,
    perks: [
      'شارة "بائع شاطر"',
      "أولوية في نتائج البحث +10%",
      "إحصائيات مبيعاتك",
    ],
  },
  {
    rank: "pro",
    name: "محترف",
    icon: "\u{1F3C6}",
    color: "text-brand-gold",
    bgColor: "bg-brand-gold-light",
    minScore: 500,
    perks: [
      'شارة "بائع محترف"',
      "أولوية في البحث +25%",
      "إعلان مميز مجاني/شهر",
      "دعم أولوية",
    ],
  },
  {
    rank: "elite",
    name: "مكسب Elite",
    icon: "\u{1F48E}",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    minScore: 2000,
    perks: [
      'شارة "مكسب Elite" الحصرية',
      "أولوية قصوى في البحث +50%",
      "3 إعلانات مميزة مجانية/شهر",
      "متجر خاص بيك",
      "دعم VIP مباشر",
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────

const CACHE_KEY_PREFIX = "maksab_seller_rank_";
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface CachedRankData {
  breakdown: SellerScoreBreakdown;
  timestamp: number;
}

function getCached(userId: string): SellerScoreBreakdown | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${userId}`);
    if (!raw) return null;
    const cached: CachedRankData = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_DURATION_MS) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${userId}`);
      return null;
    }
    return cached.breakdown;
  } catch {
    return null;
  }
}

function setCache(userId: string, breakdown: SellerScoreBreakdown): void {
  if (typeof window === "undefined") return;
  try {
    const cached: CachedRankData = { breakdown, timestamp: Date.now() };
    localStorage.setItem(`${CACHE_KEY_PREFIX}${userId}`, JSON.stringify(cached));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

function invalidateCache(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${CACHE_KEY_PREFIX}${userId}`);
}

function getRankForScore(score: number): SellerRank {
  for (let i = SELLER_RANKS.length - 1; i >= 0; i--) {
    if (score >= SELLER_RANKS[i].minScore) {
      return SELLER_RANKS[i].rank;
    }
  }
  return "beginner";
}

function getNextRankForRank(rank: SellerRank): SellerRank | null {
  const order: SellerRank[] = ["beginner", "good", "pro", "elite"];
  const idx = order.indexOf(rank);
  return idx < order.length - 1 ? order[idx + 1] : null;
}

function getRankConfigByRank(rank: SellerRank): SellerRankConfig {
  return SELLER_RANKS.find((r) => r.rank === rank) ?? SELLER_RANKS[0];
}

// ── Core Functions ───────────────────────────────────────

/**
 * Calculate the seller's total score from all contributing factors.
 * Returns a full breakdown with score components.
 */
export async function calculateSellerScore(
  userId: string,
): Promise<SellerScoreBreakdown> {
  // Check cache first
  const cached = getCached(userId);
  if (cached) return cached;

  // Default breakdown (if queries fail or user is new)
  const defaultBreakdown: SellerScoreBreakdown = {
    totalScore: 0,
    rank: "beginner",
    nextRank: "good",
    pointsToNext: 100,
    progressPercent: 0,
    breakdown: {
      adsPosted: { count: 0, score: 0 },
      adsSold: { count: 0, score: 0 },
      positiveReviews: { count: 0, score: 0 },
      avgRating: { value: 0, score: 0 },
      responseRate: { value: 0, score: 0 },
      accountAge: { days: 0, score: 0 },
      commissionsCount: { count: 0, score: 0 },
    },
  };

  try {
    // Run all queries in parallel for performance
    const [
      adsCountRes,
      adsSoldRes,
      reviewsRes,
      profileRes,
      conversationsRes,
      respondedRes,
      commissionsRes,
    ] = await Promise.all([
      // 1. Count ads posted (any status except deleted)
      supabase
        .from("ads" as never)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .neq("status", "deleted"),

      // 2. Count ads sold
      supabase
        .from("ads" as never)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("status", ["sold", "exchanged"]),

      // 3. Get reviews with ratings
      supabase
        .from("reviews" as never)
        .select("rating")
        .eq("seller_id", userId),

      // 4. Get profile (for account age)
      supabase
        .from("profiles" as never)
        .select("created_at")
        .eq("id", userId)
        .maybeSingle(),

      // 5. Total conversations where user is seller (for response rate)
      supabase
        .from("conversations" as never)
        .select("id", { count: "exact", head: true })
        .eq("seller_id", userId),

      // 6. Conversations where seller responded (has at least one message from seller)
      supabase
        .from("conversations" as never)
        .select("id")
        .eq("seller_id", userId),

      // 7. Commission payments count
      supabase
        .from("commissions" as never)
        .select("id", { count: "exact", head: true })
        .eq("payer_id", userId)
        .eq("status", "paid"),
    ]);

    // ── Ads Posted ──
    const adsPostedCount = adsCountRes.count ?? 0;
    const adsPostedScore = Math.min(adsPostedCount * 10, 500); // 10 pts each, max 500

    // ── Ads Sold ──
    const adsSoldCount = adsSoldRes.count ?? 0;
    const adsSoldScore = adsSoldCount * 30; // 30 pts each, no max

    // ── Reviews & Rating ──
    const reviews = (reviewsRes.data as Record<string, unknown>[] | null) ?? [];
    const ratings = reviews.map((r) => Number(r.rating));
    const positiveCount = ratings.filter((r) => r >= 4).length;
    const positiveReviewsScore = positiveCount * 25; // 25 pts each

    let avgRatingValue = 0;
    let avgRatingScore = 0;
    if (ratings.length > 0) {
      avgRatingValue =
        Math.round(
          (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10,
        ) / 10;
      if (avgRatingValue >= 4.5) {
        avgRatingScore = 150;
      } else if (avgRatingValue >= 4.0) {
        avgRatingScore = 100;
      }
    }

    // ── Response Rate ──
    const totalConversations = conversationsRes.count ?? 0;
    let responseRate = 0;
    let responseRateScore = 0;

    if (totalConversations > 0 && respondedRes.data) {
      // Check which conversations the seller actually responded to
      const conversationIds = (
        respondedRes.data as Record<string, unknown>[]
      ).map((c) => c.id as string);

      if (conversationIds.length > 0) {
        // Count conversations where seller sent at least one message
        const { count: respondedCount } = await supabase
          .from("messages" as never)
          .select("conversation_id", { count: "exact", head: true })
          .eq("sender_id", userId)
          .in("conversation_id", conversationIds);

        const responded = respondedCount ?? 0;
        responseRate = Math.round((responded / totalConversations) * 100);
        responseRateScore = Math.round((responseRate / 100) * 50); // max 50 pts
      }
    }

    // ── Account Age ──
    let accountAgeDays = 0;
    let accountAgeScore = 0;
    if (profileRes.data) {
      const profile = profileRes.data as Record<string, unknown>;
      const createdAt = new Date(profile.created_at as string);
      accountAgeDays = Math.floor(
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      accountAgeScore = Math.min(accountAgeDays, 365); // 1 pt/day, max 365
    }

    // ── Commissions ──
    const commissionsCount = commissionsRes.count ?? 0;
    const commissionsScore = commissionsCount * 50; // 50 pts each

    // ── Total ──
    const totalScore =
      adsPostedScore +
      adsSoldScore +
      positiveReviewsScore +
      avgRatingScore +
      responseRateScore +
      accountAgeScore +
      commissionsScore;

    const rank = getRankForScore(totalScore);
    const nextRank = getNextRankForRank(rank);
    const currentConfig = getRankConfigByRank(rank);
    const nextConfig = nextRank ? getRankConfigByRank(nextRank) : null;

    const pointsToNext = nextConfig ? nextConfig.minScore - totalScore : 0;
    let progressPercent = 0;
    if (nextConfig) {
      const range = nextConfig.minScore - currentConfig.minScore;
      const progress = totalScore - currentConfig.minScore;
      progressPercent = range > 0 ? Math.min(100, Math.round((progress / range) * 100)) : 0;
    } else {
      progressPercent = 100;
    }

    const breakdown: SellerScoreBreakdown = {
      totalScore,
      rank,
      nextRank,
      pointsToNext: Math.max(0, pointsToNext),
      progressPercent,
      breakdown: {
        adsPosted: { count: adsPostedCount, score: adsPostedScore },
        adsSold: { count: adsSoldCount, score: adsSoldScore },
        positiveReviews: { count: positiveCount, score: positiveReviewsScore },
        avgRating: { value: avgRatingValue, score: avgRatingScore },
        responseRate: { value: responseRate, score: responseRateScore },
        accountAge: { days: accountAgeDays, score: accountAgeScore },
        commissionsCount: { count: commissionsCount, score: commissionsScore },
      },
    };

    // Cache the result
    setCache(userId, breakdown);

    return breakdown;
  } catch {
    return defaultBreakdown;
  }
}

/**
 * Get full seller rank profile including rank details, progress, and stats.
 */
export async function getSellerRank(userId: string): Promise<SellerRankProfile> {
  const scoreBreakdown = await calculateSellerScore(userId);
  const rankConfig = getRankConfigByRank(scoreBreakdown.rank);
  const nextRankKey = getNextRankForRank(scoreBreakdown.rank);
  const nextRankConfig = nextRankKey ? getRankConfigByRank(nextRankKey) : null;

  // Get member since date
  let memberSince = "";
  try {
    const { data } = await supabase
      .from("profiles" as never)
      .select("created_at")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      const profile = data as Record<string, unknown>;
      memberSince = profile.created_at as string;
    }
  } catch {
    // silent
  }

  return {
    userId,
    rank: scoreBreakdown.rank,
    rankConfig,
    score: scoreBreakdown.totalScore,
    nextRank: nextRankConfig,
    progressPercent: scoreBreakdown.progressPercent,
    memberSince,
    stats: {
      totalAds: scoreBreakdown.breakdown.adsPosted.count,
      totalSold: scoreBreakdown.breakdown.adsSold.count,
      avgRating: scoreBreakdown.breakdown.avgRating.value,
      totalReviews: scoreBreakdown.breakdown.positiveReviews.count,
      responseRate: scoreBreakdown.breakdown.responseRate.value,
    },
  };
}

/**
 * Get configuration for a specific rank level.
 */
export function getSellerRankConfig(rank: SellerRank): SellerRankConfig {
  return getRankConfigByRank(rank);
}

/**
 * Get search boost multiplier for a rank.
 * beginner: 1.0, good: 1.1, pro: 1.25, elite: 1.5
 */
export function getSearchBoost(rank: SellerRank): number {
  const boosts: Record<SellerRank, number> = {
    beginner: 1.0,
    good: 1.1,
    pro: 1.25,
    elite: 1.5,
  };
  return boosts[rank];
}

/**
 * Get display badge info for a seller rank.
 */
export function getSellerRankBadge(
  rank: SellerRank,
): { icon: string; name: string; color: string } {
  const config = getRankConfigByRank(rank);
  return {
    icon: config.icon,
    name: config.name,
    color: config.color,
  };
}

/**
 * Check if a seller has ranked up since last check.
 * Compares stored rank in profile with freshly calculated rank.
 * Returns the new rank info if a rank-up occurred, or null if not.
 */
export async function checkRankUp(
  userId: string,
): Promise<{ ranked_up: boolean; new_rank: SellerRank } | null> {
  try {
    // Invalidate cache so we get fresh data
    invalidateCache(userId);

    // Get current stored rank from profile
    const { data: profileData } = await supabase
      .from("profiles" as never)
      .select("seller_rank")
      .eq("id", userId)
      .maybeSingle();

    const storedRank: SellerRank =
      ((profileData as Record<string, unknown> | null)?.seller_rank as SellerRank) ||
      "beginner";

    // Calculate fresh rank
    const breakdown = await calculateSellerScore(userId);
    const newRank = breakdown.rank;

    // Check if rank improved
    const rankOrder: SellerRank[] = ["beginner", "good", "pro", "elite"];
    const oldIndex = rankOrder.indexOf(storedRank);
    const newIndex = rankOrder.indexOf(newRank);

    if (newIndex > oldIndex) {
      // Rank up! Update the profile
      await supabase
        .from("profiles" as never)
        .update({
          seller_rank: newRank,
          seller_score: breakdown.totalScore,
        } as never)
        .eq("id", userId);

      return { ranked_up: true, new_rank: newRank };
    }

    // No rank up, but still update the score
    if (breakdown.totalScore > 0) {
      await supabase
        .from("profiles" as never)
        .update({
          seller_rank: newRank,
          seller_score: breakdown.totalScore,
        } as never)
        .eq("id", userId);
    }

    return null;
  } catch {
    return null;
  }
}
