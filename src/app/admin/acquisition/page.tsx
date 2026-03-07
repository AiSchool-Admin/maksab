"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Target,
  Users,
  UserPlus,
  Phone,
  MessageCircle,
  TrendingUp,
  Filter,
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  Send,
  RefreshCw,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Star,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { getAdminHeaders } from "../layout";

// ── Types ──────────────────────────────────────────────

interface Lead {
  id: string;
  phone: string;
  name: string | null;
  source: string;
  source_profile_url: string | null;
  categories: string[];
  active_ads_count: number;
  seller_score: number;
  seller_tier: string;
  governorate: string | null;
  city: string | null;
  notes: string | null;
  status: string;
  contacted_at: string | null;
  registered_at: string | null;
  first_ad_at: string | null;
  batch_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AcquisitionStats {
  overview: {
    totalLeads: number;
    byStatus: Record<string, number>;
    bySource: Record<string, { total: number; converted: number }>;
    byTier: Record<string, number>;
    byCategory: Record<string, number>;
  };
  outreach: {
    today: number;
    repliesToday: number;
    responseRate: number;
  };
  goals: Array<{
    id: string;
    targetType: string;
    target: number;
    current: number;
    deadline: string;
    progress: number;
  }>;
  conversionRate: number;
  platformStats: {
    activeSellers: number;
    uniqueVisitors: number;
  };
}

// ── Constants ──────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  new: { label: "جديد", color: "text-blue-600", bgColor: "bg-blue-50", icon: <UserPlus size={14} /> },
  contacted: { label: "تم التواصل", color: "text-yellow-600", bgColor: "bg-yellow-50", icon: <Phone size={14} /> },
  interested: { label: "مهتم", color: "text-orange-600", bgColor: "bg-orange-50", icon: <Star size={14} /> },
  registered: { label: "مسجّل", color: "text-green-600", bgColor: "bg-green-50", icon: <CheckCircle size={14} /> },
  active_seller: { label: "بائع نشط", color: "text-emerald-700", bgColor: "bg-emerald-50", icon: <TrendingUp size={14} /> },
  declined: { label: "رفض", color: "text-red-500", bgColor: "bg-red-50", icon: <XCircle size={14} /> },
  blacklist: { label: "قائمة سوداء", color: "text-gray-500", bgColor: "bg-gray-100", icon: <AlertCircle size={14} /> },
};

const SOURCE_LABELS: Record<string, string> = {
  olx: "OLX",
  facebook: "فيسبوك",
  marketplace: "Marketplace",
  manual: "يدوي",
  referral: "إحالة",
  instagram: "إنستجرام",
  tiktok: "تيك توك",
  whatsapp_group: "واتساب",
  store_visit: "زيارة متجر",
};

const TIER_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  platinum: { label: "بلاتيني", emoji: "💎", color: "text-purple-600" },
  gold: { label: "ذهبي", emoji: "🥇", color: "text-yellow-600" },
  silver: { label: "فضي", emoji: "🥈", color: "text-gray-500" },
  bronze: { label: "برونزي", emoji: "🥉", color: "text-orange-600" },
};

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString("en-US");
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(date).toLocaleDateString("ar-EG");
}

function formatPhone(phone: string): string {
  if (phone.length === 11) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  }
  return phone;
}

// ── Main Page Component ────────────────────────────────

