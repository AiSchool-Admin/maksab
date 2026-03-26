"use client";

import { useState } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import { RefreshCw } from "lucide-react";

const PLATFORMS = ["dubizzle", "opensooq", "aqarmap", "propertyfinder", "olx", "hatla2ee"];

interface EnrichResult {
  platform: string;
  duration_ms: number;
  listings_processed: number;
  phones_found: number;
  results: Array<{
    listing_id: string;
    url: string;
    phone: string | null;
    specs_count: number;
    error: string | null;
  }>;
}

export default function EnrichSpecsPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<EnrichResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runEnrich = async (platform: string) => {
    setLoading(platform);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/crm/harvester/enrich-vercel?platform=${platform}&limit=20`,
        { headers: getAdminHeaders() }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EnrichResult = await res.json();
      setResults((prev) => [data, ...prev.filter((r) => r.platform !== platform)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حصلت مشكلة");
    }
    setLoading(null);
  };

  const runAll = async () => {
    for (const p of PLATFORMS) {
      await runEnrich(p);
    }
  };

  const totalProcessed = results.reduce((s, r) => s + r.listings_processed, 0);
  const totalPhones = results.reduce((s, r) => s + r.phones_found, 0);
  const totalSpecs = results.reduce(
    (s, r) => s + r.results.filter((x) => x.specs_count > 0).length,
    0
  );

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dark">استخراج المواصفات</h1>
          <p className="text-sm text-gray-text">جلب specifications + أرقام من صفحات التفاصيل</p>
        </div>
        <button
          onClick={runAll}
          disabled={!!loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-green text-white rounded-xl text-sm font-bold hover:bg-brand-green-dark disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          شغّل الكل
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
      )}

      {/* Platform buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {PLATFORMS.map((p) => {
          const res = results.find((r) => r.platform === p);
          const isLoading = loading === p;
          return (
            <button
              key={p}
              onClick={() => runEnrich(p)}
              disabled={!!loading}
              className={`p-4 rounded-xl border-2 text-right transition-all ${
                isLoading
                  ? "border-brand-green bg-brand-green-light animate-pulse"
                  : res
                  ? "border-green-200 bg-green-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              } disabled:opacity-50`}
            >
              <p className="text-sm font-bold text-dark capitalize">{p}</p>
              {isLoading && <p className="text-[10px] text-brand-green mt-1">جاري...</p>}
              {res && !isLoading && (
                <div className="text-[10px] text-gray-text mt-1 space-y-0.5">
                  <p>تم: {res.listings_processed} إعلان</p>
                  <p>أرقام: {res.phones_found} | specs: {res.results.filter((x) => x.specs_count > 0).length}</p>
                  <p>{res.duration_ms}ms</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-dark">{totalProcessed}</p>
            <p className="text-xs text-gray-text">إعلان تمت معالجته</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalSpecs}</p>
            <p className="text-xs text-gray-text">مع مواصفات</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{totalPhones}</p>
            <p className="text-xs text-gray-text">أرقام جديدة</p>
          </div>
        </div>
      )}

      {/* Detail results */}
      {results.map((res) => (
        <div key={res.platform} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
            <p className="text-sm font-bold text-dark capitalize">{res.platform}</p>
            <p className="text-[10px] text-gray-text">
              {res.listings_processed} إعلان — {res.duration_ms}ms
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b">
                  <th className="text-right py-1.5 px-3 font-medium">العنوان</th>
                  <th className="text-center py-1.5 px-2 font-medium">Specs</th>
                  <th className="text-center py-1.5 px-2 font-medium">رقم</th>
                  <th className="text-center py-1.5 px-2 font-medium">حالة</th>
                </tr>
              </thead>
              <tbody>
                {res.results.map((r) => (
                  <tr key={r.listing_id} className="border-b border-gray-50">
                    <td className="py-1.5 px-3 truncate max-w-[200px]">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {r.url.split("/").pop()?.substring(0, 40) || "—"}
                      </a>
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {r.specs_count > 0 ? (
                        <span className="text-green-600 font-bold">{r.specs_count}</span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {r.phone ? (
                        <span className="text-green-600 font-mono">{r.phone}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {r.error ? (
                        <span className="text-red-400">{r.error.substring(0, 20)}</span>
                      ) : (
                        <span className="text-green-500">✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
