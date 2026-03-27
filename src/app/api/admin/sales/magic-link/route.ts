/**
 * POST /api/admin/sales/magic-link — Generate magic link for seller onboarding
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

const CAR_CATS = ["vehicles", "سيارات", "cars"];

export async function POST(req: NextRequest) {
  try {
    const { seller_id } = await req.json();
    if (!seller_id) {
      return NextResponse.json({ error: "seller_id required" }, { status: 400 });
    }

    const sb = getSupabase();
    const { data: seller } = await sb
      .from("ahe_sellers")
      .select("id, phone, name, primary_category")
      .eq("id", seller_id)
      .single();

    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    const ref = CAR_CATS.includes(seller.primary_category) ? "waleed" : "ahmed";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://maksab.vercel.app";
    const phone = seller.phone || "";

    const url = `${baseUrl}/join?phone=${encodeURIComponent(phone)}&seller=${seller.id}&ref=${ref}`;

    return NextResponse.json({ url, phone, ref, seller_name: seller.name });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
