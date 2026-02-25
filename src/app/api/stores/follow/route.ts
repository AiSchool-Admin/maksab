import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server configuration missing" },
      { status: 500 },
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const { store_id, session_token } = await request.json();

    // Authentication (session_token required)
    if (!session_token) {
      return NextResponse.json({ error: "مطلوب تسجيل الدخول" }, { status: 401 });
    }
    const tokenResult = verifySessionToken(session_token);
    if (!tokenResult.valid) {
      return NextResponse.json({ error: tokenResult.error }, { status: 401 });
    }
    const user_id = tokenResult.userId;

    if (!store_id) {
      return NextResponse.json(
        { error: "store_id مطلوب" },
        { status: 400 },
      );
    }

    // Check if already following
    const { data: existing } = await adminClient
      .from("store_followers")
      .select("id")
      .eq("store_id", store_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (existing) {
      // Unfollow
      await adminClient
        .from("store_followers")
        .delete()
        .eq("store_id", store_id)
        .eq("user_id", user_id);

      return NextResponse.json({
        is_following: false,
        message: "تم إلغاء المتابعة",
      });
    } else {
      // Follow
      await adminClient.from("store_followers").insert({
        store_id,
        user_id,
      });

      return NextResponse.json({
        is_following: true,
        message: "تم المتابعة",
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}
