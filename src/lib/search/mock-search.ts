/**
 * Mock search engine — will be replaced with Supabase full-text search.
 * Implements fuzzy matching via trigram similarity.
 */

import type { MockAd } from "@/lib/mock-data";
import { recommendedAds, auctionAds } from "@/lib/mock-data";

/* ── Searchable ad type (extends MockAd with category info) ─────────── */

interface SearchableAd extends MockAd {
  categoryId: string;
  condition?: string;
}

/* ── Search request / response ──────────────────────────────────────── */

export interface SearchFilters {
  query?: string;
  category?: string;
  subcategory?: string;
  saleType?: "cash" | "auction" | "exchange";
  priceMin?: number;
  priceMax?: number;
  governorate?: string;
  condition?: string;
  sortBy?: "newest" | "price_asc" | "price_desc";
  categoryFilters?: Record<string, string>;
}

export interface SearchResult {
  ads: MockAd[];
  total: number;
  hasMore: boolean;
}

/* ── Build searchable ad pool ───────────────────────────────────────── */

const now = Date.now();
const hour = 3600000;
const day = 86400000;

/** Infer categoryId from ad title */
function inferCategory(title: string): string {
  const lower = title;
  if (/تويوتا|هيونداي|كورولا|لانسر|سيارة/.test(lower)) return "cars";
  if (/شقة|فيلا|أرض|م²/.test(lower)) return "real_estate";
  if (/آيفون|ايفون|سامسونج|شاومي|ريدمي|موبايل/.test(lower)) return "phones";
  if (/جاكت|فستان|حذاء|ملابس/.test(lower)) return "fashion";
  if (/خردة|حديد|نحاس/.test(lower)) return "scrap";
  if (/ذهب|فضة|سلسلة.*عيار/.test(lower)) return "gold";
  if (/Louis|Gucci|Rolex|شنطة.*أصلي/.test(lower)) return "luxury";
  if (/غسالة|ثلاجة|بوتاجاز|مكيف|توشيبا/.test(lower)) return "appliances";
  if (/غرفة نوم|سفرة|أنتريه|أثاث|سجاد/.test(lower)) return "furniture";
  if (/بلايستيشن|إكسبوكس|كاميرا|دراجة|ماك بوك/.test(lower)) return "hobbies";
  if (/شنيور|عدة|معدات/.test(lower)) return "tools";
  if (/سباك|كهربائي|نقاش|نجار|صيانة/.test(lower)) return "services";
  return "other";
}

