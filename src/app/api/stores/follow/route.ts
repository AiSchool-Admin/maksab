import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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
    const { store_id, user_id } = await request.json();

    if (!store_id || !user_id) {
      return NextResponse.json(
        { error: "store_id و user_id مطلوبين" },
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
      {
        error: "خطأ غير متوقع",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