export default function AcquisitionPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "leads" | "add" | "import">("dashboard");
  const [stats, setStats] = useState<AcquisitionStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsTotalPages, setLeadsTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterTier, setFilterTier] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Add lead form
  const [newLead, setNewLead] = useState({
    phone: "",
    name: "",
    source: "manual",
    seller_tier: "bronze",
    governorate: "",
    city: "",
    notes: "",
    categories: [] as string[],
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addResult, setAddResult] = useState<{ success: boolean; message: string } | null>(null);

  // Import
  const [importJson, setImportJson] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);

  // Lead status update
  const [updatingLead, setUpdatingLead] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/acquisition/stats", {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const fetchLeads = useCallback(async (page = 1) => {
    setLeadsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (filterStatus) params.set("status", filterStatus);
      if (filterSource) params.set("source", filterSource);
      if (filterTier) params.set("tier", filterTier);
      if (searchQuery) params.set("q", searchQuery);

      const res = await fetch(`/api/admin/acquisition/leads?${params}`, {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setLeadsTotal(data.total);
        setLeadsPage(data.page);
        setLeadsTotalPages(data.totalPages);
      }
    } catch {
      // Silently fail
    }
    setLeadsLoading(false);
  }, [filterStatus, filterSource, filterTier, searchQuery]);

  useEffect(() => {
    fetchStats().then(() => setIsLoading(false));
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === "leads") {
      fetchLeads(1);
    }
  }, [activeTab, fetchLeads]);

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    setUpdatingLead(leadId);
    try {
      const res = await fetch("/api/admin/acquisition/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ id: leadId, status: newStatus }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
        );
        fetchStats(); // Refresh stats
      }
    } catch {
      // Silently fail
    }
    setUpdatingLead(null);
  };

  const handleAddLead = async () => {
    setAddLoading(true);
    setAddResult(null);
    try {
      const res = await fetch("/api/admin/acquisition/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify(newLead),
      });
      const data = await res.json();
      if (res.ok) {
        setAddResult({ success: true, message: "تم إضافة الـ Lead بنجاح!" });
        setNewLead({ phone: "", name: "", source: "manual", seller_tier: "bronze", governorate: "", city: "", notes: "", categories: [] });
        fetchStats();
      } else {
        setAddResult({ success: false, message: data.error || "حصل خطأ" });
      }
    } catch {
      setAddResult({ success: false, message: "حصل خطأ في الاتصال" });
    }
    setAddLoading(false);
  };

  const handleBulkImport = async () => {
    setImportLoading(true);
    setImportResult(null);
    try {
      const parsed = JSON.parse(importJson);
      const res = await fetch("/api/admin/acquisition/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      setImportResult(data);
      if (res.ok) {
        fetchStats();
      }
    } catch {
      setImportResult({ error: "JSON غير صالح — تأكد من الصيغة" });
    }
    setImportLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 bg-brand-green rounded-xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Target size={24} className="text-white" />
          </div>
          <p className="text-sm text-gray-text">جاري تحميل بيانات الاستحواذ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dark flex items-center gap-2">
            <Target size={22} className="text-brand-green" />
            محرك الاستحواذ على العملاء
          </h1>
          <p className="text-xs text-gray-text mt-1">إدارة وتتبع عملاء مكسب المحتملين</p>
        </div>
        <button
          onClick={() => { fetchStats(); if (activeTab === "leads") fetchLeads(leadsPage); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} />
          تحديث
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: "dashboard" as const, label: "لوحة القيادة", icon: <TrendingUp size={16} /> },
          { id: "leads" as const, label: "العملاء المحتملين", icon: <Users size={16} /> },
          { id: "add" as const, label: "إضافة عميل", icon: <Plus size={16} /> },
          { id: "import" as const, label: "إدخال مجمع", icon: <Upload size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-brand-green text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && stats && <DashboardView stats={stats} />}

      {/* Leads Tab */}
      {activeTab === "leads" && (
        <LeadsView
          leads={leads}
          total={leadsTotal}
          page={leadsPage}
          totalPages={leadsTotalPages}
          loading={leadsLoading}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterSource={filterSource}
          setFilterSource={setFilterSource}
          filterTier={filterTier}
          setFilterTier={setFilterTier}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onPageChange={(p) => fetchLeads(p)}
          onUpdateStatus={updateLeadStatus}
          updatingLead={updatingLead}
          onSearch={() => fetchLeads(1)}
        />
      )}

      {/* Add Lead Tab */}
      {activeTab === "add" && (
        <AddLeadView
          newLead={newLead}
          setNewLead={setNewLead}
          loading={addLoading}
          result={addResult}
          onSubmit={handleAddLead}
        />
      )}

      {/* Import Tab */}
      {activeTab === "import" && (
        <ImportView
          json={importJson}
          setJson={setImportJson}
          loading={importLoading}
          result={importResult}
          onImport={handleBulkImport}
        />
      )}
    </div>
  );
}

// ── Dashboard View ─────────────────────────────────────

