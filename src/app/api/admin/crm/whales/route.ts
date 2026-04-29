/**
 * GET /api/admin/crm/whales — Pareto analysis of sellers
 *
 * Returns top sellers ranked by total_listings_seen with cumulative
 * percentage data, plus aggregate breakpoints (top 10/20/30/50%) so
 * the UI can show "Top N% of sellers own X% of listings".
 *
 * The "whales" framing prioritizes the 80/20 rule for outreach: focus
 * the personal-touch acquisition effort on the small set of sellers
 * holding the bulk of inventory.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

interface Seller {
  id: string;
  name: string | null;
  phone: string | null;
  source_platform: string | null;
  total_listings_seen: number;
  active_listings: number | null;
  seller_tier: string | null;
  whale_score: number;
  pipeline_status: string | null;
  primary_category: string | null;
  primary_governorate: string | null;
  last_outreach_at: string | null;
  outreach_count: number | null;
  created_at: string;
}

interface RankedSeller extends Seller {
  rank: number;
  individual_pct: number;
  cumulative_pct: number;
}

export async function GET(request: NextRequest) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category") || "properties";
    const governorates = (
      searchParams.get("governorates") || "الإسكندرية,alexandria,الاسكندرية"
    ).split(",");
    const phoneOnly = searchParams.get("phoneOnly") !== "false"; // default true for outreach
    const minListings = Math.max(
      1,
      parseInt(searchParams.get("minListings") || "1", 10)
    );

    // Fetch ALL sellers matching the filters (no pagination — Pareto needs the full set)
    let query = sb
      .from("ahe_sellers")
      .select(
        "id, name, phone, source_platform, total_listings_seen, active_listings, seller_tier, whale_score, pipeline_status, primary_category, primary_governorate, last_outreach_at, outreach_count, created_at"
      )
      .eq("primary_category", category)
      .in("primary_governorate", governorates)
      .gte("total_listings_seen", minListings);

    if (phoneOnly) query = query.not("phone", "is", null);

    query = query.order("total_listings_seen", { ascending: false }).limit(1000);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sellers = (data || []) as Seller[];
    const totalSellers = sellers.length;
    const totalListings = sellers.reduce(
      (sum, s) => sum + (s.total_listings_seen || 0),
      0
    );

    // Rank + cumulative percentage
    let cumulative = 0;
    const ranked: RankedSeller[] = sellers.map((s, i) => {
      const listings = s.total_listings_seen || 0;
      cumulative += listings;
      const cumPct = totalListings > 0 ? (cumulative / totalListings) * 100 : 0;
      const indPct = totalListings > 0 ? (listings / totalListings) * 100 : 0;
      return {
        ...s,
        rank: i + 1,
        individual_pct: Math.round(indPct * 100) / 100,
        cumulative_pct: Math.round(cumPct * 100) / 100,
      };
    });

    // Pareto breakpoints: at each percentile of SELLERS, what % of LISTINGS do they hold?
    // Classic 80/20 framing: "Top 20% of sellers own X% of listings."
    const breakpoints = [10, 20, 30, 50, 80].map((sellerPct) => {
      const cutoff = Math.max(1, Math.ceil((sellerPct / 100) * totalSellers));
      const sliceListings = ranked
        .slice(0, cutoff)
        .reduce((sum, s) => sum + s.total_listings_seen, 0);
      const share =
        totalListings > 0 ? (sliceListings / totalListings) * 100 : 0;
      return {
        seller_percentile: sellerPct,
        seller_count: cutoff,
        listings_count: sliceListings,
        listings_share: Math.round(share * 100) / 100,
      };
    });

    // The actual 80/20 cutoff: how many sellers does it take to reach 80% of listings?
    let pareto80Count = totalSellers;
    let pareto80Listings = totalListings;
    for (let i = 0; i < ranked.length; i++) {
      if (ranked[i].cumulative_pct >= 80) {
        pareto80Count = i + 1;
        pareto80Listings = ranked
          .slice(0, i + 1)
          .reduce((sum, s) => sum + s.total_listings_seen, 0);
        break;
      }
    }

    // Outreach progress on whales (top 20%) — how many we've actually reached out to
    const top20Cutoff = Math.max(1, Math.ceil(totalSellers * 0.2));
    const top20 = ranked.slice(0, top20Cutoff);
    const contactedCount = top20.filter(
      (s) =>
        s.pipeline_status === "contacted" ||
        s.pipeline_status === "interested" ||
        s.pipeline_status === "registered"
    ).length;
    const consentedCount = top20.filter(
      (s) => s.pipeline_status === "registered"
    ).length;

    return NextResponse.json({
      summary: {
        total_sellers: totalSellers,
        total_listings: totalListings,
        // 80/20 rule: how concentrated is supply?
        pareto_80_seller_count: pareto80Count,
        pareto_80_seller_share:
          totalSellers > 0
            ? Math.round((pareto80Count / totalSellers) * 10000) / 100
            : 0,
        pareto_80_listings: pareto80Listings,
        // Top 20% specifically (the whales we'll work)
        top_20pct_seller_count: top20Cutoff,
        top_20pct_listings: top20.reduce(
          (sum, s) => sum + s.total_listings_seen,
          0
        ),
        top_20pct_listings_share:
          breakpoints.find((b) => b.seller_percentile === 20)?.listings_share ||
          0,
        top_20pct_contacted: contactedCount,
        top_20pct_consented: consentedCount,
      },
      breakpoints,
      whales: ranked,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/crm/whales — update pipeline_status / notes for a seller
 *
 * Lightweight write endpoint so the whales page can mark a seller as
 * "contacted" / "interested" / "rejected" inline without leaving the page.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { seller_id, pipeline_status, notes } = body || {};
    if (!seller_id) {
      return NextResponse.json(
        { error: "seller_id required" },
        { status: 400 }
      );
    }

    const allowed = [
      "discovered",
      "phone_found",
      "contacted",
      "interested",
      "registered",
      "rejected",
      "not_reachable",
    ];
    if (pipeline_status && !allowed.includes(pipeline_status)) {
      return NextResponse.json(
        { error: "Invalid pipeline_status" },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (pipeline_status) {
      update.pipeline_status = pipeline_status;
      // Also bump outreach metadata when transitioning to "contacted"
      if (pipeline_status === "contacted") {
        update.last_outreach_at = new Date().toISOString();
      }
    }
    if (typeof notes === "string") update.notes = notes;

    const sb = getSupabase();
    const { error } = await sb
      .from("ahe_sellers")
      .update(update)
      .eq("id", seller_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
