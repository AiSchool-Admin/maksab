/**
 * GET /api/admin/crm/whales — Pareto analysis grouped by MERCHANT
 *
 * Groups multi-phone brokerages (e.g. "Remax Avalon" with one phone per
 * agent) into single merchant rows so the whales table doesn't show the
 * same brokerage three times.
 *
 * Grouping uses the persisted `merchant_key` column on ahe_sellers,
 * computed at insert time by the receive endpoint. For sellers that
 * predate the column being added, this endpoint self-heals on first
 * load (computes and writes merchant_key for any NULL rows).
 *
 * Returns ranked merchants with cumulative percentage data, plus
 * aggregate breakpoints (top 10/20/30/50%) so the UI can show
 * "Top N% of merchants own X% of listings".
 *
 * PATCH: update pipeline_status (to all sellers in a merchant) or
 * override admin_phone for a merchant.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  groupSellersIntoMerchants,
  computeMerchantKey,
  type SellerLike,
} from "@/lib/crm/merchant";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category") || "properties";
    const governorates = (
      searchParams.get("governorates") || "الإسكندرية,alexandria,الاسكندرية"
    ).split(",");
    const phoneOnly = searchParams.get("phoneOnly") !== "false";
    const minListings = Math.max(
      1,
      parseInt(searchParams.get("minListings") || "1", 10)
    );

    const categoryValues =
      category === "properties"
        ? ["properties", "عقارات"]
        : category === "vehicles"
        ? ["vehicles", "سيارات", "cars", "مركبات"]
        : [category];

    // Self-heal NULL primary_category (one-time fix for sellers harvested
    // before the receive-endpoint started carrying maksab_category through).
    try {
      const { data: orphans } = await sb
        .from("ahe_sellers")
        .select("id")
        .is("primary_category", null)
        .in("primary_governorate", governorates)
        .limit(500);

      if (orphans && orphans.length > 0) {
        const orphanIds = (orphans as Array<{ id: string }>).map((o) => o.id);
        const { data: catRows } = await sb
          .from("ahe_listings")
          .select("ahe_seller_id, maksab_category")
          .in("ahe_seller_id", orphanIds)
          .not("maksab_category", "is", null);

        if (catRows && catRows.length > 0) {
          const tally: Record<string, Record<string, number>> = {};
          for (const r of catRows as Array<{
            ahe_seller_id: string;
            maksab_category: string;
          }>) {
            tally[r.ahe_seller_id] = tally[r.ahe_seller_id] || {};
            tally[r.ahe_seller_id][r.maksab_category] =
              (tally[r.ahe_seller_id][r.maksab_category] || 0) + 1;
          }
          const grouped: Record<string, string[]> = {};
          for (const [sid, counts] of Object.entries(tally)) {
            let best: string | null = null;
            let bestN = 0;
            for (const [c, n] of Object.entries(counts)) {
              if (n > bestN) {
                best = c;
                bestN = n;
              }
            }
            if (best) {
              grouped[best] = grouped[best] || [];
              grouped[best].push(sid);
            }
          }
          for (const [cat, ids] of Object.entries(grouped)) {
            await sb
              .from("ahe_sellers")
              .update({
                primary_category: cat,
                updated_at: new Date().toISOString(),
              })
              .in("id", ids)
              .is("primary_category", null);
          }
        }
      }
    } catch (healErr) {
      console.warn("[whales] backfill skipped:", healErr);
    }

    // Self-heal merchant_key for sellers that predate the column being
    // populated. Computes the same key the receive endpoint writes for
    // new sellers. Idempotent — only updates rows where merchant_key is
    // NULL, so safe to run on every load.
    try {
      const { data: keyOrphans } = await sb
        .from("ahe_sellers")
        .select("id, name, primary_governorate, source_platform")
        .is("merchant_key", null)
        .in("primary_category", categoryValues)
        .in("primary_governorate", governorates)
        .not("name", "is", null)
        .limit(500);

      if (keyOrphans && keyOrphans.length > 0) {
        for (const o of keyOrphans as Array<{
          id: string;
          name: string | null;
          primary_governorate: string | null;
          source_platform: string | null;
        }>) {
          const key = computeMerchantKey(
            o.name,
            o.primary_governorate,
            o.source_platform
          );
          if (key) {
            await sb
              .from("ahe_sellers")
              .update({
                merchant_key: key,
                updated_at: new Date().toISOString(),
              })
              .eq("id", o.id)
              .is("merchant_key", null);
          }
        }
      }
    } catch (mkErr) {
      console.warn("[whales] merchant_key backfill skipped:", mkErr);
    }

    // Fetch all matching sellers (no pagination — Pareto needs the full set)
    let query = sb
      .from("ahe_sellers")
      .select(
        "id, name, phone, source_platform, total_listings_seen, active_listings, seller_tier, whale_score, pipeline_status, primary_category, primary_governorate, last_outreach_at, outreach_count, created_at, merchant_admin_phone"
      )
      .in("primary_category", categoryValues)
      .in("primary_governorate", governorates)
      .gte("total_listings_seen", minListings);

    if (phoneOnly) query = query.not("phone", "is", null);

    query = query
      .order("total_listings_seen", { ascending: false })
      .limit(2000);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sellers = (data || []) as SellerLike[];

    // Group multi-phone brokerages into single merchant rows
    const merchants = groupSellersIntoMerchants(sellers);

    const totalMerchants = merchants.length;
    const totalListings = merchants.reduce(
      (sum, m) => sum + m.total_listings,
      0
    );

    // Rank + cumulative percentage on MERCHANTS
    let cumulative = 0;
    const ranked = merchants.map((m, i) => {
      cumulative += m.total_listings;
      const cumPct = totalListings > 0 ? (cumulative / totalListings) * 100 : 0;
      const indPct =
        totalListings > 0 ? (m.total_listings / totalListings) * 100 : 0;
      return {
        ...m,
        rank: i + 1,
        individual_pct: Math.round(indPct * 100) / 100,
        cumulative_pct: Math.round(cumPct * 100) / 100,
      };
    });

    // Pareto breakpoints
    const breakpoints = [10, 20, 30, 50, 80].map((merchantPct) => {
      const cutoff = Math.max(
        1,
        Math.ceil((merchantPct / 100) * totalMerchants)
      );
      const sliceListings = ranked
        .slice(0, cutoff)
        .reduce((sum, r) => sum + r.total_listings, 0);
      const share =
        totalListings > 0 ? (sliceListings / totalListings) * 100 : 0;
      return {
        merchant_percentile: merchantPct,
        merchant_count: cutoff,
        listings_count: sliceListings,
        listings_share: Math.round(share * 100) / 100,
      };
    });

    // 80/20 cutoff: how many merchants does it take to reach 80% of listings?
    let pareto80Count = totalMerchants;
    let pareto80Listings = totalListings;
    for (let i = 0; i < ranked.length; i++) {
      if (ranked[i].cumulative_pct >= 80) {
        pareto80Count = i + 1;
        pareto80Listings = ranked
          .slice(0, i + 1)
          .reduce((sum, r) => sum + r.total_listings, 0);
        break;
      }
    }

    // Outreach progress on whales (top 20%)
    const top20Cutoff = Math.max(1, Math.ceil(totalMerchants * 0.2));
    const top20 = ranked.slice(0, top20Cutoff);
    const contactedCount = top20.filter(
      (m) =>
        m.pipeline_status === "contacted" ||
        m.pipeline_status === "interested" ||
        m.pipeline_status === "registered"
    ).length;
    const consentedCount = top20.filter(
      (m) => m.pipeline_status === "registered"
    ).length;

    return NextResponse.json({
      summary: {
        total_merchants: totalMerchants,
        total_sellers: sellers.length,
        total_listings: totalListings,
        pareto_80_merchant_count: pareto80Count,
        pareto_80_merchant_share:
          totalMerchants > 0
            ? Math.round((pareto80Count / totalMerchants) * 10000) / 100
            : 0,
        pareto_80_listings: pareto80Listings,
        top_20pct_merchant_count: top20Cutoff,
        top_20pct_listings: top20.reduce((sum, m) => sum + m.total_listings, 0),
        top_20pct_listings_share:
          breakpoints.find((b) => b.merchant_percentile === 20)
            ?.listings_share || 0,
        top_20pct_contacted: contactedCount,
        top_20pct_consented: consentedCount,
      },
      breakpoints,
      merchants: ranked,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/crm/whales
 *
 * Two operations:
 *   1. Update pipeline_status — applied to ALL sellers in the merchant
 *      (passed as seller_ids[] from the UI's expanded merchant row)
 *   2. Override admin_phone — applied to all sellers in the merchant by
 *      writing the same merchant_admin_phone value
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { seller_ids, pipeline_status, admin_phone } = body || {};

    if (!Array.isArray(seller_ids) || seller_ids.length === 0) {
      return NextResponse.json(
        { error: "seller_ids[] required" },
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

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (pipeline_status) {
      update.pipeline_status = pipeline_status;
      if (pipeline_status === "contacted") {
        update.last_outreach_at = new Date().toISOString();
      }
    }
    if (admin_phone !== undefined) {
      update.merchant_admin_phone = admin_phone || null;
    }

    if (Object.keys(update).length === 1) {
      // only updated_at — nothing meaningful to do
      return NextResponse.json({ ok: true, no_op: true });
    }

    const sb = getSupabase();
    const { error } = await sb
      .from("ahe_sellers")
      .update(update)
      .in("id", seller_ids);

    // Activity log: record the action in outreach_logs so it shows in
    // the merchant's timeline. Best-effort — don't fail the request if
    // the log insert errors. We attach the log to the first seller_id
    // (canonical merchant record), matching the notes pattern.
    if (!error) {
      try {
        const events: Array<{
          seller_id: string;
          action: string;
          notes: string | null;
        }> = [];
        if (pipeline_status) {
          events.push({
            seller_id: seller_ids[0],
            action: `status:${pipeline_status}`,
            notes: null,
          });
        }
        if (admin_phone !== undefined) {
          events.push({
            seller_id: seller_ids[0],
            action: admin_phone ? "admin_phone:set" : "admin_phone:cleared",
            notes: admin_phone || null,
          });
        }
        if (events.length > 0) {
          await sb.from("outreach_logs").insert(events);
        }
      } catch (logErr) {
        console.warn("[whales] activity log insert skipped:", logErr);
      }
    }

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
