/**
 * A/B Testing Framework — مكسب
 *
 * Simple, deterministic A/B testing using hash-based bucketing.
 * Same user always sees the same variant for a given experiment.
 */

import { ga4Event } from "@/lib/analytics/ga4";

// ── Hash Function ─────────────────────────────────────

/**
 * Simple string hash (djb2 algorithm).
 * Deterministic: same input always gives same output.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Convert to unsigned 32-bit integer
}

// ── Core Functions ────────────────────────────────────

/**
 * Get the variant for a user in an experiment.
 *
 * Uses a hash of `userId + experimentName` to deterministically
 * assign users to variants. Same user always gets the same variant.
 *
 * @param experimentName - Unique experiment identifier (e.g., "cta_color")
 * @param variants - Array of variant names (e.g., ["green", "orange", "blue"])
 * @param userId - User ID or anonymous ID (from localStorage)
 * @returns The assigned variant name
 */
export function getVariant<T extends string>(
  experimentName: string,
  variants: T[],
  userId?: string,
): T {
  const id = userId || getAnonymousId();
  const hash = hashString(`${id}:${experimentName}`);
  const index = hash % variants.length;
  return variants[index];
}

/**
 * Get or create an anonymous user ID for non-logged-in users.
 */
function getAnonymousId(): string {
  if (typeof window === "undefined") return "server";
  const key = "maksab_ab_uid";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

// ── Tracking ──────────────────────────────────────────

/**
 * Track that a user has seen a variant.
 */
export function trackExperimentView(
  experimentName: string,
  variant: string,
): void {
  ga4Event("experiment_view", {
    experiment: experimentName,
    variant,
  });
}

/**
 * Track that a user has converted on a variant.
 */
export function trackExperimentConversion(
  experimentName: string,
  variant: string,
  conversionType?: string,
): void {
  ga4Event("experiment_convert", {
    experiment: experimentName,
    variant,
    conversion_type: conversionType || "click",
  });
}
