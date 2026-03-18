/**
 * POST /api/ads/create
 *
 * Server-side ad creation using service role key (bypasses RLS).
 * This is needed because our custom HMAC OTP auth doesn't establish
 * a Supabase client-side session, so client-side INSERT would fail with 42501.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, recordRateLimit } from "@/lib/rate-limit/rate-limit-service";
import { verifySessionToken } from "@/lib/auth/session-token";
import { validateAdData } from "@/lib/validation/ad-validation";

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
    const { user_id: bodyUserId, session_token, ad_data } = body;

    if (!ad_data) {
      return NextResponse.json(
        { error: "بيانات ناقصة" },
        { status: 400 },
      );
    }

    // ── Authenticate user via session token ──────────────────────────
    let user_id: string;

    if (session_token) {
      // Verify the server-signed session token (primary auth method)
      const tokenResult = verifySessionToken(session_token);
      if (!tokenResult.valid) {
        return NextResponse.json(
          { error: tokenResult.error },
          { status: 401 },
        );
      }
      user_id = tokenResult.userId;

      // If body also sent user_id, it must match the token
      if (bodyUserId && bodyUserId !== user_id) {
        return NextResponse.json(
          { error: "بيانات المصادقة مش متطابقة" },
          { status: 403 },
        );
      }
    } else if (bodyUserId) {
      // Fallback: accept user_id from body but verify via Supabase auth session
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const supabaseAnon = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
        const { data: { user: authUser } } = await supabaseAnon.auth.getUser(authHeader.slice(7));
        if (!authUser || authUser.id !== bodyUserId) {
          return NextResponse.json(
            { error: "غير مصرح. سجل دخول تاني" },
            { status: 401 },
          );
        }
      } else {
        return NextResponse.json(
          { error: "مطلوب توكن الجلسة. سجل خروج وادخل تاني" },
          { status: 401 },
        );
      }
      user_id = bodyUserId;
    } else {
      return NextResponse.json(
        { error: "مطلوب تسجيل الدخول" },
        { status: 401 },
      );
    }

    // Rate limit: max 10 ads per day per user
    const rateCheck = await checkRateLimit(user_id, "ad_create");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "وصلت للحد الأقصى من الإعلانات اليومية (10 إعلانات). جرب بكرة" },
        { status: 429 },
      );
    }

    const supabase = getServiceClient();

    // Verify user exists in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "المستخدم مش موجود. سجل خروج وادخل تاني" },
        { status: 401 },
      );
    }

    // ── Validate ad_data (including category_fields) ──────────────────
    const validation = validateAdData(ad_data);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      );
    }

    // Ensure category (and subcategory if provided) exist in DB
    try {
      const { data: catCheck } = await supabase
        .from("categories")
        .select("id")
        .eq("id", ad_data.category_id)
        .maybeSingle();

      let subCatOk = true;
      if (ad_data.subcategory_id) {
        const { data: subCheck } = await supabase
          .from("subcategories")
          .select("id")
          .eq("id", ad_data.subcategory_id)
          .maybeSingle();
        subCatOk = !!subCheck;
      }

      if (!catCheck || !subCatOk) {
        // Seed ALL categories and subcategories
        const categoriesModule = await import("@/lib/categories/categories-config");
        const allCategories = categoriesModule.categoriesConfig || [];

        // Batch upsert categories first
        const catRows = allCategories.map((cat: { id: string; name: string; icon: string; slug: string }, idx: number) => ({
          id: cat.id, name: cat.name, icon: cat.icon, slug: cat.slug, sort_order: idx, is_active: true,
        }));
        if (catRows.length > 0) {
          const { error: catSeedErr } = await supabase
            .from("categories")
            .upsert(catRows, { onConflict: "id" });
          if (catSeedErr) console.warn("[ads/create] Category seed error:", catSeedErr.message);
        }

        // Then batch upsert subcategories
        const subRows: { id: string; category_id: string; name: string; slug: string; sort_order: number; is_active: boolean }[] = [];
        for (const cat of allCategories) {
          for (const sub of (cat as { subcategories?: { id: string; name: string; slug: string }[] }).subcategories || []) {
            subRows.push({
              id: sub.id, category_id: cat.id, name: sub.name, slug: sub.slug, sort_order: subRows.length, is_active: true,
            });
          }
        }
        if (subRows.length > 0) {
          const { error: subSeedErr } = await supabase
            .from("subcategories")
            .upsert(subRows, { onConflict: "id" });
          if (subSeedErr) console.warn("[ads/create] Subcategory seed error:", subSeedErr.message);
        }
      }
    } catch (e) {
      console.warn("[ads/create] Category seed warning:", e);
    }

    // Upload images if provided as base64
    const uploadedUrls: string[] = [];
    if (ad_data.image_files && Array.isArray(ad_data.image_files)) {
      for (let i = 0; i < ad_data.image_files.length; i++) {
        try {
          const base64 = ad_data.image_files[i];
          const buffer = Buffer.from(base64, "base64");
          const path = `ads/${user_id}/${Date.now()}_${i}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from("ad-images")
            .upload(path, buffer, {
              contentType: "image/jpeg",
              upsert: false,
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from("ad-images").getPublicUrl(path);
            uploadedUrls.push(publicUrl);
          } else {
            console.warn("[ads/create] Image upload error:", uploadError.message);
          }
        } catch {
          // Skip failed image uploads
        }
      }
    }

    // If store_id provided, verify ownership
    let storeId: string | null = null;
    if (ad_data.store_id) {
      const { data: storeCheck } = await supabase
        .from("stores")
        .select("id")
        .eq("id", ad_data.store_id)
        .eq("user_id", user_id)
        .maybeSingle();

      if (storeCheck) {
        storeId = ad_data.store_id;
      }
    }

    // Build the ad record
    const adRecord: Record<string, unknown> = {
      user_id,
      category_id: ad_data.category_id,
      subcategory_id: ad_data.subcategory_id || null,
      sale_type: ad_data.sale_type,
      title: ad_data.title,
      description: ad_data.description || null,
      category_fields: ad_data.category_fields || {},
      governorate: ad_data.governorate || null,
      city: ad_data.city || null,
      images: uploadedUrls.length > 0 ? uploadedUrls : (ad_data.images || []),
      // Cash
      price: ad_data.price ?? null,
      is_negotiable: ad_data.is_negotiable ?? false,
      // Auction
      auction_start_price: ad_data.auction_start_price ?? null,
      auction_buy_now_price: ad_data.auction_buy_now_price ?? null,
      auction_duration_hours: ad_data.auction_duration_hours ?? null,
      auction_min_increment: ad_data.auction_min_increment ?? null,
      auction_ends_at:
        ad_data.auction_ends_at ??
        (ad_data.sale_type === "auction" && ad_data.auction_duration_hours
          ? new Date(Date.now() + ad_data.auction_duration_hours * 3600_000).toISOString()
          : null),
      auction_status: ad_data.sale_type === "auction" ? "active" : null,
      // Exchange
      exchange_description: ad_data.exchange_description ?? null,
      exchange_accepts_price_diff: ad_data.exchange_accepts_price_diff ?? false,
      exchange_price_diff: ad_data.exchange_price_diff ?? null,
      // Store (merchant)
      store_id: storeId,
    };

    // Insert ad
    const { data: insertedAd, error: insertError } = await supabase
      .from("ads")
      .insert(adRecord)
      .select("id")
      .maybeSingle();

    if (insertError) {
      console.error("[ads/create] Insert error:", insertError.code, insertError.message, insertError.details);
      console.error("[ads/create] Ad record:", JSON.stringify({ category_id: adRecord.category_id, subcategory_id: adRecord.subcategory_id, sale_type: adRecord.sale_type }));
      return NextResponse.json(
        {
          error: insertError.code === "23503"
            ? "الفئات مش موجودة. جرب تاني أو تواصل مع الدعم"
            : "حصل مشكلة في نشر الإعلان. جرب تاني",
        },
        { status: 409 },
      );
    }

    // Record rate limit usage after successful creation
    await recordRateLimit(user_id, "ad_create");

    // Fire-and-forget: Mazen auto-moderation review
    const adId = (insertedAd as Record<string, unknown>)?.id as string | null;
    if (adId) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/moderation/ai-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing: {
            id: adId,
            title: ad_data.title,
            description: ad_data.description || '',
            category_id: ad_data.category_id,
            sale_type: ad_data.sale_type,
            price: ad_data.price ?? null,
            images: uploadedUrls.length > 0 ? uploadedUrls : (ad_data.images || []),
            user_id,
          },
        }),
      }).catch(err => console.error('[MAZEN] Auto-review failed:', err));
    }

    // Fire-and-forget: notify matching buyers and exchange matches
    if (adId) {
      const adNotifData = {
        id: adId,
        title: ad_data.title,
        category_id: ad_data.category_id,
        subcategory_id: ad_data.subcategory_id || null,
        sale_type: ad_data.sale_type,
        price: ad_data.price ?? null,
        governorate: ad_data.governorate || null,
        user_id,
        category_fields: ad_data.category_fields || {},
      };

      import("@/lib/notifications/smart-notifications").then(({ notifyMatchingBuyers, notifyExchangeMatch }) => {
        notifyMatchingBuyers(adNotifData).catch((err) => console.warn("[ads/create] notifyMatchingBuyers failed:", err));
        if (ad_data.sale_type === "exchange") {
          notifyExchangeMatch(adNotifData).catch((err) => console.warn("[ads/create] notifyExchangeMatch failed:", err));
        }
      }).catch((err) => console.warn("[ads/create] notification import failed:", err));
    }

    return NextResponse.json({
      success: true,
      ad_id: adId,
    });
  } catch (err) {
    console.error("[ads/create] Error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}
