/**
 * Track and retrieve recently viewed ads — stored in localStorage.
 */

const STORAGE_KEY = "maksab_recently_viewed";
const MAX_ITEMS = 20;

export interface RecentlyViewedItem {
  id: string;
  title: string;
  image: string | null;
  price: number | null;
  saleType: "cash" | "auction" | "exchange";
  viewedAt: string;
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToRecentlyViewed(item: Omit<RecentlyViewedItem, "viewedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const items = getRecentlyViewed().filter((i) => i.id !== item.id);
    items.unshift({ ...item, viewedAt: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // Storage full — clear old items
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ ...item, viewedAt: new Date().toISOString() }]),
    );
  }
}

export function clearRecentlyViewed(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
