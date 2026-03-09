"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAdminHeaders } from "@/app/admin/layout";

interface TestListingResult {
  url: string;
  title: string;
  price: number | null;
  location: string;
  mappedLocation: { governorate: string | null; city: string | null; area: string | null };
  dateText: string;
  estimatedDate: string | null;
  sellerName: string | null;
  isVerified: boolean;
  isBusiness: boolean;
  isFeatured: boolean;
  supportsExchange: boolean;
  isNegotiable: boolean;
  thumbnailUrl: string | null;
  description: string | null;
  extractedPhone: string | null;
  specifications: Record<string, string>;
  imageCount: number;
  isDuplicate: boolean;
}

interface TestResult {
  scope: {
    code: string;
    name: string;
    base_url: string;
    governorate: string;
    maksab_category: string;
  };
  pages_fetched: number;
  total_listings: number;
  new_listings: number;
  duplicate_listings: number;
  phones_extracted: number;
  sample_listings: TestListingResult[];
  errors: string[];
  duration_seconds: number;
  fetch_details_enabled: boolean;
}

interface ScopeOption {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  base_url: string;
}

export default function HarvesterTestPage() {
  const [scopes, setScopes] = useState<ScopeOption[]>([]);
  const [selectedScope, setSelectedScope] = useState("");
  const [maxPages, setMaxPages] = useState(2);
  const [fetchDetails, setFetchDetails] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingScopes, setLoadingScopes] = useState(true);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadScopes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/crm/harvester/scopes", {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setScopes(data.scopes || []);
        if (data.scopes?.length > 0) {
          setSelectedScope(data.scopes[0].code);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingScopes(false);
    }
  }, []);

  useEffect(() => {
    loadScopes();
  }, [loadScopes]);

  async function runTest() {
    if (!selectedScope) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/crm/harvester/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({
          scope_code: selectedScope,
          max_pages: maxPages,
          fetch_details: fetchDetails,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "فشل الاختبار");
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🧪 اختبار الحصاد اليدوي</h1>
          <p className="text-gray-500 text-sm mt-1">
            جلب وتحليل بدون كتابة في قاعدة البيانات — فقط عرض النتائج
          </p>
        </div>
        <Link
          href="/admin/crm/harvester"
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
        >
          → العودة للمحرك
        </Link>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-4">إعدادات الاختبار</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Scope selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              النطاق (Scope)
            </label>
            {loadingScopes ? (
              <div className="h-10 bg-gray-100 animate-pulse rounded-lg" />
            ) : scopes.length === 0 ? (
              <p className="text-sm text-red-500">لا توجد نطاقات — أنشئ نطاق أولاً</p>
            ) : (
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              >
                {scopes.map((s) => (
                  <option key={s.id} value={s.code}>
                    {s.name} ({s.code})
                    {s.is_active ? "" : " [غير مفعّل]"}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Max pages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عدد الصفحات (حد أقصى 5)
            </label>
            <input
              type="number"
              min={1}
              max={5}
              value={maxPages}
              onChange={(e) => setMaxPages(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Fetch details toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              جلب التفاصيل (أول 5 إعلانات جديدة)
            </label>
            <button
              onClick={() => setFetchDetails(!fetchDetails)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                fetchDetails
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : "bg-gray-100 text-gray-600 border border-gray-300"
              }`}
            >
              {fetchDetails ? "مفعّل — يجلب التفاصيل والأرقام" : "معطّل — قوائم فقط"}
            </button>
          </div>
        </div>

        {/* Selected scope info */}
        {selectedScope && scopes.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
            <p className="text-gray-500">
              URL:{" "}
              <span className="font-mono text-gray-700 text-xs" dir="ltr">
                {scopes.find((s) => s.code === selectedScope)?.base_url || "—"}
              </span>
            </p>
          </div>
        )}

        {/* Run button */}
        <button
          onClick={runTest}
          disabled={loading || !selectedScope || scopes.length === 0}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              جاري الاختبار... (ممكن يأخد دقيقة أو اتنين)
            </span>
          ) : (
            "🧪 شغّل الاختبار"
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 font-bold">خطأ</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold mb-4">📊 ملخص النتائج</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <StatCard label="الصفحات المجلوبة" value={result.pages_fetched} icon="📄" />
              <StatCard label="إجمالي الإعلانات" value={result.total_listings} icon="📰" />
              <StatCard
                label="جديد"
                value={result.new_listings}
                icon="✨"
                highlight="green"
              />
              <StatCard
                label="مكرر"
                value={result.duplicate_listings}
                icon="🔁"
                highlight={result.duplicate_listings > 0 ? "yellow" : undefined}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard
                label="أرقام مستخرجة"
                value={result.phones_extracted}
                icon="📱"
                highlight={result.phones_extracted > 0 ? "green" : undefined}
              />
              <StatCard label="الوقت المستغرق" value={`${result.duration_seconds} ثانية`} icon="⏱️" />
              <StatCard
                label="جلب تفاصيل"
                value={result.fetch_details_enabled ? "مفعّل" : "معطّل"}
                icon="🔍"
              />
            </div>

            {/* Scope info */}
            <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              النطاق: <span className="font-bold">{result.scope.name}</span> — {result.scope.governorate} — {result.scope.maksab_category}
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="text-red-700 font-bold mb-2">
                ⚠️ أخطاء ({result.errors.length})
              </h3>
              <ul className="space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-red-600 text-sm font-mono" dir="ltr">
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sample Listings */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold mb-4">
              🔎 عينة من الإعلانات (أول {result.sample_listings.length})
            </h2>

            {result.sample_listings.length === 0 ? (
              <p className="text-gray-400 text-center py-8">لم يتم العثور على إعلانات</p>
            ) : (
              <div className="space-y-4">
                {result.sample_listings.map((listing, i) => (
                  <ListingCard key={i} listing={listing} index={i + 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: string;
  highlight?: "green" | "yellow" | "red";
}) {
  const bgColor = highlight === "green"
    ? "bg-green-50 border-green-200"
    : highlight === "yellow"
    ? "bg-yellow-50 border-yellow-200"
    : highlight === "red"
    ? "bg-red-50 border-red-200"
    : "bg-gray-50 border-gray-200";

  const textColor = highlight === "green"
    ? "text-green-700"
    : highlight === "yellow"
    ? "text-yellow-700"
    : highlight === "red"
    ? "text-red-700"
    : "text-gray-900";

  return (
    <div className={`p-3 rounded-xl border ${bgColor}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span>{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>
        {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
      </p>
    </div>
  );
}

function ListingCard({ listing, index }: { listing: TestListingResult; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border rounded-xl p-4 ${
        listing.isDuplicate
          ? "bg-yellow-50 border-yellow-200"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        {listing.thumbnailUrl && (
          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={listing.thumbnailUrl}
              alt={listing.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-900 text-sm leading-tight">
                <span className="text-gray-400 font-normal ml-1">#{index}</span>
                {listing.title}
              </h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {listing.price !== null && (
                  <span className="text-green-700 font-bold text-sm">
                    {listing.price.toLocaleString("ar-EG")} جنيه
                  </span>
                )}
                {listing.location && (
                  <span className="text-gray-500 text-xs">📍 {listing.location}</span>
                )}
                {listing.dateText && (
                  <span className="text-gray-400 text-xs">{listing.dateText}</span>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1 flex-shrink-0">
              {listing.isDuplicate && (
                <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full text-[10px] font-medium">
                  مكرر
                </span>
              )}
              {listing.extractedPhone && (
                <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-[10px] font-medium">
                  📱 {listing.extractedPhone}
                </span>
              )}
              {listing.isVerified && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px]">
                  موثق
                </span>
              )}
              {listing.isBusiness && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px]">
                  متجر
                </span>
              )}
              {listing.supportsExchange && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px]">
                  تبديل
                </span>
              )}
              {listing.isFeatured && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px]">
                  مميز
                </span>
              )}
            </div>
          </div>

          {/* Seller */}
          {listing.sellerName && (
            <p className="text-gray-500 text-xs mt-1">👤 {listing.sellerName}</p>
          )}

          {/* Mapped location */}
          {(listing.mappedLocation.governorate || listing.mappedLocation.city) && (
            <p className="text-gray-400 text-xs mt-1">
              📌 mapped: {listing.mappedLocation.governorate || "—"} / {listing.mappedLocation.city || "—"}
            </p>
          )}

          {/* Expand/Collapse for details */}
          {(listing.description || Object.keys(listing.specifications).length > 0) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-600 text-xs mt-2 hover:underline"
            >
              {expanded ? "إخفاء التفاصيل ▲" : "عرض التفاصيل ▼"}
            </button>
          )}

          {expanded && (
            <div className="mt-3 space-y-2 text-sm">
              {listing.description && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs font-bold mb-1">الوصف:</p>
                  <p className="text-gray-700 text-xs leading-relaxed">
                    {listing.description.slice(0, 300)}
                    {listing.description.length > 300 ? "..." : ""}
                  </p>
                </div>
              )}
              {Object.keys(listing.specifications).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs font-bold mb-1">المواصفات:</p>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(listing.specifications).map(([key, val]) => (
                      <div key={key} className="text-xs">
                        <span className="text-gray-500">{key}: </span>
                        <span className="text-gray-700 font-medium">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {listing.imageCount > 0 && (
                <p className="text-gray-400 text-xs">📸 عدد الصور: {listing.imageCount}</p>
              )}
            </div>
          )}

          {/* URL */}
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 text-[10px] mt-1 block truncate hover:underline"
            dir="ltr"
          >
            {listing.url}
          </a>
        </div>
      </div>
    </div>
  );
}
