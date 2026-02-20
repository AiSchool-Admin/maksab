/**
 * Meta (Facebook) Pixel — مكسب
 *
 * Client-side pixel tracking for Meta Ads.
 * Pairs with server-side Conversions API for reliable attribution.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

function fbq(...args: unknown[]) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq(...args);
  }
}

// ── Standard Events ────────────────────────────────────

export function fbPageView() {
  fbq("track", "PageView");
}

export function fbViewContent(adId: string, category: string, price?: number) {
  fbq("track", "ViewContent", {
    content_ids: [adId],
    content_category: category,
    content_type: "product",
    value: price,
    currency: "EGP",
  });
}

export function fbSearch(query: string, category?: string) {
  fbq("track", "Search", {
    search_string: query,
    content_category: category || "",
  });
}

export function fbAddToWishlist(adId: string, price?: number) {
  fbq("track", "AddToWishlist", {
    content_ids: [adId],
    value: price,
    currency: "EGP",
  });
}

export function fbContact(adId: string, method: string) {
  fbq("track", "Contact", {
    content_ids: [adId],
    content_type: method,
  });
}

export function fbCompleteRegistration(method: string) {
  fbq("track", "CompleteRegistration", { content_name: method });
}

export function fbListAd(adId: string, category: string, price?: number) {
  fbq("track", "ListProduct", {
    content_ids: [adId],
    content_category: category,
    value: price,
    currency: "EGP",
  });
}

export function fbShare(adId: string) {
  fbq("trackCustom", "ShareAd", { content_ids: [adId] });
}
