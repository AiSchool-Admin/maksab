/**
 * Smart Exchange Engine — matching, scoring, and chain detection.
 *
 * Matching strategy:
 * 1. Category match: Does the ad belong to the wanted category?
 * 2. Field match:    Do specific fields (brand, model, etc.) overlap?
 * 3. Bidirectional:  Does the other person also want what I have?
 * 4. Chain:          Can we form A→B→C→A 3-way trades?
 */

import { supabase } from "@/lib/supabase/client";
import { getCategoryById } from "@/lib/categories/categories-config";
import { resolveFieldLabel } from "@/lib/categories/generate";
import type { ExchangeWantedItem, ExchangeMatchResult, MatchLevel, ChainExchange } from "./types";

/* ── Parse exchange_wanted from category_fields JSONB ────────────────── */

export function parseExchangeWanted(
  categoryFields: Record<string, unknown>,
): ExchangeWantedItem | null {
  const wanted = categoryFields?.exchange_wanted;
  if (!wanted || typeof wanted !== "object") return null;
  const w = wanted as Record<string, unknown>;
  if (!w.category_id) return null;
  return {
    categoryId: w.category_id as string,
    subcategoryId: (w.subcategory_id as string) || undefined,
    fields: (w.fields as Record<string, unknown>) || {},
    title: (w.title as string) || "",
  };
}

/* ── Generate wanted item title from structured fields ───────────────── */

export function generateWantedTitle(
  categoryId: string,
  fields: Record<string, unknown>,
  subcategoryId?: string,
): string {
  const config = getCategoryById(categoryId);
  if (!config) return "";

  const parts: string[] = [];

  // Add category icon + name as context
  // Get the most important fields (required ones)
  const override = subcategoryId ? config.subcategoryOverrides?.[subcategoryId] : undefined;
  const reqFields = override?.requiredFields ?? config.requiredFields;

  for (const fieldId of reqFields) {
    const field = config.fields.find((f) => f.id === fieldId);
    if (!field) continue;
    if (subcategoryId && field.hiddenForSubcategories?.includes(subcategoryId)) continue;

    const val = fields[fieldId];
    if (val === undefined || val === null || val === "") continue;

    const label = resolveFieldLabel(field, val);
    if (label) parts.push(label);
  }

  if (parts.length === 0) {
    // Fallback: just category name
    return config.name;
  }

  return parts.join(" — ");
}

/* ── Calculate match score between an ad and a wanted item ───────────── */

function calculateMatchScore(
  ad: Record<string, unknown>,
  wanted: ExchangeWantedItem,
  myAdCategoryId: string,
  myAdCategoryFields: Record<string, unknown>,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const adCategoryId = ad.category_id as string;
  const adSubcategoryId = ad.subcategory_id as string;
  const adCategoryFields = (ad.category_fields as Record<string, unknown>) || {};

  // ── 1. Category match (30 pts max) ──
  if (adCategoryId === wanted.categoryId) {
    score += 20;
    reasons.push("نفس القسم المطلوب");

    // Subcategory match bonus
    if (wanted.subcategoryId && adSubcategoryId === wanted.subcategoryId) {
      score += 10;
      reasons.push("نفس القسم الفرعي");
    }
  } else {
    // No category match — very low score
    return { score: 5, reasons: ["قسم مختلف"] };
  }

  // ── 2. Field-level matching (40 pts max) ──
  const wantedFields = wanted.fields;
  const fieldKeys = Object.keys(wantedFields).filter(
    (k) => wantedFields[k] !== undefined && wantedFields[k] !== null && wantedFields[k] !== "",
  );

  if (fieldKeys.length > 0) {
    const pointsPerField = Math.min(40 / fieldKeys.length, 15);
    let matchedFields = 0;

    for (const key of fieldKeys) {
      const wantedVal = String(wantedFields[key]).toLowerCase();
      const adVal = String(adCategoryFields[key] || "").toLowerCase();

      if (adVal && wantedVal === adVal) {
        score += pointsPerField;
        matchedFields++;
      }
    }

    if (matchedFields === fieldKeys.length) {
      reasons.push("كل المواصفات المطلوبة متطابقة");
    } else if (matchedFields > 0) {
      reasons.push(`${matchedFields} من ${fieldKeys.length} مواصفات متطابقة`);
    }
  } else {
    // No specific fields wanted — give base category score
    score += 15;
  }

  // ── 3. Bidirectional match (30 pts max) — does the other person want what I have? ──
  const otherWanted = parseExchangeWanted(adCategoryFields);
  if (otherWanted && ad.sale_type === "exchange") {
    // Does the other ad want MY category?
    if (otherWanted.categoryId === myAdCategoryId) {
      score += 15;
      reasons.push("الطرف التاني عايز اللي عندك");

      // Field-level reverse match
      const otherWantedFields = otherWanted.fields;
      const reverseKeys = Object.keys(otherWantedFields).filter(
        (k) => otherWantedFields[k] !== undefined && otherWantedFields[k] !== null && otherWantedFields[k] !== "",
      );

      let reverseMatches = 0;
      for (const key of reverseKeys) {
        const otherWantedVal = String(otherWantedFields[key]).toLowerCase();
        const myVal = String(myAdCategoryFields[key] || "").toLowerCase();
        if (myVal && otherWantedVal === myVal) {
          reverseMatches++;
        }
      }

      if (reverseKeys.length > 0 && reverseMatches === reverseKeys.length) {
        score += 15;
        reasons.push("تطابق مثالي — كل واحد عنده اللي التاني عايزه!");
      } else if (reverseMatches > 0) {
        score += Math.round(15 * (reverseMatches / reverseKeys.length));
        reasons.push("بعض مواصفات اللي عندك مطلوبة");
      }
    }
  }

  return { score: Math.min(score, 100), reasons };
}

