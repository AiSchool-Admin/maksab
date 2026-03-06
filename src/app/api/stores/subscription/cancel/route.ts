import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";

/**
 * POST /api/stores/subscription/cancel
 * Cancels the current active subscription.
 */
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const body = await request.json();
    const { store_id, session_token } = body as {
      store_id: string;
      session_token?: string;
    };

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
        { error: "البيانات ناقصة" },
        { status: 400 },
      );
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration missing" },
        { status: 500 },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

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

    // Mark as cancelled with end date
    const { error: cancelError } = await adminClient
      .from("store_subscriptions")
      .update({ status: "cancelled", end_at: new Date().toISOString() })
      .eq("id", currentSub.id);

    if (cancelError) {
      return NextResponse.json(
        { error: "فشل إلغاء الاشتراك. جرب تاني" },
        { status: 500 },
      );
    }

    // Remove plan badges
    const { error: badgeError } = await adminClient
      .from("store_badges")
      .delete()
      .eq("store_id", store_id)
      .in("badge_type", ["gold", "platinum"]);

    if (badgeError) {
      console.error("Failed to remove badges:", badgeError);
    }

    // Create a free subscription to take effect
    const { error: freeError } = await adminClient
      .from("store_subscriptions")
      .insert({
        store_id,
        plan: "free",
        status: "active",
        price: 0,
        start_at: new Date().toISOString(),
      });

    if (freeError) {
      console.error("Failed to create free subscription:", freeError);
    }

    return NextResponse.json({
      success: true,
      message: "تم إلغاء الاشتراك. هترجع للباقة المجانية.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}
