/**
 * Mock data for development — will be replaced with Supabase queries.
 * Covers all 3 sale types across multiple categories.
 */

export interface MockAd {
  id: string;
  title: string;
  price: number | null;
  saleType: "cash" | "auction" | "exchange";
  image: string | null;
  governorate: string | null;
  city: string | null;
  createdAt: string;
  isNegotiable?: boolean;
  auctionHighestBid?: number;
  auctionEndsAt?: string;
  auctionBidsCount?: number;
  exchangeDescription?: string;
  isFavorited?: boolean;
}

const now = Date.now();
const hour = 3600000;
const day = 86400000;

// ── Recommended ads (mixed types, personalized feel) ──────────────────
export const recommendedAds: MockAd[] = [
  {
    id: "rec-1",
    title: "آيفون 15 برو ماكس — 256GB — مستعمل زيرو",
    price: 48000,
    saleType: "auction",
    image: null,
    governorate: "القاهرة",
    city: "مدينة نصر",
    createdAt: new Date(now - 2 * hour).toISOString(),
    auctionHighestBid: 42000,
    auctionEndsAt: new Date(now + 14 * hour).toISOString(),
    auctionBidsCount: 12,
  },
  {
    id: "rec-2",
    title: "تويوتا كورولا 2022 — 30,000 كم — فابريكا",
    price: 420000,
    saleType: "cash",
    image: null,
    governorate: "الجيزة",
    city: "6 أكتوبر",
    createdAt: new Date(now - 5 * hour).toISOString(),
    isNegotiable: true,
  },
  {
    id: "rec-3",
    title: "سامسونج S24 Ultra — 512GB — جديد متبرشم",
    price: null,
    saleType: "exchange",
    image: null,
    governorate: "القاهرة",
    city: "التجمع الخامس",
    createdAt: new Date(now - 8 * hour).toISOString(),
    exchangeDescription: "آيفون 15 برو أو برو ماكس",
  },
  {
    id: "rec-4",
    title: "شقة 180م² — سوبر لوكس — 3 غرف",
    price: 2200000,
    saleType: "cash",
    image: null,
    governorate: "القاهرة",
    city: "مصر الجديدة",
    createdAt: new Date(now - 1 * day).toISOString(),
    isNegotiable: true,
  },
  {
    id: "rec-5",
    title: "سلسلة ذهب عيار 21 — 15 جرام — جديدة",
    price: 75000,
    saleType: "cash",
    image: null,
    governorate: "الإسكندرية",
    city: "سموحة",
    createdAt: new Date(now - 3 * hour).toISOString(),
  },
  {
    id: "rec-6",
    title: "ماك بوك برو M3 — 16GB — 2024",
    price: 65000,
    saleType: "auction",
    image: null,
    governorate: "القاهرة",
    city: "المعادي",
    createdAt: new Date(now - 6 * hour).toISOString(),
    auctionHighestBid: 58000,
    auctionEndsAt: new Date(now + 36 * hour).toISOString(),
    auctionBidsCount: 5,
  },
  {
    id: "rec-7",
    title: "جاكت جلد رجالي — Zara — مقاس L — جديد بالتاج",
    price: 1800,
    saleType: "cash",
    image: null,
    governorate: "القاهرة",
    city: "وسط البلد",
    createdAt: new Date(now - 12 * hour).toISOString(),
  },
];

// ── Auction ads (active auctions with timers) ─────────────────────────
export const auctionAds: MockAd[] = [
  {
    id: "auc-1",
    title: "تويوتا كورولا 2021 — 45,000 كم",
    price: 250000,
    saleType: "auction",
    image: null,
    governorate: "القاهرة",
    city: "مدينة نصر",
    createdAt: new Date(now - 1 * day).toISOString(),
    auctionHighestBid: 280000,
    auctionEndsAt: new Date(now + 5 * hour).toISOString(),
    auctionBidsCount: 15,
  },
  {
    id: "auc-2",
    title: "آيفون 14 برو — 128GB — مستعمل ممتاز",
    price: 18000,
    saleType: "auction",
    image: null,
    governorate: "الجيزة",
    city: "الدقي",
    createdAt: new Date(now - 18 * hour).toISOString(),
    auctionHighestBid: 21000,
    auctionEndsAt: new Date(now + 2 * hour).toISOString(),
    auctionBidsCount: 22,
  },
  {
    id: "auc-3",
    title: "شنطة Louis Vuitton Neverfull — أصلي بالضمان",
    price: 25000,
    saleType: "auction",
    image: null,
    governorate: "القاهرة",
    city: "الزمالك",
    createdAt: new Date(now - 2 * day).toISOString(),
    auctionHighestBid: 32000,
    auctionEndsAt: new Date(now + 20 * hour).toISOString(),
    auctionBidsCount: 9,
  },
  {
    id: "auc-4",
    title: "بلايستيشن 5 — مع 3 ألعاب — ضمان",
    price: 15000,
    saleType: "auction",
    image: null,
    governorate: "الإسكندرية",
    city: "سموحة",
    createdAt: new Date(now - 12 * hour).toISOString(),
    auctionHighestBid: 17500,
    auctionEndsAt: new Date(now + 48 * hour).toISOString(),
    auctionBidsCount: 7,
  },
  {
    id: "auc-5",
    title: "ساعة Rolex Submariner — أصلي بالعلبة",
    price: 120000,
    saleType: "auction",
    image: null,
    governorate: "القاهرة",
    city: "التجمع الخامس",
    createdAt: new Date(now - 6 * hour).toISOString(),
    auctionHighestBid: 145000,
    auctionEndsAt: new Date(now + 10 * hour).toISOString(),
    auctionBidsCount: 11,
  },
];

