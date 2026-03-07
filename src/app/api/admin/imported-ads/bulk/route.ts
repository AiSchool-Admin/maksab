/**
 * /api/admin/imported-ads/bulk
 *
 * PATCH — Bulk update imported ads status
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

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.userId || !(await isAdmin(auth.userId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = getServiceClient();
    const body = await request.json();
    const { ids, status } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0 || !status) {
      return NextResponse.json(
        { error: "Missing ids array or status" },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "approved", "published", "rejected", "duplicate", "expired"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status` },
        { status: 400 }
      );
    }

    // Limit batch size
    const batchIds = ids.slice(0, 500);

    const { error, count } = await supabase
      .from("imported_ads")
      .update({
        status,
        reviewed_by: auth.userId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("id", batchIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: count || batchIds.length });
  } catch (err) {
    console.error("Bulk update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
