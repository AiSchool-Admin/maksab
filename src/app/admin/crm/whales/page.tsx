"use client";

/**
 * /admin/crm/whales — Pareto-driven whale list for personal-touch outreach
 *
 * Surfaces the top 20% of sellers (the "whales") who hold the bulk of
 * listings in Alexandria, with per-seller quick actions:
 *   • Copy phone
 *   • Open WhatsApp with prefilled Ahmed/Waleed message
 *   • Generate magic link for self-onboarding
 *   • Mark as contacted / interested / rejected
 *
 * Strategy: the 20 highest-volume sellers convert a small effort into
 * the bulk of supply. Manual outreach to whales > automated outreach
 * to long-tail.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAdminHeaders } from "@/app/admin/layout";
import {
  ChevronLeft,
  Phone,
  Copy,
  Check,
  MessageCircle,
  Link2,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  Mail,
} from "lucide-react";

interface Whale {
  id: string;
  name: string | null;
  phone: string | null;
  source_platform: string | null;
  total_listings_seen: number;
  active_listings: number | null;
  seller_tier: string | null;
  whale_score: number;
  pipeline_status: string | null;
  primary_category: string | null;
  primary_governorate: string | null;
  last_outreach_at: string | null;
  outreach_count: number | null;
  rank: number;
  individual_pct: number;
  cumulative_pct: number;
}

interface Breakpoint {
  seller_percentile: number;
  seller_count: number;
  listings_count: number;
  listings_share: number;
}

interface Summary {
  total_sellers: number;
  total_listings: number;
  pareto_80_seller_count: number;
  pareto_80_seller_share: number;
  pareto_80_listings: number;
  top_20pct_seller_count: number;
  top_20pct_listings: number;
  top_20pct_listings_share: number;
  top_20pct_contacted: number;
  top_20pct_consented: number;
}

const PIPELINE_LABELS: Record<
  string,
  { label: string; color: string; emoji: string }
> = {
  discovered: { label: "جديد", color: "bg-gray-100 text-gray-600", emoji: "📥" },
  phone_found: {
    label: "رقم متاح",
    color: "bg-blue-50 text-blue-700",
    emoji: "📞",
  },
  contacted: {
    label: "تم التواصل",
    color: "bg-yellow-50 text-yellow-700",
    emoji: "✉️",
  },
  interested: {
    label: "مهتم",
    color: "bg-green-50 text-green-700",
    emoji: "👍",
  },
  registered: {
    label: "مسجّل",
    color: "bg-emerald-100 text-emerald-700",
    emoji: "✅",
  },
  rejected: {
    label: "رفض",
    color: "bg-red-50 text-red-700",
    emoji: "❌",
  },
  not_reachable: {
    label: "متعذر الوصول",
    color: "bg-gray-50 text-gray-500",
    emoji: "🚫",
  },
};

const PLATFORM_LABELS: Record<string, string> = {
  dubizzle: "Dubizzle",
  semsarmasr: "سمسار مصر",
  aqarmap: "AqarMap",
  opensooq: "أوبن سوق",
};

export default function WhalesPage() {
  const [category, setCategory] = useState<"properties" | "vehicles">(
    "properties"
  );
  const [whales, setWhales] = useState<Whale[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [topNFilter, setTopNFilter] = useState<"top20" | "top50" | "all">(
    "top20"
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [magicLinkOpen, setMagicLinkOpen] = useState<{
    sellerId: string;
    url: string;
    phone: string;
  } | null>(null);

  const fetchWhales = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAdminHeaders();
      const params = new URLSearchParams({
        category,
        governorates: "الإسكندرية,alexandria,الاسكندرية",
        phoneOnly: "true",
        minListings: "1",
      });
      const res = await fetch(`/api/admin/crm/whales?${params}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setWhales(json.whales || []);
        setSummary(json.summary || null);
        setBreakpoints(json.breakpoints || []);
      }
    } catch (err) {
      console.error("Failed to fetch whales:", err);
    }
    setLoading(false);
  }, [category]);

  useEffect(() => {
    fetchWhales();
  }, [fetchWhales]);

  const visibleWhales = (() => {
    if (!summary) return whales;
    if (topNFilter === "top20")
      return whales.slice(0, summary.top_20pct_seller_count);
    if (topNFilter === "top50")
      return whales.slice(0, Math.ceil(summary.total_sellers * 0.5));
    return whales;
  })();

  const copyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const buildAhmedMessage = (whale: Whale) => {
    const sellerName = whale.name?.trim() || "حضرتك";
    const platform =
      PLATFORM_LABELS[whale.source_platform || ""] ||
      whale.source_platform ||
      "إعلانك";
    return `أهلاً ${sellerName}! 🏠
أنا أحمد من مكسب — أول سوق إلكتروني مصري متخصص في العقارات بنظام المزادات والمقايضة.

شفت إعلانك على ${platform} وحسيت إن مكسب هيفيدك:
✅ مجاني للبداية — مفيش أي خسارة
✅ مزادات عقارية (مش موجودة في أي منصة تانية)
✅ وصول لآلاف المشترين في الإسكندرية
✅ عمولة طوعية بس — مش إجبارية

سجّل دلوقتي في 3 دقائق: https://maksab.vercel.app`;
  };

  const openWhatsApp = (whale: Whale) => {
    if (!whale.phone) return;
    // Egyptian numbers: prefix with country code 2 if missing
    const cleaned = whale.phone.replace(/\D/g, "");
    const intl = cleaned.startsWith("20") ? cleaned : `2${cleaned}`;
    const text = encodeURIComponent(buildAhmedMessage(whale));
    window.open(`https://wa.me/${intl}?text=${text}`, "_blank");
  };

  const generateMagicLink = async (whale: Whale) => {
    setBusyId(whale.id);
    try {
      const headers = {
        ...getAdminHeaders(),
        "Content-Type": "application/json",
      };
      const res = await fetch("/api/admin/sales/magic-link", {
        method: "POST",
        headers,
        body: JSON.stringify({ seller_id: whale.id }),
      });
      const json = await res.json();
      if (res.ok && json.url) {
        setMagicLinkOpen({
          sellerId: whale.id,
          url: json.url,
          phone: json.phone,
        });
      } else {
        alert(json.error || "فشل في توليد الرابط");
      }
    } catch (err) {
      console.error(err);
      alert("خطأ في الاتصال");
    }
    setBusyId(null);
  };

  const updateStatus = async (
    sellerId: string,
    pipeline_status: string
  ) => {
    setBusyId(sellerId);
    try {
      const headers = {
        ...getAdminHeaders(),
        "Content-Type": "application/json",
      };
      const res = await fetch("/api/admin/crm/whales", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ seller_id: sellerId, pipeline_status }),
      });
      if (res.ok) {
        await fetchWhales();
      } else {
        const json = await res.json();
        alert(json.error || "فشل في التحديث");
      }
    } catch (err) {
      console.error(err);
    }
    setBusyId(null);
  };

  const exportCsv = () => {
    const rows = [
      ["rank", "name", "phone", "platform", "listings", "share_%", "cum_%", "status"].join(","),
      ...visibleWhales.map((w) =>
        [
          w.rank,
          (w.name || "").replace(/,/g, " "),
          w.phone || "",
          PLATFORM_LABELS[w.source_platform || ""] || w.source_platform || "",
          w.total_listings_seen,
          w.individual_pct,
          w.cumulative_pct,
          w.pipeline_status || "discovered",
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `whales_${category}_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/crm"
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                🐋 الحيتان — Pareto 80/20
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                أعلى السماسرة من حيث عدد الإعلانات في الإسكندرية
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as "properties" | "vehicles")
              }
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="properties">عقارات</option>
              <option value="vehicles">سيارات</option>
            </select>
            <button
              onClick={fetchWhales}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="تحديث"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={exportCsv}
              disabled={visibleWhales.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B7A3D] text-white rounded-lg text-sm font-medium hover:bg-[#145C2E] disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {loading && !summary ? (
          <div className="text-center text-gray-500 py-20">⏳ جاري التحميل...</div>
        ) : !summary || summary.total_sellers === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
            <p className="text-lg text-gray-700 font-medium mb-2">
              لا يوجد سماسرة في الإسكندرية بعد
            </p>
            <p className="text-sm text-gray-500">
              شغّل الـ Bookmarklet على Dubizzle / SemsarMasr / AqarMap لتجميع
              البيانات أولاً
            </p>
          </div>
        ) : (
          <>
            {/* Pareto Hero Card */}
            <div className="bg-gradient-to-br from-[#1B7A3D] to-[#145C2E] rounded-2xl p-6 text-white shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm opacity-80 mb-1">قاعدة 80/20</p>
                  <p className="text-3xl font-bold">
                    {summary.pareto_80_seller_count} سمسار
                  </p>
                  <p className="text-sm opacity-90 mt-1">
                    ({summary.pareto_80_seller_share}% من السماسرة) عندهم{" "}
                    <b>80%</b> من الإعلانات
                  </p>
                </div>
                <div>
                  <p className="text-sm opacity-80 mb-1">أعلى 20% (الحيتان)</p>
                  <p className="text-3xl font-bold">
                    {summary.top_20pct_seller_count} سمسار
                  </p>
                  <p className="text-sm opacity-90 mt-1">
                    عندهم {summary.top_20pct_listings_share}% من الإعلانات (
                    {summary.top_20pct_listings} إعلان)
                  </p>
                </div>
                <div>
                  <p className="text-sm opacity-80 mb-1">تقدّم التواصل</p>
                  <p className="text-3xl font-bold">
                    {summary.top_20pct_contacted} / {summary.top_20pct_seller_count}
                  </p>
                  <p className="text-sm opacity-90 mt-1">
                    تم التواصل · مسجّل: {summary.top_20pct_consented}
                  </p>
                </div>
              </div>
            </div>

            {/* Breakpoint Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-bold text-gray-700">
                  📊 توزيع التركّز (Pareto Breakpoints)
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-right px-5 py-2 font-medium">
                      أعلى نسبة من السماسرة
                    </th>
                    <th className="text-right px-5 py-2 font-medium">
                      عدد السماسرة
                    </th>
                    <th className="text-right px-5 py-2 font-medium">
                      عدد الإعلانات
                    </th>
                    <th className="text-right px-5 py-2 font-medium">
                      نصيبهم من الإعلانات
                    </th>
                    <th className="px-5 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {breakpoints.map((bp) => (
                    <tr key={bp.seller_percentile}>
                      <td className="px-5 py-2 font-bold text-gray-900">
                        {bp.seller_percentile}%
                      </td>
                      <td className="px-5 py-2">{bp.seller_count}</td>
                      <td className="px-5 py-2">{bp.listings_count}</td>
                      <td className="px-5 py-2 font-bold text-[#1B7A3D]">
                        {bp.listings_share}%
                      </td>
                      <td className="px-5 py-2">
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[#D4A843] h-full rounded-full transition-all"
                            style={{ width: `${bp.listings_share}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2">
              {(
                [
                  { key: "top20" as const, label: `🐋 الحيتان (${summary.top_20pct_seller_count})` },
                  {
                    key: "top50" as const,
                    label: `📈 أعلى 50% (${Math.ceil(summary.total_sellers * 0.5)})`,
                  },
                  { key: "all" as const, label: `📋 الكل (${summary.total_sellers})` },
                ]
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setTopNFilter(opt.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    topNFilter === opt.key
                      ? "bg-[#1B7A3D] text-white"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Whales Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium">#</th>
                    <th className="text-right px-4 py-3 font-medium">السمسار</th>
                    <th className="text-right px-4 py-3 font-medium">الموبايل</th>
                    <th className="text-right px-4 py-3 font-medium">المنصة</th>
                    <th className="text-right px-4 py-3 font-medium">إعلانات</th>
                    <th className="text-right px-4 py-3 font-medium">% فردي</th>
                    <th className="text-right px-4 py-3 font-medium">% تجميعي</th>
                    <th className="text-right px-4 py-3 font-medium">الحالة</th>
                    <th className="text-right px-4 py-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleWhales.map((w) => {
                    const status = w.pipeline_status || "discovered";
                    const stat = PIPELINE_LABELS[status] || PIPELINE_LABELS.discovered;
                    return (
                      <tr key={w.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold text-gray-700">
                          {w.rank}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {w.name || "—"}
                          </div>
                          {w.seller_tier && (
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {w.seller_tier}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {w.phone ? (
                            <button
                              onClick={() => copyPhone(w.phone!, w.id)}
                              className="flex items-center gap-1 text-gray-700 hover:text-[#1B7A3D] font-mono text-xs"
                              title="انسخ"
                            >
                              {copiedId === w.id ? (
                                <Check className="w-3 h-3 text-green-600" />
                              ) : (
                                <Copy className="w-3 h-3 opacity-50" />
                              )}
                              {w.phone}
                            </button>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {PLATFORM_LABELS[w.source_platform || ""] ||
                            w.source_platform ||
                            "—"}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          {w.total_listings_seen}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {w.individual_pct}%
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700 min-w-[3.5rem]">
                              {w.cumulative_pct}%
                            </span>
                            <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-[#D4A843] h-full"
                                style={{ width: `${w.cumulative_pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${stat.color}`}
                          >
                            <span>{stat.emoji}</span>
                            {stat.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openWhatsApp(w)}
                              disabled={!w.phone}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-30"
                              title="افتح WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => generateMagicLink(w)}
                              disabled={busyId === w.id || !w.phone}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30"
                              title="رابط دخول"
                            >
                              <Link2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateStatus(w.id, "contacted")}
                              disabled={busyId === w.id}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg disabled:opacity-30"
                              title="علّم: تم التواصل"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateStatus(w.id, "registered")}
                              disabled={busyId === w.id}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-30"
                              title="علّم: مسجّل"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateStatus(w.id, "rejected")}
                              disabled={busyId === w.id}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30"
                              title="علّم: رفض"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visibleWhales.length === 0 && (
                <div className="px-4 py-12 text-center text-gray-500">
                  لا يوجد سماسرة بهذا الفلتر
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Magic Link Modal */}
      {magicLinkOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setMagicLinkOpen(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              🔗 رابط دخول مولّد
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              للموبايل: <span className="font-mono">{magicLinkOpen.phone}</span>
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 break-all text-xs font-mono text-gray-700">
              {magicLinkOpen.url}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(magicLinkOpen.url);
                  setCopiedId("magic-link");
                  setTimeout(() => setCopiedId(null), 1500);
                }}
                className="flex-1 px-4 py-2 bg-[#1B7A3D] text-white rounded-lg font-medium hover:bg-[#145C2E] flex items-center justify-center gap-2"
              >
                {copiedId === "magic-link" ? (
                  <>
                    <Check className="w-4 h-4" />
                    تم النسخ
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    نسخ الرابط
                  </>
                )}
              </button>
              <button
                onClick={() => setMagicLinkOpen(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