/** Additional mock ads to expand the search pool */
const extraAds: SearchableAd[] = [
  {
    id: "s-1", title: "هيونداي توسان 2023 — 15,000 كم — فابريكا",
    price: 850000, saleType: "cash", image: null,
    governorate: "القاهرة", city: "مصر الجديدة",
    createdAt: new Date(now - 4 * hour).toISOString(),
    isNegotiable: true, categoryId: "cars", condition: "used",
  },
  {
    id: "s-2", title: "شقة 200م² — 4 غرف — سوبر لوكس — مصر الجديدة",
    price: 3500000, saleType: "cash", image: null,
    governorate: "القاهرة", city: "مصر الجديدة",
    createdAt: new Date(now - 2 * day).toISOString(),
    categoryId: "real_estate", condition: "super_lux",
  },
  {
    id: "s-3", title: "آيفون 15 — 128GB — مستعمل زيرو",
    price: 32000, saleType: "cash", image: null,
    governorate: "الجيزة", city: "6 أكتوبر",
    createdAt: new Date(now - 6 * hour).toISOString(),
    categoryId: "phones", condition: "like_new",
  },
  {
    id: "s-4", title: "آيفون 14 برو ماكس — 256GB — مستعمل ممتاز",
    price: null, saleType: "exchange", image: null,
    governorate: "القاهرة", city: "المعادي",
    createdAt: new Date(now - 10 * hour).toISOString(),
    exchangeDescription: "سامسونج S24 Ultra",
    categoryId: "phones", condition: "excellent",
  },
  {
    id: "s-5", title: "خاتم ذهب عيار 21 — 8 جرام — جديد",
    price: 40000, saleType: "cash", image: null,
    governorate: "القاهرة", city: "وسط البلد",
    createdAt: new Date(now - 1 * day).toISOString(),
    categoryId: "gold", condition: "new",
  },
  {
    id: "s-6", title: "سلسلة فضة 925 — 30 جرام — مستعمل",
    price: 2500, saleType: "cash", image: null,
    governorate: "الإسكندرية", city: "سموحة",
    createdAt: new Date(now - 3 * day).toISOString(),
    categoryId: "gold", condition: "used",
  },
  {
    id: "s-7", title: "نيسان صني 2019 — 60,000 كم",
    price: 280000, saleType: "cash", image: null,
    governorate: "الجيزة", city: "فيصل",
    createdAt: new Date(now - 8 * hour).toISOString(),
    isNegotiable: true, categoryId: "cars", condition: "used",
  },
  {
    id: "s-8", title: "شاومي ريدمي نوت 12 — 128GB — جديد متبرشم",
    price: 7500, saleType: "cash", image: null,
    governorate: "المنصورة", city: null,
    createdAt: new Date(now - 12 * hour).toISOString(),
    categoryId: "phones", condition: "sealed",
  },
  {
    id: "s-9", title: "ثلاجة شارب 16 قدم — 2023 — مستعملة ممتاز",
    price: 12000, saleType: "cash", image: null,
    governorate: "القاهرة", city: "عين شمس",
    createdAt: new Date(now - 15 * hour).toISOString(),
    categoryId: "appliances", condition: "excellent",
  },
  {
    id: "s-10", title: "غرفة نوم خشب زان — 6 قطع — جديدة",
    price: 35000, saleType: "cash", image: null,
    governorate: "دمياط", city: null,
    createdAt: new Date(now - 2 * day).toISOString(),
    categoryId: "furniture", condition: "new",
  },
  {
    id: "s-11", title: "فيات تيبو 2021 — 35,000 كم — أوتوماتيك",
    price: null, saleType: "auction", image: null,
    governorate: "القاهرة", city: "مدينة نصر",
    createdAt: new Date(now - 18 * hour).toISOString(),
    auctionHighestBid: 310000, auctionEndsAt: new Date(now + 8 * hour).toISOString(),
    auctionBidsCount: 9, categoryId: "cars", condition: "used",
  },
  {
    id: "s-12", title: "شقة 120م² — 2 غرف — نص تشطيب — 6 أكتوبر",
    price: 900000, saleType: "cash", image: null,
    governorate: "الجيزة", city: "6 أكتوبر",
    createdAt: new Date(now - 5 * day).toISOString(),
    categoryId: "real_estate", condition: "semi",
  },
  {
    id: "s-13", title: "سامسونج S23 — 256GB — مستعمل كويس",
    price: 15000, saleType: "cash", image: null,
    governorate: "القاهرة", city: "التجمع الخامس",
    createdAt: new Date(now - 20 * hour).toISOString(),
    categoryId: "phones", condition: "good",
  },
  {
    id: "s-14", title: "بوتاجاز يونيفرسال 5 شعلة — 2022",
    price: 6500, saleType: "cash", image: null,
    governorate: "القليوبية", city: "بنها",
    createdAt: new Date(now - 3 * day).toISOString(),
    categoryId: "appliances", condition: "good",
  },
  {
    id: "s-15", title: "دبلة ذهب عيار 18 — 5 جرام — مستعمل",
    price: 18000, saleType: "cash", image: null,
    governorate: "القاهرة", city: "شبرا",
    createdAt: new Date(now - 4 * day).toISOString(),
    categoryId: "gold", condition: "used",
  },
  {
    id: "s-16", title: "تويوتا كورولا 2018 — 80,000 كم",
    price: null, saleType: "exchange", image: null,
    governorate: "القاهرة", city: "حلوان",
    createdAt: new Date(now - 7 * hour).toISOString(),
    exchangeDescription: "هيونداي توسان أو كيا سبورتاج",
    categoryId: "cars", condition: "used",
  },
  {
    id: "s-17", title: "شنطة Gucci Marmont — أصلي بالضمان — جديدة",
    price: 45000, saleType: "cash", image: null,
    governorate: "القاهرة", city: "الزمالك",
    createdAt: new Date(now - 2 * day).toISOString(),
    categoryId: "luxury", condition: "sealed",
  },
  {
    id: "s-18", title: "سباك خبرة 10+ سنوات — القاهرة والجيزة",
    price: null, saleType: "cash", image: null,
    governorate: "القاهرة", city: null,
    createdAt: new Date(now - 1 * day).toISOString(),
    categoryId: "services",
  },
  {
    id: "s-19", title: "فيلا 350م² — 4 غرف — حديقة — التجمع الخامس",
    price: 8500000, saleType: "cash", image: null,
    governorate: "القاهرة", city: "التجمع الخامس",
    createdAt: new Date(now - 6 * day).toISOString(),
    categoryId: "real_estate",
  },
  {
    id: "s-20", title: "مكيف كاريير 1.5 حصان — 2024 — جديد متبرشم",
    price: 18000, saleType: "cash", image: null,
    governorate: "الجيزة", city: "الشيخ زايد",
    createdAt: new Date(now - 9 * hour).toISOString(),
    categoryId: "appliances", condition: "sealed",
  },
  {
    id: "s-21", title: "حديد خردة — 2 طن — نظيف",
    price: 50000, saleType: "auction", image: null,
    governorate: "القليوبية", city: "شبرا الخيمة",
    createdAt: new Date(now - 14 * hour).toISOString(),
    auctionHighestBid: 55000, auctionEndsAt: new Date(now + 24 * hour).toISOString(),
    auctionBidsCount: 6, categoryId: "scrap",
  },
  {
    id: "s-22", title: "آيفون 15 برو — 256GB — مستعمل ممتاز",
    price: 42000, saleType: "cash", image: null,
    governorate: "القاهرة", city: "مدينة نصر",
    createdAt: new Date(now - 3 * hour).toISOString(),
    categoryId: "phones", condition: "excellent",
  },
  {
    id: "s-23", title: "سامسونج S24 Ultra — 512GB — جديد",
    price: 55000, saleType: "auction", image: null,
    governorate: "القاهرة", city: "التجمع الخامس",
    createdAt: new Date(now - 5 * hour).toISOString(),
    auctionHighestBid: 48000, auctionEndsAt: new Date(now + 18 * hour).toISOString(),
    auctionBidsCount: 8, categoryId: "phones", condition: "sealed",
  },
  {
    id: "s-24", title: "كيا سيراتو 2022 — 25,000 كم — فابريكا",
    price: 550000, saleType: "cash", image: null,
    governorate: "الجيزة", city: "6 أكتوبر",
    createdAt: new Date(now - 11 * hour).toISOString(),
    isNegotiable: true, categoryId: "cars", condition: "used",
  },
];