/* ── Determine match level from score ────────────────────────────────── */

function getMatchLevel(score: number): MatchLevel {
  if (score >= 80) return "perfect";
  if (score >= 60) return "strong";
  if (score >= 40) return "good";
  return "partial";
}

/* ── Find exchange matches from DB ───────────────────────────────────── */

export async function findSmartExchangeMatches(params: {
  currentAdId: string;
  adTitle: string;
  adCategoryId: string;
  adCategoryFields: Record<string, unknown>;
  exchangeWanted: ExchangeWantedItem;
  exchangeDescription?: string;
}): Promise<ExchangeMatchResult[]> {
  const { currentAdId, adCategoryId, adCategoryFields, exchangeWanted, exchangeDescription } = params;

  try {
    // Strategy: fetch candidate ads from multiple angles
    const results: ExchangeMatchResult[] = [];
    const seenIds = new Set<string>();

    // ── Query 1: Ads in the WANTED category (highest relevance) ──
    const { data: wantedCategoryAds } = await supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .eq("category_id", exchangeWanted.categoryId)
      .neq("id", currentAdId)
      .limit(15);

    // ── Query 2: Exchange ads that might want MY category ──
    const { data: reverseExchangeAds } = await supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .eq("sale_type", "exchange")
      .neq("id", currentAdId)
      .neq("category_id", exchangeWanted.categoryId) // avoid duplicates from query 1
      .limit(10);

    // ── Query 3: Text-based fallback (for backward compat with old text-only exchange) ──
    let textMatches: Record<string, unknown>[] = [];
    if (exchangeDescription) {
      const { data: textData } = await supabase
        .from("ads" as never)
        .select("*")
        .eq("status", "active")
        .neq("id", currentAdId)
        .or(`title.ilike.%${exchangeDescription.replace(/[%_\\]/g, "\\$&").replace(/[(),."']/g, "")}%,exchange_description.ilike.%${(params.adTitle || "").replace(/[%_\\]/g, "\\$&").replace(/[(),."']/g, "")}%`)
        .limit(6);
      textMatches = (textData as Record<string, unknown>[]) || [];
    }

    // ── Score and merge all candidates ──
    const allCandidates = [
      ...((wantedCategoryAds as Record<string, unknown>[]) || []),
      ...((reverseExchangeAds as Record<string, unknown>[]) || []),
      ...textMatches,
    ];

    // Batch-fetch seller display names
    const userIds = new Set<string>();
    for (const ad of allCandidates) {
      if (ad.user_id) userIds.add(ad.user_id as string);
    }
    const sellerNames = new Map<string, string>();
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles" as never)
        .select("id, display_name")
        .in("id", Array.from(userIds));
      if (profiles) {
        for (const p of profiles as Record<string, unknown>[]) {
          sellerNames.set(p.id as string, (p.display_name as string) || "مستخدم");
        }
      }
    }

    for (const ad of allCandidates) {
      const adId = ad.id as string;
      if (seenIds.has(adId)) continue;
      seenIds.add(adId);

      const { score, reasons } = calculateMatchScore(
        ad,
        exchangeWanted,
        adCategoryId,
        adCategoryFields,
      );

      // Filter out very low matches
      if (score < 15) continue;

      const adCatId = ad.category_id as string;
      const adConfig = getCategoryById(adCatId);
      const userId = (ad.user_id as string) || null;

      results.push({
        adId,
        title: ad.title as string,
        image: ((ad.images as string[]) ?? [])[0] ?? null,
        saleType: ad.sale_type as "cash" | "auction" | "exchange",
        price: ad.price ? Number(ad.price) : null,
        exchangeDescription: (ad.exchange_description as string) || null,
        exchangeWanted: parseExchangeWanted(
          (ad.category_fields as Record<string, unknown>) || {},
        ),
        governorate: (ad.governorate as string) || null,
        city: (ad.city as string) || null,
        matchLevel: getMatchLevel(score),
        matchScore: score,
        matchReasons: reasons,
        categoryIcon: adConfig?.icon || "📦",
        sellerId: userId,
        sellerName: userId ? (sellerNames.get(userId) || "مستخدم") : null,
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.matchScore - a.matchScore);

    return results.slice(0, 12);
  } catch {
    return [];
  }
}

/* ── Find chain exchanges (A→B→C→A) ──────────────────────────────────── */

export async function findChainExchanges(params: {
  currentAdId: string;
  adCategoryId: string;
  adCategoryFields: Record<string, unknown>;
  exchangeWanted: ExchangeWantedItem;
}): Promise<ChainExchange[]> {
  const { currentAdId, adCategoryId, exchangeWanted } = params;

  try {
    // A has [adCategoryId], wants [exchangeWanted.categoryId]
    // Look for B: has [exchangeWanted.categoryId], wants [something else = C]
    // Then look for C: has [C], wants [adCategoryId]

    const { data: bCandidates } = await supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .eq("sale_type", "exchange")
      .eq("category_id", exchangeWanted.categoryId)
      .neq("id", currentAdId)
      .limit(10);

    if (!bCandidates || (bCandidates as Record<string, unknown>[]).length === 0) return [];

    const chains: ChainExchange[] = [];

    for (const bAd of (bCandidates as Record<string, unknown>[])) {
      const bFields = (bAd.category_fields as Record<string, unknown>) || {};
      const bWanted = parseExchangeWanted(bFields);

      // B wants something — let's call it category C
      if (!bWanted || bWanted.categoryId === adCategoryId) continue; // skip if B wants A directly (that's a direct match, not chain)

      const cCategoryId = bWanted.categoryId;

      // Look for C: has cCategoryId, wants adCategoryId
      const { data: cCandidates } = await supabase
        .from("ads" as never)
        .select("*")
        .eq("status", "active")
        .eq("sale_type", "exchange")
        .eq("category_id", cCategoryId)
        .neq("id", currentAdId)
        .neq("id", bAd.id)
        .limit(5);

      if (!cCandidates) continue;

      for (const cAd of (cCandidates as Record<string, unknown>[])) {
        const cFields = (cAd.category_fields as Record<string, unknown>) || {};
        const cWanted = parseExchangeWanted(cFields);

        // C wants my category?
        if (!cWanted || cWanted.categoryId !== adCategoryId) continue;

        // Found a chain! A→B→C→A
        const bConfig = getCategoryById(bAd.category_id as string);
        const cConfig = getCategoryById(cAd.category_id as string);
        const aConfig = getCategoryById(adCategoryId);

        chains.push({
          links: [
            {
              adId: bAd.id as string,
              title: bAd.title as string,
              image: ((bAd.images as string[]) ?? [])[0] ?? null,
              ownerName: "مستخدم",
              categoryIcon: bConfig?.icon || "📦",
              has: bAd.title as string,
              wants: bWanted.title || bConfig?.name || "",
            },
            {
              adId: cAd.id as string,
              title: cAd.title as string,
              image: ((cAd.images as string[]) ?? [])[0] ?? null,
              ownerName: "مستخدم",
              categoryIcon: cConfig?.icon || "📦",
              has: cAd.title as string,
              wants: cWanted.title || aConfig?.name || "",
            },
          ],
          totalScore: 70, // Chain exchanges get a fixed good score
        });

        if (chains.length >= 3) break; // limit chains
      }

      if (chains.length >= 3) break;
    }

    return chains;
  } catch {
    return [];
  }
}
