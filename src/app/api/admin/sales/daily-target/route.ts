/**
 * POST /api/admin/sales/daily-target — Save ممدوح's daily directive for وليد
 * GET  /api/admin/sales/daily-target — Get today's directive
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const sb = getSupabase();
    const today = new Date().toISOString().split("T")[0];

    const { data } = await sb
      .from("daily_outreach_targets")
      .select("*")
      .eq("target_date", today)
      .maybeSingle();

    return NextResponse.json({ target: data || null });
  } catch {
    return NextResponse.json({ target: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb = getSupabase();
    const body = await req.json();
    const { category, governorate, tier, messageCount, notes } = body;
    const today = new Date().toISOString().split("T")[0];

    // Upsert today's target
    const { error } = await sb
      .from("daily_outreach_targets")
      .upsert(
        {
          target_date: today,
          category: category !== "all" ? category : null,
          governorate: governorate !== "all" ? governorate : null,
          tier: tier !== "all" ? tier : null,
          message_count: messageCount || 50,
          notes: notes || null,
        },
        { onConflict: "target_date" }
      );

    if (error) {
      console.error("[DAILY-TARGET] Upsert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log human decision
    await sb.from("human_decisions").insert({
      decision_type: "daily_target_set",
      context: `هدف ${today}: ${category} / ${governorate} / ${tier}`,
      decision: `${messageCount} رسالة${notes ? ` — ${notes}` : ""}`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DAILY-TARGET] Error:", err.message);
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}
