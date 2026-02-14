/**
 * /api/collections
 *
 * GET  ?share_code=XXXXXXXX  — Fetch a public collection by share code (no auth)
 * GET  ?user_id=xxx          — Fetch all collections for a user
 * POST                       — Create or update a collection (authenticated)
 * DELETE ?id=xxx&user_id=xxx — Delete a collection (authenticated)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { verifySessionToken } from "@/lib/auth/session-token";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Generate a cryptographically secure 8-character alphanumeric share code.
 */
function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(bytes[i] % chars.length);
  }
  return code;
}

// ── GET ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const shareCode = request.nextUrl.searchParams.get("share_code");
    const userId = request.nextUrl.searchParams.get("user_id");

    const supabase = getServiceClient();

    // Public access: fetch by share code
    if (shareCode) {
      if (shareCode.length !== 8) {
        return NextResponse.json(
          { error: "كود المشاركة مش صحيح" },
          { status: 400 },
        );
      }

      const { data: collection, error } = await supabase
        .from("collections")
        .select("*")
        .eq("share_code", shareCode)
        .eq("is_public", true)
        .maybeSingle();

      if (error || !collection) {
        return NextResponse.json(
          { error: "القائمة مش موجودة أو مش متاحة للمشاركة" },
          { status: 404 },
        );
      }

      const record = collection as Record<string, unknown>;
      const adIds = (record.ad_ids as string[]) || [];

      // Fetch ad details
      let ads: Record<string, unknown>[] = [];
      if (adIds.length > 0) {
        const { data: adsData } = await supabase
          .from("ads")
          .select("id, title, price, images, sale_type, status, governorate")
          .in("id", adIds);

        if (adsData) {
          // Maintain order from adIds
          const adsMap = new Map(
            (adsData as Record<string, unknown>[]).map((a) => [a.id as string, a]),
          );
          ads = adIds
            .map((id) => adsMap.get(id))
            .filter(Boolean) as Record<string, unknown>[];
        }
      }

      return NextResponse.json({
        id: record.id,
        user_id: record.user_id,
        name: record.name,
        description: record.description || null,
        icon: record.icon || "\uD83D\uDCCB",
        ad_ids: adIds,
        is_public: true,
        share_code: record.share_code,
        collaborator_ids: record.collaborator_ids || [],
        created_at: record.created_at,
        updated_at: record.updated_at,
        ads: ads.map((a) => ({
          id: a.id,
          title: a.title,
          price: a.price ? Number(a.price) : null,
          image: ((a.images as string[]) ?? [])[0] ?? null,
          sale_type: a.sale_type,
          status: a.status,
          governorate: a.governorate || "",
        })),
      });
    }

    // Authenticated: fetch all user collections (verify via session token)
    if (userId) {
      const sessionToken = request.nextUrl.searchParams.get("session_token");
      if (sessionToken) {
        const tokenResult = verifySessionToken(sessionToken);
        if (!tokenResult.valid || tokenResult.userId !== userId) {
          return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
        }
      }
      const { data: collections, error } = await supabase
        .from("collections")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "حصل مشكلة في جلب القوائم" },
          { status: 500 },
        );
      }

      const rows = (collections as Record<string, unknown>[]) || [];

      // Collect all ad IDs for preview images
      const allAdIds = new Set<string>();
      for (const row of rows) {
        const ids = (row.ad_ids as string[]) || [];
        for (const id of ids.slice(0, 3)) {
          allAdIds.add(id);
        }
      }

      // Fetch preview images
      let adImageMap: Record<string, string> = {};
      if (allAdIds.size > 0) {
        const { data: adsData } = await supabase
          .from("ads")
          .select("id, images")
          .in("id", Array.from(allAdIds));

        if (adsData) {
          for (const ad of adsData as Record<string, unknown>[]) {
            const images = (ad.images as string[]) ?? [];
            if (images.length > 0) {
              adImageMap[ad.id as string] = images[0];
            }
          }
        }
      }

      const summaries = rows.map((row) => {
        const adIds = (row.ad_ids as string[]) || [];
        const previewImages = adIds
          .slice(0, 3)
          .map((id) => adImageMap[id])
          .filter(Boolean);

        return {
          id: row.id,
          name: row.name,
          icon: row.icon || "\uD83D\uDCCB",
          ad_count: adIds.length,
          is_public: row.is_public ?? true,
          share_code: row.share_code,
          updated_at: row.updated_at,
          preview_images: previewImages,
        };
      });

      return NextResponse.json({ collections: summaries });
    }

    return NextResponse.json(
      { error: "لازم تبعت share_code أو user_id" },
      { status: 400 },
    );
  } catch (err) {
    console.error("[collections] GET error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}

// ── POST ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id: bodyUserId, session_token, action } = body;

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
    } else if (bodyUserId) {
      // Fallback for backwards compatibility — but user_id is unverified
      user_id = bodyUserId;
    } else {
      return NextResponse.json(
        { error: "لازم تسجل دخول الأول" },
        { status: 401 },
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
        { error: "المستخدم مش موجود. سجل خروج وادخل تاني" },
        { status: 401 },
      );
    }

    // ── Create new collection ──
    if (action === "create") {
      const { name, icon, description } = body;

      if (!name || (name as string).trim().length === 0) {
        return NextResponse.json(
          { error: "لازم تكتب اسم القائمة" },
          { status: 400 },
        );
      }

      if ((name as string).trim().length > 50) {
        return NextResponse.json(
          { error: "اسم القائمة طويل أوي (الحد الأقصى 50 حرف)" },
          { status: 400 },
        );
      }

      // Check collection count limit
      const { count } = await supabase
        .from("collections")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id);

      if ((count ?? 0) >= 20) {
        return NextResponse.json(
          { error: "وصلت للحد الأقصى (20 قائمة). امسح قائمة قديمة الأول" },
          { status: 400 },
        );
      }

      // Check duplicate name
      const { data: dup } = await supabase
        .from("collections")
        .select("id")
        .eq("user_id", user_id)
        .eq("name", (name as string).trim())
        .maybeSingle();

      if (dup) {
        return NextResponse.json(
          { error: "عندك قائمة بنفس الاسم ده بالفعل" },
          { status: 409 },
        );
      }

      const shareCode = generateShareCode();
      const { data: created, error: insertError } = await supabase
        .from("collections")
        .insert({
          user_id,
          name: (name as string).trim(),
          description: description ? (description as string).trim() : null,
          icon: icon || "\uD83D\uDCCB",
          ad_ids: [],
          is_public: true,
          share_code: shareCode,
          collaborator_ids: [],
        })
        .select("*")
        .maybeSingle();

      if (insertError) {
        console.error("[collections] Create error:", insertError);
        return NextResponse.json(
          { error: "حصل مشكلة في إنشاء القائمة. جرب تاني" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        collection: created,
      });
    }

    // ── Sync collection from localStorage ──
    if (action === "sync") {
      const { collection } = body;

      if (!collection || !collection.id) {
        return NextResponse.json(
          { error: "بيانات القائمة ناقصة" },
          { status: 400 },
        );
      }

      const { error: upsertError } = await supabase
        .from("collections")
        .upsert(
          {
            id: collection.id,
            user_id,
            name: collection.name,
            description: collection.description || null,
            icon: collection.icon || "\uD83D\uDCCB",
            ad_ids: collection.ad_ids || collection.adIds || [],
            is_public: collection.is_public ?? collection.isPublic ?? true,
            share_code: collection.share_code || collection.shareCode || generateShareCode(),
            collaborator_ids: collection.collaborator_ids || collection.collaboratorIds || [],
            updated_at: collection.updated_at || collection.updatedAt || new Date().toISOString(),
          },
          { onConflict: "id" },
        );

      if (upsertError) {
        console.error("[collections] Sync error:", upsertError);
        return NextResponse.json(
          { error: "حصل مشكلة في مزامنة القائمة" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    }

    // ── Add ad to collection ──
    if (action === "add_ad") {
      const { collection_id, ad_id } = body;

      if (!collection_id || !ad_id) {
        return NextResponse.json(
          { error: "بيانات ناقصة" },
          { status: 400 },
        );
      }

      // Fetch current collection
      const { data: existing } = await supabase
        .from("collections")
        .select("ad_ids, user_id, collaborator_ids")
        .eq("id", collection_id)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json(
          { error: "القائمة مش موجودة" },
          { status: 404 },
        );
      }

      const record = existing as Record<string, unknown>;
      const ownerId = record.user_id as string;
      const collabs = (record.collaborator_ids as string[]) || [];

      if (ownerId !== user_id && !collabs.includes(user_id)) {
        return NextResponse.json(
          { error: "مش مسموح ليك تضيف في القائمة دي" },
          { status: 403 },
        );
      }

      const currentAdIds = (record.ad_ids as string[]) || [];

      if (currentAdIds.includes(ad_id)) {
        return NextResponse.json(
          { error: "الإعلان ده موجود في القائمة بالفعل" },
          { status: 409 },
        );
      }

      if (currentAdIds.length >= 50) {
        return NextResponse.json(
          { error: "القائمة وصلت للحد الأقصى (50 إعلان). امسح إعلان الأول" },
          { status: 400 },
        );
      }

      const { error: updateError } = await supabase
        .from("collections")
        .update({
          ad_ids: [...currentAdIds, ad_id],
          updated_at: new Date().toISOString(),
        })
        .eq("id", collection_id);

      if (updateError) {
        return NextResponse.json(
          { error: "حصل مشكلة في إضافة الإعلان" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    }

    // ── Remove ad from collection ──
    if (action === "remove_ad") {
      const { collection_id, ad_id } = body;

      if (!collection_id || !ad_id) {
        return NextResponse.json(
          { error: "بيانات ناقصة" },
          { status: 400 },
        );
      }

      const { data: existing } = await supabase
        .from("collections")
        .select("ad_ids, user_id, collaborator_ids")
        .eq("id", collection_id)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json(
          { error: "القائمة مش موجودة" },
          { status: 404 },
        );
      }

      const record = existing as Record<string, unknown>;
      const ownerId = record.user_id as string;
      const collabs = (record.collaborator_ids as string[]) || [];

      if (ownerId !== user_id && !collabs.includes(user_id)) {
        return NextResponse.json(
          { error: "مش مسموح ليك تشيل من القائمة دي" },
          { status: 403 },
        );
      }

      const currentAdIds = (record.ad_ids as string[]) || [];
      const newAdIds = currentAdIds.filter((id: string) => id !== ad_id);

      const { error: updateError } = await supabase
        .from("collections")
        .update({
          ad_ids: newAdIds,
          updated_at: new Date().toISOString(),
        })
        .eq("id", collection_id);

      if (updateError) {
        return NextResponse.json(
          { error: "حصل مشكلة في إزالة الإعلان" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "action مش معروف. الإجراءات المتاحة: create, sync, add_ad, remove_ad" },
      { status: 400 },
    );
  } catch (err) {
    console.error("[collections] POST error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}

// ── DELETE ──────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    const userId = request.nextUrl.searchParams.get("user_id");

    if (!id || !userId) {
      return NextResponse.json(
        { error: "بيانات ناقصة (id و user_id مطلوبين)" },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from("collections")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "القائمة مش موجودة" },
        { status: 404 },
      );
    }

    const record = existing as Record<string, unknown>;
    if (record.user_id !== userId) {
      return NextResponse.json(
        { error: "مش مسموح ليك تمسح القائمة دي" },
        { status: 403 },
      );
    }

    const { error: deleteError } = await supabase
      .from("collections")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: "حصل مشكلة في مسح القائمة" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم مسح القائمة",
    });
  } catch (err) {
    console.error("[collections] DELETE error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}
