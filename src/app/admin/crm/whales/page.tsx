"use client";

/**
 * /admin/crm/whales — Pareto-driven merchant list for personal-touch outreach
 *
 * Surfaces brokerages (NOT individual phone numbers) ranked by total
 * listings. A brokerage like "Remax Avalon" with 5 agents on 5 phones
 * shows as ONE row holding 5 listings, not 5 separate rows. Per-row:
 *   • Copy admin phone
 *   • Open WhatsApp with prefilled Ahmed message
 *   • Generate magic link for the admin phone seller
 *   • Mark contacted / interested / registered / rejected (whole merchant)
 *   • Expand to see all phones + override which one is the admin
 */

import { useState, useEffect, useCallback, Fragment } from "react";
import Link from "next/link";
import { getAdminHeaders } from "@/app/admin/layout";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  MessageCircle,
  Link2,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  Mail,
  Crown,
  StickyNote,
  Send,
  Clock,
} from "lucide-react";

interface MerchantPhone {
  seller_id: string;
  phone: string | null;
  listings: number;
  pipeline_status: string | null;
  last_outreach_at: string | null;
}

interface Merchant {
  merchant_key: string;
  display_name: string;
  primary_governorate: string | null;
  source_platform: string | null;
  admin_phone: string | null;
  admin_phone_overridden: boolean;
  total_listings: number;
  phones: MerchantPhone[];
  pipeline_status: string;
  last_outreach_at: string | null;
  outreach_count: number;
  whale_score: number;
  seller_ids: string[];
  rank: number;
  individual_pct: number;
  cumulative_pct: number;
}

interface Breakpoint {
  merchant_percentile: number;
  merchant_count: number;
  listings_count: number;
  listings_share: number;
}

interface Summary {
  total_merchants: number;
  total_sellers: number;
  total_listings: number;
  pareto_80_merchant_count: number;
  pareto_80_merchant_share: number;
  pareto_80_listings: number;
  top_20pct_merchant_count: number;
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
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [topNFilter, setTopNFilter] = useState<"top20" | "top50" | "all">(
    "top20"
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [magicLinkOpen, setMagicLinkOpen] = useState<{
    merchantKey: string;
    url: string;
    phone: string;
  } | null>(null);

  // Notes / Activity timeline modal — opened per merchant.
  interface ActivityNote {
    id: string;
    seller_id: string;
    agent_name: string;
    note_text: string;
    is_pinned: boolean;
    created_at: string;
  }
  interface ActivityEvent {
    id: string;
    seller_id: string;
    action: string;
    notes: string | null;
    created_at: string;
  }
  const [notesOpen, setNotesOpen] = useState<Merchant | null>(null);
  const [notesData, setNotesData] = useState<{
    notes: ActivityNote[];
    activities: ActivityEvent[];
  } | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);

