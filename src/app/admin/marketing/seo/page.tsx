"use client";

import {
  Search,
  TrendingUp,
  Eye,
  MousePointerClick,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";

/* ── Mock Data ────────────────────────────────────────────────── */

interface SeoPage {
  url: string;
  title: string;
  impressions: number;
  clicks: number;
  position: number;
  trend: "up" | "down" | "stable";
}

const seoPages: SeoPage[] = [
  {
    url: "/",
    title: "مكسب — سوق مصر لبيع وشراء كل حاجة",
    impressions: 12500,
    clicks: 850,
    position: 3.2,
    trend: "up",
  },
  {
    url: "/search?category=cars",
    title: "سيارات مستعملة للبيع في مصر — مكسب",
    impressions: 8200,
    clicks: 620,
    position: 5.1,
    trend: "up",
  },
  {
    url: "/search?category=phones",
    title: "موبايلات مستعملة وجديدة — مكسب",
    impressions: 6800,
    clicks: 410,
    position: 4.7,
    trend: "stable",
  },
  {
    url: "/search?category=real_estate",
    title: "شقق للبيع والإيجار في مصر — مكسب",
    impressions: 5400,
    clicks: 320,
    position: 7.3,
    trend: "down",
  },
  {
    url: "/search?category=gold",
    title: "ذهب وفضة للبيع — أسعار اليوم — مكسب",
    impressions: 3100,
    clicks: 180,
    position: 8.9,
    trend: "up",
  },
];

function formatNum(n: number): string {
  return n.toLocaleString("en-US");
}

function ctr(clicks: number, impressions: number): string {
  if (impressions === 0) return "0%";
  return ((clicks / impressions) * 100).toFixed(1) + "%";
}

/* ── Component ────────────────────────────────────────────────── */

export default function SeoPage() {
  const totalImpressions = seoPages.reduce((s, p) => s + p.impressions, 0);
  const totalClicks = seoPages.reduce((s, p) => s + p.clicks, 0);
  const avgPosition = seoPages.reduce((s, p) => s + p.position, 0) / seoPages.length;

  const trendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <ArrowUp size={14} className="text-green-600" />;
      case "down":
        return <ArrowDown size={14} className="text-red-500" />;
      default:
        return <Minus size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
          <Search size={24} className="text-[#1B7A3D]" />
          أداء SEO
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          أداء صفحات الموقع في محركات البحث — آخر 28 يوم
        </p>
      </div>

      {/* ── Summary KPIs ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
            <Eye size={20} className="text-blue-600" />
          </div>
          <p className="text-xs text-gray-text mb-1">إجمالي الظهور</p>
          <p className="text-2xl font-bold text-dark">{formatNum(totalImpressions)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <MousePointerClick size={20} className="text-green-600" />
          </div>
          <p className="text-xs text-gray-text mb-1">إجمالي النقرات</p>
          <p className="text-2xl font-bold text-dark">{formatNum(totalClicks)}</p>
          <p className="text-[11px] text-gray-text mt-1">
            CTR: <span className="font-bold text-[#1B7A3D]">{ctr(totalClicks, totalImpressions)}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp size={20} className="text-purple-600" />
          </div>
          <p className="text-xs text-gray-text mb-1">متوسط الترتيب</p>
          <p className="text-2xl font-bold text-dark">{avgPosition.toFixed(1)}</p>
        </div>
      </div>

      {/* ── Pages Performance Table ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-dark">📄 أداء الصفحات</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            أهم 5 صفحات من حيث الظهور
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-right px-4 py-3 font-medium">الصفحة</th>
                <th className="text-center px-4 py-3 font-medium">الظهور</th>
                <th className="text-center px-4 py-3 font-medium">النقرات</th>
                <th className="text-center px-4 py-3 font-medium">CTR</th>
                <th className="text-center px-4 py-3 font-medium">الترتيب</th>
                <th className="text-center px-4 py-3 font-medium">الاتجاه</th>
              </tr>
            </thead>
            <tbody>
              {seoPages.map((page) => (
                <tr
                  key={page.url}
                  className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  {/* URL & Title */}
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-dark truncate max-w-xs">
                      {page.title}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5" dir="ltr">
                      {page.url}
                    </p>
                  </td>

                  {/* Impressions */}
                  <td className="px-4 py-3 text-center font-medium text-dark">
                    {formatNum(page.impressions)}
                  </td>

                  {/* Clicks */}
                  <td className="px-4 py-3 text-center font-medium text-[#1B7A3D]">
                    {formatNum(page.clicks)}
                  </td>

                  {/* CTR */}
                  <td className="px-4 py-3 text-center text-gray-600">
                    {ctr(page.clicks, page.impressions)}
                  </td>

                  {/* Position */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-gray-100 px-2 py-0.5 rounded-full text-xs font-bold text-dark">
                      {page.position.toFixed(1)}
                    </span>
                  </td>

                  {/* Trend */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center">
                      {trendIcon(page.trend)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center">
          البيانات من Google Search Console — آخر 28 يوم
        </div>
      </div>
    </div>
  );
}
