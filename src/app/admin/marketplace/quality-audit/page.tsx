"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface FieldStat { count: number; percent: number }

interface AuditResponse {
  total_rows: number;
  non_duplicate_rows: number;
  target_progress: { current: number; target: number; percent: number; remaining: number };
  completeness: Record<string, FieldStat>;
  by_platform: Record<string, { total: number; with_phone: number; with_name: number; alex: number }>;
  category_specific: {
    properties: { total: number; property_type: number; bedrooms: number; bathrooms: number; area_sqm: number; floor: number } | null;
    cars_count: number;
  };
  issues: Record<string, number>;
  sellers: { unique_linked: number; unique_phones: number };
  generated_at: string;
}

const FIELD_LABELS: Record<string, string> = {
  title: "العنوان",
  price: "السعر",
  description: "الوصف",
  seller_phone: "هاتف البائع (صيغة 01X)",
  seller_name: "اسم البائع (صالح)",
  seller_linked: "مربوط بـ ahe_seller",
  governorate_alex: "المحافظة = الإسكندرية",
  city_or_area: "مدينة/منطقة",
  source_url: "رابط المصدر",
  source_platform: "المنصة المصدر",
  specs_populated: "مواصفات (specs)",
  category: "القسم",
};

const ISSUE_LABELS: Record<string, string> = {
  duplicates: "مكرر (is_duplicate=true)",
  missing_phone: "بدون هاتف",
  missing_name: "بدون اسم بائع",
  malformed_phone: "هاتف بصيغة غلط",
  not_alexandria: "خارج إسكندرية",
  empty_specs: "specs فارغة",
  no_price: "بدون سعر",
  short_title: "عنوان قصير (<15 حرف)",
};

