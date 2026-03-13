"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  Plus,
  Eye,
  MousePointerClick,
  UserPlus,
  DollarSign,
  Calendar,
  FileText,
  Sparkles,
} from "lucide-react";

interface ChannelRow {
  icon: string;
  name: string;
  reach: number | null;
  clicks: number | null;
  signups: number;
  costPerSignup: number | null;
}

const channelData: ChannelRow[] = [
  { icon: "📱", name: "واتساب آلي", reach: 1500, clicks: null, signups: 75, costPerSignup: 0 },
  { icon: "📘", name: "Facebook Ads", reach: 50000, clicks: 2000, signups: 100, costPerSignup: 50 },
  { icon: "📸", name: "Instagram", reach: 20000, clicks: 800, signups: 30, costPerSignup: null },
  { icon: "🔗", name: "Facebook Groups", reach: 30000, clicks: 1500, signups: 60, costPerSignup: 0 },
  { icon: "🔍", name: "Google / SEO", reach: 5000, clicks: 500, signups: 25, costPerSignup: 0 },
  { icon: "👥", name: "Referral", reach: null, clicks: null, signups: 40, costPerSignup: 0 },
];

interface ContentItem {
  id: string;
  title: string;
  platform: string;
  platformIcon: string;
  scheduledDate: string;
  status: "published" | "scheduled" | "draft";
}

const scheduledContent: ContentItem[] = [
  {
    id: "1",
    title: "بيع موبايلك القديم في ثواني على مكسب",
    platform: "Facebook",
    platformIcon: "📘",
    scheduledDate: "اليوم 2:00 م",
    status: "published",
  },
  {
    id: "2",
    title: "قصة نجاح: محمد باع عربيته في يومين",
    platform: "Instagram",
    platformIcon: "📸",
    scheduledDate: "بكرة 10:00 ص",
    status: "scheduled",
  },
  {
    id: "3",
    title: "5 نصايح لتصوير إعلان يبيع بسرعة",
    platform: "Facebook",
    platformIcon: "📘",
    scheduledDate: "بعد بكرة 4:00 م",
    status: "scheduled",
  },
  {
    id: "4",
    title: "عروض الذهب اليوم على مكسب",
    platform: "Instagram",
    platformIcon: "📸",
    scheduledDate: "—",
    status: "draft",
  },
  {
    id: "5",
    title: "مقال SEO: أفضل أماكن بيع السيارات المستعملة",
    platform: "Blog",
    platformIcon: "🔍",
    scheduledDate: "15 مارس",
    status: "draft",
  },
];

function formatNum(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("en-US");
}

function formatCost(n: number | null): string {
  if (n === null) return "—";
  if (n === 0) return "0 ج.م";
  return n.toLocaleString("en-US") + " ج.م";
}

const statusConfig: Record<string, { label: string; icon: string; color: string }> = {
  published: { label: "نُشر", icon: "✅", color: "bg-green-50 text-green-700" },
  scheduled: { label: "مجدول", icon: "⏳", color: "bg-yellow-50 text-yellow-700" },
  draft: { label: "مسودة", icon: "📝", color: "bg-gray-100 text-gray-600" },
};

export default function MarketingDashboardPage() {
  const [period] = useState("7d");

  const totalReach = channelData.reduce((s, c) => s + (c.reach || 0), 0);
  const totalClicks = channelData.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalSignups = channelData.reduce((s, c) => s + c.signups, 0);
  const totalCost = channelData.reduce((s, c) => {
    if (c.costPerSignup && c.costPerSignup > 0) return s + c.costPerSignup * c.signups;
    return s;
  }, 0);
  const avgCostPerSignup = totalSignups > 0 ? Math.round(totalCost / totalSignups) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
            <Megaphone size={24} className="text-[#1B7A3D]" />
            لوحة التسويق
          </h2>
          <p className="text-xs text-gray-500 mt-1">أداء القنوات التسويقية — آخر 7 أيام</p>
        </div>
        <Link
          href="/admin/marketing/content/new"
          className="flex items-center gap-2 bg-[#1B7A3D] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#145C2E] transition-colors"
        >
          <Sparkles size={16} />
          إنشاء محتوى بـ AI
        </Link>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
            <Eye size={20} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-dark">{formatNum(totalReach)}</p>
          <p className="text-xs text-gray-500">إجمالي الوصول</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
            <MousePointerClick size={20} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-dark">{formatNum(totalClicks)}</p>
          <p className="text-xs text-gray-500">إجمالي النقرات</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <UserPlus size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-dark">{formatNum(totalSignups)}</p>
          <p className="text-xs text-gray-500">تسجيلات جديدة</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-3">
            <DollarSign size={20} className="text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-dark">{avgCostPerSignup} ج.م</p>
          <p className="text-xs text-gray-500">متوسط تكلفة / تسجيل</p>
        </div>
      </div>

      {/* Channel Performance Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-dark">أداء القنوات التسويقية</h3>
          <p className="text-xs text-gray-500 mt-0.5">آخر 7 أيام — {period === "7d" ? "13 مارس - 7 مارس 2026" : ""}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-right px-4 py-3 font-medium">القناة</th>
                <th className="text-center px-4 py-3 font-medium">وصول</th>
                <th className="text-center px-4 py-3 font-medium">نقرات</th>
                <th className="text-center px-4 py-3 font-medium">تسجيلات</th>
                <th className="text-center px-4 py-3 font-medium">تكلفة / تسجيل</th>
              </tr>
            </thead>
            <tbody>
              {channelData.map((ch, i) => (
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-dark">
                    <span className="ml-2">{ch.icon}</span>
                    {ch.name}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{formatNum(ch.reach)}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{formatNum(ch.clicks)}</td>
                  <td className="px-4 py-3 text-center font-bold text-[#1B7A3D]">{ch.signups}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{formatCost(ch.costPerSignup)}</td>
                </tr>
              ))}
              {/* Total row */}
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                <td className="px-4 py-3 text-dark">الإجمالي</td>
                <td className="px-4 py-3 text-center text-dark">{formatNum(totalReach)}</td>
                <td className="px-4 py-3 text-center text-dark">{formatNum(totalClicks)}</td>
                <td className="px-4 py-3 text-center text-[#1B7A3D]">{totalSignups}</td>
                <td className="px-4 py-3 text-center text-dark">{avgCostPerSignup} ج.م</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Scheduled Content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-dark flex items-center gap-2">
              <Calendar size={18} className="text-gray-400" />
              المحتوى المجدول
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{scheduledContent.length} عنصر محتوى</p>
          </div>
          <Link
            href="/admin/marketing/content/new"
            className="flex items-center gap-1.5 text-[#1B7A3D] text-xs font-medium hover:text-[#145C2E] transition-colors"
          >
            <Plus size={14} />
            إنشاء محتوى جديد بـ AI
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {scheduledContent.map((item) => {
            const st = statusConfig[item.status];
            return (
              <div key={item.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                <span className="text-lg flex-shrink-0">{item.platformIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                    <Calendar size={12} />
                    {item.scheduledDate}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.color}`}>
                  {st.icon} {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
