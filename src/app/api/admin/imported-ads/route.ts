/**
 * /api/admin/imported-ads
 *
 * GET   — List imported ads with filtering and pagination
 * PATCH — Update imported ad status
 *
 * Admin-only endpoints.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/require-auth";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return data?.role === "admin";
}

// ── GET — List imported ads ────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.userId || !(await isAdmin(auth.userId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = getServiceClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("q");
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("imported_ads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (category && category !== "all") {
      query = query.eq("category_id", category);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,source_seller_name.ilike.%${search}%`);
    }

    const { data: ads, error, count } = await query;

    if (error) {
      console.error("Error fetching imported ads:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get stats
    const { data: statsData } = await supabase
      .from("imported_ads")
      .select("status, category_id, governorate, price, images, source_seller_id");

    let stats = null;
    if (statsData) {
      const byStatus: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      const byGovernorate: Record<string, number> = {};
      const sellerIds = new Set<string>();
      let withImages = 0;
      let withPrice = 0;
      let totalPrice = 0;
      let priceCount = 0;

      for (const row of statsData) {
        byStatus[row.status] = (byStatus[row.status] || 0) + 1;
        if (row.category_id) byCategory[row.category_id] = (byCategory[row.category_id] || 0) + 1;
        if (row.governorate) byGovernorate[row.governorate] = (byGovernorate[row.governorate] || 0) + 1;
        if (row.source_seller_id) sellerIds.add(row.source_seller_id);
        if (row.images && row.images.length > 0) withImages++;
        if (row.price && row.price > 0) {
          withPrice++;
          totalPrice += Number(row.price);
          priceCount++;
        }
      }

      stats = {
        total: statsData.length,
        byStatus,
        byCategory,
        byGovernorate,
        uniqueSellers: sellerIds.size,
        withImages,
        withPrice,
        avgPrice: priceCount > 0 ? Math.round(totalPrice / priceCount) : 0,
      };
    }

    return NextResponse.json({
      ads: ads || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      stats,
    });
  } catch (err) {
    console.error("Imported ads GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── PATCH — Update imported ad status ──────────────────

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.userId || !(await isAdmin(auth.userId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = getServiceClient();
    const body = await request.json();
    const { id, status, admin_notes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing id or status" },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "approved", "published", "rejected", "duplicate", "expired"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      status,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes;
    }

    const { error } = await supabase
      .from("imported_ads")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Imported ads PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
