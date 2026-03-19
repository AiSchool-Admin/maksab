/**
 * GET  /api/admin/ai/daily-report — Get latest Nora daily report
 * POST /api/admin/ai/daily-report — Save admin's decision on the report
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

    const { data: report } = await sb
      .from("ai_daily_reports")
      .select("*")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ report: report || null });
  } catch {
    return NextResponse.json({ report: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb = getSupabase();
    const body = await req.json();
    const { decision } = body;

    if (!decision) {
      return NextResponse.json({ error: "مطلوب" }, { status: 400 });
    }

    // Get latest report date
    const { data: report } = await sb
      .from("ai_daily_reports")
      .select("date")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!report) {
      return NextResponse.json({ error: "لا يوجد تقرير" }, { status: 404 });
    }

    // Update report with admin decision
    const { error } = await sb
      .from("ai_daily_reports")
      .update({
        admin_decision: decision,
        admin_decision_at: new Date().toISOString(),
      })
      .eq("date", report.date);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log human decision
    await sb.from("human_decisions").insert({
      decision_type: "daily_report_decision",
      context: `تقرير نورا — ${report.date}`,
      decision,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DAILY-REPORT] Error:", err.message);
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}
