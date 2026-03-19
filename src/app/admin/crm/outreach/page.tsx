"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import {
  Users,
  Phone,
  MapPin,
  Search,
  MessageCircle,
  Send,
  X,
  Bot,
  User,
  TrendingUp,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
} from "lucide-react";

// ─── Types ───

interface Seller {
  id: string;
  name: string | null;
  phone: string | null;
  primary_category: string | null;
  primary_governorate: string | null;
  source_platform: string | null;
  whale_score: number;
  is_whale: boolean;
  seller_tier: string;
  pipeline_status: string;
  total_listings_seen: number;
  active_listings: number;
  is_business: boolean;
  is_verified: boolean;
  first_outreach_at: string | null;
  last_response_at: string | null;
  created_at: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface OutreachStats {
  total_sellers: number;
  with_phone: number;
  without_phone: number;
  whales: number;
  big: number;
  medium: number;
  small: number;
  visitor: number;
  medium_with_phone: number;
  big_with_phone: number;
  small_with_phone: number;
  contacted: number;
  signed_up: number;
}

// ─── Constants ───

const CATEGORY_AR: Record<string, string> = {
  phones: "موبايلات",
  vehicles: "سيارات",
  properties: "عقارات",
  electronics: "إلكترونيات",
  furniture: "أثاث",
  fashion: "ملابس",
  gold: "ذهب وفضة",
  luxury: "سلع فاخرة",
  appliances: "أجهزة منزلية",
  hobbies: "هوايات",
  tools: "عدد وأدوات",
  services: "خدمات",
  scrap: "خردة",
  cars: "سيارات",
  real_estate: "عقارات",
};

const TIER_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  whale: { label: "حوت", color: "bg-purple-100 text-purple-700", icon: "🐋" },
  big: { label: "كبير", color: "bg-indigo-100 text-indigo-700", icon: "💪" },
  medium: { label: "متوسط", color: "bg-blue-100 text-blue-700", icon: "📦" },
  small: { label: "صغير", color: "bg-sky-100 text-sky-700", icon: "🔹" },
  visitor: { label: "زائر", color: "bg-gray-100 text-gray-600", icon: "👁️" },
  premium_merchant: { label: "تاجر مميز", color: "bg-blue-100 text-blue-700", icon: "🏪" },
  regular_merchant: { label: "تاجر عادي", color: "bg-sky-100 text-sky-700", icon: "🏬" },
  verified_seller: { label: "بائع موثق", color: "bg-green-100 text-green-700", icon: "✅" },
  active_seller: { label: "بائع نشط", color: "bg-emerald-100 text-emerald-700", icon: "👤" },
  big_fish: { label: "سمكة كبيرة", color: "bg-indigo-100 text-indigo-700", icon: "🐟" },
  new_seller: { label: "بائع جديد", color: "bg-gray-100 text-gray-600", icon: "🆕" },
  no_phone: { label: "بدون رقم", color: "bg-red-100 text-red-600", icon: "👻" },
  regular: { label: "عادي", color: "bg-gray-100 text-gray-600", icon: "👤" },
  unknown: { label: "غير مصنف", color: "bg-gray-100 text-gray-500", icon: "❓" },
};

// Only these tiers exist in the DB — used for the filter dropdown
const FILTERABLE_TIERS = ["whale", "big", "medium", "small", "visitor"] as const;

const GOVERNORATE_OPTIONS = [
  { value: "cairo", label: "القاهرة" },
  { value: "giza", label: "الجيزة" },
  { value: "alexandria", label: "الإسكندرية" },
  { value: "qalyubia", label: "القليوبية" },
  { value: "sharqia", label: "الشرقية" },
  { value: "dakahlia", label: "الدقهلية" },
  { value: "monufia", label: "المنوفية" },
  { value: "gharbia", label: "الغربية" },
  { value: "beheira", label: "البحيرة" },
  { value: "kafr_el_sheikh", label: "كفر الشيخ" },
  { value: "damietta", label: "دمياط" },
  { value: "port_said", label: "بورسعيد" },
  { value: "ismailia", label: "الإسماعيلية" },
  { value: "suez", label: "السويس" },
  { value: "fayoum", label: "الفيوم" },
  { value: "beni_suef", label: "بني سويف" },
  { value: "minya", label: "المنيا" },
  { value: "assiut", label: "أسيوط" },
  { value: "sohag", label: "سوهاج" },
  { value: "qena", label: "قنا" },
  { value: "luxor", label: "الأقصر" },
  { value: "aswan", label: "أسوان" },
];