// ── New ads feed (general feed for infinite scroll) ───────────────────
function generateFeedAds(page: number): MockAd[] {
  const base = page * 8;
  const ads: MockAd[] = [
    {
      id: `feed-${base + 1}`,
      title: "تويوتا كورولا 2020 — 45,000 كم",
      price: 350000,
      saleType: "cash",
      image: null,
      governorate: "القاهرة",
      city: "مدينة نصر",
      createdAt: new Date(now - (base + 1) * hour).toISOString(),
      isNegotiable: true,
    },
    {
      id: `feed-${base + 2}`,
      title: "شقة 150م² — 3 غرف — الطابق الخامس",
      price: 1500000,
      saleType: "cash",
      image: null,
      governorate: "القاهرة",
      city: "مصر الجديدة",
      createdAt: new Date(now - (base + 2) * hour).toISOString(),
    },
    {
      id: `feed-${base + 3}`,
      title: "غسالة توشيبا 10 كيلو — 2023 — مستعملة ممتاز",
      price: 8500,
      saleType: "cash",
      image: null,
      governorate: "الجيزة",
      city: "فيصل",
      createdAt: new Date(now - (base + 3) * hour).toISOString(),
      isNegotiable: true,
    },
    {
      id: `feed-${base + 4}`,
      title: "حديد خردة — 500 كجم — نظيف",
      price: 12000,
      saleType: "auction",
      image: null,
      governorate: "القليوبية",
      city: "شبرا الخيمة",
      createdAt: new Date(now - (base + 4) * hour).toISOString(),
      auctionHighestBid: 14500,
      auctionEndsAt: new Date(now + (30 - base) * hour).toISOString(),
      auctionBidsCount: 4,
    },
    {
      id: `feed-${base + 5}`,
      title: "غرفة نوم خشب زان — 7 قطع — مستعملة ممتاز",
      price: 25000,
      saleType: "cash",
      image: null,
      governorate: "القاهرة",
      city: "المعادي",
      createdAt: new Date(now - (base + 5) * hour).toISOString(),
    },
    {
      id: `feed-${base + 6}`,
      title: "بلايستيشن 5 — مستعمل ممتاز — مع 2 يد",
      price: null,
      saleType: "exchange",
      image: null,
      governorate: "الإسكندرية",
      city: null,
      createdAt: new Date(now - (base + 6) * hour).toISOString(),
      exchangeDescription: "إكسبوكس سيريس إكس",
    },
    {
      id: `feed-${base + 7}`,
      title: "شاومي ريدمي نوت 13 برو — 256GB — جديد",
      price: 12500,
      saleType: "cash",
      image: null,
      governorate: "المنصورة",
      city: null,
      createdAt: new Date(now - (base + 7) * hour).toISOString(),
    },
    {
      id: `feed-${base + 8}`,
      title: "سباك خبرة 5+ سنوات — بالمشروع",
      price: null,
      saleType: "cash",
      image: null,
      governorate: "القاهرة",
      city: "حلوان",
      createdAt: new Date(now - (base + 8) * hour).toISOString(),
    },
  ];
  return ads;
}

const PAGE_SIZE = 8;
const MAX_PAGES = 5;

/**
 * Simulates a paginated API call — returns mock ads for the given page.
 * Returns empty array after MAX_PAGES to signal end of data.
 */
export async function fetchFeedAds(page: number): Promise<{ ads: MockAd[]; hasMore: boolean }> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 600));

  if (page >= MAX_PAGES) {
    return { ads: [], hasMore: false };
  }

  return { ads: generateFeedAds(page), hasMore: page < MAX_PAGES - 1 };
}
