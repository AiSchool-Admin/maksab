/**
 * Trending Searches API — Returns popular search queries
 * Uses real search_queries table data or falls back to static popular searches
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Static popular searches fallback (Egyptian market reality) */
const STATIC_POPULAR = [
  { query: "تويوتا كورولا", count: 450, category: "cars" },
  { query: "آيفون 15", count: 380, category: "phones" },
  { query: "شقق القاهرة", count: 320, category: "real_estate" },
  { query: "ذهب عيار 21", count: 290, category: "gold" },
  { query: "سامسونج S24", count: 260, category: "phones" },
  { query: "غسالة توشيبا", count: 220, category: "appliances" },
  { query: "شقة مدينة نصر", count: 200, category: "real_estate" },
  { query: "بلايستيشن 5", count: 180, category: "hobbies" },
  { query: "هيونداي أكسنت", count: 170, category: "cars" },
  { query: "آيفون 14 برو", count: 160, category: "phones" },
  { query: "غرفة نوم", count: 150, category: "furniture" },
  { query: "شاومي ريدمي", count: 140, category: "phones" },
  { query: "أرض للبيع", count: 130, category: "real_estate" },
  { query: "سلسلة ذهب", count: 120, category: "gold" },
  { query: "لابتوب", count: 110, category: "phones" },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);
    const hours = parseInt(searchParams.get("hours") || "168"); // 7 days

    const supabase = getServiceClient();

    // Try RPC for real trending data
    const { data, error } = await supabase.rpc("get_trending_searches" as never, {
      p_limit: limit,
      p_hours: hours,
    } as never);

    if (!error && data && (data as unknown[]).length >= 3) {
      const trending = (data as Record<string, unknown>[]).map((row) => ({
        query: row.query as string,
        count: Number(row.search_count),
        lastSearched: row.last_searched,
      }));

      return NextResponse.json({ trending, source: "live" });
    }

    // Fallback to static popular + mix with any DB results
    const dbTrending = !error && data
      ? (data as Record<string, unknown>[]).map((row) => ({
          query: row.query as string,
          count: Number(row.search_count),
        }))
      : [];

    // Merge DB results first, then fill with static
    const seen = new Set(dbTrending.map((t) => t.query));
    const merged = [
      ...dbTrending,
      ...STATIC_POPULAR
        .filter((s) => !seen.has(s.query))
        .map((s) => ({ query: s.query, count: s.count })),
    ].slice(0, limit);

    return NextResponse.json({ trending: merged, source: "mixed" });
  } catch (err) {
    console.error("Trending API error:", err);
    return NextResponse.json({
      trending: STATIC_POPULAR.slice(0, 10).map((s) => ({
        query: s.query,
        count: s.count,
      })),
      source: "static",
    });
  }
}
