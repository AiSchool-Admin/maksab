const STORAGE_KEY = "maksab_recent_searches";
const MAX_RECENT = 10;

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): void {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const searches = getRecentSearches().filter((s) => s !== query.trim());
    searches.unshift(query.trim());
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(searches.slice(0, MAX_RECENT)),
    );
  } catch {
    // localStorage full or unavailable
  }
}

export function removeRecentSearch(query: string): void {
  if (typeof window === "undefined") return;
  try {
    const searches = getRecentSearches().filter((s) => s !== query);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch {
    // ignore
  }
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
