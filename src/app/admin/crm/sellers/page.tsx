"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getAdminHeaders } from "@/app/admin/layout";
import { Search, Download, Phone, Copy, Check, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

/* ─── Types ─── */

interface Seller {
  id: string;
  name: string | null;
  phone: string | null;
  source_platform: string | null;
  total_listings_seen: number;
  seller_tier: string | null;
  whale_score: number;
  pipeline_status: string | null;
  created_at: string;
  last_outreach_at: string | null;
  primary_category: string | null;
  primary_governorate: string | null;
}

const TIER_DISPLAY: Record<string, { emoji: string; label: string; color: string }> = {
  whale: { emoji: "🐋", label: "حوت", color: "bg-red-100 text-red-700" },
  big: { emoji: "💪", label: "كبير", color: "bg-orange-100 text-orange-700" },
  medium: { emoji: "📦", label: "متوسط", color: "bg-blue-100 text-blue-700" },
  small: { emoji: "🔹", label: "صغير", color: "bg-gray-100 text-gray-500" },
  visitor: { emoji: "👁️", label: "زائر", color: "bg-gray-50 text-gray-400" },
};

const PLATFORM_LABELS: Record<string, string> = {
  dubizzle: "Dubizzle",
  opensooq: "OpenSooq",
  aqarmap: "AqarMap",
  propertyfinder: "PF",
  olx: "OLX",
  hatla2ee: "Hatla2ee",
  contactcars: "ContactCars",
};

const PIPELINE_DISPLAY: Record<string, { label: string; color: string }> = {
  discovered: { label: "جديد", color: "bg-gray-100 text-gray-600" },
  phone_found: { label: "رقم متاح", color: "bg-blue-50 text-blue-600" },
  contacted: { label: "تم التواصل", color: "bg-yellow-50 text-yellow-600" },
  interested: { label: "مهتم", color: "bg-green-50 text-green-600" },
  registered: { label: "مسجّل", color: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "رفض", color: "bg-red-50 text-red-600" },
};

const ALEX_GOVS = ["الإسكندرية", "alexandria", "الاسكندرية"];

/* ─── Main Page ─── */

export default function SellersPage() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") || "vehicles";
  const isCars = categoryParam === "vehicles" || categoryParam === "سيارات";

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [phoneOnly, setPhoneOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const limit = 50;

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAdminHeaders();
      const params = new URLSearchParams({
        category: isCars ? "vehicles" : "properties",
        governorates: ALEX_GOVS.join(","),
        tier: tierFilter,
        phoneOnly: String(phoneOnly),
        search,
        offset: String(page * limit),
        limit: String(limit),
      });
      const res = await fetch(`/api/admin/crm/sellers?${params}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setSellers(json.sellers || []);
        setTotal(json.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch sellers:", err);
    }
    setLoading(false);
  }, [isCars, tierFilter, phoneOnly, search, page]);

  useEffect(() => { fetchSellers(); }, [fetchSellers]);

  const copyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCSV = () => {
    if (sellers.length === 0) return;
    const headers = ["الاسم", "الرقم", "المصدر", "عدد الإعلانات", "الشريحة", "الحالة"];
    const rows = sellers.map(s => [
      s.name || "—",
      s.phone || "—",
      PLATFORM_LABELS[s.source_platform || ""] || s.source_platform || "—",
      String(s.total_listings_seen || 0),
      TIER_DISPLAY[s.seller_tier || ""]?.label || "—",
      PIPELINE_DISPLAY[s.pipeline_status || ""]?.label || "—",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sellers_${isCars ? "cars" : "properties"}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dark">
            {isCars ? "🚗 بائعو السيارات" : "🏠 بائعو العقارات"} — الإسكندرية
          </h1>
          <p className="text-sm text-gray-text">{total.toLocaleString()} بائع</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
            <Download size={16} /> CSV
          </button>
          <button onClick={fetchSellers} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="ابحث بالاسم أو الرقم..."
            className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20"
          />
        </div>
        <div className="flex gap-1.5">
          {[
            { key: "all", label: "الكل" },
            { key: "whale", label: "🐋" },
            { key: "big", label: "💪" },
            { key: "medium", label: "📦" },
            { key: "small", label: "🔹" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setTierFilter(key); setPage(0); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                tierFilter === key ? "bg-brand-green text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setPhoneOnly(!phoneOnly); setPage(0); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
            phoneOnly ? "bg-blue-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Phone size={14} /> بأرقام فقط
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b bg-gray-50/50">
              <th className="text-right py-3 px-4 font-medium">الاسم</th>
              <th className="text-right py-3 px-3 font-medium">الرقم</th>
              <th className="text-center py-3 px-3 font-medium">المصدر</th>
              <th className="text-center py-3 px-3 font-medium">إعلانات</th>
              <th className="text-center py-3 px-3 font-medium">الشريحة</th>
              <th className="text-center py-3 px-3 font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td colSpan={6} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : sellers.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">لا توجد نتائج</td></tr>
            ) : (
              sellers.map((s) => {
                const tier = TIER_DISPLAY[s.seller_tier || ""] || TIER_DISPLAY.small;
                const pipeline = PIPELINE_DISPLAY[s.pipeline_status || ""] || PIPELINE_DISPLAY.discovered;
                return (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-dark truncate max-w-[200px]">{s.name || "بدون اسم"}</p>
                    </td>
                    <td className="py-3 px-3">
                      {s.phone ? (
                        <button
                          onClick={() => copyPhone(s.phone!, s.id)}
                          className="flex items-center gap-1 text-xs font-mono text-blue-600 hover:text-blue-800"
                        >
                          {s.phone}
                          {copiedId === s.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-xs text-gray-500">
                        {PLATFORM_LABELS[s.source_platform || ""] || s.source_platform || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-dark">
                      {s.total_listings_seen || 0}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tier.color}`}>
                        {tier.emoji} {tier.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${pipeline.color}`}>
                        {pipeline.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
          <span className="text-sm text-gray-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
