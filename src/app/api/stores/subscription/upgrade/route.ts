import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { PLANS, isUpgrade } from "@/lib/stores/subscription-plans";
import type { SubscriptionPlan } from "@/types";

/**
 * POST /api/stores/subscription/upgrade
 * Request an upgrade to a new plan.
 */
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const body = await request.json();
    const { store_id, user_id, plan, billing_cycle, payment_method, payment_ref } = body as {
      store_id: string;
      user_id: string;
      plan: SubscriptionPlan;
      billing_cycle: "monthly" | "yearly";
      payment_method: string;
      payment_ref: string;
    };

    if (!store_id || !user_id || !plan || !payment_method) {
      return NextResponse.json(
        { error: "البيانات ناقصة" },
        { status: 400 },
      );
    }

    // Validate plan exists
    if (!PLANS[plan]) {
      return NextResponse.json(
        { error: "الباقة غير موجودة" },
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

    const currentPlan: SubscriptionPlan = (currentSub?.plan as SubscriptionPlan) || "free";

    // Can't downgrade through this endpoint
    if (!isUpgrade(currentPlan, plan)) {
      return NextResponse.json(
        { error: "مش ممكن تنزل لباقة أقل من هنا، استخدم الإلغاء" },
        { status: 400 },
      );
    }

    const planConfig = PLANS[plan];
    const price = billing_cycle === "yearly" ? planConfig.yearlyPrice : planConfig.price;

    const now = new Date();
    const endAt = new Date(now);
    if (billing_cycle === "yearly") {
      endAt.setFullYear(endAt.getFullYear() + 1);
    } else {
      endAt.setMonth(endAt.getMonth() + 1);
    }

    // Expire old subscription if exists
    if (currentSub) {
      await adminClient
        .from("store_subscriptions")
        .update({ status: "expired", end_at: now.toISOString() })
        .eq("id", currentSub.id);
    }

    // Create new subscription
    const { data: newSub, error: insertError } = await adminClient
      .from("store_subscriptions")
      .insert({
        store_id,
        plan,
        status: "active",
        price,
        start_at: now.toISOString(),
        end_at: endAt.toISOString(),
        payment_method,
        payment_ref: payment_ref || null,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "فشل ترقية الاشتراك: " + insertError.message },
        { status: 500 },
      );
    }

    // Add plan badge to store (gold or platinum)
    if (plan === "gold" || plan === "platinum") {
      await adminClient
        .from("store_badges")
        .delete()
        .eq("store_id", store_id)
        .in("badge_type", ["gold", "platinum"]);

      await adminClient
        .from("store_badges")
        .insert({
          store_id,
          badge_type: plan,
          expires_at: endAt.toISOString(),
        });
    }

    return NextResponse.json({
      success: true,
      subscription: newSub,
      message: `تم الترقية لباقة ${PLANS[plan].name} بنجاح!`,
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
