"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getAdminHeaders } from "@/app/admin/layout";
import Link from "next/link";
import {
  RefreshCw,
  Copy,
  Check,
  SkipForward,
  Eye,
  EyeOff,
  MessageSquare,
  Target,
  Send,
  Users,
  Pencil,
  Phone,
  Smile,
  Meh,
  Frown,
  StickyNote,
  BarChart3,
  Clock,
  UserCheck,
  ChevronDown,
  Filter,
  FileText,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OutreachContact {
  id: string;
  name: string;
  phone: string;
  score: number;
  sellerTier: string;
  isWhale: boolean;
  listingCount: number;
  location: string;
  category: string;
  pipelineStatus: string;
  outreachCount: number;
  lastOutreachAt: string | null;
  lastResponseAt: string | null;
  notes: string | null;
  rejectionReason: string | null;
  templateId: string | null;
  message: string;
  sourcePlatform: string | null;
}

interface OutreachTemplate {
  id: string;
  name: string;
  name_ar: string;
  category: string;
  target_tier: string;
  message_text: string;
  is_default: boolean;
  usage_count: number;
  response_rate: number;
}

interface OutreachProgress {
  sent: number;
  skipped: number;
  remaining: number;
  target: number;
}

interface StatsData {
  sentToday: number;
  sentWeek: number;
  sentMonth: number;
  responseRate: number;
  interestRate: number;
  registrationRate: number;
  totalSent: number;
  totalResponded: number;
  totalInterested: number;
  totalRegistered: number;
  bestTemplate: { name_ar: string; usage_count: number; response_rate: number } | null;
  byCategory: Record<string, { sent: number; interested: number }>;
}

const TIER_DISPLAY: Record<string, { emoji: string; label: string; color: string }> = {
  whale: { emoji: "🐋", label: "حوت", color: "bg-red-100 text-red-700" },
  big: { emoji: "💪", label: "كبير", color: "bg-orange-100 text-orange-700" },
  medium: { emoji: "📦", label: "متوسط", color: "bg-blue-100 text-blue-700" },
  small: { emoji: "🔹", label: "صغير", color: "bg-gray-100 text-gray-500" },
  visitor: { emoji: "👁️", label: "زائر", color: "bg-gray-50 text-gray-400" },
  // Legacy aliases for backward compatibility
  big_fish: { emoji: "💪", label: "كبير", color: "bg-orange-100 text-orange-700" },
  regular: { emoji: "📦", label: "متوسط", color: "bg-blue-100 text-blue-700" },
  small_fish: { emoji: "🔹", label: "صغير", color: "bg-gray-100 text-gray-500" },
};

const CATEGORY_LABELS: Record<string, string> = {
  vehicles: "سيارات",
  properties: "عقارات",
  phones: "موبايلات",
  electronics: "إلكترونيات",
  furniture: "أثاث",
  fashion: "ملابس",
  gold: "ذهب",
  luxury: "فاخر",
  appliances: "أجهزة",
  hobbies: "هوايات",
  tools: "عدد",
  services: "خدمات",
  scrap: "خردة",
  kids: "أطفال",
  sports: "رياضة",
  pets: "حيوانات",
  other: "أخرى",
};

const GOV_LABELS: Record<string, string> = {
  cairo: "القاهرة",
  alexandria: "الإسكندرية",
  giza: "الجيزة",
  qalyubia: "القليوبية",
  sharqia: "الشرقية",
  dakahlia: "الدقهلية",
  gharbia: "الغربية",
  monufia: "المنوفية",
  beheira: "البحيرة",
  kafr_el_sheikh: "كفر الشيخ",
  damietta: "دمياط",
  port_said: "بورسعيد",
  ismailia: "الإسماعيلية",
  suez: "السويس",
  fayoum: "الفيوم",
  beni_suef: "بني سويف",
  minya: "المنيا",
  assiut: "أسيوط",
  sohag: "سوهاج",
  qena: "قنا",
  luxor: "الأقصر",
  aswan: "أسوان",
  red_sea: "البحر الأحمر",
  matrouh: "مطروح",
};

const ROLE_TARGETS: Record<string, number> = {
  ceo: 10,
  sales_manager: 30,
  sales_rep: 50,
};

// ─── WhatsApp Integration ────────────────────────────────────────────────────

function formatEgyptPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) return '2' + clean;
  if (clean.startsWith('20')) return clean;
  return '2' + clean;
}

interface WaleedTemplate {
  id: string;
  name: string;
  content: string;
  platform: string;
  is_active: boolean;
  use_count: number;
}

const PLATFORM_NAME_MAP: Record<string, string> = {
  opensooq: 'السوق المفتوح',
  hatla2ee: 'هتلاقي',
  aqarmap: 'عقار ماب',
  olx: 'OLX',
  facebook: 'فيسبوك',
  dubizzle: 'دوبيزل',
};

function resolveWaleedMessage(template: string, seller: OutreachContact): string {
  const platformName = PLATFORM_NAME_MAP[seller.sourcePlatform || ''] || seller.sourcePlatform || 'دوبيزل';
  return template
    .replace(/\{\{name\}\}/g, seller.name || 'بالتاجر')
    .replace(/\{\{platform\}\}/g, platformName)
    .replace(/\{\{city\}\}/g, GOV_LABELS[seller.location] || seller.location || '');
}

