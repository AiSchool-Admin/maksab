import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase config");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Pipeline stages mapped to pipeline_status values
const PIPELINE_STAGES = [
  { status: "discovered", stage: "اكتشفوا", color: "#1B7A3D", kanbanId: "discovery", kanbanTitle: "اكتشاف" },
  { status: "phone_found", stage: "عندهم رقم", color: "#1E8B45", kanbanId: "phone_found", kanbanTitle: "عندهم رقم" },
  { status: "contacted", stage: "تم التواصل", color: "#22A050", kanbanId: "contact", kanbanTitle: "تواصل" },
  { status: "responded", stage: "ردّوا", color: "#2DB85E", kanbanId: "responded", kanbanTitle: "ردّوا" },
  { status: "interested", stage: "مهتمين", color: "#45C972", kanbanId: "interested", kanbanTitle: "مهتم" },
  { status: "signed_up", stage: "سجّلوا", color: "#6DD895", kanbanId: "registered", kanbanTitle: "تسجيل" },
  { status: "active", stage: "نشطين", color: "#95E5B2", kanbanId: "active", kanbanTitle: "نشط" },
  { status: "vip", stage: "VIP", color: "#D4A843", kanbanId: "vip", kanbanTitle: "VIP" },
];

export async function GET() {
  try {
    const supabase = getSupabase();

    // 1. Get counts per pipeline_status for the funnel
    const statusCounts: Record<string, number> = {};
    const { data: allSellers, error: countError } = await supabase
      .from("ahe_sellers")
      .select("pipeline_status");

    if (countError) {
      console.error("Pipeline count error:", countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // Count by status
    let totalSellers = 0;
    for (const seller of allSellers || []) {
      const status = seller.pipeline_status || "discovered";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      totalSellers++;
    }

    // Build funnel data
    const funnel = PIPELINE_STAGES.map((s) => {
      const count = statusCounts[s.status] || 0;
      return {
        stage: s.stage,
        count,
        percent: totalSellers > 0 ? Math.round((count / totalSellers) * 100) : 0,
        color: s.color,
      };
    });

    // 2. Get top sellers per pipeline_status for kanban (max 5 per column)
    const kanbanColumns = [];
    for (const stage of PIPELINE_STAGES) {
      const { data: sellers } = await supabase
        .from("ahe_sellers")
        .select("id, name, phone, priority_score, primary_category")
        .eq("pipeline_status", stage.status)
        .order("priority_score", { ascending: false })
        .limit(5);

      kanbanColumns.push({
        id: stage.kanbanId,
        title: stage.kanbanTitle,
        color: stage.color,
        cards: (sellers || []).map((s) => ({
          id: s.id,
          name: s.name || "بدون اسم",
          phone: s.phone || "—",
          score: s.priority_score || 0,
          category: s.primary_category || "—",
        })),
      });
    }

    // 3. Today's performance — count sellers discovered/contacted today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const { count: harvestedToday } = await supabase
      .from("ahe_sellers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayISO);

    const { count: phonesToday } = await supabase
      .from("ahe_sellers")
      .select("*", { count: "exact", head: true })
      .not("phone", "is", null)
      .gte("updated_at", todayISO);

    const { count: contactedToday } = await supabase
      .from("ahe_sellers")
      .select("*", { count: "exact", head: true })
      .eq("pipeline_status", "contacted")
      .gte("first_outreach_at", todayISO);

    const { count: respondedToday } = await supabase
      .from("ahe_sellers")
      .select("*", { count: "exact", head: true })
      .eq("pipeline_status", "responded")
      .gte("last_response_at", todayISO);

    const { count: signedUpToday } = await supabase
      .from("ahe_sellers")
      .select("*", { count: "exact", head: true })
      .eq("pipeline_status", "signed_up")
      .gte("updated_at", todayISO);

    const { count: vipToday } = await supabase
      .from("ahe_sellers")
      .select("*", { count: "exact", head: true })
      .eq("pipeline_status", "vip")
      .gte("updated_at", todayISO);

    const todayPerformance = [
      { label: "حصاد", value: harvestedToday || 0, icon: "wheat", color: "#1B7A3D" },
      { label: "أرقام", value: phonesToday || 0, icon: "phone", color: "#1E8B45" },
      { label: "رسائل", value: contactedToday || 0, icon: "message", color: "#22A050" },
      { label: "ردود", value: respondedToday || 0, icon: "reply", color: "#2DB85E" },
      { label: "تسجيل", value: signedUpToday || 0, icon: "user-plus", color: "#45C972" },
      { label: "حيتان جدد", value: vipToday || 0, icon: "star", color: "#D4A843" },
    ];

    return NextResponse.json({
      funnel,
      kanban: { columns: kanbanColumns },
      todayPerformance,
    });
  } catch (err: any) {
    console.error("Pipeline API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
