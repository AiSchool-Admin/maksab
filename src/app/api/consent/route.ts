/**
 * GET /api/consent?seller=UUID — Fetch seller data for consent page
 * POST /api/consent — Record consent + trigger registration + migration
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
  const sellerId = new URL(req.url).searchParams.get("seller");
  if (!sellerId) return NextResponse.json({ error: "seller required" }, { status: 400 });

  const sb = getSupabase();

  const { data: seller } = await sb
    .from("ahe_sellers")
    .select("id, name, phone, primary_category, primary_governorate, detected_account_type, total_listings_seen, source_platform")
    .eq("id", sellerId)
    .single();

  if (!seller) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: listings } = await sb
    .from("ahe_listings")
    .select("id, title, price, thumbnail_url, city")
    .eq("ahe_seller_id", sellerId)
    .eq("is_duplicate", false)
    .order("created_at", { ascending: false })
    .limit(3);

  return NextResponse.json({
    seller: {
      id: seller.id,
      name: seller.name,
      category: seller.primary_category,
      listingsCount: seller.total_listings_seen,
    },
    listings: (listings || []).map(l => ({
      title: l.title,
      price: l.price,
      image: l.thumbnail_url,
      city: l.city,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { seller_id, ref } = await req.json();
    if (!seller_id) return NextResponse.json({ error: "seller_id required" }, { status: 400 });

    const sb = getSupabase();

    // Update seller: consented → pipeline moves to 'consented'
    await sb
      .from("ahe_sellers")
      .update({
        pipeline_status: "consented",
        updated_at: new Date().toISOString(),
      })
      .eq("id", seller_id);

    // Log consent
    await sb.from("outreach_logs").insert({
      seller_id,
      action: "consented",
      agent_name: ref || null,
      notes: "seller_approved_via_consent_page",
    });

    // Queue message 3 (account ready notification) — will be sent after registration
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://maksab.vercel.app";

    const { data: seller } = await sb
      .from("ahe_sellers")
      .select("phone, name, primary_category")
      .eq("id", seller_id)
      .single();

    if (seller?.phone) {
      const agentName = seller.primary_category === "vehicles" || seller.primary_category === "سيارات" ? "waleed" : "ahmed";
      const magicLink = `${baseUrl}/join?phone=${encodeURIComponent(seller.phone)}&seller=${seller_id}&ref=${agentName}`;

      await sb.from("acquisition_queue").insert({
        seller_id,
        asset_type: seller.primary_category === "vehicles" || seller.primary_category === "سيارات" ? "cars" : "properties",
        message_number: 3,
        message_text: `🎉 تم! حسابك جاهز على مكسب\nكتبنا إعلاناتك — ادخل وشوف:\n👉 ${magicLink}`,
        magic_link: magicLink,
        status: "queued",
        mode: "auto",
        agent_name: agentName,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
