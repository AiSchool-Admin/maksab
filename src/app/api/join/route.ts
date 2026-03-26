/**
 * GET /api/join?seller=UUID — Public API for magic link onboarding
 * Returns seller info + their listings for the /join page
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
  const sellerId = searchParams.get("seller");

  if (!sellerId) {
    return NextResponse.json({ error: "seller param required" }, { status: 400 });
  }

  const sb = getSupabase();

  // Fetch seller
  const { data: seller } = await sb
    .from("ahe_sellers")
    .select("id, name, phone, primary_category, primary_governorate, detected_account_type, total_listings_seen, source_platform")
    .eq("id", sellerId)
    .single();

  if (!seller) {
    return NextResponse.json({ error: "Seller not found" }, { status: 404 });
  }

  // Fetch their listings
  const { data: listings } = await sb
    .from("ahe_listings")
    .select("id, title, price, thumbnail_url, source_listing_url, city, created_at")
    .eq("ahe_seller_id", sellerId)
    .eq("is_duplicate", false)
    .order("created_at", { ascending: false })
    .limit(6);

  // Log link opened
  const ref = searchParams.get("ref");
  await sb.from("outreach_logs").insert({
    seller_id: sellerId,
    action: "link_opened",
    agent_name: ref || null,
    notes: `magic_link_opened`,
  }).then(() => {});

  return NextResponse.json({
    seller: {
      id: seller.id,
      name: seller.name,
      category: seller.primary_category,
      governorate: seller.primary_governorate,
      accountType: seller.detected_account_type,
      listingsCount: seller.total_listings_seen,
      platform: seller.source_platform,
    },
    listings: (listings || []).map((l) => ({
      id: l.id,
      title: l.title,
      price: l.price,
      image: l.thumbnail_url,
      url: l.source_listing_url,
      city: l.city,
    })),
  });
}

/** POST /api/join — Log conversion when seller registers */
export async function POST(req: NextRequest) {
  try {
    const { seller_id, ref } = await req.json();
    if (!seller_id) {
      return NextResponse.json({ error: "seller_id required" }, { status: 400 });
    }

    const sb = getSupabase();

    // Update seller pipeline_status
    await sb
      .from("ahe_sellers")
      .update({ pipeline_status: "registered", updated_at: new Date().toISOString() })
      .eq("id", seller_id);

    // Log conversion
    await sb.from("outreach_logs").insert({
      seller_id,
      action: "registered",
      agent_name: ref || null,
      notes: "magic_link_conversion",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
