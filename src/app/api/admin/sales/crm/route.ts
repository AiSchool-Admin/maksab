/**
 * GET /api/admin/sales/crm — Unified sellers list with advanced filters
 *
 * Query params:
 *   q             = free-text search (name or phone)
 *   category      = cars | properties (maps Arabic + English variants)
 *   governorate   = الإسكندرية | alexandria (defaults to Alexandria)
 *   stage         = pipeline_status filter (comma-separated for multiple)
 *   account_type  = individual | broker | agency
 *   source        = dubizzle | opensooq | olx | etc.
 *   has_phone     = true | false
 *   has_response  = true | false (filter sellers who responded)
 *   name_like     = filter by name pattern (e.g. "وكالة" for agencies only)
 *   sort          = whale_score | listings | last_outreach | created (default: listings)
 *   limit         = default 50, max 200
 *   offset        = for pagination
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const CATEGORY_VARIANTS: Record<string, string[]> = {
  cars: ["cars", "vehicles", "سيارات"],
  properties: ["properties", "real_estate", "عقارات"],
};

const GOV_VARIANTS: Record<string, string[]> = {
  alexandria: ["الإسكندرية", "alexandria", "Alexandria"],
};

export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;

    const q = sp.get("q")?.trim() || "";
    const category = sp.get("category") || "";
    const governorate = sp.get("governorate") || "alexandria";
    const stage = sp.get("stage") || "";
    const accountType = sp.get("account_type") || "";
    const source = sp.get("source") || "";
    const hasPhone = sp.get("has_phone");
    const hasResponse = sp.get("has_response");
    const nameLike = sp.get("name_like") || "";
    const sort = sp.get("sort") || "listings";
    const limit = Math.min(parseInt(sp.get("limit") || "50"), 200);
    const offset = parseInt(sp.get("offset") || "0");

    const sb = getSupabase();
    let query = sb
      .from("ahe_sellers")
      .select(
        "id, name, phone, primary_category, primary_governorate, source_platform, detected_account_type, pipeline_status, total_listings_seen, active_listings, whale_score, priority_score, outreach_count, last_outreach_at, last_response_at, created_at",
        { count: "exact" }
      );

    // Governorate
    if (governorate) {
      const govs = GOV_VARIANTS[governorate] || [governorate];
      query = query.in("primary_governorate", govs);
    }

    // Category
    if (category) {
      const cats = CATEGORY_VARIANTS[category] || [category];
      query = query.in("primary_category", cats);
    }

    // Pipeline stage (supports multiple)
    if (stage) {
      const stages = stage.split(",").map((s) => s.trim()).filter(Boolean);
      if (stages.length === 1) {
        query = stages[0] === "null"
          ? query.is("pipeline_status", null)
          : query.eq("pipeline_status", stages[0]);
      } else {
        query = query.in("pipeline_status", stages);
      }
    }

    // Account type
    if (accountType) {
      query = query.eq("detected_account_type", accountType);
    }

    // Source platform
    if (source) {
      query = query.eq("source_platform", source);
    }

    // Phone filter
    if (hasPhone === "true") query = query.not("phone", "is", null);
    if (hasPhone === "false") query = query.is("phone", null);

    // Response filter
    if (hasResponse === "true") query = query.not("last_response_at", "is", null);

    // Free-text search (name or phone)
    if (q) {
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    // Name pattern (e.g. "وكالة" for agencies)
    if (nameLike) {
      query = query.ilike("name", `%${nameLike}%`);
    }

    // Sorting
    switch (sort) {
      case "whale_score":
        query = query.order("whale_score", { ascending: false, nullsFirst: false });
        break;
      case "last_outreach":
        query = query.order("last_outreach_at", { ascending: false, nullsFirst: false });
        break;
      case "created":
        query = query.order("created_at", { ascending: false });
        break;
      case "listings":
      default:
        query = query.order("total_listings_seen", { ascending: false, nullsFirst: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add quick stats
    const sellers = (data || []).map((s) => ({
      ...s,
      consent_url: `/consent?seller=${s.id}&ref=${
        CATEGORY_VARIANTS.cars.includes(s.primary_category) ? "waleed" : "ahmed"
      }`,
      crm_url: `/admin/sales/crm/${s.id}`,
    }));

    return NextResponse.json({
      sellers,
      total: count || 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error("[sales/crm GET] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
