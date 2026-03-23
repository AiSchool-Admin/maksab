"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  ShoppingBag,
  DollarSign,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Info,
  Headphones,
  BarChart3,
  Megaphone,
  ClipboardCheck,
  CreditCard,
  Monitor,
  Scale,
  ChevronLeft,
} from "lucide-react";
import { useAdmin, getAdminHeaders } from "../layout";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ─── Types ─── */

interface DashboardData {
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
  chart_empty_message?: string;
  alerts: Array<{
    id: string;
    type: "critical" | "warning" | "info";
    message: string;
    time: string;
  }>;
}

/* ─── Helpers ─── */

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString("en-US");
}

function formatPrice(n: number): string {
  return n.toLocaleString("en-US") + " جنيه";
}

/* ─── KPI Card ─── */

function KPICard({
  label,
  value,
  trend,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  const isPositive = trend >= 0;
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor}`}>
          <span className={color}>{icon}</span>
        </div>
        <span
          className={`flex items-center gap-0.5 text-xs font-medium ${
            isPositive ? "text-emerald-600" : "text-red-500"
          }`}
        >
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {isPositive ? "+" : ""}
          {trend.toFixed(1)}%
        </span>
      </div>
      <p className="text-2xl font-bold text-dark">{value}</p>
      <p className="text-xs text-gray-text mt-0.5">{label}</p>
    </div>
  );
}

/* ─── Department Health Card ─── */

const statusConfig: Record<
  string,
  { emoji: string; badgeClass: string; label: string }
> = {
  excellent: { emoji: "🟢", badgeClass: "bg-emerald-50 text-emerald-700", label: "ممتاز" },
  good: { emoji: "🟢", badgeClass: "bg-green-50 text-green-700", label: "جيد" },
  warning: { emoji: "🟡", badgeClass: "bg-yellow-50 text-yellow-700", label: "تحتاج انتباه" },
  critical: { emoji: "🔴", badgeClass: "bg-red-50 text-red-700", label: "حرج" },
};

const deptIcons: Record<string, React.ReactNode> = {
  cs: <Headphones size={18} />,
  sales: <BarChart3 size={18} />,
  marketing: <Megaphone size={18} />,
  ops: <ClipboardCheck size={18} />,
  finance: <CreditCard size={18} />,
  tech: <Monitor size={18} />,
};

function DepartmentCard({
  dept,
}: {
  dept: DashboardData["department_health"][0];
}) {
  const cfg = statusConfig[dept.status] || statusConfig.good;
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">{deptIcons[dept.id]}</span>
          <h4 className="text-sm font-bold text-dark">{dept.name}</h4>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badgeClass}`}>
          {cfg.emoji} {cfg.label}
        </span>
      </div>
      <p className="text-xs text-gray-600 font-medium">{dept.stats}</p>
      <p className="text-[11px] text-gray-text mt-1">{dept.details}</p>
    </div>
  );
}

/* ─── Alert Item ─── */

const alertIcons: Record<string, React.ReactNode> = {
  critical: <AlertCircle size={16} className="text-red-500 shrink-0" />,
  warning: <AlertTriangle size={16} className="text-yellow-500 shrink-0" />,
  info: <Info size={16} className="text-blue-500 shrink-0" />,
};

const alertBg: Record<string, string> = {
  critical: "bg-red-50 border-red-100",
  warning: "bg-yellow-50 border-yellow-100",
  info: "bg-blue-50 border-blue-100",
};

