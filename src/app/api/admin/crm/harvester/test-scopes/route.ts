/**
 * GET /api/admin/crm/harvester/test-scopes
 * Returns scope stats + sample listings for quality verification
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scopeCode = searchParams.get("scope_code");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

  const sb = getSupabase();

  // If scope_code provided, return sample listings
  if (scopeCode) {
    // Get scope
    const { data: scope } = await sb
      .from("ahe_scopes")
      .select("id, code, name, source_platform, maksab_category, governorate, base_url, last_harvest_at")
      .eq("code", scopeCode)
      .single();

    if (!scope) return NextResponse.json({ error: "Scope not found" }, { status: 404 });

    // Get sample listings with seller data
    const { data: listings } = await sb
      .from("ahe_listings")
      .select("id, title, governorate, city, source_listing_url, price, maksab_category, specifications, detected_brand, listing_type, created_at, seller_name, extracted_phone, ahe_seller_id")
      .eq("scope_id", scope.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Get seller data for these listings
    const sellerIds = [...new Set((listings || []).map(l => l.ahe_seller_id).filter(Boolean))];
    const { data: sellers } = sellerIds.length > 0
      ? await sb.from("ahe_sellers").select("id, name, phone, primary_governorate, detected_account_type").in("id", sellerIds)
      : { data: [] };

    const sellerMap = new Map((sellers || []).map(s => [s.id, s]));

    const samples = (listings || []).map(l => {
      const seller = sellerMap.get(l.ahe_seller_id);
      return {
        title: l.title,
        governorate: l.governorate,
        city: l.city,
        price: l.price,
        url: l.source_listing_url,
        brand: l.detected_brand,
        listing_type: l.listing_type,
        specs_count: l.specifications ? Object.keys(l.specifications).length : 0,
        created_at: l.created_at,
        seller_name: seller?.name || l.seller_name,
        seller_phone: seller?.phone || l.extracted_phone,
        seller_gov: seller?.primary_governorate,
        seller_type: seller?.detected_account_type || "individual",
      };
    });

    return NextResponse.json({ scope, samples });
  }

  // No scope_code — return all scopes with stats
  const { data: scopes } = await sb
    .from("ahe_scopes")
    .select("id, code, name, source_platform, maksab_category, governorate, base_url, last_harvest_at, is_active, is_paused, priority, harvest_interval_minutes")
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .order("source_platform");

  if (!scopes || scopes.length === 0) {
    return NextResponse.json({ scopes: [] });
  }

  // Get stats for each scope
  const scopeStats = await Promise.all(scopes.map(async (scope) => {
    const [totalRes, alexRes, phoneRes] = await Promise.all([
      sb.from("ahe_listings").select("id", { count: "exact", head: true }).eq("scope_id", scope.id),
      sb.from("ahe_listings").select("id", { count: "exact", head: true }).eq("scope_id", scope.id)
        .or("governorate.ilike.%اسكندري%,governorate.ilike.%alexandria%"),
      sb.from("ahe_listings").select("id", { count: "exact", head: true }).eq("scope_id", scope.id)
        .not("extracted_phone", "is", null),
    ]);

    const total = totalRes.count || 0;
    const alex = alexRes.count || 0;
    const withPhone = phoneRes.count || 0;

    return {
      ...scope,
      total_listings: total,
      alex_pct: total > 0 ? Math.round((alex / total) * 100) : 0,
      no_phone_pct: total > 0 ? Math.round(((total - withPhone) / total) * 100) : 0,
      with_phone: withPhone,
    };
  }));

  return NextResponse.json({ scopes: scopeStats });
}
