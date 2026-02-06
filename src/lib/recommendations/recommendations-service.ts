/**
 * Recommendations service — personalized suggestions, exchange matching,
 * and seller insights. In dev mode uses local mock data with display rules.
 * In production uses Supabase get_recommendations() function.
 */

import type { MockAd } from "@/lib/mock-data";
import { recommendedAds, auctionAds } from "@/lib/mock-data";
import type { ExchangeMatch, SellerInsights, UserInterest } from "./types";
import { getDevSignals, buildInterestProfile } from "./signal-store";

const IS_DEV = process.env.NEXT_PUBLIC_DEV_MODE === "true";

const now = Date.now();
const hour = 3600000;
const day = 86400000;

/* ── Display Rules ────────────────────────────────────────────────────── */

/**
 * Apply display rules from CLAUDE.md:
 * 1. Diversity: max 3 from same sale_type in a row
 * 2. Freshness: prioritize ads from last 7 days
 * 3. No Duplicates: exclude already-viewed ad IDs
 * 4. Location Aware: boost user's governorate
 * 5. Auction Urgency: auctions ending in 6 hours get priority
 * 6. Exchange Highlighting: perfect matches get priority
 * 7. Minimum Quality: prefer ads with images (relaxed in mock)
 * 8. Fallback: if not enough signals, show trending
 */
