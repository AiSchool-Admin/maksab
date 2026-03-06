/**
 * POST /api/ads/update
 *
 * Server-side ad update for status changes (pin, sold, reactivate, delete).
 * Uses service role key to bypass RLS, verifies ownership.
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

type UpdateAction = "pin" | "unpin" | "mark_sold" | "reactivate" | "delete";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id: bodyUserId, session_token, ad_id, action } = body as {
      user_id?: string;
      session_token?: string;
      ad_id?: string;
      action?: UpdateAction;
    };

    // Authenticate
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

    if (!ad_id || !action) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const validActions: UpdateAction[] = ["pin", "unpin", "mark_sold", "reactivate", "delete"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Verify ownership
    const { data: ad, error: fetchError } = await supabase
      .from("ads")
      .select("id, user_id, status, is_pinned")
      .eq("id", ad_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (fetchError || !ad) {
      return NextResponse.json({ error: "الإعلان مش موجود أو مش بتاعك" }, { status: 404 });
    }

    // Build update based on action
    let updateData: Record<string, unknown> = {};

    switch (action) {
      case "pin":
        updateData = { is_pinned: true };
        break;
      case "unpin":
        updateData = { is_pinned: false };
        break;
      case "mark_sold":
        updateData = { status: "sold" };
        break;
      case "reactivate":
        updateData = { status: "active" };
        break;
      case "delete":
        updateData = { status: "deleted" };
        break;
    }

    const { error: updateError } = await supabase
      .from("ads")
      .update(updateData)
      .eq("id", ad_id)
      .eq("user_id", user_id);

    if (updateError) {
      console.error("[ads/update] Error:", updateError);
      return NextResponse.json({ error: "حصل مشكلة. جرب تاني" }, { status: 500 });
    }

    return NextResponse.json({ success: true, action });
  } catch (err) {
    console.error("[ads/update] Error:", err);
    return NextResponse.json({ error: "حصل مشكلة. جرب تاني" }, { status: 500 });
  }
}
