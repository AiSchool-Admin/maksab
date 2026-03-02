import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { PLANS } from "@/lib/stores/subscription-plans";
import { verifySessionToken } from "@/lib/auth/session-token";
import type { StoreSubscription, SubscriptionPlan } from "@/types";

/**
 * GET /api/stores/subscription?store_id=xxx
 * Returns the current active subscription + plan details.
 * Requires authentication — only the store owner can view subscription details.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("store_id");
  const sessionToken = searchParams.get("session_token");

  if (!storeId) {
    return NextResponse.json(
      { error: "store_id مطلوب" },
      { status: 400 },
    );
  }

  // Authentication required
  if (!sessionToken) {
    return NextResponse.json(
      { error: "مطلوب تسجيل الدخول" },
      { status: 401 },
    );
  }
  const tokenResult = verifySessionToken(sessionToken);
  if (!tokenResult.valid) {
    return NextResponse.json(
      { error: tokenResult.error },
      { status: 401 },
    );
  }
  const userId = tokenResult.userId;

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

  // Verify user owns this store
  const { data: store } = await adminClient
    .from("stores")
    .select("id, user_id")
    .eq("id", storeId)
    .maybeSingle();

  if (!store || store.user_id !== userId) {
    return NextResponse.json(
      { error: "مش مسموحلك تشوف اشتراك المتجر ده" },
      { status: 403 },
    );
  }

  const { data, error } = await adminClient
    .from("store_subscriptions")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "فشل جلب الاشتراك" },
      { status: 500 },
    );
  }

  const subscription = data as StoreSubscription | null;
  const currentPlan: SubscriptionPlan = subscription?.plan || "free";

  return NextResponse.json({
    subscription,
    currentPlan,
    planConfig: PLANS[currentPlan],
    allPlans: PLANS,
  });
}
