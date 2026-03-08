"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowRight, Phone, MessageSquare, Mail, MapPin, Building2, Tag,
  TrendingUp, TrendingDown, Activity, Clock, ShoppingBag, Star,
  Edit2, Save, X, RefreshCw, Heart, AlertTriangle, Crown,
  Wallet, Gift, History, Send
} from "lucide-react";
import type { CrmCustomer, CrmActivityLog, CrmConversation, LifecycleStage } from "@/types/crm";
import {
  LIFECYCLE_LABELS, LIFECYCLE_COLORS, SOURCE_LABELS,
  ACCOUNT_TYPE_LABELS, CATEGORY_LABELS, SUBSCRIPTION_LABELS,
  LOYALTY_LABELS
} from "@/types/crm";
import { getAdminHeaders } from "@/app/admin/layout";

function ScoreCircle({ label, score, color }: { label: string; score: number; color: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90">
          <circle cx="32" cy="32" r={radius} stroke="#e5e7eb" strokeWidth="4" fill="none" />
          <circle cx="32" cy="32" r={radius} stroke={color} strokeWidth="4" fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-500" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{score}</span>
      </div>
      <span className="text-[10px] text-gray-500 mt-1">{label}</span>
    </div>
  );
}

function ActivityItem({ activity }: { activity: CrmActivityLog }) {
  const icons: Record<string, typeof Activity> = {
    lifecycle_change: TrendingUp,
    message_sent: Send,
    message_received: MessageSquare,
    listing_posted: ShoppingBag,
    commission_paid: Wallet,
    loyalty_earned: Gift,
  };
  const Icon = icons[activity.activity_type] || Activity;

  return (
    <div className="flex gap-3 py-2.5 border-b last:border-0">
      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{activity.description || activity.activity_type}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(activity.created_at).toLocaleString("ar-EG", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
          })}
          {activity.is_system && " • تلقائي"}
        </p>
      </div>
    </div>
  );
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<CrmCustomer | null>(null);
  const [activities, setActivities] = useState<CrmActivityLog[]>([]);
  const [conversations, setConversations] = useState<CrmConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CrmCustomer>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchCustomer() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/crm/customers/${id}`, { headers: getAdminHeaders() });
        const data = await res.json();
        setCustomer(data.customer);
        setActivities(data.activities || []);
        setConversations(data.conversations || []);
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchCustomer();
  }, [id]);

  const handleSave = async () => {
    if (!customer) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/crm/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.customer) {
        setCustomer(data.customer);
        setEditing(false);
        setEditForm({});
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleLifecycleChange = async (newStage: string) => {
    try {
      const res = await fetch(`/api/admin/crm/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ lifecycle_stage: newStage }),
      });
      const data = await res.json();
      if (data.customer) setCustomer(data.customer);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="bg-white rounded-xl border p-6">
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 mb-4">العميل غير موجود</p>
        <Link href="/admin/crm/customers" className="text-[#1B7A3D] font-bold hover:underline">العودة للقائمة</Link>
      </div>
    );
  }

  const c = customer;

  const tabs = [
    { id: "overview", label: "نظرة عامة" },
    { id: "details", label: "بيانات" },
    { id: "activity", label: "نشاط" },
    { id: "conversations", label: "محادثات" },
    { id: "loyalty", label: "ولاء" },
  ];

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link href="/admin/crm/customers" className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1B7A3D]">
        <ArrowRight size={14} /> العودة لقائمة العملاء
      </Link>

      {/* Header Card */}
      <div className="bg-white rounded-xl border p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Avatar & Name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-700 text-2xl font-bold flex-shrink-0">
              {(c.full_name || "؟")[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold">{c.full_name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${LIFECYCLE_COLORS[c.lifecycle_stage as LifecycleStage] || 'bg-gray-100'}`}>
                  {LIFECYCLE_LABELS[c.lifecycle_stage as LifecycleStage] || c.lifecycle_stage}
                </span>
                <span className="text-xs text-gray-500">{ACCOUNT_TYPE_LABELS[c.account_type]}</span>
                {c.is_commission_supporter && <span className="text-xs">💚 داعم مكسب</span>}
                {c.subscription_plan !== 'free' && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                    {SUBSCRIPTION_LABELS[c.subscription_plan]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1" dir="ltr"><Phone size={12} /> {c.phone}</span>
                {c.email && <span className="flex items-center gap-1" dir="ltr"><Mail size={12} /> {c.email}</span>}
                {c.governorate && <span className="flex items-center gap-1"><MapPin size={12} /> {c.governorate}{c.city ? ` — ${c.city}` : ''}</span>}
              </div>
            </div>
          </div>

          {/* Scores */}
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <ScoreCircle label="الصحة" score={c.health_score} color="#16a34a" />
            <ScoreCircle label="الاكتساب" score={c.acquisition_score} color="#2563eb" />
            <ScoreCircle label="التفاعل" score={c.engagement_score} color="#7c3aed" />
            <ScoreCircle label="القيمة" score={c.value_score} color="#d97706" />
            <ScoreCircle label="خطر المغادرة" score={c.churn_risk_score} color="#dc2626" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          <select value={c.lifecycle_stage} onChange={e => handleLifecycleChange(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-xs">
            {Object.entries(LIFECYCLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <a href={`https://wa.me/2${c.phone}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-200 transition-colors">
            <MessageSquare size={12} /> واتساب
          </a>
          <a href={`tel:${c.phone}`}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200 transition-colors">
            <Phone size={12} /> اتصال
          </a>
          <button onClick={() => { setEditing(true); setEditForm(c); }}
            className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 transition-colors">
            <Edit2 size={12} /> تعديل
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.id ? 'bg-[#1B7A3D] text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border p-4 md:p-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Key Metrics */}
            <div>
              <h3 className="font-bold mb-3">مقاييس رئيسية</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">إعلانات نشطة / كلية</span>
                  <span className="text-sm font-bold">{c.active_listings} / {c.total_listings}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">مبيعات / مشتريات / تبادلات</span>
                  <span className="text-sm font-bold">{c.total_sales} / {c.total_purchases} / {c.total_exchanges}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">إجمالي GMV</span>
                  <span className="text-sm font-bold">{Number(c.total_gmv_egp).toLocaleString()} جنيه</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">عمولة مدفوعة</span>
                  <span className="text-sm font-bold">{Number(c.total_commission_paid_egp).toLocaleString()} جنيه</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">مشاهدات إعلاناته</span>
                  <span className="text-sm font-bold">{c.total_views_received.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">متوسط وقت الرد</span>
                  <span className="text-sm font-bold">{c.avg_response_time_minutes ? `${c.avg_response_time_minutes} د` : '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">آخر نشاط</span>
                  <span className="text-sm font-bold">
                    {c.last_active_at ? `منذ ${c.days_since_last_active} يوم` : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">تاريخ التسجيل</span>
                  <span className="text-sm font-bold">
                    {new Date(c.created_at).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="font-bold mb-3">آخر النشاط</h3>
              {activities.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">لا يوجد نشاط بعد</p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {activities.slice(0, 10).map(a => <ActivityItem key={a.id} activity={a} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "details" && (
          <div className="space-y-6">
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">الاسم</label>
                    <input type="text" value={editForm.full_name || ''} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">الإيميل</label>
                    <input type="email" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-xl text-sm" dir="ltr" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">المحافظة</label>
                    <input type="text" value={editForm.governorate || ''} onChange={e => setEditForm(f => ({ ...f, governorate: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">المدينة</label>
                    <input type="text" value={editForm.city || ''} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-xl text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">نوع الحساب</label>
                    <select value={editForm.account_type || ''} onChange={e => setEditForm(f => ({ ...f, account_type: e.target.value as CrmCustomer['account_type'] }))}
                      className="w-full px-3 py-2 border rounded-xl text-sm">
                      {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">الفئة الرئيسية</label>
                    <select value={editForm.primary_category || ''} onChange={e => setEditForm(f => ({ ...f, primary_category: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-xl text-sm">
                      <option value="">— اختر —</option>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">ملاحظات داخلية</label>
                  <textarea value={editForm.internal_notes || ''} onChange={e => setEditForm(f => ({ ...f, internal_notes: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl text-sm" rows={3} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-1 px-4 py-2 bg-[#1B7A3D] text-white rounded-xl text-sm font-bold hover:bg-[#145C2E] disabled:opacity-50">
                    <Save size={14} /> {saving ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                  <button onClick={() => { setEditing(false); setEditForm({}); }}
                    className="flex items-center gap-1 px-4 py-2 border rounded-xl text-sm hover:bg-gray-50">
                    <X size={14} /> إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-sm mb-3">معلومات أساسية</h4>
                  <dl className="space-y-2">
                    {[
                      ['الهاتف', c.phone],
                      ['واتساب', c.whatsapp || c.phone],
                      ['الإيميل', c.email || '—'],
                      ['نوع الحساب', ACCOUNT_TYPE_LABELS[c.account_type]],
                      ['الفئة', CATEGORY_LABELS[c.primary_category || ''] || '—'],
                      ['المحافظة', c.governorate || '—'],
                      ['المدينة', c.city || '—'],
                      ['المصدر', SOURCE_LABELS[c.source] || c.source],
                      ['تفاصيل المصدر', c.source_detail || '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between py-1.5 border-b text-sm">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </dl>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-3">معلومات تجارية</h4>
                  <dl className="space-y-2">
                    {[
                      ['اسم النشاط', c.business_name || '—'],
                      ['الباقة', SUBSCRIPTION_LABELS[c.subscription_plan]],
                      ['مستوى الولاء', LOYALTY_LABELS[c.loyalty_tier]],
                      ['نقاط الولاء', c.loyalty_points.toLocaleString()],
                      ['إعلانات المنافسين', c.estimated_competitor_listings.toString()],
                      ['التوثيق', c.verification_level],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between py-1.5 border-b text-sm">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </dl>
                  {c.tags && c.tags.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-bold text-sm mb-2">الوسوم</h4>
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {c.internal_notes && (
                    <div className="mt-4">
                      <h4 className="font-bold text-sm mb-2">ملاحظات</h4>
                      <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-xl">{c.internal_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <div>
            <h3 className="font-bold mb-3">سجل النشاط</h3>
            {activities.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">لا يوجد نشاط مسجل</p>
            ) : (
              <div className="space-y-0">
                {activities.map(a => <ActivityItem key={a.id} activity={a} />)}
              </div>
            )}
          </div>
        )}

        {activeTab === "conversations" && (
          <div>
            <h3 className="font-bold mb-3">المحادثات</h3>
            {conversations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">لا توجد محادثات</p>
            ) : (
              <div className="space-y-2">
                {conversations.map(conv => (
                  <div key={conv.id} className={`p-3 rounded-xl text-sm ${
                    conv.direction === 'inbound' ? 'bg-blue-50 mr-8' : 'bg-gray-50 ml-8'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">
                        {conv.direction === 'inbound' ? 'وارد' : 'صادر'} — {conv.channel}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(conv.created_at).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p>{conv.content || '(بدون محتوى)'}</p>
                    {conv.sentiment && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-white rounded-full">
                        {conv.sentiment === 'positive' ? '😊' : conv.sentiment === 'negative' ? '😞' : '😐'} {conv.sentiment}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "loyalty" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-3">برنامج الولاء</h3>
              <div className="bg-gradient-to-l from-green-50 to-emerald-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <Crown size={24} className="text-yellow-600" />
                  <div>
                    <p className="font-bold">{LOYALTY_LABELS[c.loyalty_tier]}</p>
                    <p className="text-xs text-gray-500">{c.loyalty_points.toLocaleString()} نقطة</p>
                  </div>
                </div>
                <div className="w-full bg-white rounded-full h-2.5">
                  <div className="bg-green-500 h-2.5 rounded-full transition-all" style={{
                    width: `${Math.min((c.loyalty_points / (c.loyalty_tier === 'bronze' ? 100 : c.loyalty_tier === 'silver' ? 500 : c.loyalty_tier === 'gold' ? 2000 : c.loyalty_tier === 'platinum' ? 10000 : 20000)) * 100, 100)}%`
                  }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b text-sm">
                  <span className="text-gray-500">نقاط مكتسبة (إجمالي)</span>
                  <span className="font-bold">{c.loyalty_points_lifetime.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b text-sm">
                  <span className="text-gray-500">رصيد حالي</span>
                  <span className="font-bold">{c.loyalty_points.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 text-sm">
                  <span className="text-gray-500">قيمة العميل الكلية</span>
                  <span className="font-bold">{Number(c.lifetime_value_egp).toLocaleString()} جنيه</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-3">إيرادات</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b text-sm">
                  <span className="text-gray-500">إجمالي GMV</span>
                  <span className="font-bold">{Number(c.total_gmv_egp).toLocaleString()} جنيه</span>
                </div>
                <div className="flex justify-between py-1.5 border-b text-sm">
                  <span className="text-gray-500">عمولة مدفوعة</span>
                  <span className="font-bold">{Number(c.total_commission_paid_egp).toLocaleString()} جنيه</span>
                </div>
                <div className="flex justify-between py-1.5 border-b text-sm">
                  <span className="text-gray-500">معدل دفع العمولة</span>
                  <span className="font-bold">{c.commission_payment_rate}%</span>
                </div>
                <div className="flex justify-between py-1.5 border-b text-sm">
                  <span className="text-gray-500">اشتراكات مدفوعة</span>
                  <span className="font-bold">{Number(c.total_subscription_paid_egp).toLocaleString()} جنيه</span>
                </div>
                <div className="flex justify-between py-1.5 text-sm">
                  <span className="text-gray-500">خدمات إضافية</span>
                  <span className="font-bold">{Number(c.total_addons_paid_egp).toLocaleString()} جنيه</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
