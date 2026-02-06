/**
 * Mock data for ad detail pages — will be replaced with Supabase queries.
 */

import { recommendedAds, type MockAd } from "./mock-data";
import type { AuctionStatus } from "./auction/types";

export interface MockBid {
  id: string;
  bidderName: string;
  amount: number;
  createdAt: string;
}

export interface MockSeller {
  id: string;
  displayName: string;
  phone: string;
  avatarUrl: string | null;
  memberSince: string;
  totalAds: number;
  rating: number;
}

export interface MockAdDetail {
  id: string;
  title: string;
  description: string;
  price: number | null;
  saleType: "cash" | "auction" | "exchange";
  isNegotiable: boolean;
  images: string[];
  categoryId: string;
  subcategoryId: string;
  categoryFields: Record<string, unknown>;
  governorate: string;
  city: string | null;
  viewsCount: number;
  favoritesCount: number;
  createdAt: string;
  // Auction
  auctionStartPrice: number | null;
  auctionBuyNowPrice: number | null;
  auctionEndsAt: string | null;
  auctionHighestBid: number | null;
  auctionHighestBidderId: string | null;
  auctionHighestBidderName: string | null;
  auctionBidsCount: number;
  auctionMinIncrement: number;
  auctionStatus: AuctionStatus | null;
  auctionWinnerId: string | null;
  auctionWinnerName: string | null;
  bids: MockBid[];
  // Exchange
  exchangeDescription: string | null;
  exchangeAcceptsPriceDiff: boolean;
  exchangePriceDiff: number | null;
  // Seller
  seller: MockSeller;
  // Favorite state
  isFavorited: boolean;
}

const now = Date.now();
const hour = 3600000;
const day = 86400000;

const mockSeller: MockSeller = {
  id: "seller-1",
  displayName: "محمد أحمد",
  phone: "01012345678",
  avatarUrl: null,
  memberSince: "2024-03-15T00:00:00Z",
  totalAds: 15,
  rating: 4.5,
};

const mockBids: MockBid[] = [
  { id: "bid-1", bidderName: "أحمد س.", amount: 280000, createdAt: new Date(now - 5 * 60000).toISOString() },
  { id: "bid-2", bidderName: "سارة م.", amount: 275000, createdAt: new Date(now - 12 * 60000).toISOString() },
  { id: "bid-3", bidderName: "محمود ع.", amount: 270000, createdAt: new Date(now - 30 * 60000).toISOString() },
  { id: "bid-4", bidderName: "هدى ر.", amount: 265000, createdAt: new Date(now - 1 * hour).toISOString() },
  { id: "bid-5", bidderName: "كريم ف.", amount: 260000, createdAt: new Date(now - 2 * hour).toISOString() },
];

/** Null auction fields — reusable for non-auction ads */
const noAuction = {
  auctionStartPrice: null,
  auctionBuyNowPrice: null,
  auctionEndsAt: null,
  auctionHighestBid: null,
  auctionHighestBidderId: null,
  auctionHighestBidderName: null,
  auctionBidsCount: 0,
  auctionMinIncrement: 0,
  auctionStatus: null as AuctionStatus | null,
  auctionWinnerId: null,
  auctionWinnerName: null,
  bids: [] as MockBid[],
};

