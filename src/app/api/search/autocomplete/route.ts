/**
 * Autocomplete API — Fast suggestions while typing
 * Combines: DB title matches + AI-parsed entity extraction + recent/popular
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const supabase = getServiceClient();

    // Try RPC autocomplete first
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "search_autocomplete" as never,
      { p_query: query, p_limit: 8 } as never
    );

    if (!rpcError && rpcData && (rpcData as unknown[]).length > 0) {
      const suggestions = (rpcData as Record<string, unknown>[]).map((row) => ({
        text: row.suggestion as string,
        category: row.category_id as string | null,
        count: Number(row.match_count),
        type: row.suggestion_type as string,
      }));

      return NextResponse.json({ suggestions });
    }

    // Fallback: simple ILIKE query on ad titles
    const { data, error } = await supabase
      .from("ads" as never)
      .select("title, category_id")
      .eq("status", "active")
      .ilike("title", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      return NextResponse.json({ suggestions: [] });
    }

    // Deduplicate similar titles
    const seen = new Set<string>();
    const suggestions = ((data || []) as Record<string, unknown>[])
      .filter((row) => {
        const title = (row.title as string).toLowerCase().trim();
        if (seen.has(title)) return false;
        seen.add(title);
        return true;
      })
      .map((row) => ({
        text: row.title as string,
        category: row.category_id as string | null,
        count: 1,
        type: "title",
      }));

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("Autocomplete error:", err);
    return NextResponse.json({ suggestions: [] });
  }
}
