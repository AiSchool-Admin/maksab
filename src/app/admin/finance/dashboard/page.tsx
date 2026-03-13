"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Users,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
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

/* ── Mock Data ────────────────────────────────────────────────── */

const monthlyTrend = [
  { month: "أكتوبر", revenue: 4200, expenses: 3800 },
  { month: "نوفمبر", revenue: 5100, expenses: 4200 },
  { month: "ديسمبر", revenue: 6300, expenses: 4800 },
  { month: "يناير", revenue: 7100, expenses: 5000 },
  { month: "فبراير", revenue: 7400, expenses: 5100 },
  { month: "مارس", revenue: 8500, expenses: 5200 },
];

const revenueSources = [
  { label: "باقات تجار", icon: "🏪", amount: 5000, pct: 59, color: "bg-brand-green" },
  { label: "إعلانات مميزة", icon: "⭐", amount: 2000, pct: 24, color: "bg-brand-gold" },
  { label: "Boost", icon: "🔼", amount: 1000, pct: 12, color: "bg-blue-500" },
  { label: "عمولات طوعية", icon: "💰", amount: 500, pct: 6, color: "bg-purple-500" },
];

const subscriptionTiers = [
  { name: "Free", count: 1200, color: "bg-gray-400", textColor: "text-gray-600" },
  { name: "Silver", count: 15, color: "bg-gray-300", textColor: "text-gray-700", price: 99 },
  { name: "Gold", count: 5, color: "bg-brand-gold", textColor: "text-amber-700", price: 199 },
  { name: "Diamond", count: 1, color: "bg-blue-400", textColor: "text-blue-700", price: 499 },
];

function formatPrice(n: number): string {
  return n.toLocaleString("en-US");
}

/* ── Component ────────────────────────────────────────────────── */

export default function FinanceDashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<"month" | "quarter" | "year">("month");

  const revenue = 8500;
  const expenses = 5200;
  const net = revenue - expenses;
  const growthPct = 15;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        {(["month", "quarter", "year"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setSelectedPeriod(p)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === p
                ? "bg-brand-green text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {p === "month" ? "الشهر" : p === "quarter" ? "الربع" : "السنة"}
          </button>
        ))}
      </div>

      {/* ── Month Summary Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Revenue */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign size={20} className="text-brand-green" />
            </div>
            <div className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">
              <TrendingUp size={14} />
              <span>{growthPct}%+</span>
            </div>
          </div>
          <p className="text-xs text-gray-text mb-1">إيرادات مارس</p>
          <p className="text-2xl font-bold text-dark">{formatPrice(revenue)} <span className="text-sm font-normal text-gray-text">ج.م</span></p>
          <p className="text-[11px] text-gray-text mt-1">↑ {growthPct}% عن فبراير</p>
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <TrendingDown size={20} className="text-red-500" />
            </div>
          </div>
          <p className="text-xs text-gray-text mb-1">مصروفات مارس</p>
          <p className="text-2xl font-bold text-dark">{formatPrice(expenses)} <span className="text-sm font-normal text-gray-text">ج.م</span></p>
        </div>

        {/* Net */}
        <div className="bg-white rounded-2xl border border-green-200 p-5 bg-gradient-to-bl from-green-50 to-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center">
              <ArrowUpRight size={20} className="text-white" />
            </div>
            <span className="text-green-600 text-xs font-bold">✅</span>
          </div>
          <p className="text-xs text-gray-text mb-1">صافي الربح</p>
          <p className="text-2xl font-bold text-brand-green">{formatPrice(net)} <span className="text-sm font-normal text-gray-text">ج.م</span></p>
        </div>
      </div>

      {/* ── Revenue Sources ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-dark mb-4">📊 مصادر الإيرادات</h3>
        <div className="space-y-4">
          {revenueSources.map((src) => (
            <div key={src.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-dark font-medium">
                  {src.icon} {src.label}
                </span>
                <span className="text-sm font-bold text-dark">
                  {formatPrice(src.amount)} ج.م <span className="text-gray-text font-normal">({src.pct}%)</span>
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${src.color} transition-all duration-700`}
                  style={{ width: `${src.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Active Subscriptions Summary ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-dark mb-4">💳 ملخص الاشتراكات النشطة</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {subscriptionTiers.map((tier) => (
            <div key={tier.name} className="bg-gray-50 rounded-xl p-3 text-center">
              <div className={`w-8 h-8 ${tier.color} rounded-lg mx-auto mb-2 flex items-center justify-center`}>
                <CreditCard size={16} className="text-white" />
              </div>
              <p className={`text-xs font-bold ${tier.textColor}`}>{tier.name}</p>
              <p className="text-lg font-bold text-dark">{formatPrice(tier.count)}</p>
              <p className="text-[10px] text-gray-text">تاجر</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-text mb-1">MRR</p>
            <p className="text-lg font-bold text-brand-green">6,500 ج.م</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-text mb-1">معدل التجديد</p>
            <p className="text-lg font-bold text-blue-600">85%</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-text mb-1">إجمالي المشتركين</p>
            <p className="text-lg font-bold text-amber-600">
              <Users size={16} className="inline ml-1" />
              21
            </p>
          </div>
        </div>
      </div>

      {/* ── Monthly Trend Chart ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-dark">📈 الإيرادات vs المصروفات — آخر 6 شهور</h3>
          <button className="p-1.5 text-gray-text hover:text-dark rounded-lg hover:bg-gray-100 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTrend} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B7A3D" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1B7A3D" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [
                  `${formatPrice(Number(value ?? 0))} ج.م`,
                  name === "revenue" ? "إيرادات" : "مصروفات",
                ]}
                labelStyle={{ fontWeight: "bold" }}
              />
              <Legend
                formatter={(value: string) => (value === "revenue" ? "إيرادات" : "مصروفات")}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#1B7A3D"
                strokeWidth={2}
                fill="url(#revGrad)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#DC2626"
                strokeWidth={2}
                fill="url(#expGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