/** All mock ad details, keyed by id */
const detailsMap: Record<string, MockAdDetail> = {
  // ─── Cash ad — car ──────────────────────────────────────
  "rec-2": {
    id: "rec-2",
    title: "تويوتا كورولا 2022 — 30,000 كم — فابريكا",
    description: "سيارة تويوتا كورولا موديل 2022، مسافة 30,000 كم، أوتوماتيك، بنزين، لون أبيض، مُرخصة. الحالة ممتازة زي الزيرو، صيانة الوكيل، رخصة سنة.",
    price: 420000,
    saleType: "cash",
    isNegotiable: true,
    images: [],
    categoryId: "cars",
    subcategoryId: "passenger",
    categoryFields: {
      brand: "toyota",
      model: "corolla",
      year: "2022",
      mileage: 30000,
      color: "white",
      fuel: "petrol",
      transmission: "automatic",
      condition: "used",
      licensed: true,
    },
    governorate: "الجيزة",
    city: "6 أكتوبر",
    viewsCount: 245,
    favoritesCount: 18,
    createdAt: new Date(now - 5 * hour).toISOString(),
    ...noAuction,
    exchangeDescription: null,
    exchangeAcceptsPriceDiff: false,
    exchangePriceDiff: null,
    seller: mockSeller,
    isFavorited: false,
  },

  // ─── Auction — ACTIVE (5 hours remaining) ──────────────
  "auc-1": {
    id: "auc-1",
    title: "تويوتا كورولا 2021 — 45,000 كم",
    description: "سيارة تويوتا كورولا موديل 2021، مسافة 45,000 كم، أوتوماتيك، بنزين، لون فضي. المزاد بينتهي قريب!",
    price: null,
    saleType: "auction",
    isNegotiable: false,
    images: [],
    categoryId: "cars",
    subcategoryId: "passenger",
    categoryFields: {
      brand: "toyota",
      model: "corolla",
      year: "2021",
      mileage: 45000,
      color: "silver",
      fuel: "petrol",
      transmission: "automatic",
      condition: "used",
      licensed: true,
    },
    governorate: "القاهرة",
    city: "مدينة نصر",
    viewsCount: 512,
    favoritesCount: 35,
    createdAt: new Date(now - 1 * day).toISOString(),
    auctionStartPrice: 250000,
    auctionBuyNowPrice: 350000,
    auctionEndsAt: new Date(now + 5 * hour).toISOString(),
    auctionHighestBid: 280000,
    auctionHighestBidderId: "bidder-1",
    auctionHighestBidderName: "أحمد س.",
    auctionBidsCount: 15,
    auctionMinIncrement: 5000,
    auctionStatus: "active",
    auctionWinnerId: null,
    auctionWinnerName: null,
    bids: mockBids,
    exchangeDescription: null,
    exchangeAcceptsPriceDiff: false,
    exchangePriceDiff: null,
    seller: mockSeller,
    isFavorited: true,
  },

  // ─── Auction — ENDED WITH WINNER ───────────────────────
  "auc-2": {
    id: "auc-2",
    title: "هيونداي توسان 2020 — 60,000 كم",
    description: "سيارة هيونداي توسان موديل 2020، مسافة 60,000 كم، أوتوماتيك، بنزين. انتهى المزاد.",
    price: null,
    saleType: "auction",
    isNegotiable: false,
    images: [],
    categoryId: "cars",
    subcategoryId: "passenger",
    categoryFields: {
      brand: "hyundai",
      model: "tucson",
      year: "2020",
      mileage: 60000,
      color: "blue",
      fuel: "petrol",
      transmission: "automatic",
      condition: "used",
      licensed: true,
    },
    governorate: "الإسكندرية",
    city: "سموحة",
    viewsCount: 890,
    favoritesCount: 42,
    createdAt: new Date(now - 3 * day).toISOString(),
    auctionStartPrice: 300000,
    auctionBuyNowPrice: 450000,
    auctionEndsAt: new Date(now - 2 * hour).toISOString(),
    auctionHighestBid: 395000,
    auctionHighestBidderId: "bidder-2",
    auctionHighestBidderName: "سارة م.",
    auctionBidsCount: 28,
    auctionMinIncrement: 5000,
    auctionStatus: "ended_winner",
    auctionWinnerId: "bidder-2",
    auctionWinnerName: "سارة م.",
    bids: [
      { id: "bid-w1", bidderName: "سارة م.", amount: 395000, createdAt: new Date(now - 2.1 * hour).toISOString() },
      { id: "bid-w2", bidderName: "أحمد س.", amount: 390000, createdAt: new Date(now - 2.5 * hour).toISOString() },
      { id: "bid-w3", bidderName: "محمود ع.", amount: 380000, createdAt: new Date(now - 3 * hour).toISOString() },
      { id: "bid-w4", bidderName: "كريم ف.", amount: 370000, createdAt: new Date(now - 4 * hour).toISOString() },
      { id: "bid-w5", bidderName: "هدى ر.", amount: 350000, createdAt: new Date(now - 5 * hour).toISOString() },
    ],
    exchangeDescription: null,
    exchangeAcceptsPriceDiff: false,
    exchangePriceDiff: null,
    seller: { ...mockSeller, id: "seller-3", displayName: "عمر خالد" },
    isFavorited: false,
  },

  // ─── Auction — ENDED NO BIDS ───────────────────────────
  "auc-3": {
    id: "auc-3",
    title: "فيات تيبو 2019 — 80,000 كم",
    description: "سيارة فيات تيبو موديل 2019، مسافة 80,000 كم. انتهى المزاد بدون مزايدات.",
    price: null,
    saleType: "auction",
    isNegotiable: false,
    images: [],
    categoryId: "cars",
    subcategoryId: "passenger",
    categoryFields: {
      brand: "fiat",
      model: "tipo",
      year: "2019",
      mileage: 80000,
      color: "white",
      fuel: "petrol",
      transmission: "manual",
      condition: "used",
      licensed: true,
    },
    governorate: "المنصورة",
    city: null,
    viewsCount: 120,
    favoritesCount: 3,
    createdAt: new Date(now - 4 * day).toISOString(),
    auctionStartPrice: 180000,
    auctionBuyNowPrice: null,
    auctionEndsAt: new Date(now - 1 * day).toISOString(),
    auctionHighestBid: null,
    auctionHighestBidderId: null,
    auctionHighestBidderName: null,
    auctionBidsCount: 0,
    auctionMinIncrement: 3000,
    auctionStatus: "ended_no_bids",
    auctionWinnerId: null,
    auctionWinnerName: null,
    bids: [],
    exchangeDescription: null,
    exchangeAcceptsPriceDiff: false,
    exchangePriceDiff: null,
    seller: { ...mockSeller, id: "seller-4", displayName: "خالد أحمد", totalAds: 3 },
    isFavorited: false,
  },

  // ─── Auction — BOUGHT NOW ──────────────────────────────
  "auc-4": {
    id: "auc-4",
    title: "آيفون 15 برو ماكس — 256GB — مستعمل زيرو",
    description: "آيفون 15 برو ماكس، مساحة 256GB، مستعمل زيرو مع العلبة والضمان. تم شراءه فوري.",
    price: null,
    saleType: "auction",
    isNegotiable: false,
    images: [],
    categoryId: "phones",
    subcategoryId: "mobile",
    categoryFields: {
      brand: "iphone",
      model: "15_pro_max",
      storage: "256",
      condition: "used_like_new",
      color: "natural_titanium",
      ram: "8",
    },
    governorate: "القاهرة",
    city: "التجمع الخامس",
    viewsCount: 345,
    favoritesCount: 25,
    createdAt: new Date(now - 2 * day).toISOString(),
    auctionStartPrice: 35000,
    auctionBuyNowPrice: 48000,
    auctionEndsAt: new Date(now - 6 * hour).toISOString(),
    auctionHighestBid: 48000,
    auctionHighestBidderId: "bidder-5",
    auctionHighestBidderName: "ياسمين أ.",
    auctionBidsCount: 8,
    auctionMinIncrement: 500,
    auctionStatus: "bought_now",
    auctionWinnerId: "bidder-5",
    auctionWinnerName: "ياسمين أ.",
    bids: [
      { id: "bid-bn1", bidderName: "أحمد س.", amount: 42000, createdAt: new Date(now - 7 * hour).toISOString() },
      { id: "bid-bn2", bidderName: "محمود ع.", amount: 40000, createdAt: new Date(now - 8 * hour).toISOString() },
      { id: "bid-bn3", bidderName: "كريم ف.", amount: 38000, createdAt: new Date(now - 9 * hour).toISOString() },
    ],
    exchangeDescription: null,
    exchangeAcceptsPriceDiff: false,
    exchangePriceDiff: null,
    seller: { ...mockSeller, id: "seller-5", displayName: "نورا سعيد", totalAds: 6 },
    isFavorited: true,
  },

  // ─── Auction — CANCELLED ───────────────────────────────
  "auc-5": {
    id: "auc-5",
    title: "بلايستيشن 5 — مستعمل ممتاز — مع 2 يد",
    description: "بلايستيشن 5 ديسك إديشن، مستعمل ممتاز، مع 2 يد ألعاب. تم إلغاء المزاد.",
    price: null,
    saleType: "auction",
    isNegotiable: false,
    images: [],
    categoryId: "hobbies",
    subcategoryId: "video_games",
    categoryFields: {
      type: "playstation_5",
      condition: "used_excellent",
      brand: "Sony",
    },
    governorate: "الجيزة",
    city: "الدقي",
    viewsCount: 89,
    favoritesCount: 7,
    createdAt: new Date(now - 5 * day).toISOString(),
    auctionStartPrice: 15000,
    auctionBuyNowPrice: 22000,
    auctionEndsAt: new Date(now - 3 * day).toISOString(),
    auctionHighestBid: 17000,
    auctionHighestBidderId: "bidder-3",
    auctionHighestBidderName: "أحمد س.",
    auctionBidsCount: 3,
    auctionMinIncrement: 250,
    auctionStatus: "cancelled",
    auctionWinnerId: null,
    auctionWinnerName: null,
    bids: [
      { id: "bid-c1", bidderName: "أحمد س.", amount: 17000, createdAt: new Date(now - 4 * day).toISOString() },
      { id: "bid-c2", bidderName: "هدى ر.", amount: 16000, createdAt: new Date(now - 4.5 * day).toISOString() },
    ],
    exchangeDescription: null,
    exchangeAcceptsPriceDiff: false,
    exchangePriceDiff: null,
    seller: { ...mockSeller, id: "seller-6", displayName: "يوسف محمد", totalAds: 2 },
    isFavorited: false,
  },

  // ─── Exchange ad — phone ────────────────────────────────
  "rec-3": {
    id: "rec-3",
    title: "سامسونج S24 Ultra — 512GB — جديد متبرشم",
    description: "سامسونج S24 Ultra مساحة 512GB، جديد متبرشم، لون أسود. عايز أبدل بآيفون 15 برو أو برو ماكس. أقبل فرق سعر.",
    price: null,
    saleType: "exchange",
    isNegotiable: false,
    images: [],
    categoryId: "phones",
    subcategoryId: "mobile",
    categoryFields: {
      brand: "samsung",
      model: "s24_ultra",
      storage: "512",
      condition: "sealed",
      color: "black",
      ram: "12",
    },
    governorate: "القاهرة",
    city: "التجمع الخامس",
    viewsCount: 178,
    favoritesCount: 12,
    createdAt: new Date(now - 8 * hour).toISOString(),
    ...noAuction,
    exchangeDescription: "آيفون 15 برو أو برو ماكس",
    exchangeAcceptsPriceDiff: true,
    exchangePriceDiff: 5000,
    seller: { ...mockSeller, id: "seller-2", displayName: "أحمد سعيد", totalAds: 8 },
    isFavorited: false,
  },
};

