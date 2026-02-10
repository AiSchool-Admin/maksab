import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { PLANS } from "@/lib/stores/subscription-plans";
import { getDemoSubscription } from "@/lib/demo/demo-stores";
import type { StoreSubscription, SubscriptionPlan } from "@/types";

const IS_DEV = process.env.NEXT_PUBLIC_DEV_MODE === "true";

/**
 * GET /api/stores/subscription?store_id=xxx
 * Returns the current active subscription + plan details.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("store_id");

  if (!storeId) {
    return NextResponse.json(
      { error: "store_id مطلوب" },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Dev mode fallback
  if (IS_DEV && (!supabaseUrl || !serviceRoleKey)) {
    const sub = getDemoSubscription();
    const currentPlan: SubscriptionPlan = sub.plan;
    return NextResponse.json({
      subscription: sub,
      currentPlan,
      planConfig: PLANS[currentPlan],
      allPlans: PLANS,
    });
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
