/**
 * Favorites service — uses localStorage for persistence.
 * Works for both dev and real users (no DB dependency).
 */

const FAVORITES_KEY = "maksab_favorites";
const FAVORITES_PRICES_KEY = "maksab_favorite_prices";

export function getFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function isFavorited(adId: string): boolean {
  return getFavoriteIds().includes(adId);
}

export function toggleFavorite(adId: string, price?: number | null): boolean {
  const ids = getFavoriteIds();
  const index = ids.indexOf(adId);
  if (index >= 0) {
    ids.splice(index, 1);
    saveFavorites(ids);
    removeFavoritePrice(adId);
    return false; // removed
  } else {
    ids.push(adId);
    saveFavorites(ids);
    if (price != null) {
      saveFavoritePrice(adId, price);
    }
    return true; // added
  }
}

export function clearFavorites(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(FAVORITES_KEY);
    localStorage.removeItem(FAVORITES_PRICES_KEY);
  }
}

function saveFavorites(ids: string[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  }
}

/** Get the price snapshot when the ad was favorited */
export function getFavoritePrices(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(FAVORITES_PRICES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/** Save the price at the time of favoriting */
export function saveFavoritePrice(adId: string, price: number): void {
  if (typeof window === "undefined") return;
  const prices = getFavoritePrices();
  // Only save if not already stored (preserve original favorited price)
  if (!(adId in prices)) {
    prices[adId] = price;
    localStorage.setItem(FAVORITES_PRICES_KEY, JSON.stringify(prices));
  }
}

function removeFavoritePrice(adId: string): void {
  if (typeof window === "undefined") return;
  const prices = getFavoritePrices();
  delete prices[adId];
  localStorage.setItem(FAVORITES_PRICES_KEY, JSON.stringify(prices));
}