/**
 * Fetch ad detail by ID. Falls back to a generated detail for any ID.
 */
export async function fetchAdDetail(id: string): Promise<MockAdDetail> {
  await new Promise((r) => setTimeout(r, 400));

  if (detailsMap[id]) return detailsMap[id];

  // Fallback: generate a detail for any ID
  return {
    id,
    title: "تويوتا كورولا 2020 — 45,000 كم",
    description: "سيارة تويوتا كورولا موديل 2020، مسافة 45,000 كم، أوتوماتيك، بنزين، لون أبيض، مُرخصة",
    price: 350000,
    saleType: "cash",
    isNegotiable: true,
    images: [],
    categoryId: "cars",
    subcategoryId: "passenger",
    categoryFields: {
      brand: "toyota",
      model: "corolla",
      year: "2020",
      mileage: 45000,
      color: "white",
      fuel: "petrol",
      transmission: "automatic",
    },
    governorate: "القاهرة",
    city: "مدينة نصر",
    viewsCount: 245,
    favoritesCount: 18,
    createdAt: new Date(now - 3 * hour).toISOString(),
    ...noAuction,
    exchangeDescription: null,
    exchangeAcceptsPriceDiff: false,
    exchangePriceDiff: null,
    seller: mockSeller,
    isFavorited: false,
  };
}

/** Get similar/recommended ads for the detail page bottom section */
export function getSimilarAds(currentId: string): MockAd[] {
  return recommendedAds.filter((a) => a.id !== currentId).slice(0, 6);
}
