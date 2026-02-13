/**
 * POST /api/users/delete
 * Soft-delete a user account with data anonymization.
 * Does NOT hard-delete — preserves data integrity for existing conversations/bids.
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
    const { user_id, reason } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Verify user exists and is not already deleted
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, is_deleted")
      .eq("id", user_id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "المستخدم مش موجود" }, { status: 404 });
    }

    if (profile.is_deleted) {
      return NextResponse.json({ error: "الحساب محذوف بالفعل" }, { status: 400 });
    }

    // Soft-delete: triggers anonymize_deleted_profile() in database
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deletion_reason: reason || null,
        display_name: "مستخدم محذوف",
        avatar_url: null,
        bio: null,
      } as never)
      .eq("id", user_id);

    if (updateError) {
      console.error("[users/delete] Update error:", updateError);
      return NextResponse.json(
        { error: "حصل مشكلة في حذف الحساب. جرب تاني" },
        { status: 500 },
      );
    }

    // Deactivate all user's active ads
    await supabase
      .from("ads")
      .update({ status: "deleted" } as never)
      .eq("user_id", user_id)
      .eq("status", "active");

    // Remove push subscriptions
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user_id);

    // Delete avatar from storage
    try {
      const { data: files } = await supabase.storage
        .from("avatars")
        .list(user_id);
      if (files && files.length > 0) {
        await supabase.storage
          .from("avatars")
          .remove(files.map((f) => `${user_id}/${f.name}`));
      }
    } catch {
      // Non-critical
    }

    // Invalidate OTP tokens
    await supabase
      .from("phone_otp")
      .delete()
      .eq("user_id", user_id);

    return NextResponse.json({
      success: true,
      message: "تم حذف حسابك. بياناتك الشخصية اتمسحت. يمكنك إنشاء حساب جديد في أي وقت.",
    });
  } catch (err) {
    console.error("[users/delete] Error:", err);
    return NextResponse.json({ error: "حصل مشكلة. جرب تاني" }, { status: 500 });
  }
}
