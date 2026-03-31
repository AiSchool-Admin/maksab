"use client";

import { useState, useEffect } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import { RefreshCw, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface ScopeStats {
  id: string;
  code: string;
  name: string;
  source_platform: string;
  maksab_category: string;
  governorate: string;
  base_url: string;
  last_harvest_at: string | null;
  is_active: boolean;
  is_paused: boolean;
  priority: number;
  total_listings: number;
  alex_pct: number;
  no_phone_pct: number;
  with_phone: number;
}

interface SampleListing {
  title: string;
  governorate: string | null;
  city: string | null;
  price: number | null;
  url: string;
  brand: string | null;
  listing_type: string | null;
  specs_count: number;
  created_at: string;
  seller_name: string | null;
  seller_phone: string | null;
  seller_gov: string | null;
  seller_type: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  dubizzle: "Dubizzle", opensooq: "OpenSooq", aqarmap: "AqarMap",
  propertyfinder: "PropertyFinder", olx: "OLX", hatla2ee: "Hatla2ee",
  contactcars: "ContactCars", semsarmasr: "SemsarMasr",
};

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  agency: { label: "🏢 وكيل", color: "bg-amber-50 text-amber-700" },
  broker: { label: "🏷️ سمسار", color: "bg-orange-50 text-orange-600" },
  individual: { label: "👤 فرد", color: "bg-blue-50 text-blue-600" },
};

function timeAgo(d: string | null): string {
  if (!d) return "—";
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
}

function isAlex(gov: string | null): boolean {
  if (!gov) return false;
  const g = gov.toLowerCase();
  return g.includes("الإسكندرية") || g.includes("اسكندري") || g.includes("alexandria");
}

export default function TestScopesPage() {
  const [scopes, setScopes] = useState<ScopeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedScope, setExpandedScope] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleListing[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);

  const loadScopes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/crm/harvester/test-scopes", { headers: getAdminHeaders() });
      const data = await res.json();
      setScopes(data.scopes || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { loadScopes(); }, []);

  const loadSamples = async (code: string) => {
    if (expandedScope === code) {
      setExpandedScope(null);
      return;
    }
    setExpandedScope(code);
    setSamplesLoading(true);
    setSamples([]);
    try {
      const res = await fetch(`/api/admin/crm/harvester/test-scopes?scope_code=${code}&limit=10`, { headers: getAdminHeaders() });
      const data = await res.json();
      setSamples(data.samples || []);
    } catch { /* silent */ }
    setSamplesLoading(false);
  };

  const totalListings = scopes.reduce((s, sc) => s + sc.total_listings, 0);
  const totalPhones = scopes.reduce((s, sc) => s + sc.with_phone, 0);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dark">🔍 اختبار نطاقات الحصاد</h1>
          <p className="text-sm text-gray-text">{scopes.length} scope | {totalListings.toLocaleString()} إعلان | {totalPhones.toLocaleString()} رقم</p>
        </div>
        <button onClick={loadScopes} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-gray-100" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {scopes.map((sc) => (
            <div key={sc.code} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Scope header */}
              <button onClick={() => loadSamples(sc.code)} className="w-full p-4 text-right hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-dark">{sc.code}</span>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {PLATFORM_LABELS[sc.source_platform] || sc.source_platform}
                      </span>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {sc.maksab_category === "سيارات" ? "🚗" : "🏠"} {sc.maksab_category}
                      </span>
                      {sc.is_paused && <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full">⏸ متوقف</span>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-text">
                      <span>إجمالي: <b className="text-dark">{sc.total_listings}</b></span>
                      <span>آخر حصاد: <b className="text-dark">{timeAgo(sc.last_harvest_at)}</b></span>
                      <span>
                        إسكندرية:{" "}
                        <b className={sc.alex_pct >= 95 ? "text-green-600" : sc.alex_pct >= 80 ? "text-yellow-600" : "text-red-600"}>
                          {sc.alex_pct}%
                        </b>
                      </span>
                      <span>
                        بدون رقم:{" "}
                        <b className={sc.no_phone_pct <= 30 ? "text-green-600" : "text-orange-600"}>
                          {sc.no_phone_pct}%
                        </b>
                      </span>
                    </div>
                  </div>
                  {expandedScope === sc.code ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </button>

              {/* Samples table */}
              {expandedScope === sc.code && (
                <div className="border-t border-gray-100">
                  {samplesLoading ? (
                    <div className="p-4 text-center text-sm text-gray-400">جاري التحميل...</div>
                  ) : samples.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">لا توجد إعلانات</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 text-gray-400 border-b">
                            <th className="text-right py-2 px-3 font-medium">العنوان</th>
                            <th className="text-center py-2 px-2 font-medium">المحافظة</th>
                            <th className="text-center py-2 px-2 font-medium">السعر</th>
                            <th className="text-center py-2 px-2 font-medium">البائع</th>
                            <th className="text-center py-2 px-2 font-medium">الرقم</th>
                            <th className="text-center py-2 px-2 font-medium">النوع</th>
                            <th className="text-center py-2 px-2 font-medium">Specs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {samples.map((s, i) => {
                            const govOk = isAlex(s.governorate);
                            const badge = TYPE_BADGE[s.seller_type] || TYPE_BADGE.individual;
                            return (
                              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="py-2 px-3 max-w-[200px]">
                                  {s.url ? (
                                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline font-medium truncate block">
                                      {s.title?.substring(0, 50)}
                                    </a>
                                  ) : (
                                    <span className="text-dark truncate block">{s.title?.substring(0, 50)}</span>
                                  )}
                                  {s.listing_type === "rent" && (
                                    <span className="text-[9px] bg-purple-50 text-purple-600 px-1 rounded">إيجار</span>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${govOk ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                                    {govOk ? "🟢" : "🔴"} {s.governorate?.substring(0, 15) || "—"}
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-center font-bold text-dark">
                                  {s.price ? `${(s.price / 1000).toFixed(0)}K` : "—"}
                                </td>
                                <td className="py-2 px-2 text-center text-gray-500 truncate max-w-[100px]">
                                  {s.seller_name?.substring(0, 20) || "—"}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  {s.seller_phone ? (
                                    <span className="text-green-600 font-mono text-[10px]">{s.seller_phone}</span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                                </td>
                                <td className="py-2 px-2 text-center">
                                  {s.specs_count > 0 ? (
                                    <span className="text-green-600 font-bold">{s.specs_count}</span>
                                  ) : (
                                    <span className="text-gray-300">0</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
