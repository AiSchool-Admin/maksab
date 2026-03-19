/**
 * GET  /api/admin/ops/moderation — Fetch ads needing human review (fraud_score 40-79)
 * POST /api/admin/ops/moderation — Approve or reject an ad
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

    // Fetch ads flagged for review (fraud_score 40-79)
    const { data: pending, error } = await sb
      .from("listing_moderation")
      .select("*")
      .eq("decision", "review")
      .is("human_decision", null)
      .gte("fraud_score", 40)
      .lte("fraud_score", 79)
      .order("fraud_score", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[MODERATION] Fetch error:", error.message);
    }

    // Get stats
    const today = new Date().toISOString().split("T")[0];

    const { count: totalToday } = await sb
      .from("listing_moderation")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today);

    const { count: approvedToday } = await sb
      .from("listing_moderation")
      .select("*", { count: "exact", head: true })
      .eq("decision", "approve")
      .gte("created_at", today);

    const { count: rejectedToday } = await sb
      .from("listing_moderation")
      .select("*", { count: "exact", head: true })
      .eq("decision", "reject")
      .gte("created_at", today);

    const { count: reviewCount } = await sb
      .from("listing_moderation")
      .select("*", { count: "exact", head: true })
      .eq("decision", "review")
      .is("human_decision", null);

    return NextResponse.json({
      pending: pending || [],
      stats: {
        total: totalToday || 0,
        approved: approvedToday || 0,
        rejected: rejectedToday || 0,
        review: reviewCount || 0,
      },
    });
  } catch (err: any) {
    console.error("[MODERATION] Error:", err.message);
    return NextResponse.json({ pending: [], stats: { total: 0, approved: 0, rejected: 0, review: 0 } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb = getSupabase();
    const body = await req.json();
    const { moderation_id, action, admin_id } = body;

    if (!moderation_id || !["approved", "rejected"].includes(action)) {
      return NextResponse.json({ error: "مطلوب" }, { status: 400 });
    }

    // Update moderation record
    const { error: modErr } = await sb
      .from("listing_moderation")
      .update({
        human_decision: action,
        human_decided_at: new Date().toISOString(),
        human_decided_by: admin_id || null,
        human_override: action,
        human_override_reason: action === "approved" ? "ممدوح وافق" : "ممدوح رفض",
      })
      .eq("id", moderation_id);

    if (modErr) {
      console.error("[MODERATION] Update error:", modErr.message);
      return NextResponse.json({ error: modErr.message }, { status: 500 });
    }

    // Get the listing_id to update the ad status
    const { data: mod } = await sb
      .from("listing_moderation")
      .select("listing_id")
      .eq("id", moderation_id)
      .maybeSingle();

    if (mod?.listing_id) {
      if (action === "approved") {
        await sb
          .from("ads")
          .update({ status: "active" })
          .eq("id", mod.listing_id);
      } else {
        await sb
          .from("ads")
          .update({ status: "deleted" })
          .eq("id", mod.listing_id);
      }
    }

    // Log human decision
    await sb.from("human_decisions").insert({
      decision_type: "moderation_review",
      context: `إعلان ${mod?.listing_id || moderation_id}`,
      decision: action === "approved" ? "موافقة" : "رفض",
      admin_id: admin_id || null,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[MODERATION] POST error:", err.message);
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}
