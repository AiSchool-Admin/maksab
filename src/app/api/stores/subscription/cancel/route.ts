import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * POST /api/stores/subscription/cancel
 * Cancels the current active subscription.
 * The subscription remains active until end_at, then expires.
 */
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
    const body = await request.json();
    const { store_id, user_id } = body as {
      store_id: string;
      user_id: string;
    };

    if (!store_id || !user_id) {
      return NextResponse.json(
        { error: "البيانات ناقصة" },
        { status: 400 },
      );
    }

    // Verify store ownership
    const { data: store } = await adminClient
      .from("stores")
      .select("id, user_id")
      .eq("id", store_id)
      .maybeSingle();

    if (!store || store.user_id !== user_id) {
      return NextResponse.json(
        { error: "المتجر غير موجود أو مش متجرك" },
        { status: 403 },
      );
    }

    // Get current active subscription
    const { data: currentSub } = await adminClient
      .from("store_subscriptions")
      .select("*")
      .eq("store_id", store_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (!currentSub) {
      return NextResponse.json(
        { error: "مفيش اشتراك نشط" },
        { status: 404 },
      );
    }

    if (currentSub.plan === "free") {
      return NextResponse.json(
        { error: "مش ممكن إلغاء الباقة المجانية" },
        { status: 400 },
      );
    }

    // Mark as cancelled — it stays active until end_at
    await adminClient
      .from("store_subscriptions")
      .update({ status: "cancelled" })
      .eq("id", currentSub.id);

    // Remove plan badges
    await adminClient
      .from("store_badges")
      .delete()
      .eq("store_id", store_id)
      .in("badge_type", ["gold", "platinum"]);

    // Create a free subscription to take effect
    await adminClient
      .from("store_subscriptions")
      .insert({
        store_id,
        plan: "free",
        status: "active",
        price: 0,
        start_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: "تم إلغاء الاشتراك. هترجع للباقة المجانية.",
    });
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
