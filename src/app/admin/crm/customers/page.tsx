"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search, Plus, Upload, RefreshCw, ChevronLeft, ChevronRight,
  Users, UserPlus, AlertTriangle, TrendingUp, Filter, X, Download
} from "lucide-react";
import {
  LIFECYCLE_LABELS, LIFECYCLE_COLORS, SOURCE_LABELS,
  ACCOUNT_TYPE_LABELS, CATEGORY_LABELS,
} from "@/types/crm";
import type { CrmCustomer, LifecycleStage } from "@/types/crm";
import { getAdminHeaders } from "@/app/admin/layout";

// Quick Add Modal
function QuickAddModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    full_name: "", phone: "", whatsapp: "", email: "",
    account_type: "individual", governorate: "", city: "",
    primary_category: "", source: "cs_agent", source_detail: "",
    estimated_competitor_listings: 0, tags: "", internal_notes: "",
    business_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/crm/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({
          ...form,
          tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "حصل مشكلة");
        return;
      }
      onAdded();
      onClose();
      setForm({
        full_name: "", phone: "", whatsapp: "", email: "",
        account_type: "individual", governorate: "", city: "",
        primary_category: "", source: "cs_agent", source_detail: "",
        estimated_competitor_listings: 0, tags: "", internal_notes: "",
        business_name: "",
      });
    } catch {
      setError("حصل مشكلة في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold">إضافة عميل جديد</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">الاسم *</label>
              <input type="text" required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="الاسم الكامل" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">الهاتف *</label>
              <input type="tel" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="01XXXXXXXXX" dir="ltr" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">واتساب</label>
              <input type="tel" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="نفس رقم الهاتف" dir="ltr" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">الإيميل</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="example@email.com" dir="ltr" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">نوع الحساب</label>
              <select value={form.account_type} onChange={e => setForm(f => ({ ...f, account_type: e.target.value }))}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">الفئة الرئيسية</label>
              <select value={form.primary_category} onChange={e => setForm(f => ({ ...f, primary_category: e.target.value }))}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
                <option value="">— اختر —</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">المحافظة</label>
              <input type="text" value={form.governorate} onChange={e => setForm(f => ({ ...f, governorate: e.target.value }))}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="القاهرة" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">المدينة</label>
              <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="مدينة نصر" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">المصدر</label>
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent">
                {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">تفاصيل المصدر</label>
              <input type="text" value={form.source_detail} onChange={e => setForm(f => ({ ...f, source_detail: e.target.value }))}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="اسم الجروب/الحملة" />
            </div>
          </div>

          {form.account_type !== "individual" && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">اسم النشاط التجاري</label>
              <input type="text" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">إعلانات المنافسين (تقريبي)</label>
            <input type="number" min={0} value={form.estimated_competitor_listings}
              onChange={e => setForm(f => ({ ...f, estimated_competitor_listings: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">وسوم (مفصولة بفاصلة)</label>
            <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="vip, high_value" dir="ltr" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">ملاحظات داخلية</label>
            <textarea value={form.internal_notes} onChange={e => setForm(f => ({ ...f, internal_notes: e.target.value }))}
              className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" rows={2} />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#1B7A3D] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#145C2E] disabled:opacity-50 transition-colors">
              {loading ? "جاري الإضافة..." : "إضافة العميل"}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 border rounded-xl text-sm hover:bg-gray-50 transition-colors">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// CSV Import Modal
function ImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; duplicates: number; errors: number } | null>(null);

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return;
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });
      return obj;
    });
    setPreview(rows.slice(0, 5));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setLoading(true);
    setResult(null);
    try {
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = values[i] || ''; });
        return obj;
      });

      const res = await fetch("/api/admin/crm/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      setResult({ imported: data.imported, duplicates: data.duplicates, errors: data.errors });
      if (data.imported > 0) onImported();
    } catch {
      setResult({ imported: 0, duplicates: 0, errors: -1 });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold">استيراد عملاء من CSV</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-blue-50 p-3 rounded-xl text-sm text-blue-800">
            <p className="font-bold mb-1">تنسيق الملف المطلوب (CSV):</p>
            <p dir="ltr" className="font-mono text-xs">full_name,phone,governorate,city,primary_category,source,source_detail,estimated_competitor_listings,tags,internal_notes</p>
          </div>

          <div>
            <label className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <Upload size={20} className="text-gray-500" />
              <span className="text-sm text-gray-600">اختر ملف CSV</span>
              <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">أو الصق البيانات هنا:</label>
            <textarea value={csvText} onChange={e => { setCsvText(e.target.value); parseCSV(e.target.value); }}
              className="w-full px-3 py-2 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-green-500" rows={5} dir="ltr"
              placeholder="full_name,phone,governorate,city,primary_category&#10;أحمد محمد,01012345678,cairo,مدينة نصر,phones" />
          </div>

          {preview.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-2">معاينة ({preview.length} صف):</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      {Object.keys(preview[0]).slice(0, 5).map(h => <th key={h} className="px-2 py-1 text-right">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(row).slice(0, 5).map((v, j) => <td key={j} className="px-2 py-1">{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result && (
            <div className={`p-3 rounded-xl text-sm ${result.errors === -1 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {result.errors === -1 ? "حصل مشكلة في الاتصال" : (
                <p>تم استيراد {result.imported} عميل | {result.duplicates} مكرر | {result.errors} خطأ</p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleImport} disabled={loading || !csvText}
              className="flex-1 bg-[#1B7A3D] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#145C2E] disabled:opacity-50 transition-colors">
              {loading ? "جاري الاستيراد..." : "استيراد"}
            </button>
            <button onClick={onClose} className="px-4 py-2.5 border rounded-xl text-sm hover:bg-gray-50 transition-colors">إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Health score bar
function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold">{score}</span>
    </div>
  );
}

export default function CrmCustomersPage() {
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lifecycle, setLifecycle] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [accountType, setAccountType] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({ total: 0, leads: 0, active: 0, at_risk: 0 });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(), limit: "20", sort_by: sortBy, sort_order: sortOrder,
    });
    if (search) params.set("search", search);
    if (lifecycle) params.set("lifecycle", lifecycle);
    if (category) params.set("category", category);
    if (source) params.set("source", source);
    if (accountType) params.set("account_type", accountType);

    try {
      const res = await fetch(`/api/admin/crm/customers?${params}`, { headers: getAdminHeaders() });
      const data = await res.json();

      setCustomers(data.customers || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search, lifecycle, category, source, accountType, sortBy, sortOrder]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/crm/customers?limit=1", { headers: getAdminHeaders() });
        const data = await res.json();
        setStats(s => ({ ...s, total: data.total || 0 }));
      } catch { /* ignore */ }
    }
    fetchStats();
  }, []);

  const handleRecalculateScores = async () => {
    setRecalculating(true);
    try {
      await fetch("/api/admin/crm/customers/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({}),
      });
      fetchCustomers();
    } catch { /* ignore */ }
    setRecalculating(false);
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/admin/crm/customers/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
      });
      const data = await res.json();
      if (res.ok) {
        setSeedResult(`تم إضافة ${data.imported} عميل تجريبي بنجاح`);
        fetchCustomers();
      } else {
        setSeedResult(data.error || "حصل مشكلة");
      }
    } catch {
      setSeedResult("حصل مشكلة في الاتصال");
    } finally {
      setSeeding(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-blue-600" />
            <span className="text-xs text-gray-500">إجمالي العملاء</span>
          </div>
          <p className="text-2xl font-bold">{total.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus size={16} className="text-green-600" />
            <span className="text-xs text-gray-500">عملاء محتملين</span>
          </div>
          <p className="text-2xl font-bold">{customers.filter(c => c.lifecycle_stage === 'lead').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-emerald-600" />
            <span className="text-xs text-gray-500">نشطين</span>
          </div>
          <p className="text-2xl font-bold">{customers.filter(c => ['active', 'power_user', 'champion'].includes(c.lifecycle_stage)).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-orange-600" />
            <span className="text-xs text-gray-500">معرضين للخطر</span>
          </div>
          <p className="text-2xl font-bold">{customers.filter(c => c.lifecycle_stage === 'at_risk').length}</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-xl border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو الهاتف أو الإيميل..."
                className="w-full pr-9 pl-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
          </form>

          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-3 py-2 border rounded-xl text-sm hover:bg-gray-50 transition-colors ${showFilters ? 'bg-green-50 border-green-300 text-green-700' : ''}`}>
            <Filter size={14} /> فلاتر
          </button>

          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 px-3 py-2 bg-[#1B7A3D] text-white rounded-xl text-sm font-bold hover:bg-[#145C2E] transition-colors">
            <Plus size={14} /> إضافة
          </button>

          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1 px-3 py-2 border rounded-xl text-sm hover:bg-gray-50 transition-colors">
            <Upload size={14} /> استيراد CSV
          </button>

          <button onClick={handleRecalculateScores} disabled={recalculating}
            className="flex items-center gap-1 px-3 py-2 border rounded-xl text-sm hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} /> تحديث النقاط
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-5 gap-2">
            <select value={lifecycle} onChange={e => { setLifecycle(e.target.value); setPage(1); }}
              className="px-3 py-2 border rounded-xl text-xs">
              <option value="">كل المراحل</option>
              {Object.entries(LIFECYCLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}
              className="px-3 py-2 border rounded-xl text-xs">
              <option value="">كل الفئات</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={source} onChange={e => { setSource(e.target.value); setPage(1); }}
              className="px-3 py-2 border rounded-xl text-xs">
              <option value="">كل المصادر</option>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={accountType} onChange={e => { setAccountType(e.target.value); setPage(1); }}
              className="px-3 py-2 border rounded-xl text-xs">
              <option value="">كل الأنواع</option>
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={`${sortBy}:${sortOrder}`} onChange={e => { const [s, o] = e.target.value.split(':'); setSortBy(s); setSortOrder(o); setPage(1); }}
              className="px-3 py-2 border rounded-xl text-xs">
              <option value="created_at:desc">الأحدث</option>
              <option value="created_at:asc">الأقدم</option>
              <option value="health_score:desc">الأعلى صحة</option>
              <option value="health_score:asc">الأقل صحة</option>
              <option value="acquisition_score:desc">الأعلى أولوية</option>
              <option value="churn_risk_score:desc">الأعلى خطر</option>
              <option value="total_gmv_egp:desc">الأعلى قيمة</option>
            </select>
          </div>
        )}
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="px-3 py-2.5 text-right">العميل</th>
                <th className="px-3 py-2.5 text-right">الهاتف</th>
                <th className="px-3 py-2.5 text-right">المرحلة</th>
                <th className="px-3 py-2.5 text-right">النوع</th>
                <th className="px-3 py-2.5 text-right">الفئة</th>
                <th className="px-3 py-2.5 text-right">المصدر</th>
                <th className="px-3 py-2.5 text-right">الصحة</th>
                <th className="px-3 py-2.5 text-right">إعلانات</th>
                <th className="px-3 py-2.5 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t animate-pulse">
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-12" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-14" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-8" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-gray-400">
                    <Users size={40} className="mx-auto mb-2 opacity-30" />
                    <p>لا يوجد عملاء</p>
                    <div className="mt-3 flex flex-col items-center gap-2">
                      <button onClick={() => setShowAdd(true)} className="text-[#1B7A3D] text-sm font-bold hover:underline">
                        أضف أول عميل
                      </button>
                      <span className="text-xs text-gray-300">أو</span>
                      <button
                        onClick={handleSeedDemo}
                        disabled={seeding}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#D4A843] text-white rounded-xl text-sm font-bold hover:bg-[#b8922e] disabled:opacity-50 transition-colors"
                      >
                        <Download size={14} />
                        {seeding ? "جاري الإضافة..." : "إضافة 15 عميل تجريبي للاختبار"}
                      </button>
                      {seedResult && (
                        <p className={`text-xs mt-1 ${seedResult.includes("بنجاح") ? "text-green-600" : "text-red-600"}`}>
                          {seedResult}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id} className="border-t hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/crm/customers/${c.id}`} className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-xs font-bold flex-shrink-0">
                          {(c.full_name || "؟")[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{c.full_name}</p>
                          {c.business_name && <p className="text-xs text-gray-500 truncate">{c.business_name}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono" dir="ltr">{c.phone}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${LIFECYCLE_COLORS[c.lifecycle_stage as LifecycleStage] || 'bg-gray-100'}`}>
                        {LIFECYCLE_LABELS[c.lifecycle_stage as LifecycleStage] || c.lifecycle_stage}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{ACCOUNT_TYPE_LABELS[c.account_type] || c.account_type}</td>
                    <td className="px-3 py-2.5 text-xs">{CATEGORY_LABELS[c.primary_category || ''] || '—'}</td>
                    <td className="px-3 py-2.5 text-xs">{SOURCE_LABELS[c.source] || c.source}</td>
                    <td className="px-3 py-2.5"><HealthBar score={c.health_score} /></td>
                    <td className="px-3 py-2.5 text-xs text-center">{c.active_listings}/{c.total_listings}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">
                      {new Date(c.created_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-xs text-gray-500">{total.toLocaleString()} عميل</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 border rounded-lg hover:bg-white disabled:opacity-30 transition-colors">
                <ChevronRight size={14} />
              </button>
              <span className="px-3 text-xs">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 border rounded-lg hover:bg-white disabled:opacity-30 transition-colors">
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <QuickAddModal open={showAdd} onClose={() => setShowAdd(false)} onAdded={fetchCustomers} />
      <ImportModal open={showImport} onClose={() => setShowImport(false)} onImported={fetchCustomers} />
    </div>
  );
}