  const openNotesModal = useCallback(async (m: Merchant) => {
    setNotesOpen(m);
    setNotesData(null);
    setNotesDraft("");
    setNotesLoading(true);
    try {
      const headers = getAdminHeaders();
      const params = new URLSearchParams({ seller_ids: m.seller_ids.join(",") });
      const res = await fetch(`/api/admin/crm/whales/activity?${params}`, {
        headers,
      });
      if (res.ok) {
        const json = await res.json();
        setNotesData({
          notes: json.notes || [],
          activities: json.activities || [],
        });
      }
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
    setNotesLoading(false);
  }, []);

  const saveNote = useCallback(async () => {
    if (!notesOpen || !notesDraft.trim()) return;
    setNotesSaving(true);
    try {
      const headers = {
        ...getAdminHeaders(),
        "Content-Type": "application/json",
      };
      const res = await fetch("/api/admin/crm/whales/activity", {
        method: "POST",
        headers,
        body: JSON.stringify({
          seller_ids: notesOpen.seller_ids,
          note_text: notesDraft.trim(),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setNotesData((prev) =>
          prev
            ? { ...prev, notes: [json.note, ...prev.notes] }
            : { notes: [json.note], activities: [] }
        );
        setNotesDraft("");
      } else {
        const json = await res.json();
        alert(json.error || "فشل في الحفظ");
      }
    } catch (err) {
      console.error(err);
    }
    setNotesSaving(false);
  }, [notesOpen, notesDraft]);

  const fetchMerchants = useCallback(async () => {
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
        setMerchants(json.merchants || []);
        setSummary(json.summary || null);
        setBreakpoints(json.breakpoints || []);
      }
    } catch (err) {
      console.error("Failed to fetch merchants:", err);
    }
    setLoading(false);
  }, [category]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  const visibleMerchants: Merchant[] = (() => {
    if (!summary) return merchants;
    if (topNFilter === "top20")
      return merchants.slice(0, summary.top_20pct_merchant_count);
    if (topNFilter === "top50")
      return merchants.slice(0, Math.ceil(summary.total_merchants * 0.5));
    return merchants;
  })();

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const buildAhmedMessage = (m: Merchant) => {
    const sellerName = m.display_name?.trim() || "حضرتك";
    const platform =
      PLATFORM_LABELS[m.source_platform || ""] || m.source_platform || "إعلانك";
    return `أهلاً ${sellerName}! 🏠
أنا أحمد من مكسب — أول سوق إلكتروني مصري متخصص في العقارات بنظام المزادات والمقايضة.

شفت إعلانك على ${platform} وحسيت إن مكسب هيفيدك:
✅ مجاني للبداية — مفيش أي خسارة
✅ مزادات عقارية (مش موجودة في أي منصة تانية)
✅ وصول لآلاف المشترين في الإسكندرية
✅ عمولة طوعية بس — مش إجبارية

سجّل دلوقتي في 3 دقائق: https://maksab.vercel.app`;
  };

  const openWhatsApp = (m: Merchant) => {
    if (!m.admin_phone) return;
    const cleaned = m.admin_phone.replace(/\D/g, "");
    const intl = cleaned.startsWith("20") ? cleaned : `2${cleaned}`;
    const text = encodeURIComponent(buildAhmedMessage(m));
    window.open(`https://wa.me/${intl}?text=${text}`, "_blank");
  };

  const generateMagicLink = async (m: Merchant) => {
    // Magic link is keyed off seller_id; pick the seller whose phone is
    // the admin phone (or the first phone holder).
    const adminSeller =
      m.phones.find((p) => p.phone === m.admin_phone) || m.phones[0];
    if (!adminSeller) return;
    setBusyKey(m.merchant_key);
    try {
      const headers = {
        ...getAdminHeaders(),
        "Content-Type": "application/json",
      };
      const res = await fetch("/api/admin/sales/magic-link", {
        method: "POST",
        headers,
        body: JSON.stringify({ seller_id: adminSeller.seller_id }),
      });
      const json = await res.json();
      if (res.ok && json.url) {
        setMagicLinkOpen({
          merchantKey: m.merchant_key,
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
    setBusyKey(null);
  };

  const updateStatus = async (m: Merchant, pipeline_status: string) => {
    setBusyKey(m.merchant_key);
    try {
      const headers = {
        ...getAdminHeaders(),
        "Content-Type": "application/json",
      };
      const res = await fetch("/api/admin/crm/whales", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          seller_ids: m.seller_ids,
          pipeline_status,
        }),
      });
      if (res.ok) {
        await fetchMerchants();
      } else {
        const json = await res.json();
        alert(json.error || "فشل في التحديث");
      }
    } catch (err) {
      console.error(err);
    }
    setBusyKey(null);
  };

  const overrideAdminPhone = async (m: Merchant, phone: string | null) => {
    setBusyKey(m.merchant_key);
    try {
      const headers = {
        ...getAdminHeaders(),
        "Content-Type": "application/json",
      };
      const res = await fetch("/api/admin/crm/whales", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          seller_ids: m.seller_ids,
          admin_phone: phone,
        }),
      });
      if (res.ok) {
        await fetchMerchants();
      } else {
        const json = await res.json();
        alert(json.error || "فشل في التحديث");
      }
    } catch (err) {
      console.error(err);
    }
    setBusyKey(null);
  };

  const exportCsv = () => {
    const rows = [
      ["rank", "merchant", "admin_phone", "platform", "listings", "phones_count", "share_%", "cum_%", "status"].join(","),
      ...visibleMerchants.map((m) =>
        [
          m.rank,
          (m.display_name || "").replace(/,/g, " "),
          m.admin_phone || "",
          PLATFORM_LABELS[m.source_platform || ""] || m.source_platform || "",
          m.total_listings,
          m.phones.length,
          m.individual_pct,
          m.cumulative_pct,
          m.pipeline_status || "discovered",
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
                أكبر السماسرة (مجموعين بالشركة) في الإسكندرية
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
              onClick={fetchMerchants}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="تحديث"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={exportCsv}
              disabled={visibleMerchants.length === 0}
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
        ) : !summary || summary.total_merchants === 0 ? (
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
                    {summary.pareto_80_merchant_count} شركة
                  </p>
                  <p className="text-sm opacity-90 mt-1">
                    ({summary.pareto_80_merchant_share}% من الشركات) عندهم{" "}
                    <b>80%</b> من الإعلانات
                  </p>
                </div>
                <div>
                  <p className="text-sm opacity-80 mb-1">أعلى 20% (الحيتان)</p>
                  <p className="text-3xl font-bold">
                    {summary.top_20pct_merchant_count} شركة
                  </p>
                  <p className="text-sm opacity-90 mt-1">
                    عندهم {summary.top_20pct_listings_share}% من الإعلانات (
                    {summary.top_20pct_listings} إعلان)
                  </p>
                </div>
                <div>
                  <p className="text-sm opacity-80 mb-1">تقدّم التواصل</p>
                  <p className="text-3xl font-bold">
                    {summary.top_20pct_contacted} / {summary.top_20pct_merchant_count}
                  </p>
                  <p className="text-sm opacity-90 mt-1">
                    تم التواصل · مسجّل: {summary.top_20pct_consented}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20 text-xs opacity-80">
                إجمالي: {summary.total_merchants} شركة من{" "}
                {summary.total_sellers} حساب موبايل · {summary.total_listings}{" "}
                إعلان
              </div>
            </div>

            {/* Breakpoint Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-bold text-gray-700">
                  📊 توزيع التركّز (Pareto Breakpoints)
                </h2>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-right px-5 py-2 font-medium">
                      أعلى نسبة من الشركات
                    </th>
                    <th className="text-right px-5 py-2 font-medium">
                      عدد الشركات
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
                    <tr key={bp.merchant_percentile}>
                      <td className="px-5 py-2 font-bold text-gray-900">
                        {bp.merchant_percentile}%
                      </td>
                      <td className="px-5 py-2">{bp.merchant_count}</td>
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
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  {
                    key: "top20" as const,
                    label: `🐋 الحيتان (${summary.top_20pct_merchant_count})`,
                  },
                  {
                    key: "top50" as const,
                    label: `📈 أعلى 50% (${Math.ceil(summary.total_merchants * 0.5)})`,
                  },
                  {
                    key: "all" as const,
                    label: `📋 الكل (${summary.total_merchants})`,
                  },
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

            {/* Merchants Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="text-right px-3 py-3 font-medium w-8"></th>
                    <th className="text-right px-3 py-3 font-medium">#</th>
                    <th className="text-right px-3 py-3 font-medium">
                      الشركة / السمسار
                    </th>
                    <th className="text-right px-3 py-3 font-medium">
                      موبايل الأدمن
                    </th>
                    <th className="text-right px-3 py-3 font-medium hidden lg:table-cell">المنصة</th>
                    <th className="text-right px-3 py-3 font-medium">إعلانات</th>
                    <th className="text-right px-3 py-3 font-medium hidden md:table-cell">أرقام</th>
                    <th className="text-right px-3 py-3 font-medium hidden lg:table-cell">% تجميعي</th>
                    <th className="text-right px-3 py-3 font-medium">الحالة</th>
                    <th className="text-right px-3 py-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleMerchants.map((m) => {
                    const stat =
                      PIPELINE_LABELS[m.pipeline_status] ||
                      PIPELINE_LABELS.discovered;
                    const isExpanded = !!expanded[m.merchant_key];
                    const hasMultiplePhones = m.phones.length > 1;
                    return (
                      <Fragment key={m.merchant_key}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-3 py-3">
                            {hasMultiplePhones ? (
                              <button
                                onClick={() =>
                                  setExpanded((prev) => ({
                                    ...prev,
                                    [m.merchant_key]: !prev[m.merchant_key],
                                  }))
                                }
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                title={
                                  isExpanded ? "طي الأرقام" : "عرض كل الأرقام"
                                }
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 font-bold text-gray-700">
                            {m.rank}
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-medium text-gray-900">
                              {m.display_name || "—"}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            {m.admin_phone ? (
                              <button
                                onClick={() =>
                                  copy(m.admin_phone!, m.merchant_key + ":phone")
                                }
                                className="flex items-center gap-1 text-gray-700 hover:text-[#1B7A3D] font-mono text-xs"
                                title="انسخ"
                              >
                                {copiedKey === m.merchant_key + ":phone" ? (
                                  <Check className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3 opacity-50" />
                                )}
                                {m.admin_phone}
                                {m.admin_phone_overridden && (
                                  <span title="مختار يدوياً">
                                    <Crown className="w-3 h-3 text-amber-500" />
                                  </span>
                                )}
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600 hidden lg:table-cell">
                            {PLATFORM_LABELS[m.source_platform || ""] ||
                              m.source_platform ||
                              "—"}
                          </td>
                          <td className="px-3 py-3 font-bold text-gray-900">
                            {m.total_listings}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600 hidden md:table-cell">
                            {m.phones.length}
                          </td>
                          <td className="px-3 py-3 text-xs hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 min-w-[3.5rem]">
                                {m.cumulative_pct}%
                              </span>
                              <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-[#D4A843] h-full"
                                  style={{ width: `${m.cumulative_pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${stat.color}`}
                            >
                              <span>{stat.emoji}</span>
                              {stat.label}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openWhatsApp(m)}
                                disabled={!m.admin_phone}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-30"
                                title="افتح WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => generateMagicLink(m)}
                                disabled={
                                  busyKey === m.merchant_key || !m.admin_phone
                                }
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30"
                                title="رابط دخول"
                              >
                                <Link2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => updateStatus(m, "contacted")}
                                disabled={busyKey === m.merchant_key}
                                className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg disabled:opacity-30"
                                title="علّم: تم التواصل"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => updateStatus(m, "registered")}
                                disabled={busyKey === m.merchant_key}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-30"
                                title="علّم: مسجّل"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => updateStatus(m, "rejected")}
                                disabled={busyKey === m.merchant_key}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30"
                                title="علّم: رفض"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openNotesModal(m)}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg"
                                title="ملاحظات وسجل التواصل"
                              >
                                <StickyNote className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && hasMultiplePhones && (
                          <tr className="bg-gray-50/50">
                            <td colSpan={10} className="px-6 py-3">
                              <div className="text-xs font-medium text-gray-500 mb-2">
                                {m.phones.length} رقم تواصل — اختر أيهم admin:
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {m.phones.map((p) => {
                                  const isAdmin = p.phone === m.admin_phone;
                                  return (
                                    <div
                                      key={p.seller_id}
                                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${
                                        isAdmin
                                          ? "bg-amber-50 border-amber-200"
                                          : "bg-white border-gray-200"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {isAdmin && (
                                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                                        )}
                                        <span className="font-mono text-xs">
                                          {p.phone || "—"}
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                          ({p.listings} إعلان)
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() =>
                                            p.phone &&
                                            copy(
                                              p.phone,
                                              m.merchant_key + ":" + p.seller_id
                                            )
                                          }
                                          className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                          title="انسخ"
                                        >
                                          {copiedKey ===
                                          m.merchant_key + ":" + p.seller_id ? (
                                            <Check className="w-3 h-3 text-green-600" />
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                        </button>
                                        {!isAdmin && p.phone && (
                                          <button
                                            onClick={() =>
                                              overrideAdminPhone(m, p.phone!)
                                            }
                                            disabled={busyKey === m.merchant_key}
                                            className="text-[10px] px-2 py-0.5 bg-[#1B7A3D] text-white rounded hover:bg-[#145C2E] disabled:opacity-50"
                                          >
                                            اجعله admin
                                          </button>
                                        )}
                                        {isAdmin && m.admin_phone_overridden && (
                                          <button
                                            onClick={() =>
                                              overrideAdminPhone(m, null)
                                            }
                                            disabled={busyKey === m.merchant_key}
                                            className="text-[10px] px-2 py-0.5 text-amber-700 hover:bg-amber-100 rounded"
                                            title="إلغاء الاختيار اليدوي"
                                          >
                                            إلغاء
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
              {visibleMerchants.length === 0 && (
                <div className="px-4 py-12 text-center text-gray-500">
                  لا يوجد شركات بهذا الفلتر
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
                  setCopiedKey("magic-link");
                  setTimeout(() => setCopiedKey(null), 1500);
                }}
                className="flex-1 px-4 py-2 bg-[#1B7A3D] text-white rounded-lg font-medium hover:bg-[#145C2E] flex items-center justify-center gap-2"
              >
                {copiedKey === "magic-link" ? (
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

      {/* Notes / Activity Modal */}
      {notesOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setNotesOpen(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  📝 {notesOpen.display_name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {notesOpen.total_listings} إعلان · {notesOpen.phones.length}{" "}
                  رقم
                </p>
              </div>
              <button
                onClick={() => setNotesOpen(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Compose */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="اكتب ملاحظة عن المكالمة، النتيجة، أو التالي..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20 focus:border-[#1B7A3D]"
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={saveNote}
                  disabled={!notesDraft.trim() || notesSaving}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1B7A3D] text-white rounded-lg text-sm font-medium hover:bg-[#145C2E] disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {notesSaving ? "جاري الحفظ..." : "حفظ"}
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {notesLoading ? (
                <div className="text-center text-gray-500 py-8 text-sm">
                  جاري التحميل...
                </div>
              ) : !notesData ||
                (notesData.notes.length === 0 &&
                  notesData.activities.length === 0) ? (
                <div className="text-center text-gray-500 py-8 text-sm">
                  لا توجد ملاحظات أو سجل تواصل بعد
                </div>
              ) : (
                <>
                  {notesData.notes.map((n) => (
                    <div
                      key={"n:" + n.id}
                      className="bg-yellow-50 border border-yellow-100 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                        <span className="flex items-center gap-1">
                          <StickyNote className="w-3 h-3" />
                          {n.agent_name}
                        </span>
                        <span>{formatDate(n.created_at)}</span>
                      </div>
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">
                        {n.note_text}
                      </div>
                    </div>
                  ))}
                  {notesData.activities.map((a) => (
                    <div
                      key={"a:" + a.id}
                      className="bg-gray-50 border border-gray-100 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {translateAction(a.action)}
                        </span>
                        <span>{formatDate(a.created_at)}</span>
                      </div>
                      {a.notes && (
                        <div className="text-xs text-gray-600 font-mono">
                          {a.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers for the notes modal ─── */

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "الآن";
    if (diffMin < 60) return `منذ ${diffMin} د`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `منذ ${diffH} س`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `منذ ${diffD} يوم`;
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function translateAction(action: string): string {
  // outreach_logs.action values written by PATCH whales:
  //   status:contacted / status:registered / status:rejected / ...
  //   admin_phone:set / admin_phone:cleared
  if (action === "admin_phone:set") return "تعيين رقم admin";
  if (action === "admin_phone:cleared") return "إلغاء رقم admin";
  if (action.startsWith("status:")) {
    const s = action.slice("status:".length);
    const map: Record<string, string> = {
      discovered: "جديد",
      phone_found: "رقم متاح",
      contacted: "تم التواصل",
      interested: "مهتم",
      registered: "مسجّل",
      rejected: "رفض",
      not_reachable: "متعذر الوصول",
    };
    return `الحالة → ${map[s] || s}`;
  }
  // Legacy outreach actions from the broader CRM (sent / interested / etc.)
  const legacy: Record<string, string> = {
    sent: "رسالة مُرسَلة",
    skipped: "تم التخطي",
    interested: "أبدى اهتمامه",
    considering: "يفكّر",
    rejected: "رفض",
  };
  return legacy[action] || action;
}
