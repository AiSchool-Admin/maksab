/**
 * GET /api/admin/dashboard
 *
 * Strategic CEO dashboard data — aggregates KPIs, department health,
 * chart data, and alerts. Requires admin auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";
import { verifyAdmin } from "@/lib/admin/admin-service";

interface DashboardResponse {
  kpis: {
    users: number;
    listings: number;
    revenue: number;
    activity: number;
    trends: {
      users: number;
      listings: number;
      revenue: number;
      activity: number;
    };
  };
  department_health: Array<{
    id: string;
    name: string;
    status: "excellent" | "good" | "warning" | "critical";
    stats: string;
    details: string;
  }>;
  chart_data: Array<{
    date: string;
    users: number;
    ads: number;
    revenue: number;
  }>;
  alerts: Array<{
    id: string;
    type: "critical" | "warning" | "info";
    message: string;
    time: string;
  }>;
}

function generateChartData(): DashboardResponse["chart_data"] {
  const data: DashboardResponse["chart_data"] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayStr = `${date.getMonth() + 1}/${date.getDate()}`;
    // Simulate growth trend with some variance
    const base = 30 - i;
    data.push({
      date: dayStr,
      users: Math.floor(40 + base * 2.5 + Math.random() * 30),
      ads: Math.floor(25 + base * 1.8 + Math.random() * 20),
      revenue: Math.floor(500 + base * 80 + Math.random() * 400),
    });
  }
  return data;
}

function getMockDashboard(): DashboardResponse {
  return {
    kpis: {
      users: 12847,
      listings: 8432,
      revenue: 45200,
      activity: 1893,
      trends: {
        users: 12.5,
        listings: 8.3,
        revenue: 23.1,
        activity: -3.2,
      },
    },
    department_health: [
      {
        id: "cs",
        name: "خدمة العملاء",
        status: "good",
        stats: "متوسط الرد: 4 دقائق",
        details: "12 محادثة مفتوحة — 2 تصعيد معلّق",
      },
      {
        id: "sales",
        name: "المبيعات",
        status: "excellent",
        stats: "47 عميل جديد هذا الأسبوع",
        details: "معدل التحويل 18% — Pipeline: 156 عميل",
      },
      {
        id: "marketing",
        name: "التسويق",
        status: "warning",
        stats: "3 حملات نشطة",
        details: "معدل التفاعل منخفض على فيسبوك — يحتاج مراجعة",
      },
      {
        id: "ops",
        name: "العمليات",
        status: "good",
        stats: "28 إعلان في انتظار المراجعة",
        details: "0 بلاغات عاجلة — متوسط المراجعة: 2 ساعة",
      },
      {
        id: "finance",
        name: "المالية",
        status: "excellent",
        stats: "إيرادات الشهر: 45,200 جنيه",
        details: "نمو 23% عن الشهر السابق",
      },
      {
        id: "tech",
        name: "التقنية",
        status: "good",
        stats: "Uptime: 99.8%",
        details: "محرك الحصاد: 342 إعلان محصود اليوم",
      },
    ],
    chart_data: generateChartData(),
    alerts: [
      {
        id: "1",
        type: "critical",
        message: "3 بلاغات عن محتوى مخالف بحاجة لمراجعة فورية",
        time: "منذ 15 دقيقة",
      },
      {
        id: "2",
        type: "warning",
        message: "حملة فيسبوك \"عروض رمضان\" معدل التفاعل أقل من المتوقع بـ 40%",
        time: "منذ ساعة",
      },
      {
        id: "3",
        type: "warning",
        message: "5 تصعيدات خدمة عملاء معلّقة لأكثر من 24 ساعة",
        time: "منذ 3 ساعات",
      },
      {
        id: "4",
        type: "info",
        message: "محرك الحصاد أضاف 156 بائع جديد من OLX اليوم",
        time: "منذ 4 ساعات",
      },
      {
        id: "5",
        type: "info",
        message: "تم تجديد اشتراكات 12 متجر تلقائياً",
        time: "منذ 6 ساعات",
      },
    ],
  };
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

    // Return dashboard data (mock for now, will be replaced with real queries)
    const data = getMockDashboard();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "حصل خطأ في تحميل البيانات" }, { status: 500 });
  }
}
