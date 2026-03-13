"use client";

import { useState, useEffect } from "react";
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