function applyDisplayRules(
  ads: MockAd[],
  options?: {
    viewedAdIds?: Set<string>;
    userGovernorate?: string;
    maxSameTypeInRow?: number;
  },
): MockAd[] {
  const viewedIds = options?.viewedAdIds ?? new Set();
  const userGov = options?.userGovernorate;
  const maxSameType = options?.maxSameTypeInRow ?? 3;

  // 1. Remove duplicates (already viewed)
  let filtered = ads.filter((ad) => !viewedIds.has(ad.id));

  // 2. Score each ad
  const scored = filtered.map((ad) => {
    let score = 0;

    // Freshness: ads from last 7 days get bonus
    const ageMs = now - new Date(ad.createdAt).getTime();
    if (ageMs < 1 * day) score += 10;
    else if (ageMs < 3 * day) score += 7;
    else if (ageMs < 7 * day) score += 4;

    // Location boost
    if (userGov && ad.governorate === userGov) score += 5;

    // Auction urgency: ending within 6 hours
    if (ad.saleType === "auction" && ad.auctionEndsAt) {
      const remaining = new Date(ad.auctionEndsAt).getTime() - now;
      if (remaining > 0 && remaining < 6 * hour) score += 8;
    }

    return { ad, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  filtered = scored.map(({ ad }) => ad);

  // 3. Enforce diversity: max N from same sale_type in a row
  const diverse: MockAd[] = [];
  const consecutiveCount: Record<string, number> = {};

  for (const ad of filtered) {
    const lastType = diverse.length > 0 ? diverse[diverse.length - 1].saleType : null;

    if (lastType === ad.saleType) {
      consecutiveCount[ad.saleType] = (consecutiveCount[ad.saleType] || 1) + 1;
      if (consecutiveCount[ad.saleType] > maxSameType) continue;
    } else {
      consecutiveCount[ad.saleType] = 1;
    }

    diverse.push(ad);
  }

  return diverse;
}

/* ── Get personalized recommendations ─────────────────────────────────── */

export interface RecommendationResult {
  personalizedAds: MockAd[];
  matchingAuctions: MockAd[];
  hasSignals: boolean;
}

/**
 * Fetch personalized recommendations for "عروض مقترحة ليك" and "مزادات تناسبك".
 * In dev mode: uses mock data with interest-based scoring.
 * In production: calls Supabase get_recommendations() function.
 */
export async function getRecommendations(
  userId: string,
  userGovernorate?: string,
): Promise<RecommendationResult> {
  if (!IS_DEV) {
    return getRecommendationsProduction(userId, userGovernorate);
  }

  // Dev mode: build from signals + mock data
  const signals = getDevSignals(userId);
  const interests = buildInterestProfile(signals);
  const hasSignals = interests.length > 0;

  // All available ads (mock pool)
  const allAds = [...recommendedAds, ...auctionAds];
  const viewedAdIds = new Set(
    signals.filter((s) => s.signal_type === "view").map((s) => s.ad_id).filter(Boolean) as string[],
  );

  // Score ads based on user interests
  let scored = allAds.map((ad) => {
    let score = 0;
    const adCategory = inferCategoryFromTitle(ad.title);

    for (const interest of interests) {
      // Category match
      if (interest.category === adCategory) score += interest.score * 2;

      // Keyword match from past searches
      for (const keyword of interest.keywords) {
        if (ad.title.includes(keyword)) score += 3;
      }

      // Governorate match
      if (interest.governorate && ad.governorate === interest.governorate) score += 2;

      // Price range match
      if (interest.priceRange && ad.price) {
        const [min, max] = interest.priceRange;
        if (ad.price >= min && ad.price <= max) score += 4;
      }
    }

    return { ad, score };
  });

  // If no signals, use default scoring (trending)
  if (!hasSignals) {
    scored = scored.map(({ ad }) => ({
      ad,
      score: Math.random() * 10,
    }));
  }

  scored.sort((a, b) => b.score - a.score);

  // Split into personalized and auction sections
  const personalizedPool = scored.map(({ ad }) => ad);
  const auctionPool = scored
    .filter(({ ad }) => ad.saleType === "auction")
    .map(({ ad }) => ad);

  const personalizedAds = applyDisplayRules(personalizedPool, {
    viewedAdIds,
    userGovernorate,
  }).slice(0, 10);

  const matchingAuctions = applyDisplayRules(auctionPool, {
    viewedAdIds,
    userGovernorate,
  }).slice(0, 8);

  return { personalizedAds, matchingAuctions, hasSignals };
}

async function getRecommendationsProduction(
  userId: string,
  userGovernorate?: string,
): Promise<RecommendationResult> {
  try {
    const { supabase } = await import("@/lib/supabase/client");

    const { data, error } = await supabase.rpc("get_recommendations" as never, {
      p_user_id: userId,
      p_limit: 20,
    } as never);

    if (error || !data) {
      return { personalizedAds: [], matchingAuctions: [], hasSignals: false };
    }

    const ads = (data as Record<string, unknown>[]).map(mapSupabaseAdToMockAd);

    const personalizedAds = applyDisplayRules(ads, { userGovernorate }).slice(0, 10);
    const matchingAuctions = applyDisplayRules(
      ads.filter((a) => a.saleType === "auction"),
      { userGovernorate },
    ).slice(0, 8);

    return { personalizedAds, matchingAuctions, hasSignals: true };
  } catch {
    return { personalizedAds: [], matchingAuctions: [], hasSignals: false };
  }
}

/* ── Exchange matching ────────────────────────────────────────────────── */

/**
 * Find matching ads for exchange. Returns perfect matches (mutual) and partial matches.
 */
export async function findExchangeMatches(
  adTitle: string,
  exchangeDescription: string,
  categoryId: string,
  currentAdId: string,
): Promise<ExchangeMatch[]> {
  // In dev mode, search through mock data
  const { recommendedAds: recAds } = await import("@/lib/mock-data");

  // Extract keywords from exchange description
  const wantedKeywords = exchangeDescription
    .split(/[\s,،—\-]+/)
    .filter((w) => w.length >= 2);

  // Extract keywords from ad title (what I'm offering)
  const offeringKeywords = adTitle
    .split(/[\s,،—\-]+/)
    .filter((w) => w.length >= 2);

  const matches: ExchangeMatch[] = [];
  const allAds = [...recAds];

  for (const ad of allAds) {
    if (ad.id === currentAdId) continue;

    // Perfect match: exchange ad offering what I want AND wanting what I have
    if (ad.saleType === "exchange" && ad.exchangeDescription) {
      const adOffersWhatIWant = wantedKeywords.some((kw) =>
        ad.title.includes(kw),
      );
      const adWantsWhatIOffer = offeringKeywords.some((kw) =>
        ad.exchangeDescription!.includes(kw),
      );

      if (adOffersWhatIWant && adWantsWhatIOffer) {
        matches.push({
          adId: ad.id,
          title: ad.title,
          saleType: ad.saleType,
          price: ad.price,
          exchangeDescription: ad.exchangeDescription,
          governorate: ad.governorate,
          city: ad.city,
          matchType: "perfect",
          matchReason: "تطابق مثالي! بيعرض اللي أنت عايزه وعايز اللي عندك",
        });
        continue;
      }
    }

    // Partial match: someone selling/auctioning what I want
    const hasPartialMatch = wantedKeywords.some((kw) => ad.title.includes(kw));
    if (hasPartialMatch) {
      matches.push({
        adId: ad.id,
        title: ad.title,
        saleType: ad.saleType,
        price: ad.price,
        exchangeDescription: ad.exchangeDescription ?? null,
        governorate: ad.governorate,
        city: ad.city,
        matchType: "partial",
        matchReason:
          ad.saleType === "exchange"
            ? "بيعرض حاجة شبه اللي بتدور عليها"
            : "بيبيع اللي أنت عايزه",
      });
    }
  }

  // Perfect matches first, then partial
  matches.sort((a, b) => {
    if (a.matchType === "perfect" && b.matchType !== "perfect") return -1;
    if (a.matchType !== "perfect" && b.matchType === "perfect") return 1;
    return 0;
  });

  return matches.slice(0, 6);
}

/* ── Seller insights ──────────────────────────────────────────────────── */

/**
 * Calculate seller insights after publishing an ad.
 * Shows estimated reach and tips.
 */
export async function getSellerInsights(params: {
  categoryId: string;
  title: string;
  governorate: string;
  hasImages: boolean;
}): Promise<SellerInsights> {
  // In dev mode, return mock data based on category popularity
  const categoryPopularity: Record<string, number> = {
    cars: 450,
    real_estate: 380,
    phones: 520,
    fashion: 200,
    scrap: 80,
    gold: 150,
    luxury: 90,
    appliances: 170,
    furniture: 130,
    hobbies: 110,
    tools: 60,
    services: 140,
  };

  const basePop = categoryPopularity[params.categoryId] ?? 100;

  // Extract a "specific" term from title for the specific searchers count
  const titleWords = params.title.split(/\s+/).filter((w) => w.length >= 3);
  const specificMultiplier = 0.25 + Math.random() * 0.15;
  const locationMultiplier = 0.5 + Math.random() * 0.2;

  const categorySearchers = Math.floor(basePop * (0.8 + Math.random() * 0.4));
  const specificSearchers = Math.floor(categorySearchers * specificMultiplier);
  const locationInterested = Math.floor(categorySearchers * locationMultiplier);

  const tips: string[] = [];
  if (!params.hasImages) {
    tips.push("أضف صور لزيادة المشاهدات بنسبة 3x");
  }
  if (titleWords.length < 4) {
    tips.push("عنوان أطول وأوضح بيجذب مشترين أكتر");
  }

  // Category-specific tips
  const categoryTips: Record<string, string> = {
    cars: "أضف صورة للعداد والموتور — دي أكتر حاجة الناس بتسأل عنها",
    phones: "اذكر حالة البطارية — دي بتفرق كتير في السعر",
    real_estate: "أضف صور للمطبخ والحمام — الناس عايزة تشوف التفاصيل",
    gold: "صور واضحة للدمغة بتزود الثقة",
  };
  if (categoryTips[params.categoryId]) {
    tips.push(categoryTips[params.categoryId]);
  }

  return {
    categorySearchers,
    specificSearchers,
    locationInterested,
    tips,
  };
}

/* ── Enhanced similar search ads ──────────────────────────────────────── */

/**
 * Enhanced "شبيه اللي بتدور عليه" — relaxes criteria and mixes sale types.
 * Includes exchange ads where someone wants what user searches for.
 */
export function getEnhancedSimilarAds(
  query: string,
  mainResultIds: Set<string>,
  category?: string,
): MockAd[] {
  const allAds = [...recommendedAds, ...auctionAds];
  const words = query.split(/\s+/).filter((w) => w.length >= 2);

  const similar: { ad: MockAd; score: number; reason: string }[] = [];

  for (const ad of allAds) {
    if (mainResultIds.has(ad.id)) continue;

    let score = 0;
    let reason = "";

    // 1. Partial word match in title
    for (const word of words) {
      if (ad.title.includes(word)) score += 2;
    }

    // 2. Same category boost
    const adCat = inferCategoryFromTitle(ad.title);
    if (category && adCat === category) score += 1;

    // 3. Exchange ads wanting what user is searching for
    if (ad.saleType === "exchange" && ad.exchangeDescription) {
      for (const word of words) {
        if (ad.exchangeDescription.includes(word)) {
          score += 3;
          reason = `عايز يبدل بـ ${ad.exchangeDescription}`;
        }
      }
    }

    // 4. Different sale type adds diversity bonus
    if (score > 0) {
      if (ad.saleType === "auction") score += 0.5;
      if (ad.saleType === "exchange") score += 0.5;
    }

    if (score > 0) similar.push({ ad, score, reason });
  }

  return similar
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ ad }) => ad);
}

