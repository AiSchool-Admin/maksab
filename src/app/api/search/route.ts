/**
 * Advanced Search API — Full-text Arabic + Fuzzy matching + Smart filtering
 * Uses Supabase RPC function search_ads_advanced()
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCategoryById } from "@/lib/categories/categories-config";
import { generateAutoTitle } from "@/lib/categories/generate";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      originalQuery,
      category,
      subcategory,
      saleType,
      priceMin,
      priceMax,
      governorate,
      city,
      condition,
      sortBy = "relevance",
      categoryFilters,
      page = 0,
      limit = 12,
    } = body;

    const supabase = getServiceClient();
    const offset = page * limit;

    // Try RPC first (full-text + fuzzy)
    // Pass the original user-typed query (before AI cleaning) if no clean query available
    const rpcQuery = query || originalQuery || null;
    // Pass categoryFilters as object (not string) so PostgREST maps it to JSONB correctly
    const { data, error } = await supabase.rpc("search_ads_advanced" as never, {
      p_query: rpcQuery,
      p_category: category || null,
      p_subcategory: subcategory || null,
      p_sale_type: saleType || null,
      p_price_min: priceMin ?? null,
      p_price_max: priceMax ?? null,
      p_governorate: governorate || null,
      p_city: city || null,
      p_condition: condition || null,
      p_sort_by: sortBy || "relevance",
      p_category_filters: categoryFilters && Object.keys(categoryFilters).length > 0
        ? categoryFilters
        : null,
      p_limit: limit,
      p_offset: offset,
    } as never);

    if (error) {
      // Fallback to basic search if RPC doesn't exist yet
      console.warn("RPC search_ads_advanced failed, falling back:", error.message);
      return fallbackSearch(supabase, { ...body, originalQuery }, offset, limit);
    }

    const rows = (data || []) as Record<string, unknown>[];
    const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

    const ads = rows.map((row) => {
      // Resolve title using Arabic labels from category config
      let title = row.title as string;
      const catId = row.category_id as string | undefined;
      const subId = row.subcategory_id as string | undefined;
      const catFields = (row.category_fields as Record<string, unknown>) ?? {};
      if (catId) {
        const catConfig = getCategoryById(catId);
        if (catConfig) {
          const resolved = generateAutoTitle(catConfig, catFields, subId || undefined);
          if (resolved) title = resolved;
        }
      }
      return {
      id: row.id,
      title,
      price: row.price ? Number(row.price) : null,
      saleType: row.sale_type,
      image: ((row.images as string[]) ?? [])[0] ?? null,
      images: row.images ?? [],
      governorate: row.governorate,
      city: row.city,
      categoryId: row.category_id,
      subcategoryId: row.subcategory_id,
      categoryFields: row.category_fields,
      createdAt: row.created_at,
      isNegotiable: row.is_negotiable ?? false,
      auctionStartPrice: row.auction_start_price ? Number(row.auction_start_price) : undefined,
      auctionBuyNowPrice: row.auction_buy_now_price ? Number(row.auction_buy_now_price) : undefined,
      auctionEndsAt: row.auction_ends_at ?? undefined,
      auctionStatus: row.auction_status ?? undefined,
      exchangeDescription: row.exchange_description ?? undefined,
      viewsCount: row.views_count ?? 0,
      favoritesCount: row.favorites_count ?? 0,
      relevanceScore: row.relevance_score ? Number(row.relevance_score) : 0,
      matchType: row.match_type ?? "none",
    };
    });

    // Log search query for trending (fire and forget)
    if (query) {
      Promise.resolve(
        supabase.rpc("log_search_query" as never, {
          p_query: query,
          p_user_id: null,
          p_category_id: category || null,
          p_results_count: totalCount,
        } as never)
      ).catch(() => {});
    }

    return NextResponse.json({
      ads,
      total: totalCount,
      hasMore: offset + limit < totalCount,
      page,
      searchMethod: rows.length > 0 ? (rows[0] as Record<string, unknown>).match_type : "none",
    });
  } catch (err) {
    console.error("Search API error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة في البحث" },
      { status: 500 }
    );
  }
}

/** Build a base fallback query with all filters except text search */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFallbackQuery(
  supabase: any,
  body: Record<string, unknown>,
  includeTextSearch: boolean,
) {
  let q = supabase
    .from("ads" as never)
    .select("*", { count: "exact" })
    .eq("status", "active")
    .not("category_fields", "cs", '{"_type":"buy_request"}');

  if (includeTextSearch && body.query) {
    // Sanitize query for PostgREST .or() filter — escape special chars
    const sanitized = String(body.query)
      .replace(/[%_\\]/g, "\\$&")   // escape LIKE wildcards
      .replace(/[(),."']/g, "");     // remove PostgREST control chars
    if (sanitized.trim()) {
      q = q.or(
        `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
      );
    }
  }
  if (body.category) q = q.eq("category_id", body.category);
  if (body.subcategory) q = q.eq("subcategory_id", body.subcategory);
  if (body.saleType) q = q.eq("sale_type", body.saleType);
  if (body.priceMin != null) q = q.gte("price", body.priceMin);
  if (body.priceMax != null) q = q.lte("price", body.priceMax);
  if (body.governorate) q = q.eq("governorate", body.governorate);
  if (body.city) q = q.eq("city", body.city);

  // Condition filter: "new" matches new/sealed, "used" matches everything else
  if (body.condition === "new") {
    q = q.in("category_fields->>condition", ["new", "sealed", "new_tagged", "new_no_tag"]);
  } else if (body.condition === "used") {
    q = q.not("category_fields->>condition", "in", "(new,sealed,new_tagged,new_no_tag)");
  }

  // Apply category-specific JSONB filters (brand, karat, storage, etc.)
  // Whitelist of allowed category field names to prevent JSONB injection
  const ALLOWED_CATEGORY_FIELDS = new Set([
    "brand", "model", "year", "mileage", "color", "fuel", "transmission",
    "engine_cc", "condition", "licensed", "type", "area", "rooms", "floor",
    "bathrooms", "finishing", "elevator", "garage", "garden", "facing",
    "furnished", "storage", "ram", "battery_health", "with_box", "with_warranty",
    "size", "material", "karat", "weight", "ring_size", "has_gemstone",
    "certificate", "authentic", "purchase_year", "with_receipt", "capacity",
    "pieces", "dimensions", "power", "quantity", "service_type", "pricing",
    "experience", "service_area", "working_days", "working_hours",
  ]);

  if (body.categoryFilters && typeof body.categoryFilters === "object") {
    const cf = body.categoryFilters as Record<string, string>;
    for (const [key, value] of Object.entries(cf)) {
      if (key && value && typeof value === "string" && ALLOWED_CATEGORY_FIELDS.has(key)) {
        q = q.eq(`category_fields->>${key}`, value);
      }
    }
  }

  switch (body.sortBy) {
    case "price_asc":
      q = q.order("price", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      q = q.order("price", { ascending: false, nullsFirst: false });
      break;
    default:
      q = q.order("created_at", { ascending: false });
  }

  return q;
}

/** Fallback when RPC is not available — progressive relaxation */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fallbackSearch(
  supabase: any,
  body: Record<string, unknown>,
  offset: number,
  limit: number
) {
  const formatRows = (rows: Record<string, unknown>[]) =>
    rows.map((row) => {
      // Resolve title using Arabic labels
      let title = row.title as string;
      const catId = row.category_id as string | undefined;
      const subId = row.subcategory_id as string | undefined;
      const catFields = (row.category_fields as Record<string, unknown>) ?? {};
      if (catId) {
        const catConfig = getCategoryById(catId);
        if (catConfig) {
          const resolved = generateAutoTitle(catConfig, catFields, subId || undefined);
          if (resolved) title = resolved;
        }
      }
      return {
      id: row.id,
      title,
      price: row.price ? Number(row.price) : null,
      saleType: row.sale_type,
      image: ((row.images as string[]) ?? [])[0] ?? null,
      governorate: row.governorate,
      city: row.city,
      createdAt: row.created_at,
      isNegotiable: row.is_negotiable ?? false,
      auctionEndsAt: row.auction_ends_at ?? undefined,
      exchangeDescription: row.exchange_description ?? undefined,
      relevanceScore: 0,
      matchType: "fallback",
    };
    });

  // Also try with original query text (before AI cleaning) for ILIKE matching
  const originalQuery = body.originalQuery as string | undefined;

  // Step 1: Try full query with all filters (strictest)
  const q = buildFallbackQuery(supabase, body, true)
    .range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) {
    console.warn("Fallback search step 1 error:", error.message);
  }

  let rows = (!error && data ? data : []) as Record<string, unknown>[];

  // Step 2: If 0 results and we have an original query, try with original text + category (no categoryFilters)
  if (rows.length === 0 && (originalQuery || body.query)) {
    const relaxedBody: Record<string, unknown> = { ...body, categoryFilters: undefined };
    // Use original query for text search if available
    if (originalQuery && !body.query) {
      relaxedBody.query = originalQuery;
    }
    const relaxedQ = buildFallbackQuery(supabase, relaxedBody, true)
      .range(offset, offset + limit - 1);

    const { data: rData, error: rErr, count: rCount } = await relaxedQ;
    if (!rErr && rData && (rData as unknown[]).length > 0) {
      const rRows = rData as Record<string, unknown>[];
      const ads = formatRows(rRows);
      const total = rCount ?? ads.length;
      return NextResponse.json({
        ads,
        total,
        hasMore: offset + limit < total,
        page: Math.floor(offset / limit),
        searchMethod: "relaxed",
      });
    }
  }

  // Step 3: If still 0 results and we have category, try category-only (no text, no categoryFilters)
  if (rows.length === 0 && body.category) {
    const categoryOnlyBody = {
      category: body.category,
      subcategory: body.subcategory,
      saleType: body.saleType,
      priceMin: body.priceMin,
      priceMax: body.priceMax,
      governorate: body.governorate,
      city: body.city,
      sortBy: body.sortBy,
    };
    const catQ = buildFallbackQuery(supabase, categoryOnlyBody, false)
      .range(offset, offset + limit - 1);

    const { data: catData, error: catErr, count: catCount } = await catQ;
    if (!catErr && catData && (catData as unknown[]).length > 0) {
      const catRows = catData as Record<string, unknown>[];
      const ads = formatRows(catRows);
      const total = catCount ?? ads.length;
      return NextResponse.json({
        ads,
        total,
        hasMore: offset + limit < total,
        page: Math.floor(offset / limit),
        searchMethod: "broadened",
      });
    }
  }

  const ads = formatRows(rows);
  const total = count ?? ads.length;
  return NextResponse.json({
    ads,
    total,
    hasMore: offset + limit < total,
    page: Math.floor(offset / limit),
    searchMethod: "fallback",
  });
}
