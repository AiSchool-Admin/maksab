/**
 * Merchant grouping for the whales / Pareto page.
 *
 * Real-world data shows a single brokerage (e.g. "Remax Avalon", "Elite
 * Group For Real Estate") posts listings under DIFFERENT phone numbers
 * for different agents. The ahe_sellers table aggregates by phone, so
 * each brokerage shows up as multiple rows — fragmenting the Pareto
 * analysis and producing duplicate entries on the whales page.
 *
 * This module groups sellers by a normalized identity (name +
 * governorate + platform) so brokerages roll up correctly while
 * unrelated sellers with the same first name don't merge.
 *
 * Conservative on purpose:
 *   - Single-name strings under 10 chars (e.g. "أحمد", "Mohamed") are
 *     refused — too generic to safely merge.
 *   - Names under 3 chars are refused.
 *   - Governorate + platform are part of the key so two "Elite Group"
 *     instances on different sites or in different cities don't merge.
 */

export interface SellerLike {
  id: string;
  name: string | null;
  phone: string | null;
  source_platform: string | null;
  total_listings_seen: number;
  active_listings: number | null;
  primary_governorate: string | null;
  pipeline_status: string | null;
  last_outreach_at: string | null;
  outreach_count: number | null;
  whale_score: number;
  seller_tier: string | null;
  created_at: string;
  /** Persisted merchant key from ahe_sellers.merchant_key. May be null
   *  for legacy rows; the grouping function falls back to computing it. */
  merchant_key?: string | null;
  merchant_admin_phone?: string | null;
}

export interface MerchantPhone {
  seller_id: string;
  phone: string | null;
  listings: number;
  pipeline_status: string | null;
  last_outreach_at: string | null;
}

export interface Merchant {
  merchant_key: string;
  display_name: string;
  primary_governorate: string | null;
  source_platform: string | null;
  /** Selected admin phone (override → most-listings → first). */
  admin_phone: string | null;
  /** True when admin_phone came from manual override, not auto-pick. */
  admin_phone_overridden: boolean;
  total_listings: number;
  phones: MerchantPhone[];
  /** Aggregated pipeline_status: best-of-group (registered > interested > contacted > phone_found > discovered). */
  pipeline_status: string;
  last_outreach_at: string | null;
  outreach_count: number;
  whale_score: number;
  /** All seller_ids in this merchant — used by the PATCH endpoint to
   *  apply admin_phone overrides to every member of the group. */
  seller_ids: string[];
}

/**
 * Compute a stable identity key for a seller. Returns null when the
 * name is too generic / short to safely merge.
 */