/** Merge all sources into one searchable pool */
const searchPool: SearchableAd[] = [
  ...recommendedAds.map((ad) => ({
    ...ad,
    categoryId: inferCategory(ad.title),
  })),
  ...auctionAds.map((ad) => ({
    ...ad,
    categoryId: inferCategory(ad.title),
  })),
  ...extraAds,
];

/* ── Trigram fuzzy matching ─────────────────────────────────────────── */

function getTrigrams(text: string): Set<string> {
  const padded = `  ${text}  `;
  const trigrams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.slice(i, i + 3));
  }
  return trigrams;
}

function trigramSimilarity(a: string, b: string): number {
  const triA = getTrigrams(a);
  const triB = getTrigrams(b);
  let intersection = 0;
  for (const t of triA) {
    if (triB.has(t)) intersection++;
  }
  const union = triA.size + triB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Check if ad title matches query (exact substring or fuzzy) */
function matchesQuery(ad: SearchableAd, query: string): number {
  if (!query) return 1;

  const title = ad.title;
  const desc = ad.exchangeDescription || "";

  // Exact substring match is highest score
  if (title.includes(query)) return 2;
  if (desc.includes(query)) return 1.5;

  // Check each query word
  const words = query.split(/\s+/).filter(Boolean);
  let matchedWords = 0;
  for (const word of words) {
    if (word.length < 2) continue;
    if (title.includes(word) || desc.includes(word)) {
      matchedWords++;
    }
  }
  if (words.length > 0 && matchedWords > 0) {
    return 0.5 + (matchedWords / words.length);
  }

  // Fuzzy trigram match
  const similarity = trigramSimilarity(title, query);
  if (similarity > 0.2) return similarity;

  return 0;
}

/* ── Main search function ───────────────────────────────────────────── */

const PAGE_SIZE = 12;

export async function searchAds(
  filters: SearchFilters,
  page: number = 0,
): Promise<SearchResult> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 300));

  let results = searchPool.filter((ad) => {
    // Category filter
    if (filters.category && ad.categoryId !== filters.category) return false;

    // Sale type filter
    if (filters.saleType && ad.saleType !== filters.saleType) return false;

    // Price range filter
    const adPrice =
      ad.saleType === "auction" ? (ad.auctionHighestBid ?? ad.price) : ad.price;
    if (filters.priceMin != null && (adPrice == null || adPrice < filters.priceMin))
      return false;
    if (filters.priceMax != null && (adPrice == null || adPrice > filters.priceMax))
      return false;

    // Governorate filter
    if (filters.governorate && ad.governorate !== filters.governorate) return false;

    // Condition filter (check title for condition keywords)
    if (filters.condition) {
      const conditionKeywords: Record<string, string[]> = {
        new: ["جديد", "متبرشم", "زيرو"],
        used: ["مستعمل", "مستعملة"],
        needs_repair: ["يحتاج صيانة", "يحتاج تجديد"],
      };
      const keywords = conditionKeywords[filters.condition] || [];
      if (keywords.length > 0 && !keywords.some((kw) => ad.title.includes(kw))) {
        return false;
      }
    }

    return true;
  });

  // Text query matching — score and filter
  if (filters.query) {
    const scored = results
      .map((ad) => ({ ad, score: matchesQuery(ad, filters.query!) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);
    results = scored.map(({ ad }) => ad);
  }

  const total = results.length;

  // Sorting (only when no text query — text query uses relevance)
  if (!filters.query || filters.sortBy) {
    switch (filters.sortBy) {
      case "price_asc":
        results.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
        break;
      case "price_desc":
        results.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case "newest":
      default:
        if (!filters.query) {
          results.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        }
        break;
    }
  }

  // Paginate
  const start = page * PAGE_SIZE;
  const paged = results.slice(start, start + PAGE_SIZE);

  return {
    ads: paged,
    total,
    hasMore: start + PAGE_SIZE < total,
  };
}

/**
 * Get "similar" ads — relaxed search for the "شبيه اللي بتدور عليه" section.
 * Returns ads from a related category or with partial keyword overlap.
 */
export async function getSimilarSearchAds(
  filters: SearchFilters,
): Promise<MockAd[]> {
  // Find ads that partially match but aren't in the main results
  const mainResults = await searchAds(filters, 0);
  const mainIds = new Set(mainResults.ads.map((a) => a.id));

  const similar: { ad: SearchableAd; score: number }[] = [];

  for (const ad of searchPool) {
    if (mainIds.has(ad.id)) continue;

    let score = 0;

    // Same category boosts score
    if (filters.category && ad.categoryId === filters.category) score += 2;

    // Partial query word match
    if (filters.query) {
      const words = filters.query.split(/\s+/).filter((w) => w.length >= 2);
      for (const word of words) {
        if (ad.title.includes(word)) score += 1;
      }
    }

    // Same governorate
    if (filters.governorate && ad.governorate === filters.governorate) score += 1;

    // Different sale type is interesting for diversity
    if (filters.saleType && ad.saleType !== filters.saleType) score += 0.5;

    if (score > 0) similar.push({ ad, score });
  }

  return similar
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ ad }) => ad);
}

/** Popular search terms */
export const popularSearches = [
  "تويوتا كورولا",
  "آيفون 15",
  "شقق القاهرة",
  "ذهب عيار 21",
  "سامسونج S24",
  "غسالة توشيبا",
];
