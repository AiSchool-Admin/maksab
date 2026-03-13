import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Missing Supabase config" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase
      .from("market_balance")
      .select("*")
      .is("governorate", null)
      .order("balance_status", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort: critical_buyers first, then needs_buyers, then rest
    const statusOrder: Record<string, number> = {
      critical_buyers: 0,
      needs_buyers: 1,
      needs_sellers: 2,
      balanced: 3,
      no_data: 4,
    };

    const sorted = (data || []).sort(
      (a: any, b: any) =>
        (statusOrder[a.balance_status] ?? 5) -
        (statusOrder[b.balance_status] ?? 5)
    );

    return NextResponse.json({ balance: sorted });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "حصل خطأ" },
      { status: 500 }
    );
  }
}