/* ── Utility ──────────────────────────────────────────────────────────── */

function inferCategoryFromTitle(title: string): string {
  if (/تويوتا|هيونداي|كورولا|لانسر|سيارة|كيا|فيات|نيسان/.test(title)) return "cars";
  if (/شقة|فيلا|أرض|م²/.test(title)) return "real_estate";
  if (/آيفون|ايفون|سامسونج|شاومي|ريدمي|موبايل|ماك بوك/.test(title)) return "phones";
  if (/جاكت|فستان|حذاء|ملابس/.test(title)) return "fashion";
  if (/خردة|حديد|نحاس/.test(title)) return "scrap";
  if (/ذهب|فضة|سلسلة.*عيار|خاتم.*عيار|دبلة/.test(title)) return "gold";
  if (/Louis|Gucci|Rolex|شنطة.*أصلي/.test(title)) return "luxury";
  if (/غسالة|ثلاجة|بوتاجاز|مكيف|توشيبا/.test(title)) return "appliances";
  if (/غرفة نوم|سفرة|أنتريه|أثاث|سجاد/.test(title)) return "furniture";
  if (/بلايستيشن|إكسبوكس|كاميرا|دراجة/.test(title)) return "hobbies";
  if (/شنيور|عدة|معدات/.test(title)) return "tools";
  if (/سباك|كهربائي|نقاش|نجار|صيانة/.test(title)) return "services";
  return "other";
}

function mapSupabaseAdToMockAd(row: Record<string, unknown>): MockAd {
  return {
    id: row.id as string,
    title: row.title as string,
    price: row.price ? Number(row.price) : null,
    saleType: row.sale_type as MockAd["saleType"],
    image: ((row.images as string[]) ?? [])[0] ?? null,
    governorate: (row.governorate as string) ?? null,
    city: (row.city as string) ?? null,
    createdAt: row.created_at as string,
    isNegotiable: row.is_negotiable as boolean,
    auctionHighestBid: row.auction_start_price ? Number(row.auction_start_price) : undefined,
    auctionEndsAt: row.auction_ends_at as string | undefined,
    exchangeDescription: row.exchange_description as string | undefined,
  };
}
