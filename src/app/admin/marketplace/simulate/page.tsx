"use client";

import { useState } from "react";
import Link from "next/link";

interface SimulatedListing {
  title: string;
  description: string | null;
  price: number | null;
  url: string;
  location: string | null;
  governorate: string | null;
  city: string | null;
  seller_name: string | null;
  seller_phone: string | null;
  thumbnail: string | null;
  date_text: string | null;
  is_featured: boolean;
}

interface ScopeSimulation {
  scope_code: string;
  platform: string;
  category: string;
  base_url: string;
  status: "success" | "blocked" | "error" | "empty" | "no_parser";
  error_message: string | null;
  http_status: number | null;
  fetch_duration_ms: number;
  parse_duration_ms: number;
  raw_html_size: number;
  listings_found: number;
  listings_in_governorate: number;
  listings_with_phone: number;
  listings_with_name: number;
  listings_with_price: number;
  listings_with_image: number;
  sample_listings: SimulatedListing[];
}

interface SimulationResult {
  governorate: string;
  timestamp: string;
  total_scopes: number;
  working_scopes: number;
  blocked_scopes: number;
  error_scopes: number;
  empty_scopes: number;
  total_listings: number;
  total_in_governorate: number;
  total_with_phone: number;
  total_duration_ms: number;
  scopes: ScopeSimulation[];
}

