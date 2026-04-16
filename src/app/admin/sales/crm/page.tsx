"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search, Users, Filter, ChevronRight, Phone, Home, Car, Tag,
  TrendingUp, Loader2, RefreshCw, MessageSquare,
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";

interface Seller {
  id: string;
  name: string | null;
  phone: string | null;
  primary_category: string | null;
  primary_governorate: string | null;
  source_platform: string | null;
  detected_account_type: string | null;
  pipeline_status: string | null;
  total_listings_seen: number | null;
  active_listings: number | null;
  whale_score: number | null;
  outreach_count: number | null;
  last_outreach_at: string | null;
  last_response_at: string | null;
  created_at: string;
}

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  discovered: { label: "مكتشف", color: "bg-gray-100 text-gray-700" },
  phone_found: { label: "تليفون", color: "bg-blue-100 text-blue-700" },
  contacted_1: { label: "تواصل 1", color: "bg-indigo-100 text-indigo-700" },
  contacted_2: { label: "تواصل 2", color: "bg-purple-100 text-purple-700" },
  contacted: { label: "تم التواصل", color: "bg-purple-100 text-purple-700" },
  interested: { label: "مهتم", color: "bg-amber-100 text-amber-700" },
  considering: { label: "يفكر", color: "bg-yellow-100 text-yellow-700" },
  consented: { label: "وافق", color: "bg-lime-100 text-lime-700" },
  registered: { label: "✅ مسجّل", color: "bg-green-100 text-green-700" },
  rejected: { label: "رفض", color: "bg-red-100 text-red-700" },
};

export default function SalesCrmPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("properties");
  const [stage, setStage] = useState<string>("");
  const [nameLike, setNameLike] = useState<string>("");
  const [sort, setSort] = useState<string>("listings");
  const [offset, setOffset] = useState(0);

  const limit = 50;

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      if (stage) params.set("stage", stage);
      if (nameLike) params.set("name_like", nameLike);
      if (sort) params.set("sort", sort);
      params.set("governorate", "alexandria");
      params.set("has_phone", "true");
      params.set("limit", String(limit));
      params.set("offset", String(offset));

      const res = await fetch(`/api/admin/sales/crm?${params}`, { headers: getAdminHeaders() });
      const json = await res.json();
      setSellers(json.sellers || []);
      setTotal(json.total || 0);
    } finally {
      setLoading(false);
    }
  }, [q, category, stage, nameLike, sort, offset]);

  useEffect(() => {
    const t = setTimeout(fetchSellers, 300);
    return () => clearTimeout(t);
  }, [fetchSellers]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-[#1B7A3D]" />
          <h1 className="text-xl font-bold">نظام المبيعات — الإسكندرية</h1>
        </div>
        <button
          onClick={fetchSellers}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="تحديث"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 mb-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو الرقم..."
            className="w-full pr-10 pl-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="">كل الأقسام</option>
            <option value="properties">🏠 عقارات</option>
            <option value="cars">🚗 سيارات</option>
          </select>

          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="">كل المراحل</option>
            <option value="phone_found">📞 تليفون - لم يتم التواصل</option>
            <option value="contacted_1">💬 تواصل 1</option>
            <option value="contacted_2">💬 تواصل 2</option>
            <option value="contacted">تم التواصل</option>
            <option value="interested">⭐ مهتم</option>
            <option value="considering">🤔 يفكر</option>
            <option value="consented">✓ وافق</option>
            <option value="registered">✅ مسجّل</option>
            <option value="rejected">❌ رفض</option>
          </select>

          <button
            onClick={() => setNameLike(nameLike === "وكالة" ? "" : "وكالة")}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              nameLike === "وكالة"
                ? "bg-[#1B7A3D] text-white border-[#1B7A3D]"
                : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            🏢 وكالات فقط
          </button>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm mr-auto"
          >
            <option value="listings">🔝 الأكثر إعلاناً</option>
            <option value="whale_score">💎 Whale score</option>
            <option value="last_outreach">🕐 آخر تواصل</option>
            <option value="created">🆕 الأحدث</option>
          </select>
        </div>

        <div className="text-xs text-gray-500">
          إجمالي: <span className="font-bold text-gray-800">{total.toLocaleString()}</span> بائع
          {total > limit && (
            <span> — عارض {offset + 1}-{Math.min(offset + limit, total)}</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading && sellers.length === 0 ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#1B7A3D]" />
          </div>
        ) : sellers.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا يوجد بائعين مطابقين للفلترة</p>
          </div>
        ) : (
          <div className="divide-y">
            {sellers.map((s) => (
              <SellerRow key={s.id} seller={s} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
          >
            السابق
          </button>
          <span className="text-sm text-gray-500">
            صفحة {Math.floor(offset / limit) + 1} من {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}

function SellerRow({ seller }: { seller: Seller }) {
  const stage = STAGE_LABELS[seller.pipeline_status || "discovered"]
    || { label: seller.pipeline_status || "—", color: "bg-gray-100 text-gray-700" };

  const CategoryIcon = seller.primary_category &&
    ["cars", "vehicles", "سيارات"].includes(seller.primary_category) ? Car : Home;

  const isAgency = seller.name?.includes("وكالة") || /[A-Za-z]{3,}/.test(seller.name || "");

  return (
    <Link
      href={`/admin/sales/crm/${seller.id}`}
      className="flex items-center gap-3 p-3 hover:bg-gray-50 transition"
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8F5E9] to-[#FFF8E1] flex items-center justify-center shrink-0">
        <CategoryIcon className="w-5 h-5 text-[#1B7A3D]" />
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-gray-900 truncate">
            {seller.name || "بائع بدون اسم"}
          </span>
          {isAgency && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
              🏢 وكالة
            </span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${stage.color}`}>
            {stage.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {seller.phone && (
            <span className="flex items-center gap-1" dir="ltr">
              <Phone className="w-3 h-3" />
              {seller.phone}
            </span>
          )}
          {seller.total_listings_seen !== null && (
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {seller.total_listings_seen}
            </span>
          )}
          {seller.outreach_count !== null && seller.outreach_count > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {seller.outreach_count}
            </span>
          )}
          {seller.source_platform && (
            <span>• {seller.source_platform}</span>
          )}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
    </Link>
  );
}