/* ─── Custom Tooltip for Chart ─── */

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-3 text-xs" dir="rtl">
      <p className="font-bold text-dark mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-text">{entry.name}:</span>
          <span className="font-bold text-dark">
            {entry.name === "الإيرادات" ? formatPrice(entry.value) : formatNum(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

/* ─── Leader Card (بطاقة القائد) ─── */

interface LeaderCardData {
  pendingEscalations: number;
  pendingModeration: number;
  outreachSentToday: number;
  outreachTarget: number;
  csConversationsToday: number;
  hasNoraDailyReport: boolean;
  alerts: Array<{ id: string; message: string; priority: string; type: string }>;
  // Alexandria stats
  alexCarsSellers: number;
  alexPropertiesSellers: number;
  waleedMessagesToday: number;
  ahmedMessagesToday: number;
  lastHarvestBySource: Array<{ platform: string; harvested_at: string }>;
}

function LeaderCard() {
  const [data, setData] = useState<LeaderCardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const headers = getAdminHeaders();
        const [escalRes, reportRes, dashRes, mvpRes] = await Promise.all([
          fetch("/api/admin/cs/escalations", { headers }),
          fetch("/api/admin/ai/daily-report", { headers }),
          fetch("/api/admin/dashboard/leader-card", { headers }),
          fetch("/api/admin/dashboard/mvp-stats", { headers }).catch(() => null),
        ]);

        let pendingEscalations = 0;
        if (escalRes.ok) {
          const escData = await escalRes.json();
          pendingEscalations = (escData.escalations || []).filter((e: any) => e.status === "pending").length;
        }

        let hasNoraDailyReport = false;
        if (reportRes.ok) {
          const reportData = await reportRes.json();
          hasNoraDailyReport = !!reportData.report;
        }

        let extraData: any = {};
        if (dashRes.ok) {
          extraData = await dashRes.json();
        }

        let mvpData: any = {};
        if (mvpRes?.ok) {
          mvpData = await mvpRes.json();
        }

        setData({
          pendingEscalations,
          pendingModeration: extraData.pendingModeration || 0,
          outreachSentToday: extraData.outreachSentToday || 0,
          outreachTarget: extraData.outreachTarget || 50,
          csConversationsToday: extraData.csConversationsToday || 0,
          hasNoraDailyReport,
          alerts: extraData.alerts || [],
          alexCarsSellers: mvpData.alexCarsSellers || extraData.alexCarsSellers || 0,
          alexPropertiesSellers: mvpData.alexPropertiesSellers || extraData.alexPropertiesSellers || 0,
          waleedMessagesToday: mvpData.waleedMessagesToday || extraData.waleedMessagesToday || 0,
          ahmedMessagesToday: mvpData.ahmedMessagesToday || extraData.ahmedMessagesToday || 0,
          lastHarvestBySource: mvpData.lastHarvestBySource || extraData.lastHarvestBySource || [],
        });
      } catch {
        // silent
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-l from-[#1B7A3D]/10 to-[#D4A843]/10 rounded-2xl p-6 animate-pulse border border-[#1B7A3D]/20">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-4 bg-gray-100 rounded w-64" />
      </div>
    );
  }

  if (!data) return null;

  const urgentItems = [
    data.pendingEscalations > 0 && {
      emoji: "🔴",
      text: `${data.pendingEscalations} تصعيد يحتاج ردك`,
      href: "/admin/cs/escalations",
      priority: "critical",
    },
    data.pendingModeration > 0 && {
      emoji: "🟡",
      text: `${data.pendingModeration} إعلان في قائمة الانتظار`,
      href: "/admin/ops/moderation",
      priority: "warning",
    },
    ...data.alerts.map((a) => ({
      emoji: a.priority === "critical" ? "🔴" : a.priority === "high" ? "🟠" : "🔵",
      text: a.message,
      href: "#",
      priority: a.priority,
    })),
  ].filter(Boolean) as Array<{ emoji: string; text: string; href: string; priority: string }>;

  // Sort by priority
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, warning: 2, medium: 3, low: 4 };
  urgentItems.sort((a, b) => (priorityOrder[a.priority] ?? 5) - (priorityOrder[b.priority] ?? 5));

  return (
    <div className="bg-gradient-to-l from-[#1B7A3D]/10 to-[#D4A843]/10 rounded-2xl border border-[#1B7A3D]/20 overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👑</span>
            <div>
              <h2 className="text-lg font-bold text-dark">بطاقة القائد</h2>
              <p className="text-[10px] text-gray-text">
                {new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <Link
            href="/admin/ai/team"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm font-bold hover:bg-[#145C2E] transition-colors shadow-sm"
          >
            🌅 ابدأ يومك — افتح تقرير نورا
          </Link>
        </div>

        {/* Urgent Items */}
        {urgentItems.length > 0 ? (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-bold text-gray-600 mb-2">تنبيهات تحتاج تدخلك:</p>
            {urgentItems.slice(0, 5).map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  item.priority === "critical"
                    ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-100"
                    : item.priority === "high"
                    ? "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-100"
                    : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-100"
                }`}
              >
                <span>{item.emoji}</span>
                <span className="flex-1">{item.text}</span>
                <ChevronLeft size={16} className="opacity-50" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-4 text-center">
            <p className="text-sm text-green-700 font-medium">✅ مفيش حاجات عاجلة — الفريق شغّال تمام</p>
          </div>
        )}

        {/* Alexandria Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white/80 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-lg font-bold text-blue-600">{data.alexCarsSellers}</p>
            <p className="text-[10px] text-gray-text">🚗 بائعي سيارات — الإسكندرية</p>
          </div>
          <div className="bg-white/80 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-lg font-bold text-purple-600">{data.alexPropertiesSellers}</p>
            <p className="text-[10px] text-gray-text">🏠 بائعي عقارات — الإسكندرية</p>
          </div>
        </div>

        {/* Team Summary */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white/80 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-lg font-bold text-blue-600">{data.csConversationsToday}</p>
            <p className="text-[10px] text-gray-text">محادثات سارة</p>
          </div>
          <div className="bg-white/80 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-lg font-bold text-green-600">{data.waleedMessagesToday}</p>
            <p className="text-[10px] text-gray-text">🚗 رسائل وليد</p>
          </div>
          <div className="bg-white/80 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-lg font-bold text-purple-600">{data.ahmedMessagesToday}</p>
            <p className="text-[10px] text-gray-text">🏠 رسائل أحمد</p>
          </div>
          <div className="bg-white/80 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-lg font-bold text-yellow-600">{data.pendingModeration}</p>
            <p className="text-[10px] text-gray-text">بانتظار مازن</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Dashboard Page ─── */

export default function CEODashboardPage() {
  const admin = useAdmin();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!admin) return;

    async function load() {
      setIsLoading(true);
      try {
        const headers = getAdminHeaders();
        const res = await fetch("/api/admin/dashboard", { headers });

        if (res.status === 401) {
          setError("الجلسة منتهية — سجّل دخولك تاني");
          setIsLoading(false);
          return;
        }

        if (!res.ok) {
          setError("حصل مشكلة في تحميل البيانات");
          setIsLoading(false);
          return;
        }

        const json = await res.json();
        setData(json);
      } catch {
        setError("حصل مشكلة في الاتصال بالسيرفر");
      }
      setIsLoading(false);
    }

    load();
  }, [admin]);

  /* Loading skeleton */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 h-28 animate-pulse border border-gray-100" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 h-24 animate-pulse border border-gray-100" />
          ))}
        </div>
        <div className="bg-white rounded-xl p-4 h-72 animate-pulse border border-gray-100" />
      </div>
    );
  }

  /* Error state */
  if (error) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
          <Activity size={32} className="text-yellow-600" />
        </div>
        <h2 className="text-lg font-bold text-dark">{error}</h2>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-brand-green text-white rounded-xl text-sm font-medium hover:bg-brand-green-dark transition-colors"
        >
          حاول تاني
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Leader Card — بطاقة القائد */}
      <LeaderCard />

      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-dark">لوحة القيادة الاستراتيجية</h2>
        <p className="text-sm text-gray-text">نظرة شاملة على أداء مكسب</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="مستخدمين"
          value={formatNum(data.kpis.users)}
          trend={data.kpis.trends.users}
          icon={<Users size={20} />}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <KPICard
          label="إعلانات"
          value={formatNum(data.kpis.listings)}
          trend={data.kpis.trends.listings}
          icon={<ShoppingBag size={20} />}
          color="text-brand-green"
          bgColor="bg-brand-green-light"
        />
        <KPICard
          label="إيرادات"
          value={formatPrice(data.kpis.revenue)}
          trend={data.kpis.trends.revenue}
          icon={<DollarSign size={20} />}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <KPICard
          label="نشاط اليوم"
          value={formatNum(data.kpis.activity)}
          trend={data.kpis.trends.activity}
          icon={<Activity size={20} />}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
      </div>

      {/* Department Health */}
      <div>
        <h3 className="text-base font-bold text-dark mb-3">صحة الأقسام</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.department_health.map((dept) => (
            <DepartmentCard key={dept.id} dept={dept} />
          ))}
        </div>
      </div>

      {/* Market Balance Card */}
      <MarketBalanceCard />

      {/* Growth Chart */}
      <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-100 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-bold text-dark">النمو — آخر 30 يوم</h3>
          <p className="text-xs text-gray-text">بائعين، إعلانات محصودة</p>
        </div>
        {data.chart_data.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <BarChart3 size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">{data.chart_empty_message || "ستظهر البيانات بعد بدء التشغيل"}</p>
            </div>
          </div>
        ) : (
          <div className="h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chart_data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAds" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1B7A3D" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1B7A3D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value: string) => {
                    const labels: Record<string, string> = {
                      users: "البائعين",
                      ads: "الإعلانات",
                    };
                    return labels[value] || value;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  name="البائعين"
                  stroke="#3B82F6"
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="ads"
                  name="الإعلانات"
                  stroke="#1B7A3D"
                  fillOpacity={1}
                  fill="url(#colorAds)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-100 shadow-sm">
        <h3 className="text-base font-bold text-dark mb-3">مهام تحتاج انتباه</h3>
        <div className="space-y-2">
          {data.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${alertBg[alert.type]}`}
            >
              {alertIcons[alert.type]}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-dark">{alert.message}</p>
                <p className="text-[10px] text-gray-text mt-0.5">{alert.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Market Balance Card ─── */

interface BalanceEntry {
  category: string;
  active_listings: number;
  active_buyers: number;
  supply_demand_ratio: number;
  target_ratio: number;
  balance_status: string;
  updated_at: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  phones: "📱",
  vehicles: "🚗",
  properties: "🏠",
  electronics: "💻",
  furniture: "🛋️",
  fashion: "👗",
  home_appliances: "🏠",
  hobbies: "🎮",
  services: "🔧",
  gold_jewelry: "💰",
  scrap: "♻️",
  luxury: "💎",
};

const CATEGORY_AR: Record<string, string> = {
  phones: "موبايلات",
  vehicles: "سيارات",
  properties: "عقارات",
  electronics: "إلكترونيات",
  furniture: "أثاث",
  fashion: "أزياء",
  home_appliances: "أجهزة منزلية",
  hobbies: "هوايات",
  services: "خدمات",
  gold_jewelry: "ذهب ومجوهرات",
  scrap: "خُردة",
  luxury: "سلع فاخرة",
};

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  critical_buyers: { icon: "🔴", label: "محتاج مشترين عاجل", color: "text-red-600 bg-red-50" },
  needs_buyers: { icon: "🟡", label: "محتاج مشترين", color: "text-yellow-600 bg-yellow-50" },
  balanced: { icon: "🟢", label: "متوازن", color: "text-green-600 bg-green-50" },
  needs_sellers: { icon: "🔵", label: "محتاج بائعين", color: "text-blue-600 bg-blue-50" },
  no_data: { icon: "⚪", label: "لا بيانات", color: "text-gray-400 bg-gray-50" },
};

function MarketBalanceCard() {
  const [balance, setBalance] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard/balance", {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setBalance(json.balance || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-100 shadow-sm">
        <div className="h-40 animate-pulse bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (balance.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Scale size={18} className="text-brand-green" />
          <h3 className="text-base font-bold text-dark">توازن السوق</h3>
        </div>
        <p className="text-sm text-gray-400 text-center py-6">
          لا توجد بيانات بعد — سيتم حساب التوازن تلقائياً بعد أول حصادة
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scale size={18} className="text-brand-green" />
          <h3 className="text-base font-bold text-dark">توازن السوق</h3>
        </div>
        <span className="text-[10px] text-gray-400">
          آخر تحديث:{" "}
          {balance[0]?.updated_at
            ? new Date(balance[0].updated_at).toLocaleString("ar-EG", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "short",
              })
            : "—"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b">
              <th className="text-right py-2 font-medium">الفئة</th>
              <th className="text-center py-2 font-medium">عرض</th>
              <th className="text-center py-2 font-medium">طلب</th>
              <th className="text-center py-2 font-medium">النسبة</th>
              <th className="text-center py-2 font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {balance.map((entry) => {
              const cfg = STATUS_CONFIG[entry.balance_status] || STATUS_CONFIG.no_data;
              return (
                <tr key={entry.category} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2.5">
                    <span className="font-medium text-dark">
                      {CATEGORY_ICONS[entry.category] || "📦"}{" "}
                      {CATEGORY_AR[entry.category] || entry.category}
                    </span>
                  </td>
                  <td className="text-center text-gray-600">
                    {(entry.active_listings || 0).toLocaleString()}
                  </td>
                  <td className="text-center text-gray-600">
                    {(entry.active_buyers || 0).toLocaleString()}
                  </td>
                  <td className="text-center font-mono text-xs">
                    {entry.supply_demand_ratio != null
                      ? `${entry.supply_demand_ratio.toFixed(1)}:1`
                      : "—"}
                  </td>
                  <td className="text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action link for categories needing buyers */}
      {balance.some((b) => b.balance_status === "critical_buyers" || b.balance_status === "needs_buyers") && (
        <div className="mt-3 pt-3 border-t">
          <Link
            href="/admin/sales/buyer-harvest/paste"
            className="text-xs text-brand-green hover:text-brand-green-dark font-medium flex items-center gap-1"
          >
            💡 الفئات اللي محتاجة مشترين — اضغط لفتح Paste&Parse
          </Link>
        </div>
      )}
    </div>
  );
}