const GOVERNORATES = [
  { value: "القاهرة", label: "القاهرة" },
  { value: "الجيزة", label: "الجيزة" },
  { value: "الإسكندرية", label: "الإسكندرية" },
  { value: "القليوبية", label: "القليوبية" },
  { value: "الشرقية", label: "الشرقية" },
  { value: "الدقهلية", label: "الدقهلية" },
  { value: "البحيرة", label: "البحيرة" },
  { value: "الغربية", label: "الغربية" },
  { value: "المنوفية", label: "المنوفية" },
  { value: "كفر الشيخ", label: "كفر الشيخ" },
  { value: "دمياط", label: "دمياط" },
  { value: "بورسعيد", label: "بورسعيد" },
  { value: "الإسماعيلية", label: "الإسماعيلية" },
  { value: "السويس", label: "السويس" },
  { value: "شمال سيناء", label: "شمال سيناء" },
  { value: "جنوب سيناء", label: "جنوب سيناء" },
  { value: "الفيوم", label: "الفيوم" },
  { value: "بني سويف", label: "بني سويف" },
  { value: "المنيا", label: "المنيا" },
  { value: "أسيوط", label: "أسيوط" },
  { value: "سوهاج", label: "سوهاج" },
  { value: "قنا", label: "قنا" },
  { value: "الأقصر", label: "الأقصر" },
  { value: "أسوان", label: "أسوان" },
  { value: "البحر الأحمر", label: "البحر الأحمر" },
  { value: "الوادي الجديد", label: "الوادي الجديد" },
  { value: "مطروح", label: "مطروح" },
];

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  success: { label: "يعمل ✅", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  blocked: { label: "محظور 🚫", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  error: { label: "خطأ ❌", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  empty: { label: "فارغ ⚠️", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  no_parser: { label: "بدون Parser 🔧", color: "text-gray-700", bg: "bg-gray-50 border-gray-200" },
};

export default function SimulatePage() {
  const [governorate, setGovernorate] = useState("الإسكندرية");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedScope, setExpandedScope] = useState<string | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    setResult(null);
    setExpandedScope(null);
    try {
      const res = await fetch(`/api/admin/marketplace/simulate?governorate=${encodeURIComponent(governorate)}`);
      const data = await res.json();
      setResult(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🧪 محاكاة السوق</h1>
          <p className="text-sm text-gray-500 mt-1">
            اختبار كل المصادر والنطاقات بدون حفظ — شوف إيه شغال وإيه لأ
          </p>
        </div>
        <Link
          href="/admin/marketplace"
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
        >
          ← بناء السوق
        </Link>
      </div>

      {/* Controls */}
      <div className="bg-white border-2 border-purple-200 rounded-2xl p-6 flex items-center gap-4">
        <select
          value={governorate}
          onChange={(e) => setGovernorate(e.target.value)}
          className="px-4 py-3 bg-purple-50 border-2 border-purple-300 rounded-xl text-lg font-bold text-purple-800"
        >
          {GOVERNORATES.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
        <button
          onClick={runSimulation}
          disabled={loading}
          className={`px-8 py-3 rounded-xl font-bold text-white text-lg transition-all ${
            loading ? "bg-purple-400 animate-pulse cursor-wait" : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          {loading ? "⏳ جاري المحاكاة..." : "🧪 ابدأ المحاكاة"}
        </button>
        {result && (
          <span className="text-sm text-gray-500">
            استغرق {(result.total_duration_ms / 1000).toFixed(1)} ثانية
          </span>
        )}
      </div>

      {/* Summary Cards */}
      {result && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard label="النطاقات" value={result.total_scopes} color="gray" />
          <SummaryCard label="يعمل ✅" value={result.working_scopes} color="green" />
          <SummaryCard label="محظور 🚫" value={result.blocked_scopes} color="red" />
          <SummaryCard label="إعلانات" value={result.total_listings} sub={`${result.total_in_governorate} في ${governorate}`} color="blue" />
          <SummaryCard label="بأرقام 📞" value={result.total_with_phone} color="purple" />
        </div>
      )}

      {/* Scope Results */}
      {result && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">📋 نتائج النطاقات</h2>

          {result.scopes.map((scope) => {
            const st = STATUS_MAP[scope.status] || STATUS_MAP.error;
            const isExpanded = expandedScope === scope.scope_code;

            return (
              <div key={scope.scope_code} className={`border-2 rounded-2xl overflow-hidden ${st.bg}`}>
                {/* Header */}
                <button
                  onClick={() => setExpandedScope(isExpanded ? null : scope.scope_code)}
                  className="w-full p-4 flex items-center gap-4 text-right"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${st.color}`}>{st.label}</span>
                      <span className="font-bold text-gray-800">{scope.scope_code}</span>
                      <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{scope.platform}</span>
                      <span className="text-xs text-gray-500">{scope.category}</span>
                    </div>
                    {scope.error_message && (
                      <p className="text-xs text-red-600 mt-1">{scope.error_message}</p>
                    )}
                  </div>

                  <div className="flex gap-4 text-sm">
                    {scope.status === "success" && (
                      <>
                        <Stat label="إعلانات" value={scope.listings_found} />
                        <Stat label="بالمحافظة" value={scope.listings_in_governorate} />
                        <Stat label="بأرقام" value={scope.listings_with_phone} />
                        <Stat label="بأسماء" value={scope.listings_with_name} />
                        <Stat label="fetch" value={`${scope.fetch_duration_ms}ms`} />
                      </>
                    )}
                  </div>

                  <span className="text-gray-400 text-xl">{isExpanded ? "▲" : "▼"}</span>
                </button>

                {/* Expanded: Sample Listings */}
                {isExpanded && scope.sample_listings.length > 0 && (
                  <div className="border-t bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-gray-700">
                        عينة {scope.sample_listings.length} إعلان
                      </h4>
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>HTML: {(scope.raw_html_size / 1024).toFixed(0)}KB</span>
                        <span>Parse: {scope.parse_duration_ms}ms</span>
                        <span>صور: {scope.listings_with_image}/{scope.listings_found}</span>
                        <span>أسعار: {scope.listings_with_price}/{scope.listings_found}</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-gray-500 text-xs">
                            <th className="pb-2 text-right">#</th>
                            <th className="pb-2 text-right">صورة</th>
                            <th className="pb-2 text-right">العنوان</th>
                            <th className="pb-2 text-right">السعر</th>
                            <th className="pb-2 text-right">الموقع</th>
                            <th className="pb-2 text-right">المعلن</th>
                            <th className="pb-2 text-right">الموبايل</th>
                            <th className="pb-2 text-right">التاريخ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scope.sample_listings.map((listing, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 text-gray-400">{i + 1}</td>
                              <td className="py-2">
                                {listing.thumbnail ? (
                                  <img
                                    src={listing.thumbnail}
                                    alt=""
                                    className="w-12 h-12 object-cover rounded"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                ) : (
                                  <span className="text-gray-300 text-xs">—</span>
                                )}
                              </td>
                              <td className="py-2">
                                <a
                                  href={listing.url}
                                  target="_blank"
                                  rel="noopener"
                                  className="text-blue-600 hover:underline font-medium line-clamp-2"
                                  title={listing.description || listing.title}
                                >
                                  {listing.title.length > 60
                                    ? listing.title.slice(0, 60) + "..."
                                    : listing.title}
                                </a>
                                {listing.is_featured && (
                                  <span className="text-yellow-600 text-xs mr-1">⭐</span>
                                )}
                              </td>
                              <td className="py-2 font-bold text-green-700 whitespace-nowrap">
                                {listing.price
                                  ? `${listing.price.toLocaleString("ar-EG")} جنيه`
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="py-2 text-xs text-gray-600">
                                {listing.location || <span className="text-gray-300">—</span>}
                                {listing.governorate && (
                                  <span className={`block text-xs ${
                                    listing.governorate === "alexandria" ? "text-green-600 font-bold" : "text-orange-500"
                                  }`}>
                                    {listing.governorate}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 text-xs">
                                {listing.seller_name || <span className="text-gray-300">—</span>}
                              </td>
                              <td className="py-2">
                                {listing.seller_phone ? (
                                  <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-mono">
                                    {listing.seller_phone}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 text-xs">—</span>
                                )}
                              </td>
                              <td className="py-2 text-xs text-gray-500 whitespace-nowrap">
                                {listing.date_text || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {isExpanded && scope.sample_listings.length === 0 && scope.status !== "success" && (
                  <div className="border-t bg-white p-6 text-center text-gray-500">
                    <p className="text-lg mb-1">لا توجد بيانات للعرض</p>
                    <p className="text-sm">{scope.error_message}</p>
                    {scope.base_url && (
                      <a href={scope.base_url} target="_blank" rel="noopener" className="text-blue-500 text-xs mt-2 block hover:underline">
                        افتح الرابط يدوياً ←
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3 animate-bounce">🧪</div>
          <p className="text-lg font-bold text-purple-700">جاري محاكاة كل النطاقات...</p>
          <p className="text-sm text-purple-500 mt-1">بيجلب صفحة واحدة من كل منصة ويحللها بدون حفظ</p>
          <p className="text-xs text-gray-400 mt-3">قد يستغرق حتى 60 ثانية</p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, color }: {
  label: string; value: number | string; sub?: string; color: string;
}) {
  const bgMap: Record<string, string> = {
    gray: "bg-gray-50 border-gray-200",
    green: "bg-green-50 border-green-200",
    red: "bg-red-50 border-red-200",
    blue: "bg-blue-50 border-blue-200",
    purple: "bg-purple-50 border-purple-200",
  };

  return (
    <div className={`rounded-xl border p-4 text-center ${bgMap[color] || bgMap.gray}`}>
      <div className="text-2xl font-bold text-gray-800">{typeof value === "number" ? value.toLocaleString("ar-EG") : value}</div>
      <div className="text-xs text-gray-600 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <div className="font-bold text-gray-800">{typeof value === "number" ? value.toLocaleString("ar-EG") : value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
