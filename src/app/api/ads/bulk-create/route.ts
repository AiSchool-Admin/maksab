/**
 * POST /api/ads/bulk-create
 *
 * Creates multiple ads at once for merchant bulk import.
 * Accepts an array of ad data and creates them in sequence.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySessionToken } from "@/lib/auth/session-token";
import { checkRateLimit, recordRateLimit } from "@/lib/rate-limit/rate-limit-service";
import { validateAdData } from "@/lib/validation/ad-validation";

export const maxDuration = 30;

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
    const { user_id: bodyUserId, session_token, ads, store_id } = body as {
      user_id?: string;
      session_token?: string;
      ads: BulkAdItem[];
      store_id?: string;
    };

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

    if (!ads || !Array.isArray(ads) || ads.length === 0) {
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

    // Rate limit: check remaining quota (10 ads/day)
    const rateCheck = await checkRateLimit(user_id, "ad_create");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "وصلت للحد الأقصى من الإعلانات اليومية. جرب بكرة" },
        { status: 429 },
      );
    }

    // Validate each ad's data
    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];
      const validation = validateAdData({
        ...ad,
        sale_type: ad.sale_type || "cash",
        title: ad.title || "منتج جديد",
      });
      if (!validation.valid) {
        return NextResponse.json(
          { error: `خطأ في المنتج رقم ${i + 1}: ${validation.error}` },
          { status: 400 },
        );
      }
    }

    // Ensure categories exist in DB (seed if missing)
    try {
      const categoryIds = [...new Set(ads.map(a => a.category_id))];
      for (const catId of categoryIds) {
        const { data: catCheck } = await supabase
          .from("categories")
          .select("id")
          .eq("id", catId)
          .maybeSingle();

        if (!catCheck) {
          const categoriesModule = await import("@/lib/categories/categories-config");
          const allCategories = categoriesModule.categoriesConfig || [];
          const catRows = allCategories.map((cat: { id: string; name: string; icon: string; slug: string }, idx: number) => ({
            id: cat.id, name: cat.name, icon: cat.icon, slug: cat.slug, sort_order: idx, is_active: true,
          }));
          if (catRows.length > 0) {
            await supabase.from("categories").upsert(catRows, { onConflict: "id" });
          }
          const subRows: { id: string; category_id: string; name: string; slug: string; sort_order: number; is_active: boolean }[] = [];
          for (const cat of allCategories) {
            for (const sub of (cat as { subcategories?: { id: string; name: string; slug: string }[] }).subcategories || []) {
              subRows.push({ id: sub.id, category_id: cat.id, name: sub.name, slug: sub.slug, sort_order: subRows.length, is_active: true });
            }
          }
          if (subRows.length > 0) {
            await supabase.from("subcategories").upsert(subRows, { onConflict: "id" });
          }
          break; // Only need to seed once
        }
      }
    } catch (e) {
      console.warn("[ads/bulk-create] Category seed warning:", e);
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
        { error: "حصل مشكلة في إضافة المنتجات. جرب تاني" },
        { status: 409 },
      );
    }

    // Record rate limit usage for each created ad
    const createdCount = inserted?.length || 0;
    for (let i = 0; i < createdCount; i++) {
      await recordRateLimit(user_id, "ad_create");
    }

    return NextResponse.json({
      success: true,
      count: createdCount,
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
