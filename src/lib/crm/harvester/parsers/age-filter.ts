/**
 * Filter listings by age (freshness check)
 *
 * إعلان > MAX_AGE_DAYS = قديم → يتم تخطيه
 * صفحة فيها أغلبية إعلانات قديمة = وصلنا للأرشيف → نوقف
 */

import { parseRelativeDate } from "./date-parser";

export const DEFAULT_MAX_AGE_DAYS = 30;

export interface AgeFilterResult {
  isFresh: boolean;
  ageInDays: number | null;
  postedAt: Date | null;
}

/**
 * Check if a listing is fresh enough (within max_age_days)
 */
export function checkListingAge(
  dateText: string | null | undefined,
  maxAgeDays: number = DEFAULT_MAX_AGE_DAYS,
  referenceDate: Date = new Date()
): AgeFilterResult {
  if (!dateText) {
    // No date → assume fresh (don't filter out)
    return { isFresh: true, ageInDays: null, postedAt: null };
  }

  const postedAt = parseRelativeDate(dateText, referenceDate);
  if (!postedAt) {
    // Couldn't parse → assume fresh
    return { isFresh: true, ageInDays: null, postedAt: null };
  }

  const ageMs = referenceDate.getTime() - postedAt.getTime();
  const ageInDays = ageMs / (1000 * 60 * 60 * 24);

  return {
    isFresh: ageInDays <= maxAgeDays,
    ageInDays,
    postedAt,
  };
}

/**
 * Check if a page should terminate harvesting
 * Returns true if >= staleRatio of listings are older than maxAgeDays
 */
export function shouldStopPage(
  listings: { dateText?: string | null }[],
  maxAgeDays: number = DEFAULT_MAX_AGE_DAYS,
  staleRatio: number = 0.5
): { shouldStop: boolean; freshCount: number; staleCount: number; unknownCount: number } {
  let fresh = 0;
  let stale = 0;
  let unknown = 0;

  for (const l of listings) {
    const { isFresh, ageInDays } = checkListingAge(l.dateText || null, maxAgeDays);
    if (ageInDays === null) unknown++;
    else if (isFresh) fresh++;
    else stale++;
  }

  const totalKnown = fresh + stale;
  // Only stop if we have enough age data AND majority are stale
  const shouldStop = totalKnown >= 5 && stale / totalKnown >= staleRatio;

  return { shouldStop, freshCount: fresh, staleCount: stale, unknownCount: unknown };
}
