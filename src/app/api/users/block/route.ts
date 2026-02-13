/**
 * POST /api/users/block — Block a user
 * DELETE /api/users/block — Unblock a user
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

export async function POST(req: NextRequest) {
  try {
    const { blocker_id, blocked_id } = await req.json();

    if (!blocker_id || !blocked_id) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    if (blocker_id === blocked_id) {
      return NextResponse.json({ error: "مش ممكن تحظر نفسك" }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { error } = await supabase
      .from("blocked_users")
      .upsert(
        { blocker_id, blocked_id },
        { onConflict: "blocker_id,blocked_id" },
      );

    if (error) {
      console.error("[users/block] Error:", error);
      return NextResponse.json({ error: "حصل مشكلة. جرب تاني" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "تم حظر المستخدم" });
  } catch (err) {
    console.error("[users/block] Error:", err);
    return NextResponse.json({ error: "حصل مشكلة. جرب تاني" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { blocker_id, blocked_id } = await req.json();

    if (!blocker_id || !blocked_id) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", blocker_id)
      .eq("blocked_id", blocked_id);

    if (error) {
      console.error("[users/unblock] Error:", error);
      return NextResponse.json({ error: "حصل مشكلة. جرب تاني" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "تم إلغاء الحظر" });
  } catch (err) {
    console.error("[users/unblock] Error:", err);
    return NextResponse.json({ error: "حصل مشكلة. جرب تاني" }, { status: 500 });
  }
}
