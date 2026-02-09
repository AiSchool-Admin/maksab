/**
 * Favorites service — uses localStorage for persistence.
 * Works for both dev and real users (no DB dependency).
 */

const FAVORITES_KEY = "maksab_favorites";

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

export function toggleFavorite(adId: string): boolean {
  const ids = getFavoriteIds();
  const index = ids.indexOf(adId);
  if (index >= 0) {
    ids.splice(index, 1);
    saveFavorites(ids);
    return false; // removed
  } else {
    ids.push(adId);
    saveFavorites(ids);
    return true; // added
  }
}

export function clearFavorites(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(FAVORITES_KEY);
  }
}

function saveFavorites(ids: string[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  }
}
