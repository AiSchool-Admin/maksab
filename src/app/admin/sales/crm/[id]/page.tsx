"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowRight, Phone, MessageSquare, Send, Pin, Check, Plus, Trash2,
  Clock, CheckCircle2, XCircle, AlertCircle, User, Building2,
  MapPin, Tag, TrendingUp, Copy, ExternalLink, Loader2, Edit3,
  ChevronRight, Calendar, Flag, Home, Car, Sparkles,
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";

// ─── Types ────────────────────────────────────────────────────────────
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
  first_outreach_at: string | null;
  last_outreach_at: string | null;
  last_response_at: string | null;
  user_id: string | null;
  created_at: string;
}

interface Listing {
  id: string;
  title: string | null;
  price: number | null;
  thumbnail_url: string | null;
  city: string | null;
  source_listing_url: string | null;
  source_platform: string | null;
  migration_status: string | null;
  maksab_listing_id: string | null;
}

interface Note {
  id: string;
  note_text: string;
  agent_name: string;
  is_pinned: boolean;
  created_at: string;
}

interface Task {
  id: string;
  task_text: string;
  agent_name: string;
  due_at: string | null;
  priority: string;
  status: string;
  completed_at: string | null;
  created_at: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  direction: "inbound" | "outbound" | "system";
  content: string;
  meta: Record<string, unknown>;
  timestamp: string;
}

interface SellerData {
  seller: Seller;
  listings: Listing[];
  notes: Note[];
  tasks: Task[];
  timeline: TimelineEvent[];
  stats: {
    listings_count: number;
    outreach_count: number;
    notes_count: number;
    pending_tasks: number;
    progress_percent: number;
    current_stage: string;
  };
}

// ─── Stage labels & colors ────────────────────────────────────────────
const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  discovered: { label: "مكتشف", color: "bg-gray-100 text-gray-700" },
  phone_found: { label: "تم إيجاد الرقم", color: "bg-blue-100 text-blue-700" },
  contacted_1: { label: "تواصل 1", color: "bg-indigo-100 text-indigo-700" },
  contacted_2: { label: "تواصل 2", color: "bg-purple-100 text-purple-700" },
  contacted: { label: "تم التواصل", color: "bg-purple-100 text-purple-700" },
  interested: { label: "مهتم", color: "bg-amber-100 text-amber-700" },
  considering: { label: "يفكر", color: "bg-yellow-100 text-yellow-700" },
  consented: { label: "وافق", color: "bg-lime-100 text-lime-700" },
  registered: { label: "✅ مسجّل", color: "bg-green-100 text-green-700" },
  rejected: { label: "رفض", color: "bg-red-100 text-red-700" },
  skipped: { label: "تم تخطيه", color: "bg-gray-100 text-gray-500" },
};

const ALL_STAGES = [
  "phone_found", "contacted_1", "contacted_2", "interested",
  "considering", "consented", "registered", "rejected",
];

