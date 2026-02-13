/**
 * /api/collections/[id]
 *
 * GET    — Get a specific collection with full ad details
 * PATCH  — Update collection metadata (name, icon, description, isPublic)
 * DELETE — Delete collection
 *
 * Requires user_id param or body field for authentication.
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

// ── GET ────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = request.nextUrl.searchParams.get("user_id");

    const supabase = getServiceClient();

    const { data: collection, error } = await supabase
      .from("collections")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !collection) {
      return NextResponse.json(
        { error: "القائمة مش موجودة" },
        { status: 404 },
      );
    }

    const record = collection as Record<string, unknown>;
    const ownerId = record.user_id as string;
    const isPublic = record.is_public as boolean;
    const collabs = (record.collaborator_ids as string[]) || [];

    // Access control: owner, collaborator, or public
    if (!isPublic && userId !== ownerId && !collabs.includes(userId || "")) {
      return NextResponse.json(
        { error: "القائمة دي خاصة" },
        { status: 403 },
      );
    }

    const adIds = (record.ad_ids as string[]) || [];

    // Fetch full ad details
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
          .map((adId) => adsMap.get(adId))
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
      is_public: isPublic,
      share_code: record.share_code,
      collaborator_ids: collabs,
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
  } catch (err) {
    console.error("[collections/[id]] GET error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}

// ── PATCH ──────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { user_id, name, icon, description, is_public } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "لازم تسجل دخول الأول" },
        { status: 401 },
      );
    }

    const supabase = getServiceClient();

    // Fetch existing collection
    const { data: existing } = await supabase
      .from("collections")
      .select("user_id, collaborator_ids")
      .eq("id", id)
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

    // Only owner or collaborator can update
    if (ownerId !== user_id && !collabs.includes(user_id)) {
      return NextResponse.json(
        { error: "مش مسموح ليك تعدل القائمة دي" },
        { status: 403 },
      );
    }

    // Build update payload
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      const trimmedName = (name as string).trim();
      if (trimmedName.length === 0) {
        return NextResponse.json(
          { error: "لازم تكتب اسم القائمة" },
          { status: 400 },
        );
      }
      if (trimmedName.length > 50) {
        return NextResponse.json(
          { error: "اسم القائمة طويل أوي (الحد الأقصى 50 حرف)" },
          { status: 400 },
        );
      }

      // Check for duplicate name
      const { data: dup } = await supabase
        .from("collections")
        .select("id")
        .eq("user_id", ownerId)
        .eq("name", trimmedName)
        .neq("id", id)
        .maybeSingle();

      if (dup) {
        return NextResponse.json(
          { error: "عندك قائمة بنفس الاسم ده بالفعل" },
          { status: 409 },
        );
      }

      updates.name = trimmedName;
    }

    if (icon !== undefined) {
      updates.icon = icon;
    }

    if (description !== undefined) {
      updates.description = (description as string).trim() || null;
    }

    if (is_public !== undefined) {
      updates.is_public = Boolean(is_public);
    }

    const { data: updated, error: updateError } = await supabase
      .from("collections")
      .update(updates)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (updateError) {
      console.error("[collections/[id]] PATCH error:", updateError);
      return NextResponse.json(
        { error: "حصل مشكلة في تحديث القائمة. جرب تاني" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      collection: updated,
    });
  } catch (err) {
    console.error("[collections/[id]] PATCH error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}

// ── DELETE ──────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = request.nextUrl.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "لازم تسجل دخول الأول" },
        { status: 401 },
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
        { error: "مش مسموح ليك تمسح القائمة دي. صاحب القائمة بس هو اللي يقدر يمسحها" },
        { status: 403 },
      );
    }

    const { error: deleteError } = await supabase
      .from("collections")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[collections/[id]] DELETE error:", deleteError);
      return NextResponse.json(
        { error: "حصل مشكلة في مسح القائمة. جرب تاني" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم مسح القائمة",
    });
  } catch (err) {
    console.error("[collections/[id]] DELETE error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}
