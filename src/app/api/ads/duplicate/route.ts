/**
 * POST /api/ads/duplicate
 *
 * Duplicates an existing ad with "(نسخة)" appended to the title.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySessionToken } from "@/lib/auth/session-token";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id: bodyUserId, session_token, ad_id } = body;

    // ── Authenticate via session token ──
    let user_id: string;
    if (session_token) {
      const tokenResult = verifySessionToken(session_token);
      if (!tokenResult.valid) {
        return NextResponse.json({ error: tokenResult.error }, { status: 401 });
      }
      user_id = tokenResult.userId;
      if (bodyUserId && bodyUserId !== user_id) {
        return NextResponse.json({ error: "بيانات المصادقة مش متطابقة" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "مطلوب توكن الجلسة. سجل خروج وادخل تاني" }, { status: 401 });
    }

    if (!ad_id) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Get original ad (must belong to user)
    const { data: original, error: fetchError } = await supabase
      .from("ads")
      .select("*")
      .eq("id", ad_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (fetchError || !original) {
      return NextResponse.json(
        { error: "الإعلان مش موجود أو مش بتاعك" },
        { status: 404 },
      );
    }

    // Create duplicate
    const duplicate = {
      user_id,
      category_id: original.category_id,
      subcategory_id: original.subcategory_id,
      sale_type: original.sale_type,
      title: `${original.title} (نسخة)`,
      description: original.description,
      category_fields: original.category_fields,
      price: original.price,
      is_negotiable: original.is_negotiable,
      images: original.images,
      governorate: original.governorate,
      city: original.city,
      store_id: original.store_id,
      status: "active",
    };

    const { data: inserted, error: insertError } = await supabase
      .from("ads")
      .insert(duplicate)
      .select("id, title")
      .maybeSingle();

    if (insertError) {
      return NextResponse.json(
        { error: "حصل مشكلة في نسخ الإعلان" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      ad: inserted,
    });
  } catch (err) {
    console.error("[ads/duplicate] Error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}
