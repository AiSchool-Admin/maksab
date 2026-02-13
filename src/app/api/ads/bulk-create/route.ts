/**
 * POST /api/ads/bulk-create
 *
 * Creates multiple ads at once for merchant bulk import.
 * Accepts an array of ad data and creates them in sequence.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface BulkAdItem {
  category_id: string;
  subcategory_id?: string;
  title: string;
  description?: string;
  category_fields?: Record<string, unknown>;
  price?: number;
  is_negotiable?: boolean;
  images?: string[];
  sale_type?: string;
  governorate?: string;
  city?: string;
  store_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, ads, store_id } = body as {
      user_id: string;
      ads: BulkAdItem[];
      store_id?: string;
    };

    if (!user_id || !ads || !Array.isArray(ads) || ads.length === 0) {
      return NextResponse.json(
        { error: "بيانات ناقصة" },
        { status: 400 },
      );
    }

    if (ads.length > 100) {
      return NextResponse.json(
        { error: "الحد الأقصى 100 منتج في المرة الواحدة" },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();

    // Verify user exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "المستخدم مش موجود" },
        { status: 401 },
      );
    }

    // Verify store ownership if store_id provided
    let verifiedStoreId: string | null = null;
    if (store_id) {
      const { data: storeCheck } = await supabase
        .from("stores")
        .select("id")
        .eq("id", store_id)
        .eq("user_id", user_id)
        .maybeSingle();

      if (storeCheck) {
        verifiedStoreId = store_id;
      }
    }

    // Create ads in batch
    const records = ads.map((ad) => ({
      user_id,
      category_id: ad.category_id,
      subcategory_id: ad.subcategory_id || null,
      sale_type: ad.sale_type || "cash",
      title: ad.title || "منتج جديد",
      description: ad.description || null,
      category_fields: ad.category_fields || {},
      price: ad.price ?? null,
      is_negotiable: ad.is_negotiable ?? false,
      images: ad.images || [],
      governorate: ad.governorate || null,
      city: ad.city || null,
      store_id: verifiedStoreId,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("ads")
      .insert(records)
      .select("id, title");

    if (insertError) {
      console.error("[ads/bulk-create] Insert error:", insertError);
      return NextResponse.json(
        { error: `حصل مشكلة في إضافة المنتجات (${insertError.code})` },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      count: inserted?.length || 0,
      ads: inserted || [],
    });
  } catch (err) {
    console.error("[ads/bulk-create] Error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}
