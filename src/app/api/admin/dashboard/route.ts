/**
 * GET /api/admin/dashboard
 *
 * Strategic CEO dashboard data — aggregates KPIs, department health,
 * chart data, and alerts from real Supabase tables.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySessionToken } from "@/lib/auth/session-token";
import { verifyAdmin } from "@/lib/admin/admin-service";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Safely count rows in a table. Returns null if table doesn't exist. */
async function safeCount(
  sb: ReturnType<typeof getServiceClient>,
  table: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: (q: any) => any
): Promise<number | null> {
  try {
    let q = sb.from(table).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count, error } = await q;
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

/** Get counts for the last 30 days grouped by date from a table */
async function getDailyCountsLast30(
  sb: ReturnType<typeof getServiceClient>,
  table: string,
  dateCol: string = "created_at"
): Promise<Array<{ date: string; count: number }>> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await sb
      .from(table)
      .select(dateCol)
      .gte(dateCol, thirtyDaysAgo.toISOString());

    if (error || !data) return [];

    // Group by date
    const grouped: Record<string, number> = {};
    for (const row of data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = (row as any)[dateCol];
      if (!val) continue;
      const d = new Date(val).toISOString().split("T")[0];
      grouped[d] = (grouped[d] || 0) + 1;
    }

    // Fill in all 30 days
    const result: Array<{ date: string; count: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      result.push({ date: label, count: grouped[key] || 0 });
    }
    return result;
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin identity
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "مطلوب تسجيل الدخول" }, { status: 401 });
    }
    const session = verifySessionToken(token);
    if (!session.valid) {
      return NextResponse.json({ error: session.error }, { status: 401 });
    }
    const adminId = session.userId;

    const isAdmin = await verifyAdmin(adminId);
    if (!isAdmin) {
      return NextResponse.json({ error: "ليس لديك صلاحيات الأدمن" }, { status: 403 });
    }

    const sb = getServiceClient();

    // ── KPIs (parallel queries) ──────────────────────────────────
    const [
      usersCount,
      listingsCount,
      sellersCount,
      sellersWithPhoneCount,
      conversationsCount,
      teamMembersCount,
      reportsCount,
      buyersCount,
      // Whale breakdown
      whaleSellerCount,
      bigFishSellerCount,
      regularSellerCount,
    ] = await Promise.all([
      safeCount(sb, "profiles"),
      safeCount(sb, "ahe_listings"),
      safeCount(sb, "ahe_sellers"),
      safeCount(sb, "ahe_sellers", (q) => q.not("phone", "is", null)),
      safeCount(sb, "wa_conversations"),
      safeCount(sb, "team_members", (q) => q.eq("is_active", true)),
      safeCount(sb, "reports", (q) => q.eq("status", "pending")),
      safeCount(sb, "bhe_buyers"),
      // Whale tiers
      safeCount(sb, "ahe_sellers", (q) => q.eq("seller_tier", "whale")),
      safeCount(sb, "ahe_sellers", (q) => q.eq("seller_tier", "big_fish")),
      safeCount(sb, "ahe_sellers", (q) => q.eq("seller_tier", "regular")),
    ]);

    // ── Today's activity count ───────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayListings = await safeCount(sb, "ahe_listings", (q) =>
      q.gte("created_at", todayStart.toISOString())
    );

    // ── Buy probability stats ─────────────────────────────────────
    const [buyProbVeryHigh, buyProbHigh, sellerIsBuyerCount] = await Promise.all([
      safeCount(sb, "ahe_sellers", (q) => q.eq("buy_probability", "very_high").not("phone", "is", null)),
      safeCount(sb, "ahe_sellers", (q) => q.eq("buy_probability", "high").not("phone", "is", null)),
      safeCount(sb, "bhe_buyers", (q) => q.eq("source", "seller_is_buyer")),
    ]);

    // ── Chart data (last 30 days harvest) ────────────────────────
    const listingsDaily = await getDailyCountsLast30(sb, "ahe_listings");
    const sellersDaily = await getDailyCountsLast30(sb, "ahe_sellers");

    const hasChartData = listingsDaily.some((d) => d.count > 0) || sellersDaily.some((d) => d.count > 0);

    const chart_data = hasChartData
      ? listingsDaily.map((d, i) => ({
          date: d.date,
          users: sellersDaily[i]?.count ?? 0,
          ads: d.count,
          revenue: 0,
        }))
      : [];

    // ── Department health (real counts) ──────────────────────────
    const department_health = [
      {
        id: "cs",
        name: "خدمة العملاء",
        status: conversationsCount === null ? "good" : (conversationsCount > 0 ? "good" : "good"),
        stats: conversationsCount !== null ? `${conversationsCount} محادثة` : "—",
        details: conversationsCount !== null
          ? (conversationsCount > 0 ? `${conversationsCount} محادثة واتساب` : "لا توجد محادثات بعد")
          : "الجدول غير متاح",
      },
      {
        id: "sales",
        name: "المبيعات",
        status: (buyProbVeryHigh || 0) > 0 ? "excellent" : "good",
        stats: `${sellersCount ?? 0} بائع | ${buyersCount ?? 0} مشتري`,
        details: [
          `🐋 ${whaleSellerCount ?? 0} | 🦈 ${bigFishSellerCount ?? 0} | 🐟 ${regularSellerCount ?? 0}`,
          sellersWithPhoneCount !== null && sellersWithPhoneCount > 0 ? `${sellersWithPhoneCount} بأرقام` : null,
          sellerIsBuyerCount !== null && sellerIsBuyerCount > 0 ? `${sellerIsBuyerCount} بائع→مشتري` : null,
          buyProbVeryHigh !== null ? `مشترين محتملين: ${buyProbVeryHigh} very_high | ${buyProbHigh || 0} high` : null,
        ].filter(Boolean).join(" · ") || "لا توجد بيانات بعد",
      },
      {
        id: "marketing",
        name: "التسويق",
        status: "good",
        stats: "لا توجد بيانات بعد",
        details: "ستظهر البيانات بعد ربط القنوات التسويقية",
      },
      {
        id: "ops",
        name: "العمليات",
        status: reportsCount !== null && reportsCount > 0 ? "warning" : "good",
        stats: reportsCount !== null ? `${reportsCount} بلاغ معلّق` : "—",
        details: reportsCount !== null
          ? (reportsCount > 0 ? `${reportsCount} بلاغ بحاجة لمراجعة` : "لا توجد بلاغات معلّقة")
          : "الجدول غير متاح",
      },
      {
        id: "finance",
        name: "المالية",
        status: "good",
        stats: "0 جنيه إيرادات",
        details: "ستظهر البيانات بعد تفعيل نظام الدفع",
      },
      {
        id: "tech",
        name: "التقنية",
        status: listingsCount !== null && listingsCount > 0 ? "excellent" : "good",
        stats: listingsCount !== null
          ? `محرك الحصاد: ${listingsCount} إعلان`
          : "—",
        details: todayListings !== null && todayListings > 0
          ? `${todayListings} إعلان محصود اليوم`
          : (listingsCount !== null ? "لا يوجد حصاد اليوم" : "الجدول غير متاح"),
      },
    ] as Array<{
      id: string;
      name: string;
      status: "excellent" | "good" | "warning" | "critical";
      stats: string;
      details: string;
    }>;

    // ── Alerts (real conditions) ─────────────────────────────────
    const alerts: Array<{
      id: string;
      type: "critical" | "warning" | "info";
      message: string;
      time: string;
    }> = [];

    if (reportsCount !== null && reportsCount > 0) {
      alerts.push({
        id: "reports",
        type: reportsCount >= 3 ? "critical" : "warning",
        message: `${reportsCount} بلاغ بحاجة لمراجعة`,
        time: "الآن",
      });
    }

    if (todayListings !== null && todayListings > 0) {
      alerts.push({
        id: "harvest",
        type: "info",
        message: `محرك الحصاد أضاف ${todayListings} إعلان اليوم`,
        time: "اليوم",
      });
    }

    if (sellersWithPhoneCount !== null && sellersWithPhoneCount > 0) {
      alerts.push({
        id: "phones",
        type: "info",
        message: `${sellersWithPhoneCount} رقم هاتف مستخرج من البائعين`,
        time: "إجمالي",
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        id: "no_alerts",
        type: "info",
        message: "لا توجد تنبيهات حالياً — كل شيء يعمل بشكل طبيعي",
        time: "الآن",
      });
    }

    return NextResponse.json({
      kpis: {
        users: usersCount ?? 0,
        listings: listingsCount ?? 0,
        revenue: 0,
        activity: todayListings ?? 0,
        trends: {
          users: 0,
          listings: 0,
          revenue: 0,
          activity: 0,
        },
      },
      department_health,
      chart_data,
      chart_empty_message: !hasChartData ? "ستظهر البيانات بعد بدء التشغيل" : undefined,
      alerts,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "حصل خطأ في تحميل البيانات" }, { status: 500 });
  }
}
