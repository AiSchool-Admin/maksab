/**
 * Ambassador Program Service ("سفير مكسب")
 *
 * Builds on top of the existing loyalty/referral system to add
 * tiered ambassador levels, tracking, and share-ready messages.
 *
 * Uses localStorage for caching + Supabase for data persistence.
 */

import { supabase } from "@/lib/supabase/client";
import {
  getUserLoyaltyProfile,
  getReferralLink,
} from "@/lib/loyalty/loyalty-service";

// ── Types ──────────────────────────────────────────────

export type AmbassadorTier = "none" | "bronze" | "silver" | "gold" | "platinum";

export interface AmbassadorTierConfig {
  tier: AmbassadorTier;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  minReferrals: number;
  rewardPerReferral: number;
  perks: string[];
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredUserName: string;
  referredUserAvatar: string | null;
  status: "signed_up" | "posted_ad" | "active";
  pointsEarned: number;
  createdAt: string;
}

export interface AmbassadorProfile {
  userId: string;
  tier: AmbassadorTier;
  tierConfig: AmbassadorTierConfig;
  nextTier: AmbassadorTierConfig | null;
  totalReferrals: number;
  activeReferrals: number;
  totalPointsFromReferrals: number;
  referralsToNextTier: number;
  progressPercent: number;
  referralCode: string;
  referralLink: string;
  recentReferrals: ReferralRecord[];
  monthlyReferrals: number;
}

export interface ShareMessage {
  platform: "whatsapp" | "sms" | "copy";
  message: string;
  url?: string;
}

// ── Tier Configuration ─────────────────────────────────

export const AMBASSADOR_TIERS: AmbassadorTierConfig[] = [
  {
    tier: "none",
    name: "مستخدم عادي",
    icon: "\u{1F464}",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    minReferrals: 0,
    rewardPerReferral: 200,
    perks: [],
  },
  {
    tier: "bronze",
    name: "سفير برونزي",
    icon: "\u{1F949}",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    minReferrals: 3,
    rewardPerReferral: 250,
    perks: ["250 نقطة لكل دعوة ناجحة", "شارة سفير برونزي"],
  },
  {
    tier: "silver",
    name: "سفير فضي",
    icon: "\u{1F948}",
    color: "text-slate-500",
    bgColor: "bg-slate-50",
    minReferrals: 10,
    rewardPerReferral: 350,
    perks: [
      "350 نقطة لكل دعوة",
      "شارة سفير فضي",
      "إعلان مميز مجاني كل شهر",
    ],
  },
  {
    tier: "gold",
    name: "سفير ذهبي",
    icon: "\u{1F947}",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    minReferrals: 25,
    rewardPerReferral: 500,
    perks: [
      "500 نقطة لكل دعوة",
      "شارة سفير ذهبي",
      "2 إعلان مميز/شهر",
      "أولوية في الدعم",
    ],
  },
  {
    tier: "platinum",
    name: "سفير بلاتيني",
    icon: "\u{1F4A0}",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    minReferrals: 50,
    rewardPerReferral: 750,
    perks: [
      "750 نقطة لكل دعوة",
      "شارة سفير بلاتيني الحصرية",
      "5 إعلانات مميزة/شهر",
      "دعم VIP",
      "هدايا حصرية من مكسب",
    ],
  },
];

// ── Local Storage Keys ─────────────────────────────────

const AMBASSADOR_CACHE_KEY = "maksab_ambassador_cache";
const REFERRAL_RECORDS_KEY = "maksab_referral_records";
const LOYALTY_STORAGE_KEY = "maksab_loyalty_points";

// ── Helpers ────────────────────────────────────────────

interface StoredLoyaltyData {
  points: number;
  transactions: Array<{
    id: string;
    userId: string;
    action: string;
    points: number;
    description: string;
    referenceId?: string;
    createdAt: string;
  }>;
  referralCode: string;
  referralCount: number;
  referredBy: string | null;
  freeFeatureAdsUsedThisMonth: number;
  lastMonthReset: string;
}

