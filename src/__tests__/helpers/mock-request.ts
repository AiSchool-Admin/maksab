/**
 * Test helpers for creating mock NextRequest objects and Supabase mock factories.
 * Used across all API route handler tests.
 */

import { NextRequest } from "next/server";

/**
 * Create a mock NextRequest for testing API route handlers.
 * Supports both POST (with JSON body) and GET (with query params).
 */
export function createMockPostRequest(
  url: string,
  body: Record<string, unknown>,
  headers?: Record<string, string>,
): NextRequest {
  const req = new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return req;
}

export function createMockGetRequest(
  url: string,
  headers?: Record<string, string>,
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "GET",
    headers: headers || {},
  });
}

/**
 * Parse the JSON body from a NextResponse.
 */
export async function parseResponse(response: Response): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  const body = await response.json();
  return { status: response.status, body };
}

/**
 * Create a chainable Supabase mock that tracks calls and returns configured data.
 * Each method returns `this` for chaining, with terminal methods returning configured data.
 */
export function createSupabaseMock(config: {
  selectData?: unknown;
  insertData?: unknown;
  updateData?: unknown;
  deleteData?: unknown;
  rpcData?: unknown;
  selectError?: { message: string; code?: string } | null;
  insertError?: { message: string; code?: string } | null;
  rpcError?: { message: string; code?: string } | null;
} = {}) {
  const chainMethods = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: config.selectData ?? null,
      error: config.selectError ?? null,
    }),
    single: jest.fn().mockResolvedValue({
      data: config.selectData ?? null,
      error: config.selectError ?? null,
    }),
  };

  return chainMethods;
}

/**
 * Test fixture: valid Egyptian phone numbers.
 */
export const VALID_PHONES = [
  "01012345678",
  "01112345678",
  "01212345678",
  "01512345678",
];

/**
 * Test fixture: invalid Egyptian phone numbers.
 */
export const INVALID_PHONES = [
  "0101234567",   // too short
  "02012345678",  // wrong prefix
  "01312345678",  // invalid operator (013)
  "abc",          // not a number
  "",             // empty
  "0101234567890", // too long
  "01412345678",  // invalid operator (014)
];

/**
 * Test fixture: valid ad data for various sale types.
 */
export const AD_FIXTURES = {
  cash: {
    category_id: "cars",
    sale_type: "cash",
    title: "تويوتا كورولا 2020",
    description: "سيارة ممتازة بحالة جيدة",
    price: 350000,
    is_negotiable: true,
    governorate: "القاهرة",
    city: "مدينة نصر",
    category_fields: {
      brand: "تويوتا",
      model: "كورولا",
      year: 2020,
      mileage: 45000,
    },
  },
  auction: {
    category_id: "cars",
    sale_type: "auction",
    title: "هيونداي توسان 2022",
    description: "للبيع بالمزاد",
    auction_start_price: 250000,
    auction_buy_now_price: 400000,
    auction_duration_hours: 48,
    governorate: "الجيزة",
    category_fields: {
      brand: "هيونداي",
      model: "توسان",
      year: 2022,
      mileage: 20000,
    },
  },
  exchange: {
    category_id: "phones",
    sale_type: "exchange",
    title: "آيفون 15 برو ماكس — للتبديل",
    exchange_description: "عايز سامسونج S24 Ultra",
    exchange_accepts_price_diff: true,
    exchange_price_diff: 2000,
    category_fields: {
      brand: "آيفون",
      model: "15 برو ماكس",
      storage: "256GB",
      condition: "مستعمل زيرو",
    },
  },
};

/**
 * Generate a mock auction ad record as it would appear from Supabase.
 */
export function createMockAuctionAd(overrides: Record<string, unknown> = {}) {
  return {
    id: "ad-auction-001",
    user_id: "seller-001",
    category_id: "cars",
    sale_type: "auction",
    auction_status: "active",
    auction_start_price: 100000,
    auction_buy_now_price: 200000,
    auction_min_increment: 0,
    auction_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h from now
    title: "سيارة للمزاد",
    status: "active",
    ...overrides,
  };
}