function Bar({ percent, color = "#1B7A3D" }: { percent: number; color?: string }) {
  return (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, percent)}%`, background: color }}
      />
    </div>
  );
}

function colorForPct(p: number): string {
  if (p >= 90) return "#059669"; // green
  if (p >= 70) return "#16A34A";
  if (p >= 50) return "#F59E0B"; // amber
  if (p >= 30) return "#F97316"; // orange
  return "#DC2626"; // red
}

export default function QualityAuditPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = platform ? `?platform=${encodeURIComponent(platform)}` : "";
      const r = await fetch(`/api/admin/marketplace/quality-audit${qs}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setData(j);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [platform]);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-[#1B7A3D] text-white py-4 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">مكسب 💚</Link>
          <Link href="/admin/marketplace" className="text-xs opacity-90">← لوحة السوق</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-2">📊 تدقيق جودة البيانات</h1>
        <p className="text-sm text-gray-600 mb-4">
          نسبة اكتمال الحقول الحرجة عبر الـ ahe_listings. الهدف: 10,000 إعلان في إسكندرية.
        </p>

        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">كل المنصات</option>
            <option value="dubizzle_bookmarklet">دوبيزل</option>
            <option value="semsarmasr">سمسار مصر</option>
            <option value="aqarmap">أقارماب</option>
            <option value="opensooq">أوبن سوق</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 bg-[#1B7A3D] text-white rounded-lg font-bold text-sm hover:bg-[#145C2E] disabled:opacity-50"
          >
            {loading ? "⏳" : "🔄 تحديث"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-900 mb-4">
            <pre className="text-xs whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {loading && <div className="text-center text-gray-500 py-12">جاري التحميل...</div>}

        {!loading && data && (
          <>
            {/* Target progress */}
            <div className="bg-gradient-to-l from-[#1B7A3D] to-[#145C2E] text-white rounded-2xl p-5 mb-4">
              <div className="text-sm opacity-80 mb-1">الهدف — 10,000 إعلان في إسكندرية</div>
              <div className="text-3xl font-bold mb-2">
                {data.target_progress.current.toLocaleString()}
                <span className="text-sm opacity-70"> / {data.target_progress.target.toLocaleString()}</span>
              </div>
              <div className="text-xs opacity-90 mb-2">{data.target_progress.percent}% — باقي {data.target_progress.remaining.toLocaleString()}</div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-[#D4A843]" style={{ width: `${Math.min(100, data.target_progress.percent)}%` }} />
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="text-gray-500">إجمالي rows</div>
                <div className="text-2xl font-bold text-gray-900">{data.total_rows.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="text-gray-500">بعد فلترة المكرر</div>
                <div className="text-2xl font-bold text-gray-900">{data.non_duplicate_rows.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="text-gray-500">بائعين فريدين (مربوطين)</div>
                <div className="text-2xl font-bold text-blue-700">{data.sellers.unique_linked.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="text-gray-500">هواتف فريدة</div>
                <div className="text-2xl font-bold text-blue-700">{data.sellers.unique_phones.toLocaleString()}</div>
              </div>
            </div>

            {/* Completeness */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
              <h2 className="text-sm font-bold text-gray-800 mb-4">📋 اكتمال الحقول الحرجة</h2>
              <div className="space-y-3">
                {Object.entries(data.completeness).map(([field, stat]) => (
                  <div key={field}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700">{FIELD_LABELS[field] || field}</span>
                      <span className="font-mono">
                        <b>{stat.percent}%</b>
                        <span className="text-gray-500"> ({stat.count.toLocaleString()})</span>
                      </span>
                    </div>
                    <Bar percent={stat.percent} color={colorForPct(stat.percent)} />
                  </div>
                ))}
              </div>
            </div>

            {/* By platform */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
              <h2 className="text-sm font-bold text-gray-800 mb-3">🏷️ توزيع على المنصات</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-right text-gray-500">
                      <th className="py-2">المنصة</th>
                      <th className="py-2">إعلانات</th>
                      <th className="py-2">مع هاتف</th>
                      <th className="py-2">مع اسم</th>
                      <th className="py-2">إسكندرية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.by_platform)
                      .sort(([, a], [, b]) => b.total - a.total)
                      .map(([p, stats]) => (
                        <tr key={p} className="border-b border-gray-100 last:border-0">
                          <td className="py-2 font-mono">{p}</td>
                          <td className="py-2 font-bold">{stats.total}</td>
                          <td className="py-2">
                            {stats.with_phone} <span className="text-gray-500">({Math.round((stats.with_phone / Math.max(1, stats.total)) * 100)}%)</span>
                          </td>
                          <td className="py-2">
                            {stats.with_name} <span className="text-gray-500">({Math.round((stats.with_name / Math.max(1, stats.total)) * 100)}%)</span>
                          </td>
                          <td className="py-2">
                            {stats.alex} <span className="text-gray-500">({Math.round((stats.alex / Math.max(1, stats.total)) * 100)}%)</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category specific */}
            {data.category_specific.properties && (() => {
              const props = data.category_specific.properties;
              return (
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                  <h2 className="text-sm font-bold text-gray-800 mb-3">
                    🏠 حقول العقارات <span className="text-gray-500">({props.total} إعلان)</span>
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                    {(["property_type", "bedrooms", "bathrooms", "area_sqm", "floor"] as const).map((f) => (
                      <div key={f} className="bg-gray-50 rounded-lg p-2">
                        <div className="text-gray-500 text-[10px]">{f}</div>
                        <div className="text-lg font-bold" style={{ color: colorForPct(props[f]) }}>
                          {props[f]}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Issues */}
            <div className="bg-white rounded-xl border border-red-200 p-5 mb-4">
              <h2 className="text-sm font-bold text-red-800 mb-3">⚠️ الثغرات — Priority Fixes</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {Object.entries(data.issues)
                  .sort(([, a], [, b]) => b - a)
                  .map(([k, v]) => (
                    <div key={k} className="bg-red-50 rounded-lg p-2">
                      <div className="text-red-600 text-[10px]">{ISSUE_LABELS[k] || k}</div>
                      <div className="text-lg font-bold text-red-700">{v.toLocaleString()}</div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="text-[10px] text-gray-400 text-left font-mono">
              Generated: {new Date(data.generated_at).toLocaleString("ar-EG")}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
