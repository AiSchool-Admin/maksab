/**
 * TikTok Pixel — مكسب
 *
 * Client-side pixel tracking for TikTok Ads.
 */

declare global {
  interface Window {
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
      page: () => void;
      identify: (params: Record<string, unknown>) => void;
    };
  }
}

function ttq(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.ttq) {
    window.ttq.track(event, params);
  }
}

// ── Standard Events ────────────────────────────────────

export function ttPageView() {
  if (typeof window !== "undefined" && window.ttq) {
    window.ttq.page();
  }
}

export function ttViewContent(adId: string, category: string, price?: number) {
  ttq("ViewContent", {
    content_id: adId,
    content_category: category,
    content_type: "product",
    value: price,
    currency: "EGP",
  });
}

export function ttSearch(query: string) {
  ttq("Search", { query });
}

export function ttAddToWishlist(adId: string) {
  ttq("AddToWishlist", { content_id: adId });
}

export function ttContact(adId: string) {
  ttq("Contact", { content_id: adId });
}

export function ttCompleteRegistration() {
  ttq("CompleteRegistration", {});
}

export function ttListAd(adId: string, category: string, price?: number) {
  ttq("PlaceAnOrder", {
    content_id: adId,
    content_category: category,
    value: price,
    currency: "EGP",
  });
}

export function ttShare(adId: string) {
  ttq("ClickButton", { content_id: adId, description: "share_ad" });
}
