/**
 * "دوّر لي" Wish Store — persistent search wishes.
 *
 * Wishes are saved locally (localStorage) and optionally synced to Supabase.
 * Each wish monitors new ads and tracks match count.
 */

import type { SearchWish, AIParsedQuery } from "./ai-search-types";

const STORAGE_KEY = "maksab_search_wishes";
const MAX_WISHES = 10;

/* ── Local storage operations ─────────────────────────────────────────── */

export function getWishes(): SearchWish[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWishes(wishes: SearchWish[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes));
  } catch {
    // Storage full — remove oldest
    const trimmed = wishes.slice(0, MAX_WISHES - 2);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

/* ── Create wish ──────────────────────────────────────────────────────── */

export function createWish(
  query: string,
  parsedQuery: AIParsedQuery,
  filters?: SearchWish["filters"],
): SearchWish {
  const wishes = getWishes();

  // Check for duplicate (same query text)
  const existing = wishes.find((w) => w.query === query);
  if (existing) {
    // Reactivate if deactivated
    existing.isActive = true;
    existing.lastCheckedAt = new Date().toISOString();
    saveWishes(wishes);
    return existing;
  }

  const wish: SearchWish = {
    id: `wish_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    query,
    parsedQuery,
    filters: filters || {
      category: parsedQuery.primaryCategory,
      saleType: parsedQuery.saleType,
      priceMin: parsedQuery.priceMin,
      priceMax: parsedQuery.priceMax,
      governorate: parsedQuery.governorate,
    },
    createdAt: new Date().toISOString(),
    matchCount: 0,
    lastCheckedAt: new Date().toISOString(),
    newMatchCount: 0,
    isActive: true,
    displayText: parsedQuery.interpretation || query,
  };

  // Add to front, enforce max
  const updated = [wish, ...wishes].slice(0, MAX_WISHES);
  saveWishes(updated);

  return wish;
}

/* ── Update wish ──────────────────────────────────────────────────────── */

export function updateWish(wishId: string, updates: Partial<SearchWish>): SearchWish | null {
  const wishes = getWishes();
  const idx = wishes.findIndex((w) => w.id === wishId);
  if (idx === -1) return null;

  wishes[idx] = { ...wishes[idx], ...updates };
  saveWishes(wishes);
  return wishes[idx];
}

/* ── Delete wish ──────────────────────────────────────────────────────── */

export function deleteWish(wishId: string): boolean {
  const wishes = getWishes();
  const filtered = wishes.filter((w) => w.id !== wishId);
  if (filtered.length === wishes.length) return false;
  saveWishes(filtered);
  return true;
}

/* ── Toggle wish active state ─────────────────────────────────────────── */

export function toggleWishActive(wishId: string): SearchWish | null {
  const wishes = getWishes();
  const wish = wishes.find((w) => w.id === wishId);
  if (!wish) return null;
  wish.isActive = !wish.isActive;
  saveWishes(wishes);
  return wish;
}

/* ── Mark wish as viewed (clear new count) ────────────────────────────── */

export function markWishViewed(wishId: string): void {
  const wishes = getWishes();
  const wish = wishes.find((w) => w.id === wishId);
  if (wish) {
    wish.newMatchCount = 0;
    wish.lastCheckedAt = new Date().toISOString();
    saveWishes(wishes);
  }
}

/* ── Count total new matches across all wishes ────────────────────────── */

export function getTotalNewMatches(): number {
  return getWishes()
    .filter((w) => w.isActive)
    .reduce((sum, w) => sum + w.newMatchCount, 0);
}

/* ── Generate display text for a wish ─────────────────────────────────── */

export function getWishDisplayText(wish: SearchWish): string {
  if (wish.displayText) return wish.displayText;

  const parts: string[] = [];
  if (wish.filters.category) parts.push(wish.filters.category);
  if (wish.query) parts.push(wish.query);
  if (wish.filters.governorate) parts.push(`في ${wish.filters.governorate}`);
  if (wish.filters.priceMax) parts.push(`تحت ${wish.filters.priceMax.toLocaleString()} جنيه`);

  return parts.join(" — ") || wish.query;
}
