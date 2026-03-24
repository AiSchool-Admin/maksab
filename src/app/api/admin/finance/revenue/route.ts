import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Get monthly revenue by type
    const { data: transactions } = await supabase
      .from("revenue_transactions")
      .select("transaction_type, amount_egp, payment_status, created_at")
      .gte("created_at", monthStart)
      .eq("payment_status", "completed");

    const byType = {
      subscription: 0,
      lead_purchase: 0,
      auction_commission: 0,
    };

    for (const t of transactions || []) {
      if (t.transaction_type in byType) {
        byType[t.transaction_type as keyof typeof byType] += t.amount_egp || 0;
      }
    }

    const totalRevenue = byType.subscription + byType.lead_purchase + byType.auction_commission;

    // Get active subscriptions count
    const { count: activeSubscriptions } = await supabase
      .from("user_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    // Get recent transactions
    const { data: recentTransactions } = await supabase
      .from("revenue_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    // Get subscription plans
    const { data: plans } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    return NextResponse.json({
      kpis: {
        totalRevenue,
        subscriptionRevenue: byType.subscription,
        leadRevenue: byType.lead_purchase,
        auctionRevenue: byType.auction_commission,
        activeSubscriptions: activeSubscriptions || 0,
      },
      recentTransactions: recentTransactions || [],
      plans: plans || [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