const DEFAULT_WALEED_MSG = `أهلاً {{name}}! 👋
أنا وليد من مكسب — أول سوق إلكتروني مصري بالبيع المباشر والمزادات والمقايضة.
شفت إعلاناتك على {{platform}} وحسيت إن مكسب هيفيدك:
✅ مجاني للبداية — مفيش أي خسارة
✅ مزادات ومقايضة (مش موجودين في OLX)
✅ عمولة طوعية بس — مش إجبارية
لو عايز تعرف أكتر أو تسجّل: https://maksab.vercel.app
تقدر تسجّل دلوقتي في 3 دقائق بس 😊`;

// ─── Daily Target Directive from ممدوح ──────────────────────────────────────

interface DailyDirective {
  category: string;
  governorate: string;
  tier: string;
  messageCount: number;
  notes: string;
}

function DailyDirectivePanel({
  onApply,
}: {
  onApply: (d: DailyDirective) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [directive, setDirective] = useState<DailyDirective>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("outreach_daily_directive");
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }
    return { category: "all", governorate: "all", tier: "all", messageCount: 50, notes: "" };
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem("outreach_daily_directive", JSON.stringify(directive));
      // Save to DB
      await fetch("/api/admin/sales/daily-target", {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(directive),
      });
      onApply(directive);
      setIsOpen(false);
    } catch {
      // silent
    }
    setSaving(false);
  };

  const today = new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="bg-gradient-to-l from-[#1B7A3D]/5 to-[#D4A843]/5 rounded-2xl border border-[#1B7A3D]/20 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <div className="text-right">
            <h3 className="text-sm font-bold text-dark">هدف اليوم — توجيه وليد</h3>
            <p className="text-[10px] text-gray-text">{today}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {directive.category !== "all" && (
            <span className="text-[10px] bg-[#1B7A3D] text-white px-2 py-0.5 rounded-full">
              {CATEGORY_LABELS[directive.category] || directive.category}
            </span>
          )}
          {directive.tier !== "all" && (
            <span className="text-[10px] bg-[#D4A843] text-white px-2 py-0.5 rounded-full">
              {directive.tier === "whale" ? "حوت" : directive.tier === "big" ? "كبير" : "متوسط"}
            </span>
          )}
          <span className="text-[10px] font-bold text-[#1B7A3D]">{directive.messageCount} رسالة</span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#1B7A3D]/10 pt-3">
          {/* Category */}
          <div>
            <label className="text-xs text-gray-text mb-1 block">الفئة المستهدفة:</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "all", label: "الكل" },
                { key: "vehicles", label: "🚗 سيارات" },
                { key: "properties", label: "🏠 عقارات" },
                { key: "phones", label: "📱 موبايلات" },
                { key: "electronics", label: "💻 إلكترونيات" },
                { key: "furniture", label: "🪑 أثاث" },
                { key: "fashion", label: "👗 ملابس" },
                { key: "gold", label: "💰 ذهب" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setDirective((d) => ({ ...d, category: key }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    directive.category === key
                      ? "bg-[#1B7A3D] text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Governorate */}
          <div>
            <label className="text-xs text-gray-text mb-1 block">المحافظة المستهدفة:</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "all", label: "الكل" },
                { key: "cairo", label: "القاهرة" },
                { key: "alexandria", label: "الإسكندرية" },
                { key: "giza", label: "الجيزة" },
                { key: "qalyubia", label: "القليوبية" },
                { key: "sharqia", label: "الشرقية" },
                { key: "dakahlia", label: "الدقهلية" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setDirective((d) => ({ ...d, governorate: key }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    directive.governorate === key
                      ? "bg-[#1B7A3D] text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tier */}
          <div>
            <label className="text-xs text-gray-text mb-1 block">الشريحة:</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "all", label: "الكل" },
                { key: "whale", label: "🐋 حوت" },
                { key: "big", label: "💪 كبير" },
                { key: "medium", label: "📦 متوسط" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setDirective((d) => ({ ...d, tier: key }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    directive.tier === key
                      ? "bg-[#D4A843] text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Message count */}
          <div>
            <label className="text-xs text-gray-text mb-1 block">عدد الرسائل المطلوبة:</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={directive.messageCount}
                onChange={(e) => setDirective((d) => ({ ...d, messageCount: Math.max(1, parseInt(e.target.value) || 1) }))}
                className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20"
                min={1}
              />
              <span className="text-xs text-gray-text">رسالة</span>
              <div className="flex gap-1 mr-2">
                {[20, 50, 100].map((n) => (
                  <button
                    key={n}
                    onClick={() => setDirective((d) => ({ ...d, messageCount: n }))}
                    className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
                      directive.messageCount === n
                        ? "bg-[#1B7A3D] text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-text mb-1 block">ملاحظات إضافية (اختياري):</label>
            <input
              type="text"
              value={directive.notes}
              onChange={(e) => setDirective((d) => ({ ...d, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20"
              placeholder="مثال: ركّز على البائعين اللي عندهم أكتر من 5 إعلانات..."
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm font-bold hover:bg-[#145C2E] transition-colors disabled:opacity-50"
          >
            {saving ? "بيتحفظ..." : "حفظ وتطبيق الهدف"}
          </button>
        </div>
      )}
    </div>
  );
}

type TabType = "new" | "followup" | "interested" | "stats";
type EmployeeTab = "waleed" | "ahmed";

// ─── Ahmed Default Message (Real Estate) ───
const DEFAULT_AHMED_MSG = `أهلاً {{name}}! 🏠
أنا أحمد من مكسب — أول سوق إلكتروني مصري متخصص في العقارات بنظام المزادات والمقايضة.
شفت إعلانك على {{platform}} وحسيت إن مكسب هيفيدك:
✅ مجاني للبداية — مفيش أي خسارة
✅ مزادات عقارية (مش موجودة في أي منصة تانية)
✅ وصول لآلاف المشترين في الإسكندرية
✅ عمولة طوعية بس — مش إجبارية
سجّل دلوقتي في 3 دقائق: https://maksab.vercel.app`;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SalesOutreachPage() {
  const searchParams = useSearchParams();
  const initialEmployee = (searchParams.get("tab") === "ahmed" ? "ahmed" : "waleed") as EmployeeTab;
  const [activeTab, setActiveTab] = useState<TabType>("new");
  const [employeeTab, setEmployeeTab] = useState<EmployeeTab>(initialEmployee);
  const [contacts, setContacts] = useState<OutreachContact[]>([]);
  const [templates, setTemplates] = useState<OutreachTemplate[]>([]);
  const [progress, setProgress] = useState<OutreachProgress>({ sent: 0, skipped: 0, remaining: 0, target: 50 });
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tierCounts, setTierCounts] = useState<Record<string, number>>({});
  const [totalFiltered, setTotalFiltered] = useState(0);

  // Filters
  const [tierFilter, setTierFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [govFilter, setGovFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Daily target
  const [dailyTarget, setDailyTarget] = useState(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("outreach_daily_target") || "50");
    }
    return 50;
  });
  const [editingTarget, setEditingTarget] = useState(false);

  // Template selection
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Waleed templates
  const [waleedTemplates, setWaleedTemplates] = useState<WaleedTemplate[]>([]);
  const [selectedWaleedTemplateId, setSelectedWaleedTemplateId] = useState<string | null>(null);

  // Ahmed templates
  const [ahmedTemplates, setAhmedTemplates] = useState<WaleedTemplate[]>([]);
  const [selectedAhmedTemplateId, setSelectedAhmedTemplateId] = useState<string | null>(null);

  // UI state
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  // Modal
  const [noteModal, setNoteModal] = useState<{ sellerId: string; currentNote: string } | null>(null);
  const [reasonModal, setReasonModal] = useState<{ sellerId: string; action: string } | null>(null);
  const [modalText, setModalText] = useState("");

  // Employee tab → auto-set category & governorate for Alexandria focus
  const effectiveCategory = employeeTab === "waleed" ? "vehicles" : employeeTab === "ahmed" ? "properties" : categoryFilter;
  const effectiveGov = "alexandria"; // MVP: الإسكندرية فقط

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab: activeTab,
        tier: tierFilter,
        category: effectiveCategory,
        governorate: effectiveGov,
        dailyTarget: String(dailyTarget),
      });
      if (selectedTemplateId) params.set("templateId", selectedTemplateId);

      console.log('[OUTREACH UI] Filter params:', { tier: tierFilter, category: categoryFilter, governorate: govFilter, tab: activeTab });
      const res = await fetch(`/api/admin/sales/outreach?${params}`, {
        headers: getAdminHeaders(),
      });
      const json = await res.json();
      console.log('[OUTREACH UI] Results count:', json.contacts?.length, 'tierCounts:', json.tierCounts);

      if (activeTab === "stats") {
        setStats(json.stats);
      } else {
        setContacts(json.contacts || []);
        setProgress(json.progress || { sent: 0, skipped: 0, remaining: 0, target: dailyTarget });
        setTemplates(json.templates || []);
        setTierCounts(json.tierCounts || {});
        setTotalFiltered(json.totalFiltered ?? json.contacts?.length ?? 0);
      }
      setProcessedIds(new Set());
    } catch (err) {
      console.error("Failed to fetch outreach data:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, tierFilter, effectiveCategory, effectiveGov, dailyTarget, selectedTemplateId, employeeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch waleed + ahmed templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const [waleedRes, ahmedRes] = await Promise.all([
          fetch("/api/admin/sales/waleed-templates", { headers: getAdminHeaders() }),
          fetch("/api/admin/sales/ahmed-templates", { headers: getAdminHeaders() }).catch(() => null),
        ]);
        if (waleedRes.ok) {
          const json = await waleedRes.json();
          setWaleedTemplates(json.templates || []);
        }
        if (ahmedRes?.ok) {
          const json = await ahmedRes.json();
          setAhmedTemplates(json.templates || []);
        }
      } catch (err) {
        console.error("Failed to fetch templates:", err);
      }
    };
    fetchTemplates();
  }, []);

  const getWaleedMessage = useCallback((seller: OutreachContact): string => {
    const selected = waleedTemplates.find((t) => t.id === selectedWaleedTemplateId);
    const templateContent = selected?.content || DEFAULT_WALEED_MSG;
    return resolveWaleedMessage(templateContent, seller);
  }, [waleedTemplates, selectedWaleedTemplateId]);

  const getAhmedMessage = useCallback((seller: OutreachContact): string => {
    const selected = ahmedTemplates.find((t) => t.id === selectedAhmedTemplateId);
    const templateContent = selected?.content || DEFAULT_AHMED_MSG;
    return resolveWaleedMessage(templateContent, seller);
  }, [ahmedTemplates, selectedAhmedTemplateId]);

  // Get the right message based on active employee tab
  const getEmployeeMessage = useCallback((seller: OutreachContact): string => {
    return employeeTab === "ahmed" ? getAhmedMessage(seller) : getWaleedMessage(seller);
  }, [employeeTab, getAhmedMessage, getWaleedMessage]);

  const updateDailyTarget = (val: number) => {
    setDailyTarget(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("outreach_daily_target", String(val));
    }
  };

  const updateSellerStatus = async (
    sellerId: string,
    action: string,
    extra?: { templateId?: string; notes?: string; reason?: string }
  ) => {
    try {
      await fetch("/api/admin/sales/outreach", {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId, action, ...extra }),
      });
      setProcessedIds((prev) => new Set([...prev, sellerId]));
      // Update progress locally
      if (action === "sent") {
        setProgress((p) => ({ ...p, sent: p.sent + 1, remaining: Math.max(0, p.remaining - 1) }));
      } else if (action === "skipped") {
        setProgress((p) => ({ ...p, skipped: p.skipped + 1, remaining: Math.max(0, p.remaining - 1) }));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const copyMessage = async (id: string, message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      console.error("Failed to copy");
    }
  };

  const openWhatsApp = (phone: string, message: string) => {
    const formattedPhone = formatEgyptPhone(phone);
    const url = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  // Increment waleed template use_count
  const incrementWaleedTemplateUsage = async () => {
    if (!selectedWaleedTemplateId) return;
    try {
      await fetch("/api/admin/sales/waleed-templates", {
        method: "PUT",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedWaleedTemplateId,
          use_count: (waleedTemplates.find((t) => t.id === selectedWaleedTemplateId)?.use_count || 0) + 1,
        }),
      });
    } catch { /* ignore */ }
  };

  // Open WhatsApp with employee message + auto-log outreach
  const openWaleedWhatsApp = async (contact: OutreachContact) => {
    const formattedPhone = formatEgyptPhone(contact.phone);
    const waleedMsg = getEmployeeMessage(contact);
    const url = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(waleedMsg)}`;
    window.open(url, "_blank");
    // Auto-log outreach + increment template usage
    try {
      await fetch("/api/admin/sales/outreach", {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: contact.id,
          action: "sent",
          templateId: selectedWaleedTemplateId || "waleed_default",
          notes: "whatsapp_manual",
        }),
      });
      incrementWaleedTemplateUsage();
      setProcessedIds((prev) => new Set([...prev, contact.id]));
      setProgress((p) => ({ ...p, sent: p.sent + 1, remaining: Math.max(0, p.remaining - 1) }));
    } catch (err) {
      console.error("Failed to log whatsapp outreach:", err);
    }
  };

  // Batch WhatsApp send state — one message at a time
  const [batchQueue, setBatchQueue] = useState<OutreachContact[]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [batchActive, setBatchActive] = useState(false);

  const openBatchWhatsApp = (contact: OutreachContact) => {
    const formattedPhone = formatEgyptPhone(contact.phone);
    const msg = getEmployeeMessage(contact);
    const url = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const markBatchContactAsSent = async (contact: OutreachContact) => {
    try {
      await fetch("/api/admin/sales/outreach", {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: contact.id,
          action: "sent",
          templateId: selectedWaleedTemplateId || "waleed_default",
          notes: "whatsapp_manual",
        }),
      });
      incrementWaleedTemplateUsage();
      setProcessedIds((prev) => new Set([...prev, contact.id]));
      setProgress((p) => ({ ...p, sent: p.sent + 1, remaining: Math.max(0, p.remaining - 1) }));
    } catch (err) {
      console.error("Failed to log batch whatsapp:", err);
    }
  };

  const startBatchWhatsApp = () => {
    const eligible = pendingContacts.filter((c) => c.phone).slice(0, 10);
    if (eligible.length === 0) return;
    setBatchQueue(eligible);
    setCurrentBatchIndex(0);
    setBatchActive(true);
    openBatchWhatsApp(eligible[0]);
  };

  const openNextInBatch = () => {
    // Mark current contact as sent
    markBatchContactAsSent(batchQueue[currentBatchIndex]);

    const next = currentBatchIndex + 1;
    if (next < batchQueue.length) {
      setCurrentBatchIndex(next);
      openBatchWhatsApp(batchQueue[next]);
    } else {
      setBatchActive(false);
      alert("تم إرسال كل الرسائل!");
    }
  };

  const toggleMessage = (id: string) => {
    setExpandedMessages((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const progressPercent = progress.target > 0
    ? Math.round((progress.sent / progress.target) * 100)
    : 0;

  const pendingContacts = contacts.filter((c) => !processedIds.has(c.id));
  const doneContacts = contacts.filter((c) => processedIds.has(c.id));

  // Tab counts
  const tabCounts = {
    new: pendingContacts.length,
    followup: activeTab === "followup" ? pendingContacts.length : 0,
    interested: activeTab === "interested" ? pendingContacts.length : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">التواصل والاستحواذ</h1>
          <p className="text-sm text-gray-text mt-1">
            {employeeTab === "waleed" ? "🚗 وليد — سيارات الإسكندرية" : "🏠 أحمد — عقارات الإسكندرية"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Employee template selector */}
          {employeeTab === "waleed" ? (
            <select
              value={selectedWaleedTemplateId || ""}
              onChange={(e) => setSelectedWaleedTemplateId(e.target.value || null)}
              className="px-3 py-2 border border-green-300 bg-green-50 rounded-xl text-sm font-medium text-green-800 focus:outline-none focus:ring-2 focus:ring-green-300"
            >
              <option value="">رسالة وليد الافتراضية</option>
              {waleedTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.use_count} استخدام)
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedAhmedTemplateId || ""}
              onChange={(e) => setSelectedAhmedTemplateId(e.target.value || null)}
              className="px-3 py-2 border border-purple-300 bg-purple-50 rounded-xl text-sm font-medium text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              <option value="">رسالة أحمد الافتراضية</option>
              {ahmedTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.use_count} استخدام)
                </option>
              ))}
            </select>
          )}
          <button
            onClick={startBatchWhatsApp}
            disabled={batchActive || pendingContacts.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 rounded-xl text-sm text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📱 {batchActive
              ? `رسالة ${currentBatchIndex + 1} من ${batchQueue.length}`
              : "إرسال دفعة واتساب"}
          </button>
          <Link
            href="/admin/sales/waleed-templates"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FileText size={16} />
            رسائل وليد
          </Link>
          <Link
            href="/admin/sales/templates"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FileText size={16} />
            الرسائل
          </Link>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={16} />
            تحديث
          </button>
        </div>
      </div>

      {/* ═══ Daily Directive from ممدوح ═══ */}
      <DailyDirectivePanel
        onApply={(d) => {
          if (d.category !== "all") setCategoryFilter(d.category);
          if (d.governorate !== "all") setGovFilter(d.governorate);
          if (d.tier !== "all") setTierFilter(d.tier);
          updateDailyTarget(d.messageCount);
        }}
      />

      {/* ═══ Improvement 1: Editable Daily Target + Progress ═══ */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-[#1B7A3D]" />
            <h2 className="text-base font-bold text-dark">تقدم اليوم</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-text">🎯 الهدف:</span>
            {editingTarget ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={dailyTarget}
                  onChange={(e) => updateDailyTarget(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1 text-sm border border-[#1B7A3D] rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20"
                  min={1}
                  autoFocus
                  onBlur={() => setEditingTarget(false)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingTarget(false)}
                />
                <span className="text-xs text-gray-text">رسالة</span>
              </div>
            ) : (
              <button
                onClick={() => setEditingTarget(true)}
                className="flex items-center gap-1 px-2 py-1 bg-[#E8F5E9] text-[#1B7A3D] rounded-lg text-sm font-bold hover:bg-[#d0ecd2] transition-colors"
              >
                {dailyTarget}
                <Pencil size={12} />
              </button>
            )}
            {/* Quick presets */}
            <div className="flex gap-1 mr-2">
              {Object.entries(ROLE_TARGETS).map(([role, target]) => (
                <button
                  key={role}
                  onClick={() => { updateDailyTarget(target); setEditingTarget(false); }}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${
                    dailyTarget === target
                      ? "bg-[#1B7A3D] text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {role === "ceo" ? "CEO" : role === "sales_manager" ? "مشرف" : "موظف"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
          <div className="flex items-center gap-1.5">
            <Send size={14} className="text-[#1B7A3D]" />
            <span className="text-gray-text">أُرسل</span>
            <span className="font-bold text-[#1B7A3D]">{progress.sent}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <SkipForward size={14} className="text-gray-400" />
            <span className="text-gray-text">تخطّى</span>
            <span className="font-bold text-gray-500">{progress.skipped}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-blue-500" />
            <span className="text-gray-text">متبقي</span>
            <span className="font-bold text-blue-600">{progress.remaining}</span>
          </div>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.min(progressPercent, 100)}%`,
              background: `linear-gradient(90deg, #1B7A3D 0%, #D4A843 100%)`,
            }}
          />
        </div>
        <p className="text-xs text-gray-text mt-1.5 text-left">
          {progressPercent}% من الهدف اليومي
        </p>
      </div>

      {/* ═══ Employee Tabs — وليد / أحمد ═══ */}
      <div className="flex gap-2 bg-gradient-to-l from-[#1B7A3D]/5 to-[#D4A843]/5 rounded-2xl p-2 border border-[#1B7A3D]/20">
        {[
          { key: "waleed" as EmployeeTab, label: "🚗 وليد — سيارات", desc: "الإسكندرية" },
          { key: "ahmed" as EmployeeTab, label: "🏠 أحمد — عقارات", desc: "الإسكندرية" },
        ].map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => setEmployeeTab(key)}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              employeeTab === key
                ? "bg-[#1B7A3D] text-white shadow-md"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <div>{label}</div>
            <div className={`text-[10px] mt-0.5 ${employeeTab === key ? "text-green-100" : "text-gray-400"}`}>
              {desc}
            </div>
          </button>
        ))}
      </div>

      {/* ═══ Improvement 5: Tabs ═══ */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-gray-100 overflow-x-auto">
        {[
          { key: "new" as TabType, label: "📤 جدد", icon: Send },
          { key: "followup" as TabType, label: "⏳ متابعة", icon: Clock },
          { key: "interested" as TabType, label: "😊 مهتمين", icon: UserCheck },
          { key: "stats" as TabType, label: "📊 إحصائيات", icon: BarChart3 },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 min-w-0 px-3 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${
              activeTab === key
                ? "bg-[#1B7A3D] text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══ Improvement 2: Filters ═══ */}
      {activeTab !== "stats" && (
        <div className="bg-white rounded-2xl border border-gray-100">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-dark">
              <Filter size={16} />
              فلاتر
              {(tierFilter !== "all" || categoryFilter !== "all" || govFilter !== "all") && (
                <span className="bg-[#1B7A3D] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                  {[tierFilter, categoryFilter, govFilter].filter(f => f !== "all").length}
                </span>
              )}
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>

          {showFilters && (
            <div className="px-4 pb-4 space-y-3">
              {/* Tier filter */}
              <div>
                <p className="text-xs text-gray-text mb-1.5">التصنيف:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: "all", label: "الكل" },
                    { key: "whale", label: `🐋 حوت ${tierCounts.whale ? `(${tierCounts.whale})` : ""}` },
                    { key: "big", label: `💪 كبير ${tierCounts.big ? `(${tierCounts.big})` : ""}` },
                    { key: "medium", label: `📦 متوسط ${tierCounts.medium ? `(${tierCounts.medium})` : ""}` },
                    { key: "small", label: `🔹 صغير ${tierCounts.small ? `(${tierCounts.small})` : ""}` },
                    { key: "visitor", label: `👁️ زائر ${tierCounts.visitor ? `(${tierCounts.visitor})` : ""}` },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setTierFilter(key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        tierFilter === key
                          ? "bg-[#1B7A3D] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category filter */}
              <div>
                <p className="text-xs text-gray-text mb-1.5">الفئة:</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      categoryFilter === "all"
                        ? "bg-[#1B7A3D] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    الكل
                  </button>
                  {["vehicles", "properties", "phones", "electronics", "furniture", "fashion"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        categoryFilter === cat
                          ? "bg-[#1B7A3D] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {CATEGORY_LABELS[cat] || cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Governorate filter */}
              <div>
                <p className="text-xs text-gray-text mb-1.5">المحافظة:</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setGovFilter("all")}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      govFilter === "all"
                        ? "bg-[#1B7A3D] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    الكل
                  </button>
                  {["cairo", "alexandria", "giza", "qalyubia", "sharqia", "dakahlia"].map((gov) => (
                    <button
                      key={gov}
                      onClick={() => setGovFilter(gov)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        govFilter === gov
                          ? "bg-[#1B7A3D] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {GOV_LABELS[gov] || gov}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template selector (Improvement 3) */}
              <div>
                <p className="text-xs text-gray-text mb-1.5">قالب الرسالة:</p>
                <select
                  value={selectedTemplateId || ""}
                  onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20"
                >
                  <option value="">تلقائي (حسب التصنيف)</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name_ar} {t.is_default ? "⭐" : ""} ({t.usage_count} استخدام)
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear filters */}
              {(tierFilter !== "all" || categoryFilter !== "all" || govFilter !== "all") && (
                <button
                  onClick={() => { setTierFilter("all"); setCategoryFilter("all"); setGovFilter("all"); }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  ✕ مسح الفلاتر
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ Stats Tab (Improvement 5) ═══ */}
      {activeTab === "stats" && (
        <StatsPanel stats={stats} loading={loading} />
      )}

      {/* ═══ Content Tabs ═══ */}
      {activeTab !== "stats" && (
        <>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-32 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-64" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Pending Contacts */}
              {pendingContacts.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-dark flex items-center gap-2">
                    <MessageSquare size={18} className="text-[#1B7A3D]" />
                    {activeTab === "new" && "في الانتظار"}
                    {activeTab === "followup" && "تحتاج متابعة"}
                    {activeTab === "interested" && "مهتمين"}
                    {" "}({totalFiltered} بائع{pendingContacts.length < totalFiltered ? ` — عرض ${pendingContacts.length}` : ""})
                  </h2>

                  {pendingContacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      tab={activeTab}
                      isExpanded={expandedMessages[contact.id] ?? false}
                      isCopied={copiedId === contact.id}
                      onToggleMessage={() => toggleMessage(contact.id)}
                      onCopy={() => copyMessage(contact.id, contact.message)}
                      onWhatsApp={() => openWhatsApp(contact.phone, contact.message)}
                      onWaleedWhatsApp={() => openWaleedWhatsApp(contact)}
                      onMarkSent={() => updateSellerStatus(contact.id, "sent", { templateId: contact.templateId || undefined })}
                      onSkip={() => {
                        setReasonModal({ sellerId: contact.id, action: "skipped" });
                        setModalText("");
                      }}
                      onInterested={() => updateSellerStatus(contact.id, "interested")}
                      onConsidering={() => updateSellerStatus(contact.id, "considering")}
                      onRejected={() => {
                        setReasonModal({ sellerId: contact.id, action: "rejected" });
                        setModalText("");
                      }}
                      onNote={() => {
                        setNoteModal({ sellerId: contact.id, currentNote: contact.notes || "" });
                        setModalText(contact.notes || "");
                      }}
                      onCall={() => window.open(`tel:${contact.phone}`, "_self")}
                      onRegistered={() => updateSellerStatus(contact.id, "registered")}
                    />
                  ))}
                </div>
              )}

              {/* Processed Contacts */}
              {doneContacts.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-dark flex items-center gap-2 text-gray-400">
                    تم التعامل معهم ({doneContacts.length})
                  </h2>
                  {doneContacts.map((contact) => (
                    <div key={contact.id} className="bg-white rounded-2xl p-4 border border-gray-100 opacity-60">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {(TIER_DISPLAY[contact.sellerTier] || TIER_DISPLAY.small_fish).emoji}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-dark truncate">{contact.name}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                              ✅ تم
                            </span>
                          </div>
                          <p className="text-xs text-gray-text" dir="ltr">{contact.phone}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {pendingContacts.length === 0 && !loading && (
                <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
                  <span className="text-4xl mb-3 block">
                    {activeTab === "new" ? "🎉" : activeTab === "followup" ? "✅" : "📭"}
                  </span>
                  <h3 className="text-lg font-bold text-dark mb-1">
                    {activeTab === "new" && "أحسنت! خلصت كل جهات الاتصال"}
                    {activeTab === "followup" && "مفيش حد يحتاج متابعة دلوقتي"}
                    {activeTab === "interested" && "لسه مفيش مهتمين"}
                  </h3>
                  <p className="text-sm text-gray-text">
                    {activeTab === "new" && "اضغط تحديث لتحميل دفعة جديدة"}
                    {activeTab === "followup" && "هيظهروا لما حد ما يردش خلال 48 ساعة"}
                    {activeTab === "interested" && "لما حد يرد إيجابي هيظهر هنا"}
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ═══ Note Modal ═══ */}
      {noteModal && (
        <Modal
          title="📝 ملاحظة"
          onClose={() => setNoteModal(null)}
          onConfirm={() => {
            updateSellerStatus(noteModal.sellerId, "note", { notes: modalText });
            setNoteModal(null);
          }}
        >
          <textarea
            value={modalText}
            onChange={(e) => setModalText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20"
            placeholder="اكتب ملاحظتك هنا..."
            autoFocus
          />
        </Modal>
      )}

      {/* ═══ Reason Modal ═══ */}
      {reasonModal && (
        <Modal
          title={reasonModal.action === "rejected" ? "😞 سبب الرفض" : "⏭️ سبب التخطي"}
          onClose={() => setReasonModal(null)}
          onConfirm={() => {
            updateSellerStatus(reasonModal.sellerId, reasonModal.action, { reason: modalText || undefined });
            setReasonModal(null);
          }}
        >
          <input
            value={modalText}
            onChange={(e) => setModalText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20"
            placeholder={reasonModal.action === "rejected" ? "السبب (اختياري)..." : "السبب (اختياري)..."}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateSellerStatus(reasonModal.sellerId, reasonModal.action, { reason: modalText || undefined });
                setReasonModal(null);
              }
            }}
          />
        </Modal>
      )}

      {/* Batch WhatsApp bottom bar */}
      {batchActive && batchQueue[currentBatchIndex] && (
        <div className="fixed bottom-0 left-0 right-0 bg-green-600 text-white p-4 flex items-center justify-between z-50 shadow-lg">
          <span className="text-sm font-bold">رسالة {currentBatchIndex + 1} من {batchQueue.length}</span>
          <span className="text-sm">{batchQueue[currentBatchIndex]?.name}</span>
          <button
            onClick={openNextInBatch}
            className="bg-white text-green-600 px-4 py-2 rounded font-bold text-sm hover:bg-green-50 transition-colors"
          >
            ✅ أرسلت — التالي
          </button>
          <button
            onClick={() => {
              // Mark current as sent before stopping
              markBatchContactAsSent(batchQueue[currentBatchIndex]);
              setBatchActive(false);
            }}
            className="text-white underline text-sm hover:text-green-100"
          >
            إيقاف
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Contact Card Component (Improvement 4) ──────────────────────────────────

interface ContactCardProps {
  contact: OutreachContact;
  tab: TabType;
  isExpanded: boolean;
  isCopied: boolean;
  onToggleMessage: () => void;
  onCopy: () => void;
  onWhatsApp: () => void;
  onWaleedWhatsApp: () => void;
  onMarkSent: () => void;
  onSkip: () => void;
  onInterested: () => void;
  onConsidering: () => void;
  onRejected: () => void;
  onNote: () => void;
  onCall: () => void;
  onRegistered: () => void;
}

function ContactCard({
  contact,
  tab,
  isExpanded,
  isCopied,
  onToggleMessage,
  onCopy,
  onWhatsApp,
  onWaleedWhatsApp,
  onMarkSent,
  onSkip,
  onInterested,
  onConsidering,
  onRejected,
  onNote,
  onCall,
  onRegistered,
}: ContactCardProps) {
  const tier = TIER_DISPLAY[contact.sellerTier] || TIER_DISPLAY.small_fish;

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
      {/* Header Row */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <span className="text-3xl">{tier.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-dark">{contact.name}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tier.color}`}>
              {tier.emoji} {tier.label} — {contact.score} نقطة
            </span>
            {contact.outreachCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                📤 {contact.outreachCount} رسالة
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-text">
            <span dir="ltr">📞 {contact.phone}</span>
            <span>📍 {GOV_LABELS[contact.location] || contact.location}</span>
            <span>📦 {contact.listingCount} إعلان</span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {CATEGORY_LABELS[contact.category] || contact.category}
            </span>
          </div>
          {contact.notes && (
            <p className="text-xs text-[#D4A843] mt-1">📝 {contact.notes}</p>
          )}
          {contact.lastOutreachAt && (
            <p className="text-xs text-gray-400 mt-0.5">
              آخر تواصل: {new Date(contact.lastOutreachAt).toLocaleDateString("ar-EG")}
            </p>
          )}
        </div>
      </div>

      {/* Message Toggle */}
      <div className="mt-3">
        <button
          onClick={onToggleMessage}
          className="flex items-center gap-1.5 text-xs text-[#1B7A3D] hover:text-[#145C2E] font-medium transition-colors"
        >
          {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
          {isExpanded ? "إخفاء الرسالة" : "📋 عرض الرسالة"}
        </button>

        {isExpanded && (
          <div className="mt-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
            <pre className="text-sm text-dark whitespace-pre-wrap font-[Cairo] leading-relaxed">
              {contact.message}
            </pre>
          </div>
        )}
      </div>

      {/* Action Buttons — different per tab */}
      <div className="mt-3 space-y-2">
        {/* Row 1: Send actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onWaleedWhatsApp}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 rounded-xl text-xs font-medium text-white transition-colors"
          >
            📱 واتساب وليد
          </button>

          <button
            onClick={onWhatsApp}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-500 hover:bg-gray-600 rounded-xl text-xs font-medium text-white transition-colors"
          >
            📱 واتساب
          </button>

          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-medium text-gray-700 transition-colors"
          >
            {isCopied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            {isCopied ? "تم النسخ!" : "📋 نسخ"}
          </button>

          {tab === "interested" && (
            <button
              onClick={onCall}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-xs font-medium text-white transition-colors"
            >
              <Phone size={14} />
              📞 اتصل
            </button>
          )}
        </div>

        {/* Row 2: Status actions */}
        <div className="flex flex-wrap items-center gap-2">
          {(tab === "new" || tab === "followup") && (
            <>
              <button
                onClick={onMarkSent}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1B7A3D] hover:bg-[#145C2E] rounded-xl text-xs font-medium text-white transition-colors"
              >
                <Check size={14} />
                ✅ أرسلت
              </button>
              <button
                onClick={onSkip}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-medium text-gray-500 transition-colors"
              >
                <SkipForward size={14} />
                ⏭️ تخطي
              </button>
            </>
          )}

          {/* Response status buttons */}
          <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-1">
            <button
              onClick={onInterested}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 hover:bg-green-100 rounded-lg text-xs font-medium text-green-700 transition-colors"
              title="مهتم"
            >
              <Smile size={14} />
              مهتم
            </button>
            <button
              onClick={onConsidering}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-xs font-medium text-yellow-700 transition-colors"
              title="سأفكر"
            >
              <Meh size={14} />
              سأفكر
            </button>
            <button
              onClick={onRejected}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-medium text-red-700 transition-colors"
              title="رفض"
            >
              <Frown size={14} />
              رفض
            </button>
          </div>

          <button
            onClick={onNote}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FFF8E1] hover:bg-[#FFECB3] rounded-lg text-xs font-medium text-[#D4A843] transition-colors"
            title="ملاحظة"
          >
            <StickyNote size={14} />
            📝
          </button>

          {tab === "interested" && (
            <button
              onClick={onRegistered}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#D4A843] hover:bg-[#C49835] rounded-xl text-xs font-medium text-white transition-colors"
            >
              <UserCheck size={14} />
              ✅ سجّل!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stats Panel (Improvement 5) ─────────────────────────────────────────────

function StatsPanel({ stats, loading }: { stats: StatsData | null; loading: boolean }) {
  if (loading || !stats) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-4 bg-gray-100 rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Volume Stats */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h3 className="text-base font-bold text-dark mb-4">📊 حجم الرسائل</h3>
        <div className="grid grid-cols-3 gap-4">
          <StatBox label="اليوم" value={stats.sentToday} color="text-[#1B7A3D]" />
          <StatBox label="الأسبوع" value={stats.sentWeek} color="text-blue-600" />
          <StatBox label="الشهر" value={stats.sentMonth} color="text-purple-600" />
        </div>
      </div>

      {/* Conversion Stats */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h3 className="text-base font-bold text-dark mb-4">📈 معدلات التحويل</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <ConversionBar label="نسبة الرد" value={stats.responseRate} count={stats.totalResponded} total={stats.totalSent} color="bg-blue-500" />
            <ConversionBar label="نسبة الاهتمام" value={stats.interestRate} count={stats.totalInterested} total={stats.totalSent} color="bg-green-500" />
            <ConversionBar label="نسبة التسجيل" value={stats.registrationRate} count={stats.totalRegistered} total={stats.totalSent} color="bg-[#D4A843]" />
          </div>
          <div className="space-y-3">
            <StatBox label="إجمالي المُرسل" value={stats.totalSent} color="text-gray-700" />
            <StatBox label="ردوا" value={stats.totalResponded} color="text-blue-600" />
            <StatBox label="مهتمين" value={stats.totalInterested} color="text-green-600" />
            <StatBox label="سجّلوا" value={stats.totalRegistered} color="text-[#D4A843]" />
          </div>
        </div>
      </div>

      {/* Best Template */}
      {stats.bestTemplate && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-base font-bold text-dark mb-3">⭐ أفضل رسالة</h3>
          <div className="bg-[#E8F5E9] rounded-xl p-3">
            <p className="text-sm font-bold text-[#1B7A3D]">{stats.bestTemplate.name_ar}</p>
            <div className="flex gap-4 mt-2 text-xs text-gray-text">
              <span>📤 {stats.bestTemplate.usage_count} استخدام</span>
              <span>📈 {stats.bestTemplate.response_rate}% نسبة رد</span>
            </div>
          </div>
        </div>
      )}

      {/* By Category */}
      {Object.keys(stats.byCategory).length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-base font-bold text-dark mb-3">📂 حسب الفئة</h3>
          <div className="space-y-2">
            {Object.entries(stats.byCategory)
              .sort(([, a], [, b]) => b.sent - a.sent)
              .map(([cat, data]) => (
                <div key={cat} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{CATEGORY_LABELS[cat] || cat}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-text">📤 {data.sent}</span>
                    <span className="text-green-600">😊 {data.interested}</span>
                    <span className="text-[#D4A843] font-bold">
                      {data.sent > 0 ? Math.round((data.interested / data.sent) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-text mt-0.5">{label}</p>
    </div>
  );
}

function ConversionBar({
  label,
  value,
  count,
  total,
  color,
}: {
  label: string;
  value: number;
  count: number;
  total: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-text">{label}</span>
        <span className="font-bold text-dark">{value}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-0.5">{count} من {total}</p>
    </div>
  );
}

// ─── Modal Component ─────────────────────────────────────────────────────────

function Modal({
  title,
  children,
  onClose,
  onConfirm,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-dark">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        {children}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-[#1B7A3D] text-white rounded-xl text-sm font-bold hover:bg-[#145C2E] transition-colors"
          >
            حفظ
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
