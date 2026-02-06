/**
 * Mock data for ad detail pages — will be replaced with Supabase queries.
 */

import { recommendedAds, type MockAd } from "./mock-data";

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
  auctionBidsCount: number;
  auctionMinIncrement: number;
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

/** All mock ad details, keyed by id */
const detailsMap: Record<string, MockAdDetail> = {
  // Cash ad — car
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
    auctionStartPrice: null,
    auctionBuyNowPrice: null,
    auctionEndsAt: null,
    auctionHighestBid: null,
    auctionBidsCount: 0,
    auctionMinIncrement: 0,
    bids: [],
    exchangeDescription: null,
    exchangeAcceptsPriceDiff: false,
    exchangePriceDiff: null,
    seller: mockSeller,
    isFavorited: false,
  },
  // Auction ad — car
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
    auctionBidsCount: 15,
    auctionMinIncrement: 5000,
    bids: mockBids,
    exchangeDescription: null,
    exchangeAcceptsPriceDiff: false,
    exchangePriceDiff: null,
    seller: mockSeller,
    isFavorited: true,
  },
  // Exchange ad — phone
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
    auctionStartPrice: null,
    auctionBuyNowPrice: null,
    auctionEndsAt: null,
    auctionHighestBid: null,
    auctionBidsCount: 0,
    auctionMinIncrement: 0,
    bids: [],
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
    auctionStartPrice: null,
    auctionBuyNowPrice: null,
    auctionEndsAt: null,
    auctionHighestBid: null,
    auctionBidsCount: 0,
    auctionMinIncrement: 0,
    bids: [],
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