function getLoyaltyData(userId: string): StoredLoyaltyData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`${LOYALTY_STORAGE_KEY}_${userId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredLoyaltyData;
  } catch {
    return null;
  }
}

interface StoredReferralRecords {
  records: ReferralRecord[];
  updatedAt: string;
}

function getStoredReferralRecords(userId: string): ReferralRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(`${REFERRAL_RECORDS_KEY}_${userId}`);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as StoredReferralRecords;
    return data.records;
  } catch {
    return [];
  }
}

function saveReferralRecords(userId: string, records: ReferralRecord[]): void {
  if (typeof window === "undefined") return;
  const data: StoredReferralRecords = {
    records,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(`${REFERRAL_RECORDS_KEY}_${userId}`, JSON.stringify(data));
}

interface CachedAmbassadorProfile {
  profile: AmbassadorProfile;
  cachedAt: string;
}

function getCachedProfile(userId: string): AmbassadorProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`${AMBASSADOR_CACHE_KEY}_${userId}`);
  if (!raw) return null;
  try {
    const cached = JSON.parse(raw) as CachedAmbassadorProfile;
    // Cache valid for 5 minutes
    const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
    if (cacheAge > 5 * 60 * 1000) return null;
    return cached.profile;
  } catch {
    return null;
  }
}

function cacheProfile(userId: string, profile: AmbassadorProfile): void {
  if (typeof window === "undefined") return;
  const cached: CachedAmbassadorProfile = {
    profile,
    cachedAt: new Date().toISOString(),
  };
  localStorage.setItem(`${AMBASSADOR_CACHE_KEY}_${userId}`, JSON.stringify(cached));
}

// ── Core Functions ─────────────────────────────────────

/**
 * Calculate the ambassador tier from a referral count.
 */
export function getAmbassadorTier(referralCount: number): AmbassadorTier {
  // Walk tiers from highest to lowest
  for (let i = AMBASSADOR_TIERS.length - 1; i >= 0; i--) {
    if (referralCount >= AMBASSADOR_TIERS[i].minReferrals) {
      return AMBASSADOR_TIERS[i].tier;
    }
  }
  return "none";
}

/**
 * Get the config object for a specific tier.
 */
export function getAmbassadorTierConfig(tier: AmbassadorTier): AmbassadorTierConfig {
  return AMBASSADOR_TIERS.find((t) => t.tier === tier) || AMBASSADOR_TIERS[0];
}

/**
 * Get the next tier config above the given tier, or null if at max.
 */
function getNextTierConfig(tier: AmbassadorTier): AmbassadorTierConfig | null {
  const idx = AMBASSADOR_TIERS.findIndex((t) => t.tier === tier);
  if (idx < 0 || idx >= AMBASSADOR_TIERS.length - 1) return null;
  return AMBASSADOR_TIERS[idx + 1];
}

/**
 * Build referral records from the loyalty transaction history.
 *
 * Scans all localStorage loyalty entries to find users referred by this user,
 * and also attempts to fetch from Supabase.
 */
async function buildReferralRecords(userId: string): Promise<ReferralRecord[]> {
  const records: ReferralRecord[] = [];
  const seenUserIds = new Set<string>();

  // 1. Scan localStorage for users who were referred by this user
  if (typeof window !== "undefined") {
    const loyaltyData = getLoyaltyData(userId);
    if (loyaltyData) {
      // Find referral_signup transactions by this user (referenceId is the referred user's id)
      const referralTxns = loyaltyData.transactions.filter(
        (t) => t.action === "referral_signup" && t.referenceId
      );
      const firstAdTxns = loyaltyData.transactions.filter(
        (t) => t.action === "referral_first_ad" && t.referenceId
      );
      const firstAdUserIds = new Set(firstAdTxns.map((t) => t.referenceId));

      for (const txn of referralTxns) {
        const refUserId = txn.referenceId!;
        if (seenUserIds.has(refUserId)) continue;
        seenUserIds.add(refUserId);

        // Determine status: if they also triggered referral_first_ad, they posted an ad
        const hasPostedAd = firstAdUserIds.has(refUserId);
        let status: ReferralRecord["status"] = "signed_up";
        if (hasPostedAd) {
          status = "posted_ad";
          // Check if they have multiple transactions (active user heuristic)
          const refUserData = getLoyaltyData(refUserId);
          if (refUserData && refUserData.transactions.length >= 3) {
            status = "active";
          }
        }

        // Calculate total points earned from this referral
        let pointsEarned = txn.points;
        const firstAdTxn = firstAdTxns.find((t) => t.referenceId === refUserId);
        if (firstAdTxn) {
          pointsEarned += firstAdTxn.points;
        }

        // Try to get referred user's display info
        const refUserLoyalty = getLoyaltyData(refUserId);
        let displayName = "مستخدم جديد";
        let avatarUrl: string | null = null;

        // Check if we have profile data cached in localStorage
        if (typeof window !== "undefined") {
          const profileRaw = localStorage.getItem(`maksab_user_profile_${refUserId}`);
          if (profileRaw) {
            try {
              const profile = JSON.parse(profileRaw);
              if (profile.display_name) displayName = profile.display_name;
              if (profile.avatar_url) avatarUrl = profile.avatar_url;
            } catch {
              // ignore
            }
          }
        }

        records.push({
          id: txn.id,
          referrerId: userId,
          referredUserId: refUserId,
          referredUserName: displayName,
          referredUserAvatar: avatarUrl,
          status,
          pointsEarned,
          createdAt: txn.createdAt,
        });
      }
    }
  }

  // 2. Also try to fetch from Supabase for additional records
  try {
    const { data: supabaseReferrals } = await supabase
      .from("loyalty_points" as never)
      .select("id, user_id, points, reference_id, created_at")
      .eq("user_id" as never, userId as never)
      .eq("action" as never, "referral_signup" as never)
      .order("created_at" as never, { ascending: false } as never)
      .limit(50 as never);

    if (supabaseReferrals && Array.isArray(supabaseReferrals)) {
      for (const row of supabaseReferrals) {
        const rec = row as Record<string, unknown>;
        const refUserId = rec.reference_id as string;
        if (!refUserId || seenUserIds.has(refUserId)) continue;
        seenUserIds.add(refUserId);

        // Try fetching the referred user's profile from Supabase
        let displayName = "مستخدم جديد";
        let avatarUrl: string | null = null;
        try {
          const { data: profileRow } = await supabase
            .from("profiles" as never)
            .select("display_name, avatar_url")
            .eq("id" as never, refUserId as never)
            .maybeSingle();
          if (profileRow) {
            const p = profileRow as Record<string, unknown>;
            if (p.display_name) displayName = p.display_name as string;
            if (p.avatar_url) avatarUrl = p.avatar_url as string;
          }
        } catch {
          // ignore
        }

        records.push({
          id: rec.id as string,
          referrerId: userId,
          referredUserId: refUserId,
          referredUserName: displayName,
          referredUserAvatar: avatarUrl,
          status: "signed_up",
          pointsEarned: (rec.points as number) || 200,
          createdAt: (rec.created_at as string) || new Date().toISOString(),
        });
      }
    }
  } catch {
    // Supabase may not be available; rely on localStorage data
  }

  // Sort by newest first
  records.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Persist records to localStorage for caching
  saveReferralRecords(userId, records);

  return records;
}

/**
 * Get full ambassador dashboard data for a user.
 */
export async function getAmbassadorProfile(
  userId: string
): Promise<AmbassadorProfile> {
  // Check cache first
  const cached = getCachedProfile(userId);
  if (cached) return cached;

  // Get existing loyalty profile
  const loyaltyProfile = getUserLoyaltyProfile(userId);

  // Build referral records
  const records = await buildReferralRecords(userId);

  const totalReferrals = loyaltyProfile.referralCount;
  const activeReferrals = records.filter(
    (r) => r.status === "posted_ad" || r.status === "active"
  ).length;

  // Calculate total points from referrals
  const totalPointsFromReferrals = records.reduce(
    (sum, r) => sum + r.pointsEarned,
    0
  );

  // Determine tier
  const tier = getAmbassadorTier(totalReferrals);
  const tierConfig = getAmbassadorTierConfig(tier);
  const nextTier = getNextTierConfig(tier);

  // Calculate progress to next tier
  let referralsToNextTier = 0;
  let progressPercent = 100;
  if (nextTier) {
    referralsToNextTier = nextTier.minReferrals - totalReferrals;
    const currentTierMin = tierConfig.minReferrals;
    const nextTierMin = nextTier.minReferrals;
    const range = nextTierMin - currentTierMin;
    const progress = totalReferrals - currentTierMin;
    progressPercent = range > 0 ? Math.min(100, Math.round((progress / range) * 100)) : 0;
  }

  // Calculate monthly referrals
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);
  const monthlyReferrals = records.filter(
    (r) => new Date(r.createdAt) >= currentMonthStart
  ).length;

  const referralCode = loyaltyProfile.referralCode;
  const referralLink = getReferralLink(referralCode);

  const profile: AmbassadorProfile = {
    userId,
    tier,
    tierConfig,
    nextTier,
    totalReferrals,
    activeReferrals,
    totalPointsFromReferrals,
    referralsToNextTier,
    progressPercent,
    referralCode,
    referralLink,
    recentReferrals: records.slice(0, 20),
    monthlyReferrals,
  };

  // Cache result
  cacheProfile(userId, profile);

  return profile;
}

/**
 * Get referral history records for a user.
 */
export async function getReferralHistory(
  userId: string,
  limit: number = 20
): Promise<ReferralRecord[]> {
  // Try cached records first
  const cached = getStoredReferralRecords(userId);
  if (cached.length > 0) {
    return cached.slice(0, limit);
  }

  // Build fresh
  const records = await buildReferralRecords(userId);
  return records.slice(0, limit);
}

/**
 * Get referral stats for the current month.
 */
export async function getMonthlyReferralStats(
  userId: string
): Promise<{
  monthlyReferrals: number;
  monthlyPointsEarned: number;
  monthName: string;
}> {
  const records = await getReferralHistory(userId, 100);

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthlyRecords = records.filter(
    (r) => new Date(r.createdAt) >= currentMonthStart
  );

  const monthlyReferrals = monthlyRecords.length;
  const monthlyPointsEarned = monthlyRecords.reduce(
    (sum, r) => sum + r.pointsEarned,
    0
  );

  const monthName = now.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });

  return {
    monthlyReferrals,
    monthlyPointsEarned,
    monthName,
  };
}

/**
 * Generate pre-made share messages for different platforms.
 */
export function generateShareMessages(referralCode: string): ShareMessage[] {
  const link = getReferralLink(referralCode);

  return [
    {
      platform: "whatsapp",
      message: `جرّب تطبيق مكسب — أسهل سوق في مصر! \u{1F1EA}\u{1F1EC}\nبيع واشتري وبدّل أي حاجة بسهولة.\nسجّل من هنا: ${link}\nكل صفقة مكسب \u{1F49A}`,
      url: `https://wa.me/?text=${encodeURIComponent(`جرّب تطبيق مكسب — أسهل سوق في مصر! \u{1F1EA}\u{1F1EC}\nبيع واشتري وبدّل أي حاجة بسهولة.\nسجّل من هنا: ${link}\nكل صفقة مكسب \u{1F49A}`)}`,
    },
    {
      platform: "sms",
      message: `جرّب مكسب — أسهل سوق في مصر للبيع والشراء والتبديل! سجّل من الرابط ده: ${link}`,
      url: `sms:?body=${encodeURIComponent(`جرّب مكسب — أسهل سوق في مصر للبيع والشراء والتبديل! سجّل من الرابط ده: ${link}`)}`,
    },
    {
      platform: "copy",
      message: `مكسب — كل صفقة مكسب \u{1F49A}\nسوق مصري للبيع والشراء والتبديل.\nسجّل من هنا واكسب نقاط: ${link}\nكود الدعوة: ${referralCode}`,
    },
  ];
}
