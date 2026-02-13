/**
 * POST /api/reports/create
 * Submit a report against an ad or user.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const VALID_REASONS = [
  "spam", "fake", "offensive", "wrong_category", "wrong_price",
  "stolen_photos", "prohibited", "harassment", "scam", "other",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reporter_id, target_type, target_ad_id, target_user_id, reason, details } = body;

    // Validation
    if (!reporter_id || !target_type || !reason) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    if (!["ad", "user"].includes(target_type)) {
      return NextResponse.json({ error: "نوع البلاغ غلط" }, { status: 400 });
    }

    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: "سبب البلاغ غلط" }, { status: 400 });
    }

    if (target_type === "ad" && !target_ad_id) {
      return NextResponse.json({ error: "لازم تحدد الإعلان" }, { status: 400 });
    }

    if (target_type === "user" && !target_user_id) {
      return NextResponse.json({ error: "لازم تحدد المستخدم" }, { status: 400 });
    }

    // Cannot report yourself
    if (target_type === "user" && target_user_id === reporter_id) {
      return NextResponse.json({ error: "مش ممكن تبلّغ عن نفسك" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Rate limit: max 10 reports per day per user
    const { data: recentReports } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reporter_id", reporter_id)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if ((recentReports as unknown as number) >= 10) {
      return NextResponse.json(
        { error: "وصلت للحد الأقصى من البلاغات اليومية. جرب بكرة" },
        { status: 429 },
      );
    }

    // Check for duplicate report
    const dupQuery = supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reporter_id", reporter_id)
      .eq("target_type", target_type);

    if (target_type === "ad") {
      dupQuery.eq("target_ad_id", target_ad_id);
    } else {
      dupQuery.eq("target_user_id", target_user_id);
    }

    const { count: dupCount } = await dupQuery;
    if ((dupCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "أنت بلّغت عن ده قبل كده. البلاغ بتاعك بيتراجع" },
        { status: 409 },
      );
    }

    // Insert report
    const { error: insertError } = await supabase
      .from("reports")
      .insert({
        reporter_id,
        target_type,
        target_ad_id: target_ad_id || null,
        target_user_id: target_user_id || null,
        reason,
        details: details || null,
        status: "pending",
      });

    if (insertError) {
      console.error("[reports/create] Insert error:", insertError);
      return NextResponse.json(
        { error: "حصل مشكلة في تسجيل البلاغ. جرب تاني" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, message: "تم تسجيل البلاغ. شكراً لمساعدتك في تحسين مكسب" });
  } catch (err) {
    console.error("[reports/create] Error:", err);
    return NextResponse.json({ error: "حصل مشكلة. جرب تاني" }, { status: 500 });
  }
}
