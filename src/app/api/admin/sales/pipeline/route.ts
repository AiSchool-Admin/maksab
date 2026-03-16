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

// Pipeline stages for kanban columns
const KANBAN_STAGES = [
  { status: "discovered", kanbanId: "discovery", kanbanTitle: "اكتشاف", color: "#1B7A3D" },
  { status: "phone_found", kanbanId: "phone_found", kanbanTitle: "عندهم رقم", color: "#1E8B45" },
  { status: "contacted", kanbanId: "contact", kanbanTitle: "تواصل", color: "#22A050" },
  { status: "responded", kanbanId: "responded", kanbanTitle: "ردّوا", color: "#2DB85E" },
  { status: "interested", kanbanId: "interested", kanbanTitle: "مهتم", color: "#45C972" },
  { status: "signed_up", kanbanId: "registered", kanbanTitle: "تسجيل", color: "#6DD895" },
  { status: "active", kanbanId: "active", kanbanTitle: "نشط", color: "#95E5B2" },
  { status: "vip", kanbanId: "vip", kanbanTitle: "VIP", color: "#D4A843" },
];

export async function GET() {
  try {
    const supabase = getSupabase();

    // ── 1. Get REAL counts for funnel (cumulative logic) ────────────
    const [
      discoveredRes,
      withPhoneRes,
      contactedRes,
      respondedRes,
      registeredRes,
      whaleNewRes,
    ] = await Promise.all([
      // اكتشفوا = ALL sellers
      supabase.from("ahe_sellers").select("*", { count: "exact", head: true }),
      // عندهم رقم = sellers with phone
      supabase.from("ahe_sellers").select("*", { count: "exact", head: true }).not("phone", "is", null),
      // تم التواصل = cumulative contacted+
      supabase.from("ahe_sellers").select("*", { count: "exact", head: true })
        .in("pipeline_status", ["contacted", "responded", "interested", "onboarding", "activated", "active", "signed_up", "vip"]),
      // ردود = cumulative responded+
      supabase.from("ahe_sellers").select("*", { count: "exact", head: true })
        .in("pipeline_status", ["responded", "interested", "onboarding", "activated", "active", "signed_up", "vip"]),
      // تسجيل = cumulative signed_up+
      supabase.from("ahe_sellers").select("*", { count: "exact", head: true })
        .in("pipeline_status", ["activated", "active", "signed_up", "vip"]),
      // حيتان جدد = whale tier in last 7 days
      supabase.from("ahe_sellers").select("*", { count: "exact", head: true })
        .eq("seller_tier", "whale")
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);

    const discovered = discoveredRes.count || 0;
    const withPhone = withPhoneRes.count || 0;
    const contacted = contactedRes.count || 0;
    const responded = respondedRes.count || 0;
    const registered = registeredRes.count || 0;
    const newWhales = whaleNewRes.count || 0;

    // Build funnel with conversion rates (each stage relative to previous)
    const funnelStages = [
      { stage: "اكتشفوا", count: discovered, color: "#1B7A3D" },
      { stage: "عندهم رقم", count: withPhone, color: "#1E8B45" },
      { stage: "تم التواصل", count: contacted, color: "#22A050" },
      { stage: "ردّوا", count: responded, color: "#2DB85E" },
      { stage: "سجّلوا", count: registered, color: "#6DD895" },
      { stage: "حيتان جدد", count: newWhales, color: "#D4A843" },
    ];

    const funnel = funnelStages.map((s, i) => {
      const prevCount = i === 0 ? s.count : funnelStages[i - 1].count;
      const percent = prevCount > 0 ? Math.round((s.count / prevCount) * 100) : 0;
      return {
        stage: s.stage,
        count: s.count,
        percent: i === 0 ? 100 : percent,
        color: s.color,
      };
    });

    // ── 2. Kanban board (top 5 sellers per pipeline_status) ────────
    const kanbanColumns = [];
    for (const stage of KANBAN_STAGES) {
      const { data: sellers } = await supabase
        .from("ahe_sellers")
        .select("id, name, phone, priority_score, whale_score, seller_tier, primary_category")
        .eq("pipeline_status", stage.status)
        .order("whale_score", { ascending: false })
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
          score: s.whale_score || s.priority_score || 0,
          tier: s.seller_tier || "unknown",
          category: s.primary_category || "—",
        })),
      });
    }

    // ── 3. Today's performance ─────────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const [harvestTodayRes, phonesTodayRes, contactedTodayRes, respondedTodayRes, registeredTodayRes] = await Promise.all([
      // حصاد اليوم = listings harvested today
      supabase.from("ahe_listings").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
      // أرقام مستخرجة اليوم
      supabase.from("ahe_sellers").select("*", { count: "exact", head: true }).not("phone", "is", null).gte("updated_at", todayISO),
      // رسائل اليوم
      supabase.from("ahe_sellers").select("*", { count: "exact", head: true })
        .not("first_outreach_at", "is", null).gte("first_outreach_at", todayISO),
      // ردود اليوم
      supabase.from("ahe_sellers").select("*", { count: "exact", head: true })
        .in("pipeline_status", ["responded", "interested"]).gte("updated_at", todayISO),
      // تسجيل اليوم
      supabase.from("ahe_sellers").select("*", { count: "exact", head: true })
        .in("pipeline_status", ["signed_up", "activated", "active"]).gte("updated_at", todayISO),
    ]);

    const todayPerformance = [
      { label: "حصاد", value: harvestTodayRes.count || 0, icon: "wheat", color: "#1B7A3D" },
      { label: "أرقام", value: phonesTodayRes.count || 0, icon: "phone", color: "#1E8B45" },
      { label: "رسائل", value: contactedTodayRes.count || 0, icon: "message", color: "#22A050" },
      { label: "ردود", value: respondedTodayRes.count || 0, icon: "reply", color: "#2DB85E" },
      { label: "تسجيل", value: registeredTodayRes.count || 0, icon: "user-plus", color: "#45C972" },
      { label: "حيتان جدد", value: newWhales, icon: "star", color: "#D4A843" },
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
