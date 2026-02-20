/**
 * Google Analytics 4 — مكسب
 *
 * Wrapper for GA4 gtag.js — fires marketing events
 * for ad views, conversions, search, shares, etc.
 */

// ── Types ──────────────────────────────────────────────

type GA4EventParams = Record<string, string | number | boolean | undefined>;

// ── Helpers ────────────────────────────────────────────

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function gtag(...args: unknown[]) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...args);
  }
}

// ── Core Functions ─────────────────────────────────────

export function ga4PageView(url: string) {
  gtag("event", "page_view", { page_path: url });
}

export function ga4Event(eventName: string, params?: GA4EventParams) {
  gtag("event", eventName, params);
}

// ── Marketing Events ───────────────────────────────────

export function ga4AdView(adId: string, category: string, price?: number) {
  ga4Event("ad_view", {
    ad_id: adId,
    category,
    value: price,
    currency: "EGP",
  });
}

export function ga4AdCreate(adId: string, category: string, saleType: string) {
  ga4Event("ad_create", {
    ad_id: adId,
    category,
    sale_type: saleType,
  });
}

export function ga4ContactSeller(adId: string, method: "chat" | "whatsapp" | "call") {
  ga4Event("contact_seller", {
    ad_id: adId,
    contact_method: method,
  });
}

export function ga4Search(query: string, category?: string, resultsCount?: number) {
  ga4Event("search", {
    search_term: query,
    category: category || "",
    results_count: resultsCount,
  });
}

export function ga4Share(adId: string, method: "whatsapp" | "facebook" | "copy" | "native") {
  ga4Event("share", {
    ad_id: adId,
    method,
    content_type: "ad",
  });
}

export function ga4Signup(method: "phone_otp") {
  ga4Event("sign_up", { method });
}

export function ga4Favorite(adId: string, action: "add" | "remove") {
  ga4Event("favorite", { ad_id: adId, action });
}

export function ga4PriceScannerUse(category: string) {
  ga4Event("price_scanner_use", { category });
}

export function ga4AuctionBid(adId: string, amount: number) {
  ga4Event("auction_bid", {
    ad_id: adId,
    value: amount,
    currency: "EGP",
  });
}

export function ga4PWAInstall() {
  ga4Event("pwa_install", {});
}