function DashboardView({ stats }: { stats: AcquisitionStats }) {
  const { overview, outreach, goals, conversionRate } = stats;
  const { byStatus, bySource, byTier } = overview;

  // Funnel data
  const funnelSteps = [
    { key: "new", count: byStatus.new || 0 },
    { key: "contacted", count: byStatus.contacted || 0 },
    { key: "interested", count: byStatus.interested || 0 },
    { key: "registered", count: byStatus.registered || 0 },
    { key: "active_seller", count: byStatus.active_seller || 0 },
  ];

  const maxFunnel = Math.max(...funnelSteps.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <Users size={20} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-dark">{formatNum(overview.totalLeads)}</p>
          <p className="text-xs text-gray-text mt-0.5">إجمالي العملاء المحتملين</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-3">
            <TrendingUp size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-dark">{conversionRate}%</p>
          <p className="text-xs text-gray-text mt-0.5">معدل التحويل</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
            <Send size={20} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-dark">{formatNum(outreach.today)}</p>
          <p className="text-xs text-gray-text mt-0.5">رسائل النهارده</p>
          <p className="text-[10px] text-brand-green mt-1 font-medium">
            {outreach.repliesToday} رد — {outreach.responseRate}% استجابة
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
            <CheckCircle size={20} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-dark">{formatNum((byStatus.active_seller || 0) + (byStatus.registered || 0))}</p>
          <p className="text-xs text-gray-text mt-0.5">تم تحويلهم</p>
        </div>
      </div>

      {/* Acquisition Funnel */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-dark mb-4 flex items-center gap-2">
          <Filter size={16} className="text-brand-green" />
          قمع الاستحواذ
        </h3>
        <div className="space-y-3">
          {funnelSteps.map((step, i) => {
            const config = STATUS_CONFIG[step.key];
            const width = Math.max((step.count / maxFunnel) * 100, 5);
            const prevCount = i > 0 ? funnelSteps[i - 1].count : step.count;
            const dropRate = prevCount > 0 && i > 0
              ? Math.round(((prevCount - step.count) / prevCount) * 100)
              : 0;

            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className="w-24 flex items-center gap-1.5 shrink-0">
                  <span className={config.color}>{config.icon}</span>
                  <span className="text-xs font-medium text-dark">{config.label}</span>
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden relative">
                  <div
                    className={`h-full rounded-full ${config.bgColor} border ${config.color.replace("text-", "border-")} transition-all duration-500 flex items-center px-3`}
                    style={{ width: `${width}%` }}
                  >
                    <span className={`text-xs font-bold ${config.color}`}>{step.count}</span>
                  </div>
                </div>
                {i > 0 && dropRate > 0 && (
                  <span className="text-[10px] text-red-400 shrink-0 w-12 text-center">
                    -{dropRate}%
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Declined & Blacklisted */}
        <div className="flex gap-4 mt-4 pt-3 border-t border-gray-100">
          <span className="text-xs text-red-500">
            ❌ رفض: {byStatus.declined || 0}
          </span>
          <span className="text-xs text-gray-400">
            🚫 قائمة سوداء: {byStatus.blacklist || 0}
          </span>
        </div>
      </div>

      {/* Source & Tier Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Source */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-dark mb-4">📊 التوزيع حسب المصدر</h3>
          <div className="space-y-2.5">
            {Object.entries(bySource)
              .sort(([, a], [, b]) => b.total - a.total)
              .map(([source, data]) => {
                const convRate = data.total > 0 ? Math.round((data.converted / data.total) * 100) : 0;
                return (
                  <div key={source} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-dark">{SOURCE_LABELS[source] || source}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-text">{data.total} عميل</span>
                      <span className={`text-xs font-medium ${convRate > 0 ? "text-green-600" : "text-gray-400"}`}>
                        {convRate}% تحويل
                      </span>
                    </div>
                  </div>
                );
              })}
            {Object.keys(bySource).length === 0 && (
              <p className="text-xs text-gray-text text-center py-4">لا توجد بيانات بعد</p>
            )}
          </div>
        </div>

        {/* By Tier */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-dark mb-4">🏆 التوزيع حسب التصنيف</h3>
          <div className="space-y-3">
            {Object.entries(TIER_CONFIG).map(([tier, config]) => {
              const count = byTier[tier] || 0;
              const total = overview.totalLeads || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${config.color}`}>
                      {config.emoji} {config.label}
                    </span>
                    <span className="text-xs text-gray-text">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-green rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Goals */}
      {goals.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-dark mb-4">🎯 الأهداف</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {goals.map((goal) => (
              <div key={goal.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-dark">
                    {goal.targetType === "sellers" ? "🏪 البائعين" : "👥 المشترين"}
                  </span>
                  <span className="text-xs text-gray-text">
                    حتى {new Date(goal.deadline).toLocaleDateString("ar-EG")}
                  </span>
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-xl font-bold text-dark">{formatNum(goal.current)}</span>
                  <span className="text-xs text-gray-text mb-1">/ {formatNum(goal.target)}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      goal.progress >= 100 ? "bg-emerald-500" : goal.progress >= 50 ? "bg-brand-green" : "bg-yellow-400"
                    }`}
                    style={{ width: `${Math.min(goal.progress, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-text mt-1 text-left" dir="ltr">{goal.progress}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Distribution */}
      {Object.keys(overview.byCategory).length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-dark mb-4">📦 التوزيع حسب القسم</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(overview.byCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, count]) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 rounded-full text-xs font-medium text-dark border border-gray-100"
                >
                  {cat}
                  <span className="text-brand-green font-bold">{count}</span>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Leads List View ────────────────────────────────────

function LeadsView({
  leads,
  total,
  page,
  totalPages,
  loading,
  filterStatus,
  setFilterStatus,
  filterSource,
  setFilterSource,
  filterTier,
  setFilterTier,
  searchQuery,
  setSearchQuery,
  onPageChange,
  onUpdateStatus,
  updatingLead,
  onSearch,
}: {
  leads: Lead[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterSource: string;
  setFilterSource: (v: string) => void;
  filterTier: string;
  setFilterTier: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onPageChange: (p: number) => void;
  onUpdateStatus: (id: string, status: string) => void;
  updatingLead: string | null;
  onSearch: () => void;
}) {
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-3">
        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              placeholder="بحث بالاسم أو رقم الهاتف..."
              className="w-full pr-10 pl-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
            />
          </div>
          <button
            onClick={onSearch}
            className="px-4 py-2.5 bg-brand-green text-white rounded-xl text-sm font-medium hover:bg-brand-green-dark transition-colors"
          >
            بحث
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); }}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-green bg-white"
          >
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          <select
            value={filterSource}
            onChange={(e) => { setFilterSource(e.target.value); }}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-green bg-white"
          >
            <option value="">كل المصادر</option>
            {Object.entries(SOURCE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={filterTier}
            onChange={(e) => { setFilterTier(e.target.value); }}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-green bg-white"
          >
            <option value="">كل التصنيفات</option>
            {Object.entries(TIER_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-gray-text">
          إجمالي: <span className="font-bold text-dark">{total}</span> عميل محتمل
        </p>
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-2 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
          <Users size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-text">لا توجد نتائج</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => {
            const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
            const tierCfg = TIER_CONFIG[lead.seller_tier] || TIER_CONFIG.bronze;
            const isExpanded = expandedLead === lead.id;

            return (
              <div
                key={lead.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Lead Row */}
                <div
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full ${statusCfg.bgColor} flex items-center justify-center shrink-0`}>
                    <span className={`text-sm font-bold ${statusCfg.color}`}>
                      {(lead.name || lead.phone)[0]}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-dark truncate">
                        {lead.name || "بدون اسم"}
                      </p>
                      <span className={`text-[10px] ${tierCfg.color}`}>{tierCfg.emoji}</span>
                    </div>
                    <p className="text-xs text-gray-text" dir="ltr">{formatPhone(lead.phone)}</p>
                  </div>

                  {/* Status badge */}
                  <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${statusCfg.bgColor} ${statusCfg.color} shrink-0`}>
                    {statusCfg.label}
                  </span>

                  {/* Source */}
                  <span className="text-[10px] text-gray-text shrink-0 hidden sm:block">
                    {SOURCE_LABELS[lead.source] || lead.source}
                  </span>

                  {/* Time */}
                  <span className="text-[10px] text-gray-text shrink-0 hidden sm:block">
                    {timeAgo(lead.created_at)}
                  </span>

                  {/* Expand icon */}
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-gray-text">المصدر:</span>{" "}
                        <span className="font-medium text-dark">{SOURCE_LABELS[lead.source] || lead.source}</span>
                      </div>
                      <div>
                        <span className="text-gray-text">التصنيف:</span>{" "}
                        <span className={`font-medium ${tierCfg.color}`}>{tierCfg.emoji} {tierCfg.label}</span>
                      </div>
                      <div>
                        <span className="text-gray-text">الموقع:</span>{" "}
                        <span className="font-medium text-dark">{lead.governorate || "—"}{lead.city ? ` — ${lead.city}` : ""}</span>
                      </div>
                      <div>
                        <span className="text-gray-text">إعلانات سابقة:</span>{" "}
                        <span className="font-medium text-dark">{lead.active_ads_count}</span>
                      </div>
                    </div>

                    {lead.categories && lead.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {lead.categories.map((cat) => (
                          <span key={cat} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{cat}</span>
                        ))}
                      </div>
                    )}

                    {lead.notes && (
                      <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">{lead.notes}</p>
                    )}

                    {lead.source_profile_url && (
                      <a
                        href={lead.source_profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-green hover:underline"
                      >
                        🔗 بروفايل المصدر
                      </a>
                    )}

                    {/* Status Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                      <span className="text-[10px] text-gray-text ml-2 self-center">غيّر الحالة:</span>
                      {Object.entries(STATUS_CONFIG)
                        .filter(([key]) => key !== lead.status)
                        .map(([key, cfg]) => (
                          <button
                            key={key}
                            onClick={() => onUpdateStatus(lead.id, key)}
                            disabled={updatingLead === lead.id}
                            className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors hover:opacity-80 ${cfg.bgColor} ${cfg.color} border-current disabled:opacity-50`}
                          >
                            {updatingLead === lead.id ? "..." : cfg.label}
                          </button>
                        ))}
                    </div>

                    {/* Quick WhatsApp */}
                    <div className="flex gap-2 pt-1">
                      <a
                        href={`https://wa.me/2${lead.phone}?text=${encodeURIComponent("السلام عليكم! 👋\nأنا من فريق مكسب — سوق إلكتروني مصري لبيع وشراء كل حاجة.\nحابين نعرفك على المنصة وإزاي تقدر تعرض منتجاتك عليها مجاناً! 💚")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                      >
                        <MessageCircle size={12} />
                        واتساب
                      </a>
                      <a
                        href={`tel:+2${lead.phone}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
                      >
                        <Phone size={12} />
                        اتصال
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ArrowRight size={14} />
            السابق
          </button>
          <span className="text-xs text-gray-text">
            صفحة {page} من {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            التالي
            <ArrowLeft size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Add Lead View ──────────────────────────────────────

function AddLeadView({
  newLead,
  setNewLead,
  loading,
  result,
  onSubmit,
}: {
  newLead: {
    phone: string;
    name: string;
    source: string;
    seller_tier: string;
    governorate: string;
    city: string;
    notes: string;
    categories: string[];
  };
  setNewLead: (v: typeof newLead) => void;
  loading: boolean;
  result: { success: boolean; message: string } | null;
  onSubmit: () => void;
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm max-w-xl">
      <h3 className="text-sm font-bold text-dark mb-4 flex items-center gap-2">
        <UserPlus size={16} className="text-brand-green" />
        إضافة عميل محتمل جديد
      </h3>

      <div className="space-y-4">
        {/* Phone */}
        <div>
          <label className="text-xs font-medium text-dark mb-1 block">رقم الموبايل *</label>
          <input
            type="tel"
            value={newLead.phone}
            onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
            placeholder="01XXXXXXXXX"
            dir="ltr"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
          />
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-medium text-dark mb-1 block">الاسم</label>
          <input
            type="text"
            value={newLead.name}
            onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
            placeholder="اسم العميل"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
          />
        </div>

        {/* Source & Tier */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-dark mb-1 block">المصدر</label>
            <select
              value={newLead.source}
              onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green bg-white"
            >
              {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-dark mb-1 block">التصنيف</label>
            <select
              value={newLead.seller_tier}
              onChange={(e) => setNewLead({ ...newLead, seller_tier: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green bg-white"
            >
              {Object.entries(TIER_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-dark mb-1 block">المحافظة</label>
            <input
              type="text"
              value={newLead.governorate}
              onChange={(e) => setNewLead({ ...newLead, governorate: e.target.value })}
              placeholder="مثال: القاهرة"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-dark mb-1 block">المدينة</label>
            <input
              type="text"
              value={newLead.city}
              onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
              placeholder="مثال: مدينة نصر"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-dark mb-1 block">ملاحظات</label>
          <textarea
            value={newLead.notes}
            onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
            placeholder="أي ملاحظات عن العميل..."
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green resize-none"
          />
        </div>

        {/* Result Message */}
        {result && (
          <div className={`p-3 rounded-xl text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {result.success ? "✅" : "❌"} {result.message}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={onSubmit}
          disabled={loading || !newLead.phone}
          className="w-full py-3 bg-brand-green text-white rounded-xl text-sm font-bold hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              جاري الإضافة...
            </>
          ) : (
            <>
              <UserPlus size={16} />
              إضافة العميل
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Import View ────────────────────────────────────────

function ImportView({
  json,
  setJson,
  loading,
  result,
  onImport,
}: {
  json: string;
  setJson: (v: string) => void;
  loading: boolean;
  result: Record<string, unknown> | null;
  onImport: () => void;
}) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-dark mb-4 flex items-center gap-2">
          <Upload size={16} className="text-brand-green" />
          إدخال مجمع للعملاء المحتملين
        </h3>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 p-3 rounded-xl text-xs text-blue-700 space-y-1">
            <p className="font-bold">📋 صيغة البيانات المطلوبة (JSON):</p>
            <pre className="bg-blue-100 p-2 rounded-lg overflow-x-auto text-[10px] mt-2" dir="ltr">
{`[
  {
    "phone": "01012345678",
    "name": "محمد أحمد",
    "source": "olx",
    "seller_tier": "gold",
    "governorate": "القاهرة",
    "categories": ["سيارات", "موبايلات"]
  }
]`}
            </pre>
            <p className="mt-2">
              المصادر المتاحة: {Object.keys(SOURCE_LABELS).join("، ")}
            </p>
            <p>الحد الأقصى: 500 سجل في المرة الواحدة</p>
          </div>

          {/* JSON Input */}
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder='[{"phone": "01012345678", "name": "اسم العميل", "source": "olx"}]'
            rows={10}
            dir="ltr"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green resize-none"
          />

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-xl text-xs ${(result as { error?: string }).error ? "bg-red-50" : "bg-green-50"}`}>
              {(result as { error?: string }).error ? (
                <p className="text-red-700">❌ {(result as { error: string }).error}</p>
              ) : (
                <div className="space-y-1 text-green-700">
                  <p className="font-bold">✅ تم الإدخال بنجاح!</p>
                  <p>الإجمالي: {(result as { total?: number }).total || 0}</p>
                  <p>تم إدخالهم: {(result as { imported?: number }).imported || 0}</p>
                  <p>مكررين: {(result as { skippedDuplicate?: number }).skippedDuplicate || 0}</p>
                  <p>غير صالحين: {(result as { skippedInvalid?: number }).skippedInvalid || 0}</p>
                  {((result as { errors?: Array<{ phone: string; reason: string }> }).errors || []).length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-orange-600">
                        أخطاء ({((result as { errors?: unknown[] }).errors || []).length})
                      </summary>
                      <ul className="mt-1 space-y-0.5 text-red-600">
                        {((result as { errors?: Array<{ phone: string; reason: string }> }).errors || []).slice(0, 10).map((e, i) => (
                          <li key={i}>{e.phone}: {e.reason}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={onImport}
            disabled={loading || !json.trim()}
            className="w-full py-3 bg-brand-green text-white rounded-xl text-sm font-bold hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                جاري الإدخال...
              </>
            ) : (
              <>
                <Upload size={16} />
                إدخال البيانات
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