// ─── Main Component ───────────────────────────────────────────────────
export default function SellerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<SellerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/sales/crm/${id}`, { headers: getAdminHeaders() });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "فشل تحميل البيانات");
      } else {
        setData(json);
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير معروف");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B7A3D]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-gray-800 font-bold">{error || "البائع غير موجود"}</p>
        <Link href="/admin/sales/crm" className="inline-block mt-4 text-[#1B7A3D] underline">
          العودة للقائمة
        </Link>
      </div>
    );
  }

  const { seller, listings, notes, tasks, timeline, stats } = data;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4" dir="rtl">
      {/* Header */}
      <SellerHeader seller={seller} stats={stats} onRefresh={fetchData} />

      {/* Single-column mobile, two-column desktop */}
      <div className="flex flex-col gap-4">
        {/* Message Composer — always first */}
        <MessageComposer sellerId={id} sellerPhone={seller.phone || ""} onSent={fetchData} />

        {/* Pipeline + Notes + Tasks — collapsible on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PipelineStageCard
            sellerId={id}
            currentStage={seller.pipeline_status}
            onChanged={fetchData}
          />
          <NotesCard sellerId={id} notes={notes} onChanged={fetchData} />
          <TasksCard sellerId={id} tasks={tasks} onChanged={fetchData} />
        </div>

        {/* Timeline */}
        <TimelineCard timeline={timeline} />

        {/* Listings */}
        <ListingsCard listings={listings} />
      </div>
    </div>
  );
}

// ─── Header with seller info + pipeline progress ──────────────────────
function SellerHeader({ seller, stats, onRefresh }: {
  seller: Seller;
  stats: SellerData["stats"];
  onRefresh: () => void;
}) {
  const stage = STAGE_LABELS[seller.pipeline_status || "discovered"]
    || { label: seller.pipeline_status || "غير محدد", color: "bg-gray-100 text-gray-700" };

  const CategoryIcon = seller.primary_category &&
    ["cars", "vehicles", "سيارات"].includes(seller.primary_category) ? Car : Home;

  const consentUrl = `/consent?seller=${seller.id}&ref=${
    ["cars", "vehicles", "سيارات"].includes(seller.primary_category || "") ? "waleed" : "ahmed"
  }`;

  return (
    <div className="bg-white rounded-xl border p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin/sales/crm" className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CategoryIcon className="w-5 h-5 text-[#1B7A3D] shrink-0" />
              <h1 className="text-lg md:text-xl font-bold truncate">
                {seller.name || "بائع بدون اسم"}
              </h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${stage.color} whitespace-nowrap`}>
                {stage.label}
              </span>
            </div>
            {seller.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-3.5 h-3.5" />
                <a href={`tel:${seller.phone}`} className="hover:underline font-mono" dir="ltr">
                  {seller.phone}
                </a>
                <button
                  onClick={() => navigator.clipboard.writeText(seller.phone || "")}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="نسخ الرقم"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 hover:bg-gray-100 rounded-lg shrink-0"
          title="تحديث"
        >
          <TrendingUp className="w-4 h-4" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="إعلانات" value={stats.listings_count} />
        <StatBox label="تواصل" value={stats.outreach_count} />
        <StatBox label="ملاحظات" value={stats.notes_count} />
        <StatBox label="مهام مفتوحة" value={stats.pending_tasks} />
      </div>

      {/* Pipeline progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>مرحلة الـ Pipeline</span>
          <span className="font-bold">{stats.progress_percent}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#1B7A3D] to-[#D4A843] transition-all duration-500"
            style={{ width: `${stats.progress_percent}%` }}
          />
        </div>
      </div>

      {/* Quick meta */}
      <div className="flex flex-wrap gap-2 mt-3 text-xs">
        {seller.source_platform && (
          <span className="px-2 py-1 bg-gray-50 rounded border">
            📍 {seller.source_platform}
          </span>
        )}
        {seller.primary_governorate && (
          <span className="px-2 py-1 bg-gray-50 rounded border flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {seller.primary_governorate}
          </span>
        )}
        {seller.detected_account_type && (
          <span className="px-2 py-1 bg-gray-50 rounded border">
            🏢 {seller.detected_account_type}
          </span>
        )}
        <a
          href={consentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-200 flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          رابط الموافقة
        </a>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-2 bg-gray-50 rounded-lg">
      <div className="text-lg font-bold text-[#1B7A3D]">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

// ─── Message Composer ────────────────────────────────────────────────
function MessageComposer({ sellerId, sellerPhone, onSent }: {
  sellerId: string;
  sellerPhone: string;
  onSent: () => void;
}) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Format phone for wa.me link (201xxxxxxxxx)
  const waPhone = sellerPhone
    ? (sellerPhone.startsWith("0") ? "2" + sellerPhone : sellerPhone).replace(/\D/g, "")
    : "";

  const openWhatsApp = () => {
    if (!content.trim() || !waPhone) return;
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(content)}`;
    window.open(url, "_blank");
    logManualSend("whatsapp_manual");
  };

  const openSms = () => {
    if (!content.trim() || !sellerPhone) return;
    const url = `sms:${sellerPhone}?body=${encodeURIComponent(content)}`;
    window.open(url, "_blank");
    logManualSend("sms_manual");
  };

  const callSeller = () => {
    if (!sellerPhone) return;
    window.open(`tel:${sellerPhone}`, "_blank");
    logManualSend("call");
  };

  const sendViaApi = async () => {
    if (!content.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/sales/crm/${sellerId}/message`, {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ content, channel: "auto" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setResult({ ok: true, msg: `✅ تم الإرسال عبر ${json.channel}` });
        setContent("");
        setTimeout(onSent, 500);
      } else {
        setResult({ ok: false, msg: `❌ ${json.error || "فشل الإرسال"}` });
      }
    } catch (e) {
      setResult({ ok: false, msg: `❌ ${e instanceof Error ? e.message : "خطأ"}` });
    } finally {
      setSending(false);
    }
  };

  const logManualSend = async (channel: string) => {
    setResult({ ok: true, msg: `✅ تم فتح ${channel === "whatsapp_manual" ? "واتساب" : channel === "sms_manual" ? "SMS" : "الاتصال"}` });
    try {
      await fetch(`/api/admin/sales/crm/${sellerId}/stage`, {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "contacted_1",
          agent_name: "agent",
          reason: `[${channel}] ${content.substring(0, 100)}`,
        }),
      });
      setTimeout(onSent, 1000);
    } catch { /* ignore */ }
  };

  const copyConsent = () => {
    const ref = "ahmed";
    const url = `https://maksab.vercel.app/consent?seller=${sellerId}&ref=${ref}`;
    navigator.clipboard.writeText(url);
    setResult({ ok: true, msg: "✅ تم نسخ رابط الموافقة" });
  };

  if (!sellerPhone) {
    return (
      <div className="bg-white rounded-xl border p-4">
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          لا يوجد رقم تليفون لهذا البائع
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <Send className="w-4 h-4 text-[#1B7A3D]" />
        إرسال رسالة
      </h2>

      {/* Quick templates — shown first for fast selection */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {QUICK_TEMPLATES.map((tpl, i) => (
          <button
            key={i}
            onClick={() => setContent(tpl.body)}
            className={`text-xs px-2.5 py-1.5 rounded-full border transition ${
              content === tpl.body
                ? "bg-[#1B7A3D] text-white border-[#1B7A3D]"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {tpl.title}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="اكتب رسالتك هنا أو اختر قالب..."
        rows={4}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B7A3D] resize-none"
      />

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {/* Primary: WhatsApp Manual */}
        <button
          onClick={openWhatsApp}
          disabled={!content.trim()}
          className="px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-bold hover:bg-[#1da851] disabled:opacity-40 flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          واتساب
        </button>

        {/* SMS Manual */}
        <button
          onClick={openSms}
          disabled={!content.trim()}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          SMS
        </button>

        {/* Call */}
        <button
          onClick={callSeller}
          className="px-3 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-800 flex items-center gap-2"
        >
          <Phone className="w-4 h-4" />
          اتصال
        </button>

        {/* Copy Consent Link */}
        <button
          onClick={copyConsent}
          className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          نسخ رابط الموافقة
        </button>

        {/* Auto API send (when channels are configured) */}
        <button
          onClick={sendViaApi}
          disabled={sending || !content.trim()}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 disabled:opacity-40 flex items-center gap-2"
          title="إرسال تلقائي عبر API (يحتاج WAHA أو SMS Misr)"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          API تلقائي
        </button>

        <span className="text-xs text-gray-400 mr-auto">
          {content.length} حرف
        </span>
      </div>

      {result && (
        <div className={`mt-2 text-sm px-3 py-2 rounded-lg ${
          result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {result.msg}
        </div>
      )}
    </div>
  );
}

const QUICK_TEMPLATES = [
  {
    title: "تواصل أول (عقارات)",
    body: "السلام عليكم،\nمعاك أحمد من مكسب — منصة عقارية مصرية جديدة.\nشفنا إعلاناتك على دوبيزل وممكن نساعدك تنقلها لمكسب مجاناً.\nيهمك نتكلم 5 دقايق؟",
  },
  {
    title: "تواصل أول (سيارات)",
    body: "السلام عليكم،\nمعاك وليد من مكسب — منصة سيارات مصرية جديدة.\nشفنا إعلاناتك وممكن نساعدك تبيع أسرع وبدون عمولات.\nيهمك نتكلم 5 دقايق؟",
  },
  {
    title: "متابعة بعد 48 ساعة",
    body: "أهلاً،\nبعدت رسالتي قبل كده عن منصة مكسب. لو يهمك نسجلك مجاناً، الرابط جاهز.\nأو ابعتلي \"مش دلوقتي\" وهسيبك.",
  },
  {
    title: "رد على \"كام الاشتراك؟\"",
    body: "الاشتراك مجاني تماماً حالياً (فترة الإطلاق).\nبعد 3 شهور هيكون فيه باقات اختيارية تبدأ من 299 جنيه/شهر.\nأنت في فترة الـ early adopter → Gold مجاني سنة كاملة.",
  },
  {
    title: "شكر على التسجيل",
    body: "مبروك التسجيل! 🎉\nأنا جاهز أساعدك في أول 3 إعلانات.\nهل معاد 15 دقيقة تليفون مناسب النهاردة أو بكرة؟",
  },
];

// ─── Timeline ────────────────────────────────────────────────────────
function TimelineCard({ timeline }: { timeline: TimelineEvent[] }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#1B7A3D]" />
        سجل المحادثة ({timeline.length})
      </h2>

      {timeline.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-8">
          لا يوجد سجل بعد
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {timeline.map((event) => (
            <TimelineItem key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const isInbound = event.direction === "inbound";
  const isOutbound = event.direction === "outbound";
  const alignment = isInbound ? "justify-start" : isOutbound ? "justify-end" : "justify-center";
  const bgColor = isInbound ? "bg-gray-100"
    : isOutbound ? "bg-[#E8F5E9] border-[#1B7A3D]/20"
    : "bg-amber-50 border-amber-200";

  return (
    <div className={`flex ${alignment}`}>
      <div className={`max-w-[75%] p-2.5 rounded-lg border ${bgColor}`}>
        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
          {isInbound && <MessageSquare className="w-3 h-3" />}
          {isOutbound && <Send className="w-3 h-3" />}
          {!isInbound && !isOutbound && <Sparkles className="w-3 h-3" />}
          <span>{event.type}</span>
          <span className="mr-auto">•</span>
          <span>
            {new Date(event.timestamp).toLocaleString("ar-EG", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </div>
        <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
          {event.content}
        </div>
      </div>
    </div>
  );
}

// ─── Listings ────────────────────────────────────────────────────────
function ListingsCard({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-4 text-sm text-gray-400 text-center">
        لا توجد إعلانات محصدة
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <Tag className="w-4 h-4 text-[#1B7A3D]" />
        الإعلانات ({listings.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {listings.slice(0, 10).map((l) => (
          <ListingItem key={l.id} listing={l} />
        ))}
      </div>
      {listings.length > 10 && (
        <div className="text-center text-xs text-gray-400 mt-2">
          + {listings.length - 10} إعلان آخر
        </div>
      )}
    </div>
  );
}

function ListingItem({ listing }: { listing: Listing }) {
  const migrated = listing.migration_status === "migrated";
  return (
    <div className="p-2 border rounded-lg hover:bg-gray-50 transition">
      <div className="flex items-start gap-2">
        {listing.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.thumbnail_url}
            alt={listing.title || "إعلان"}
            className="w-14 h-14 object-cover rounded shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 line-clamp-1">
            {listing.title || "بدون عنوان"}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
            {listing.price && <span className="font-bold text-[#1B7A3D]">{listing.price.toLocaleString()} جنيه</span>}
            {listing.city && <span>• {listing.city}</span>}
          </div>
          <div className="flex items-center gap-1 mt-1">
            {migrated && (
              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                ✅ منقول
              </span>
            )}
            {listing.source_listing_url && (
              <a
                href={listing.source_listing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                الأصلي
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline Stage Quick Changer ────────────────────────────────────
function PipelineStageCard({ sellerId, currentStage, onChanged }: {
  sellerId: string;
  currentStage: string | null;
  onChanged: () => void;
}) {
  const [changing, setChanging] = useState(false);

  const change = async (stage: string) => {
    setChanging(true);
    try {
      await fetch(`/api/admin/sales/crm/${sellerId}/stage`, {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      onChanged();
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border p-4">
      <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-[#1B7A3D]" />
        تغيير المرحلة
      </h2>
      <div className="grid grid-cols-2 gap-1.5">
        {ALL_STAGES.map((stage) => {
          const meta = STAGE_LABELS[stage];
          const isCurrent = stage === currentStage;
          return (
            <button
              key={stage}
              onClick={() => !isCurrent && change(stage)}
              disabled={changing || isCurrent}
              className={`text-xs px-2 py-1.5 rounded border transition ${
                isCurrent
                  ? `${meta.color} border-current font-bold`
                  : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
              }`}
            >
              {isCurrent && "✓ "}
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Notes ───────────────────────────────────────────────────────────
function NotesCard({ sellerId, notes, onChanged }: {
  sellerId: string;
  notes: Note[];
  onChanged: () => void;
}) {
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!newNote.trim()) return;
    setAdding(true);
    try {
      await fetch(`/api/admin/sales/crm/${sellerId}/note`, {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ note_text: newNote }),
      });
      setNewNote("");
      onChanged();
    } finally {
      setAdding(false);
    }
  };

  const togglePin = async (note: Note) => {
    await fetch(`/api/admin/sales/crm/${sellerId}/note?note_id=${note.id}`, {
      method: "PATCH",
      headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: !note.is_pinned }),
    });
    onChanged();
  };

  const del = async (note: Note) => {
    if (!confirm("تحذف الملاحظة؟")) return;
    await fetch(`/api/admin/sales/crm/${sellerId}/note?note_id=${note.id}`, {
      method: "DELETE",
      headers: getAdminHeaders(),
    });
    onChanged();
  };

  return (
    <div className="bg-white rounded-xl border p-4">
      <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <Edit3 className="w-4 h-4 text-[#1B7A3D]" />
        ملاحظات ({notes.length})
      </h2>

      <div className="flex gap-1 mb-3">
        <input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="ضف ملاحظة..."
          className="flex-1 px-2 py-1.5 text-sm border rounded-lg"
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button
          onClick={add}
          disabled={adding || !newNote.trim()}
          className="px-3 bg-[#1B7A3D] text-white rounded-lg disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center text-xs text-gray-400 py-3">
          لا توجد ملاحظات
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`p-2 rounded-lg border text-sm ${
                note.is_pinned ? "bg-amber-50 border-amber-200" : "bg-gray-50"
              }`}
            >
              <div className="text-gray-800 whitespace-pre-wrap break-words">
                {note.note_text}
              </div>
              <div className="flex items-center justify-between mt-1.5 text-xs text-gray-500">
                <span>{note.agent_name} • {new Date(note.created_at).toLocaleDateString("ar-EG")}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => togglePin(note)}
                    className={`p-0.5 rounded hover:bg-gray-200 ${note.is_pinned ? "text-amber-600" : ""}`}
                    title={note.is_pinned ? "إلغاء التثبيت" : "تثبيت"}
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                  <button onClick={() => del(note)} className="p-0.5 rounded hover:bg-red-100 text-red-600">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tasks ───────────────────────────────────────────────────────────
function TasksCard({ sellerId, tasks, onChanged }: {
  sellerId: string;
  tasks: Task[];
  onChanged: () => void;
}) {
  const [newTask, setNewTask] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!newTask.trim()) return;
    setAdding(true);
    try {
      await fetch(`/api/admin/sales/crm/${sellerId}/task`, {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          task_text: newTask,
          due_at: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });
      setNewTask("");
      setDueDate("");
      onChanged();
    } finally {
      setAdding(false);
    }
  };

  const complete = async (task: Task) => {
    await fetch(`/api/admin/sales/crm/${sellerId}/task?task_id=${task.id}`, {
      method: "PATCH",
      headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    onChanged();
  };

  const del = async (task: Task) => {
    await fetch(`/api/admin/sales/crm/${sellerId}/task?task_id=${task.id}`, {
      method: "DELETE",
      headers: getAdminHeaders(),
    });
    onChanged();
  };

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <div className="bg-white rounded-xl border p-4">
      <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-[#1B7A3D]" />
        مهام المتابعة ({pendingTasks.length})
      </h2>

      <div className="space-y-1 mb-3">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="المهمة..."
          className="w-full px-2 py-1.5 text-sm border rounded-lg"
        />
        <div className="flex gap-1">
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="flex-1 px-2 py-1.5 text-xs border rounded-lg"
          />
          <button
            onClick={add}
            disabled={adding || !newTask.trim()}
            className="px-3 bg-[#1B7A3D] text-white rounded-lg disabled:opacity-50 text-sm"
          >
            إضافة
          </button>
        </div>
      </div>

      {pendingTasks.length > 0 && (
        <div className="space-y-1 mb-3">
          {pendingTasks.map((task) => (
            <div key={task.id} className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <div className="flex items-start gap-2">
                <button
                  onClick={() => complete(task)}
                  className="mt-0.5 w-4 h-4 rounded border-2 border-gray-400 hover:border-green-600 hover:bg-green-100"
                  title="إكمال"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-gray-800">{task.task_text}</div>
                  {task.due_at && (
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(task.due_at).toLocaleString("ar-EG", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
                <button onClick={() => del(task)} className="text-red-500 hover:bg-red-100 rounded p-0.5">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {completedTasks.length > 0 && (
        <details className="text-xs">
          <summary className="text-gray-500 cursor-pointer hover:text-gray-800">
            مكتملة ({completedTasks.length})
          </summary>
          <div className="mt-2 space-y-1">
            {completedTasks.map((task) => (
              <div key={task.id} className="p-1.5 text-gray-400 line-through flex items-center gap-2">
                <Check className="w-3 h-3 text-green-600" />
                <span className="flex-1 truncate">{task.task_text}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