const PIPELINE_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  discovered: { label: "لم يُتواصل", color: "bg-gray-100 text-gray-600", icon: Clock },
  contacted: { label: "تم التواصل", color: "bg-blue-100 text-blue-700", icon: MessageCircle },
  responded: { label: "رد", color: "bg-cyan-100 text-cyan-700", icon: CheckCircle },
  interested: { label: "مهتم", color: "bg-green-100 text-green-700", icon: Star },
  signed_up: { label: "سجّل", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  declined: { label: "رفض", color: "bg-red-100 text-red-600", icon: XCircle },
  not_reachable: { label: "غير متاح", color: "bg-orange-100 text-orange-600", icon: AlertCircle },
};

// ─── Waleed Opening Message Generator ───

function generateWaleedOpening(seller: Seller): string {
  const name = seller.name || "أخي الكريم";
  const category = CATEGORY_AR[seller.primary_category || ""] || "المنتجات";

  if (seller.is_whale || seller.seller_tier === "whale") {
    return `أهلاً ${name} 👋\nأنا وليد من مكسب — السوق الإلكتروني الجديد في مصر.\nشفت إعلاناتك في ${category} وحسيت إنك تاجر كبير ومحترم 💪\nعندنا حساب تاجر مميز هيديك ظهور أولوية وأدوات حصرية — تحب أحكيلك أكتر؟`;
  }

  if (seller.is_business || seller.seller_tier === "premium_merchant" || seller.seller_tier === "regular_merchant") {
    return `أهلاً ${name} 👋\nأنا وليد من مكسب — سوق إلكتروني جديد مجاني في مصر.\nشفت إنك بتشتغل في ${category} وعندك ${seller.total_listings_seen || "كذا"} إعلان.\nمكسب هيساعدك توصل لعملاء جدد ببلاش — تحب تجرب؟ 💚`;
  }

  return `أهلاً ${name} 👋\nأنا وليد من مكسب — سوق إلكتروني مجاني 100% لبيع وشراء أي حاجة في مصر.\nشفت إعلانك في ${category} وحبيت أقولك إن مكسب ممكن يساعدك تبيع أسرع.\nالتسجيل مجاني ومش هياخد دقيقة — تحب تعرف أكتر؟ 😊`;
}

// ─── Main Page Component ───