export function computeMerchantKey(
  name: string | null | undefined,
  governorate: string | null | undefined,
  platform: string | null | undefined
): string | null {
  if (!name) return null;

  // Normalize Arabic + Latin: lowercase, trim, collapse whitespace,
  // unify common letter variants, strip punctuation.
  const normalized = String(name)
    .trim()
    .toLowerCase()
    .replace(/[ً-ْٰ]/g, "") // strip Arabic diacritics
    .replace(/[ىي]/g, "ي") // alef maksura → ya
    .replace(/[ةه]/g, "ه") // ta marbuta → ha (light merge, intentional)
    .replace(/[أإآا]/g, "ا") // alef variants → bare alef
    .replace(/[.\-_،,()'"]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized || normalized.length < 3) return null;

  // Refuse single-token short names — "أحمد" / "Mohamed" / "Ahmed" are
  // too common to merge across phone numbers without false positives.
  // Multi-token names ("أحمد علي", "ahmed ali") are fine.
  const tokens = normalized.split(/\s+/);
  if (tokens.length === 1 && normalized.length < 10) return null;

  const govPart = (governorate || "").trim().toLowerCase().replace(/\s+/g, "");
  // Strip "_bookmarklet" / "_railway" suffixes so the same brokerage on
  // the same source via different harvest channels still merges.
  const platformPart = (platform || "")
    .trim()
    .toLowerCase()
    .replace(/_(?:bookmarklet|railway|api|cron)$/i, "");

  return `${normalized}|${govPart}|${platformPart}`;
}

const PIPELINE_RANK: Record<string, number> = {
  registered: 5,
  interested: 4,
  contacted: 3,
  phone_found: 2,
  discovered: 1,
  rejected: 0,
  not_reachable: 0,
};

/**
 * Group sellers into merchants. Sellers without a stable merchant_key
 * (generic single names, missing names) become their own one-phone
 * merchant — never merged with anyone else.
 */
export function groupSellersIntoMerchants(sellers: SellerLike[]): Merchant[] {
  const buckets = new Map<string, SellerLike[]>();

  for (const s of sellers) {
    // Prefer the persisted merchant_key from ahe_sellers (computed at
    // insert by the receive endpoint and self-healed by the whales API).
    // Fall back to computing it if the column is missing/null — keeps
    // the function safe to use against rows that haven't been healed yet.
    const key =
      s.merchant_key ||
      computeMerchantKey(s.name, s.primary_governorate, s.source_platform) ||
      `__solo__${s.id}`; // unique-per-seller key for un-mergeable rows
    const arr = buckets.get(key);
    if (arr) arr.push(s);
    else buckets.set(key, [s]);
  }

  const merchants: Merchant[] = [];
  for (const [key, group] of buckets.entries()) {
    // Display name: pick the longest-cleanest name in the group
    const displayName =
      group
        .map((g) => (g.name || "").trim())
        .filter((n) => n.length > 0)
        .sort((a, b) => b.length - a.length)[0] || "—";

    const phones: MerchantPhone[] = group.map((g) => ({
      seller_id: g.id,
      phone: g.phone,
      listings: g.total_listings_seen || 0,
      pipeline_status: g.pipeline_status,
      last_outreach_at: g.last_outreach_at,
    }));
    phones.sort((a, b) => b.listings - a.listings);

    const totalListings = phones.reduce((sum, p) => sum + p.listings, 0);

    // Admin phone: explicit override → most-listings → first phone with one
    const overrideValues = group
      .map((g) => g.merchant_admin_phone)
      .filter((v): v is string => !!v);
    const override = overrideValues[0] || null;
    const overrideExistsInGroup =
      override && phones.some((p) => p.phone === override);
    const autoPick =
      phones.find((p) => p.phone)?.phone || null;
    const adminPhone = overrideExistsInGroup ? override : autoPick;
    const adminOverridden = !!overrideExistsInGroup;

    // Best pipeline_status across the group
    let bestStatus = "discovered";
    let bestRank = -1;
    for (const g of group) {
      const ps = g.pipeline_status || "discovered";
      const rank = PIPELINE_RANK[ps] ?? 1;
      if (rank > bestRank) {
        bestRank = rank;
        bestStatus = ps;
      }
    }

    const lastOutreach = group
      .map((g) => g.last_outreach_at)
      .filter((d): d is string => !!d)
      .sort()
      .reverse()[0] || null;

    const outreachCount = group.reduce(
      (sum, g) => sum + (g.outreach_count || 0),
      0
    );
    const whaleScore = Math.max(...group.map((g) => g.whale_score || 0));

    merchants.push({
      merchant_key: key,
      display_name: displayName,
      primary_governorate: group[0].primary_governorate,
      source_platform: (group[0].source_platform || "").replace(
        /_(?:bookmarklet|railway|api|cron)$/i,
        ""
      ),
      admin_phone: adminPhone,
      admin_phone_overridden: adminOverridden,
      total_listings: totalListings,
      phones,
      pipeline_status: bestStatus,
      last_outreach_at: lastOutreach,
      outreach_count: outreachCount,
      whale_score: whaleScore,
      seller_ids: group.map((g) => g.id),
    });
  }

  // Sort merchants by total listings descending (highest first → whales)
  merchants.sort((a, b) => b.total_listings - a.total_listings);
  return merchants;
}
