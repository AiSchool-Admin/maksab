/**
 * GET /api/admin/acquisition/stats
 *
 * Returns acquisition pipeline statistics.
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/require-auth";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return data?.role === "admin" || data?.role === "super_admin";
}

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.userId) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  if (!(await isAdmin(auth.userId))) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const supabase = getServiceClient();

  try {
    // Get lead counts by status
    const { data: statusCounts } = await supabase.rpc("exec_sql", {
      query: `
        SELECT status, COUNT(*)::int as count
        FROM acquisition_leads
        GROUP BY status
      `,
    });

    // Get lead counts by source
    const { data: sourceCounts } = await supabase.rpc("exec_sql", {
      query: `
        SELECT source, COUNT(*)::int as count,
               COUNT(*) FILTER (WHERE status IN ('registered', 'active_seller'))::int as converted
        FROM acquisition_leads
        GROUP BY source
      `,
    });

    // Fallback: query directly if RPC not available
    const statusMap: Record<string, number> = {};
    const sourceMap: Record<string, { total: number; converted: number }> = {};

    // Status counts
    const statuses = [
      "new",
      "contacted",
      "interested",
      "registered",
      "active_seller",
      "declined",
      "blacklist",
    ];
    for (const status of statuses) {
      const { count } = await supabase
        .from("acquisition_leads")
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      statusMap[status] = count || 0;
    }

    // Source counts
    const sources = [
      "olx",
      "facebook",
      "marketplace",
      "manual",
      "referral",
      "instagram",
      "tiktok",
      "whatsapp_group",
      "store_visit",
    ];
    for (const source of sources) {
      const { count: total } = await supabase
        .from("acquisition_leads")
        .select("id", { count: "exact", head: true })
        .eq("source", source);

      const { count: converted } = await supabase
        .from("acquisition_leads")
        .select("id", { count: "exact", head: true })
        .eq("source", source)
        .in("status", ["registered", "active_seller"]);

      if ((total || 0) > 0) {
        sourceMap[source] = { total: total || 0, converted: converted || 0 };
      }
    }

    // Tier counts
    const tierMap: Record<string, number> = {};
    for (const tier of ["platinum", "gold", "silver", "bronze"]) {
      const { count } = await supabase
        .from("acquisition_leads")
        .select("id", { count: "exact", head: true })
        .eq("seller_tier", tier);
      tierMap[tier] = count || 0;
    }

    // Today's outreach
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: outreachToday } = await supabase
      .from("acquisition_outreach")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", today.toISOString());

    const { count: repliesToday } = await supabase
      .from("acquisition_outreach")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", today.toISOString())
      .eq("status", "replied");

    // Goals
    const { data: goals } = await supabase
      .from("acquisition_goals")
      .select("*");

    // Category distribution
    // This requires parsing the categories array — simplified query
    const { data: recentLeads } = await supabase
      .from("acquisition_leads")
      .select("categories")
      .not("categories", "eq", "{}");

    const categoryCount: Record<string, number> = {};
    if (recentLeads) {
      for (const lead of recentLeads) {
        const cats = lead.categories as string[];
        if (cats) {
          for (const cat of cats) {
            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
          }
        }
      }
    }

    // Total registered users and active ads (for goal tracking)
    const { count: totalActiveSellers } = await supabase
      .from("ads")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "active");

    const { count: totalUniqueVisitors } = await supabase
      .from("utm_visits")
      .select("session_id", { count: "exact", head: true });

    const totalLeads =
      Object.values(statusMap).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      overview: {
        totalLeads,
        byStatus: statusMap,
        bySource: sourceMap,
        byTier: tierMap,
        byCategory: categoryCount,
      },
      outreach: {
        today: outreachToday || 0,
        repliesToday: repliesToday || 0,
        responseRate:
          outreachToday && outreachToday > 0
            ? Math.round(((repliesToday || 0) / outreachToday) * 100)
            : 0,
      },
      goals: (goals || []).map(
        (g: {
          id: string;
          target_type: string;
          target_count: number;
          current_count: number;
          deadline: string;
        }) => ({
          id: g.id,
          targetType: g.target_type,
          target: g.target_count,
          current: g.current_count,
          deadline: g.deadline,
          progress: Math.round((g.current_count / g.target_count) * 100),
        })
      ),
      conversionRate:
        totalLeads > 0
          ? Math.round(
              (((statusMap.registered || 0) + (statusMap.active_seller || 0)) /
                totalLeads) *
                100
            )
          : 0,
      platformStats: {
        activeSellers: totalActiveSellers || 0,
        uniqueVisitors: totalUniqueVisitors || 0,
      },
    });
  } catch (err) {
    console.error("Acquisition stats error:", err);
    return NextResponse.json(
      { error: "حصل خطأ في جلب الإحصائيات" },
      { status: 500 }
    );
  }
}