export default function OutreachPage() {
  // State
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [todayStats, setTodayStats] = useState<{
    messages_sent: number;
    responses: number;
    signups: number;
    response_rate: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTier, setFilterTier] = useState("");
  const [filterGovernorate, setFilterGovernorate] = useState("");
  const [whalesOnly, setWhalesOnly] = useState(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSeller, setChatSeller] = useState<Seller | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── Fetch Sellers ───

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (searchQuery) params.set("search", searchQuery);
      if (filterStatus) params.set("status", filterStatus);
      if (filterTier) params.set("tier", filterTier);
      if (filterGovernorate) params.set("governorate", filterGovernorate);
      if (whalesOnly) params.set("whales_only", "true");
      params.set("has_phone", "true");

      const headers = getAdminHeaders();
      const res = await fetch(`/api/admin/crm/harvester/sellers?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSellers(data.sellers || []);
        setStats(data.stats || null);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch sellers:", err);
    }
    setLoading(false);
  }, [page, searchQuery, filterStatus, filterTier, filterGovernorate, whalesOnly]);

  // ─── Fetch Today Stats ───

  const fetchTodayStats = useCallback(async () => {
    try {
      const headers = getAdminHeaders();
      const res = await fetch("/api/admin/crm/harvester/outreach/stats", { headers });
      if (res.ok) {
        const data = await res.json();
        setTodayStats(data.today || null);
      }
    } catch {
      // Silent
    }
  }, []);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  useEffect(() => {
    fetchTodayStats();
  }, [fetchTodayStats]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ─── Open Waleed Chat ───

  function openWaleedChat(seller: Seller) {
    const opening = generateWaleedOpening(seller);
    setChatSeller(seller);
    setChatMessages([
      {
        role: "assistant",
        content: opening,
        timestamp: new Date(),
      },
    ]);
    setChatInput("");
    setChatOpen(true);
  }

  // ─── Send Chat Message (Simulate Seller Reply → Get Waleed Response) ───

  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading || !chatSeller) return;

    const sellerMessage = chatInput.trim();
    setChatInput("");

    // Add seller message
    const updatedMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: sellerMessage, timestamp: new Date() },
    ];
    setChatMessages(updatedMessages);

    // Call Waleed API
    setChatLoading(true);
    try {
      const history = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/admin/ai/waleed/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: sellerMessage,
          conversation_history: history.slice(0, -1), // exclude the latest user msg (it's in `message`)
          seller_context: {
            name: chatSeller.name,
            phone: chatSeller.phone,
            category: chatSeller.primary_category,
            governorate: chatSeller.primary_governorate,
            seller_type: chatSeller.is_whale
              ? "whale"
              : chatSeller.is_business
                ? "business"
                : "individual",
            listings_count: chatSeller.total_listings_seen,
            seller_id: chatSeller.id,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply,
            timestamp: new Date(),
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "عذراً، حصل مشكلة في الاتصال. جرب تاني.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "خطأ في الاتصال بالسيرفر.",
          timestamp: new Date(),
        },
      ]);
    }
    setChatLoading(false);
  }

  // ─── Search with debounce ───

  const searchTimeoutRef = useRef<NodeJS.Timeout>(null);
  function handleSearch(value: string) {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
    }, 400);
  }

  // ─── Render ───

  return (
    <div className="space-y-6">
      {/* ═══ Section 3: Stats Cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard
          label="إجمالي البائعين"
          value={(stats?.total_sellers || total).toLocaleString("en")}
          icon={<Users size={18} />}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="بأرقام"
          value={(stats?.with_phone || 0).toLocaleString("en")}
          subtitle={stats?.total_sellers ? `${((stats.with_phone / stats.total_sellers) * 100).toFixed(1)}%` : undefined}
          icon={<Phone size={18} />}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="بدون أرقام"
          value={(stats?.without_phone || 0).toLocaleString("en")}
          icon={<span className="text-base">🚫</span>}
          color="bg-red-50 text-red-500"
        />
        <StatCard
          label="تم التواصل"
          value={stats?.contacted || 0}
          icon={<MessageCircle size={18} />}
          color="bg-cyan-50 text-cyan-600"
        />
        <StatCard
          label="رسائل اليوم"
          value={todayStats?.messages_sent || 0}
          icon={<Send size={18} />}
          color="bg-orange-50 text-orange-600"
        />
        <StatCard
          label="معدل الاستجابة"
          value={`${todayStats?.response_rate || 0}%`}
          icon={<TrendingUp size={18} />}
          color="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* ═══ Outreach Priority Board ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-dark mb-3 flex items-center gap-2">
          🎯 أولوية التواصل
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PriorityCard
            priority={1}
            label="📦 متوسط + رقم"
            count={stats?.medium_with_phone || 0}
            color="bg-blue-50 border-blue-200 text-blue-700"
            onClick={() => { setFilterTier("medium"); setPage(1); }}
          />
          <PriorityCard
            priority={2}
            label="💪 كبير + رقم"
            count={stats?.big_with_phone || 0}
            color="bg-indigo-50 border-indigo-200 text-indigo-700"
            onClick={() => { setFilterTier("big"); setPage(1); }}
          />
          <PriorityCard
            priority={3}
            label="🔹 صغير + رقم"
            count={stats?.small_with_phone || 0}
            color="bg-sky-50 border-sky-200 text-sky-700"
            onClick={() => { setFilterTier("small"); setPage(1); }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
          <span>🐋 حيتان: {stats?.whales || 0}</span>
          <span>·</span>
          <span>💪 كبير: {stats?.big || 0}</span>
          <span>·</span>
          <span>📦 متوسط: {stats?.medium || 0}</span>
          <span>·</span>
          <span>🔹 صغير: {stats?.small || 0}</span>
          <span>·</span>
          <span>👁️ زائر: {stats?.visitor || 0}</span>
        </div>
      </div>

      {/* ═══ Section 1: Sellers List ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header + Filters */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-dark flex items-center gap-2">
              <Users size={20} className="text-brand-green" />
              قائمة البائعين
              <span className="text-sm font-normal text-gray-400">({total})</span>
            </h2>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو الرقم..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
              />
            </div>

            {/* Pipeline Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            >
              <option value="">كل الحالات</option>
              {Object.entries(PIPELINE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>

            {/* Tier Filter */}
            <select
              value={filterTier}
              onChange={(e) => { setFilterTier(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            >
              <option value="">كل الشرائح</option>
              {FILTERABLE_TIERS.map((key) => (
                <option key={key} value={key}>{TIER_CONFIG[key].icon} {TIER_CONFIG[key].label}</option>
              ))}
            </select>

            {/* Governorate Filter */}
            <select
              value={filterGovernorate}
              onChange={(e) => { setFilterGovernorate(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            >
              <option value="">كل المحافظات</option>
              {GOVERNORATE_OPTIONS.map((gov) => (
                <option key={gov.value} value={gov.value}>{gov.label}</option>
              ))}
            </select>

            {/* Whales Toggle */}
            <button
              onClick={() => { setWhalesOnly(!whalesOnly); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors flex items-center gap-1.5 ${
                whalesOnly
                  ? "bg-purple-100 text-purple-700 border-purple-200"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              🐋 حيتان فقط
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={24} className="animate-spin mx-auto text-brand-green mb-2" />
            <p className="text-sm text-gray-400">جاري التحميل...</p>
          </div>
        ) : sellers.length === 0 ? (
          <div className="p-12 text-center">
            <Filter size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">لا يوجد بائعين بهذه الفلاتر</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">البائع</th>
                  <th className="px-4 py-3 text-right font-medium">الموبايل</th>
                  <th className="px-4 py-3 text-right font-medium">المدينة</th>
                  <th className="px-4 py-3 text-right font-medium">الفئة</th>
                  <th className="px-4 py-3 text-center font-medium">Whale Score</th>
                  <th className="px-4 py-3 text-center font-medium">الشريحة</th>
                  <th className="px-4 py-3 text-center font-medium">حالة التواصل</th>
                  <th className="px-4 py-3 text-center font-medium">الإعلانات</th>
                  <th className="px-4 py-3 text-center font-medium">وليد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sellers.map((seller) => {
                  const tier = TIER_CONFIG[seller.seller_tier] || TIER_CONFIG.unknown;
                  const pipeline = PIPELINE_CONFIG[seller.pipeline_status] || PIPELINE_CONFIG.discovered;
                  const PipelineIcon = pipeline.icon;

                  return (
                    <tr key={seller.id} className="hover:bg-gray-50 transition-colors">
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-green-light flex items-center justify-center text-brand-green text-xs font-bold shrink-0">
                            {(seller.name || "؟")[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-dark truncate max-w-[160px]">
                              {seller.name || "بدون اسم"}
                            </p>
                            {seller.source_platform && (
                              <p className="text-[10px] text-gray-400">{seller.source_platform}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-gray-600 direction-ltr inline-block">
                          {seller.phone || "—"}
                        </span>
                      </td>

                      {/* City */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <MapPin size={12} className="text-gray-400 shrink-0" />
                          {seller.primary_governorate || "—"}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">
                          {CATEGORY_AR[seller.primary_category || ""] || seller.primary_category || "—"}
                        </span>
                      </td>

                      {/* Whale Score */}
                      <td className="px-4 py-3 text-center">
                        {seller.whale_score > 0 ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                            seller.whale_score >= 60
                              ? "bg-purple-100 text-purple-700"
                              : seller.whale_score >= 30
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                          }`}>
                            {seller.whale_score}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Tier */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${tier.color}`}>
                          {tier.icon} {tier.label}
                        </span>
                      </td>

                      {/* Pipeline Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${pipeline.color}`}>
                          <PipelineIcon size={12} />
                          {pipeline.label}
                        </span>
                      </td>

                      {/* Listings Count */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-gray-600 font-medium">
                          {seller.total_listings_seen || 0}
                        </span>
                      </td>

                      {/* Waleed Action */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openWaleedChat(seller)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-green text-white rounded-lg text-xs font-medium hover:bg-brand-green-dark transition-colors"
                        >
                          <Bot size={14} />
                          وليد
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              صفحة {page} من {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Section 2: Waleed Chat Modal ═══ */}
      {chatOpen && chatSeller && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setChatOpen(false)}>
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Chat Header */}
            <div className="bg-brand-green text-white px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">وليد — محاكي المبيعات</h3>
                  <p className="text-[11px] text-white/80">
                    محادثة مع: {chatSeller.name || "بائع"}
                    {chatSeller.is_whale && " 🐋"}
                  </p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Seller Info Bar */}
            <div className="bg-gray-50 px-4 py-2 border-b text-xs text-gray-500 flex flex-wrap gap-3 shrink-0">
              <span className="flex items-center gap-1">
                <User size={12} />
                {chatSeller.name || "بدون اسم"}
              </span>
              {chatSeller.phone && (
                <span className="flex items-center gap-1 font-mono direction-ltr">
                  <Phone size={12} />
                  {chatSeller.phone}
                </span>
              )}
              {chatSeller.primary_governorate && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {chatSeller.primary_governorate}
                </span>
              )}
              {chatSeller.whale_score > 0 && (
                <span className="text-purple-600 font-medium">
                  Whale: {chatSeller.whale_score}
                </span>
              )}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0f2f5]">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "assistant" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "assistant"
                        ? "bg-brand-green text-white rounded-tl-sm"
                        : "bg-white text-dark rounded-tr-sm shadow-sm"
                    }`}
                  >
                    {msg.content}
                    <div className={`text-[10px] mt-1 ${
                      msg.role === "assistant" ? "text-white/60" : "text-gray-400"
                    }`}>
                      {msg.role === "assistant" ? "🤖 وليد" : "👤 البائع"} · {msg.timestamp.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-end">
                  <div className="bg-brand-green/80 text-white rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 size={14} className="animate-spin" />
                      وليد بيكتب...
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Input (Seller Simulation) */}
            <div className="bg-white border-t p-3 shrink-0">
              <p className="text-[10px] text-gray-400 mb-1.5 text-center">
                اكتب رد البائع هنا لمحاكاة المحادثة
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="محاكاة رد البائع..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
                  disabled={chatLoading}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green disabled:opacity-50"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="w-10 h-10 bg-brand-green text-white rounded-full flex items-center justify-center hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── StatCard Component ───

function StatCard({
  label,
  value,
  icon,
  color,
  subtitle,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <p className="text-2xl font-bold text-dark">{value}</p>
        {subtitle && (
          <span className="text-xs font-medium text-green-600">({subtitle})</span>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function PriorityCard({
  priority,
  label,
  count,
  color,
  onClick,
}: {
  priority: number;
  label: string;
  count: number;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-right transition-all hover:shadow-md ${color}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold opacity-60">أولوية {priority}</span>
        <span className="text-2xl font-bold">{count.toLocaleString("en")}</span>
      </div>
      <p className="text-sm font-medium">{label}</p>
    </button>
  );
}
