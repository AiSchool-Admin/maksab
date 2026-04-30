"use client";

/**
 * /admin/dashboard — CEO Dashboard & Operating Playbook
 *
 * The single page the CEO opens every morning. Three layers:
 *
 *   1. مهام اليوم (Today's checklist) — interactive, persists per-user
 *      in localStorage and auto-resets at midnight. The non-negotiable
 *      daily ops loop.
 *
 *   2. KPIs بكل قسم — one card per department (Marketing / Sales /
 *      CS / Finance) with the few numbers that actually matter, plus
 *      a deep-link to the department landing page.
 *
 *   3. دليل العمل (Playbook) — accordion of tasks with three frequency
 *      tabs (يومي / أسبوعي / شهري). Static content, no DB needed.
 *
 * Live KPIs are pulled from existing endpoints (whales summary,
 * batch-send quota, escalations count). Department stats endpoints
 * can be added later — placeholders show "—" gracefully.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw,
  CheckCircle2,
  Circle,
  Rocket,
  Wheat,
  Inbox,
  Headphones,
  DollarSign,
  TrendingUp,
  Calendar,
  ListTodo,
  ArrowLeft,
} from "lucide-react";
import { useAdmin, getAdminHeaders } from "../layout";

/* ─── Live KPIs ─── */

interface DashKpis {
  total_listings: number;
  total_merchants: number;
  whales_count: number;
  contacted_today: number;
  cap_remaining: number;
  cap: number;
  escalations_pending: number;
}

/* ─── Daily Playbook (the non-negotiable loop) ─── */

interface DailyTask {
  id: string;
  label: string;
  desc?: string;
  href?: string;
  estimate: string; // e.g. "5 د"
  bucket: "morning" | "midday" | "evening";
  dept: "marketing" | "sales" | "cs" | "all";
}

const DAILY_TASKS: DailyTask[] = [
  // ───── Morning (15 د) ─────
  {
    id: "daily.harvest.dubizzle",
    label: "حصاد Dubizzle (Alexandria)",
    desc: "Bookmarklet → الإسكندرية → properties for sale",
    estimate: "5 د",
    bucket: "morning",
    dept: "marketing",
  },
  {
    id: "daily.harvest.aqarmap",
    label: "حصاد AqarMap",
    desc: "نفس الخطوات على aqarmap.com.eg",
    estimate: "5 د",
    bucket: "morning",
    dept: "marketing",
  },
  {
    id: "daily.harvest.semsarmasr",
    label: "حصاد SemsarMasr",
    desc: "نفس الخطوات على semsarmasr.com",
    estimate: "5 د",
    bucket: "morning",
    dept: "marketing",
  },
  {
    id: "daily.review.new_listings",
    label: "راجع عدد الإعلانات الجديدة",
    href: "/admin/marketing",
    estimate: "2 د",
    bucket: "morning",
    dept: "marketing",
  },

  // ───── Midday (30 د) ─────
  {
    id: "daily.escalations",
    label: "رد على escalations",
    desc: "محادثات Ahmed المُحوّلة لإنسان",
    href: "/admin/crm/escalations",
    estimate: "10-20 د",
    bucket: "midday",
    dept: "sales",
  },
  {
    id: "daily.cs.conversations",
    label: "راجع محادثات سارة المفتوحة",
    href: "/admin/cs/conversations",
    estimate: "5-10 د",
    bucket: "midday",
    dept: "cs",
  },
  {
    id: "daily.batch_send",
    label: "ابدأ حصاد Ahmed اليومي",
    desc: '\"ابدأ حصاد اليوم\" → 10-50 سمسار',
    href: "/admin/crm/whales?category=properties",
    estimate: "5 د",
    bucket: "midday",
    dept: "sales",
  },

  // ───── Evening (15 د) ─────
  {
    id: "daily.review.responses",
    label: "راجع نتائج الحصاد + ردود اليوم",
    href: "/admin/sales",
    estimate: "10 د",
    bucket: "evening",
    dept: "sales",
  },
  {
    id: "daily.review.kpis",
    label: "راجع KPIs اليوم على الـ dashboard",
    href: "/admin/dashboard",
    estimate: "5 د",
    bucket: "evening",
    dept: "all",
  },
];

/* ─── Weekly + Monthly Playbook ─── */

interface PlaybookItem {
  task: string;
  detail?: string;
  href?: string;
}
interface PlaybookSection {
  dept: "marketing" | "sales" | "cs" | "finance";
  emoji: string;
  title: string;
  items: PlaybookItem[];
}

const WEEKLY: PlaybookSection[] = [
  {
    dept: "marketing",
    emoji: "📈",
    title: "التسويق",
    items: [
      { task: "مراجعة Pareto — هل الحوت اتغيروا؟", href: "/admin/crm/whales?category=properties" },
      { task: "تحديث استراتيجية الحصاد بناءً على الأسبوع" },
      { task: "مراجعة Conversion Rate لكل منصة (Dubizzle/AqarMap/SemsarMasr)" },
      { task: "اعمل audit للـ duplicate sellers — لو في merge محتاج" },
    ],
  },
  {
    dept: "sales",
    emoji: "💼",
    title: "المبيعات",
    items: [
      { task: "تحليل Ahmed — رسائل مرسلة vs ردود vs تسجيلات" },
      { task: "مراجعة الـ escalations المتكررة — هل في pattern؟", href: "/admin/crm/escalations" },
      { task: "تحديث قوالب الرسائل لو الـ conversion ضعيف", href: "/admin/sales/templates" },
      { task: "اختبار A/B لـ subject lines / opening lines" },
    ],
  },
  {
    dept: "cs",
    emoji: "💚",
    title: "خدمة العملاء",
    items: [
      { task: "أكثر الأسئلة تكراراً → أضف للـ FAQs" },
      { task: "تدريب Sara على patterns جديدة" },
      { task: "مراجعة response time — هل في خطر SLA؟" },
      { task: "Survey CSAT لو في عملاء حلّوا مشاكلهم" },
    ],
  },
  {
    dept: "finance",
    emoji: "💰",
    title: "المالية",
    items: [
      { task: "مراجعة Featured Listings المدفوعة الأسبوع ده" },
      { task: "تتبع الباقات النشطة (Silver / Gold / Diamond)", href: "/admin/finance/subscriptions" },
      { task: "حساب MRR (Monthly Recurring Revenue) المتوقع" },
      { task: "تأكيد الـ payments المعلقة" },
    ],
  },
];

const MONTHLY: PlaybookSection[] = [
  {
    dept: "marketing",
    emoji: "📈",
    title: "التسويق",
    items: [
      { task: "SEO audit + إضافة landing pages للمناطق الجديدة" },
      { task: "حملات Facebook/Instagram — تقييم ROI" },
      { task: "خطة المحتوى للشهر القادم" },
      { task: "مراجعة شاملة لقاعدة البيانات — هل في فرص توسع؟" },
    ],
  },
  {
    dept: "sales",
    emoji: "💼",
    title: "المبيعات",
    items: [
      { task: "تقييم شامل لأداء Ahmed — هل نوسع scope؟" },
      { task: "تحديث system prompt لـ Ahmed بناءً على الـ patterns" },
      { task: "خطة الـ outreach للشهر القادم" },
      { task: "تجارب A/B جديدة (timing / channel / messaging)" },
    ],
  },
  {
    dept: "cs",
    emoji: "💚",
    title: "خدمة العملاء",
    items: [
      { task: "تقييم أداء Sara + ROI الـ AI" },
      { task: "تدريب الموظفين على المشاكل الجديدة" },
      { task: "تحديث الـ knowledge base" },
      { task: "خطة التوسع (هل نضيف موظفين؟)" },
    ],
  },
  {
    dept: "finance",
    emoji: "💰",
    title: "المالية",
    items: [
      { task: "إغلاق الشهر — تجميع كل المعاملات" },
      { task: "P&L statement (الأرباح والخسائر)" },
      { task: "خطة المرتبات + الـ commissions" },
      { task: "مراجعة الـ unit economics (CAC / LTV / Churn)" },
    ],
  },
  {
    dept: "marketing",
    emoji: "🎯",
    title: "استراتيجي (CEO)",
    items: [
      { task: "مراجعة الـ KPIs الكبيرة (MRR / sellers / listings / conversations)" },
      { task: "خطة الشهر القادم — أهداف SMART" },
      { task: "مراجعة الميزانية مقابل الإيرادات" },
      { task: "خطة التوسع — مدن جديدة؟ فئات جديدة؟" },
    ],
  },
];

/* ─── localStorage helpers (with daily auto-reset) ─── */

const CHECKLIST_KEY = "maksab_daily_checklist_v1";
function loadChecklist(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { date: string; tasks: Record<string, boolean> };
    const today = new Date().toISOString().split("T")[0];
    if (parsed.date !== today) return {}; // auto-reset overnight
    return parsed.tasks || {};
  } catch {
    return {};
  }
}
function saveChecklist(tasks: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem(CHECKLIST_KEY, JSON.stringify({ date: today, tasks }));
}

/* ─── Component ─── */

export default function CeoDashboardPage() {
  const admin = useAdmin();
  const [kpis, setKpis] = useState<DashKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"daily" | "weekly" | "monthly">("daily");

  useEffect(() => {
    setChecked(loadChecklist());
  }, []);

  const fetchKpis = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAdminHeaders();
      const [whalesRes, quotaRes, escRes] = await Promise.all([
        fetch("/api/admin/crm/whales?category=properties", { headers }),
        fetch("/api/admin/crm/whales/batch-send", { headers }),
        fetch("/api/admin/crm/escalations", { headers }),
      ]);
      const whales = whalesRes.ok ? await whalesRes.json() : null;
      const quota = quotaRes.ok ? await quotaRes.json() : null;
      const esc = escRes.ok ? await escRes.json() : null;
      setKpis({
        total_listings: whales?.summary?.total_listings || 0,
        total_merchants: whales?.summary?.total_merchants || 0,
        whales_count: whales?.summary?.top_20pct_merchant_count || 0,
        contacted_today: quota?.sent_today || 0,
        cap_remaining: quota?.remaining_today || 0,
        cap: quota?.cap || 50,
        escalations_pending: esc?.total || 0,
      });
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  const toggleTask = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveChecklist(next);
      return next;
    });
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "صباح الخير";
    if (h < 17) return "مساء الخير";
    return "مساء النور";
  })();

  const todayStr = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Group daily tasks by bucket
  const tasksByBucket = {
    morning: DAILY_TASKS.filter((t) => t.bucket === "morning"),
    midday: DAILY_TASKS.filter((t) => t.bucket === "midday"),
    evening: DAILY_TASKS.filter((t) => t.bucket === "evening"),
  };
  const completedCount = DAILY_TASKS.filter((t) => checked[t.id]).length;
  const totalCount = DAILY_TASKS.length;
  const completionPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1B7A3D] to-[#145C2E] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold mb-1">
              {greeting}، {admin?.name || "مدير"} 👋
            </div>
            <div className="text-sm opacity-80 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {todayStr}
            </div>
          </div>
          <button
            onClick={fetchKpis}
            className="p-2 hover:bg-white/10 rounded-lg"
            title="تحديث"
          >
            <RefreshCw
              className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-sm">
          <span>تقدم اليوم</span>
          <span className="font-bold">
            {completedCount} / {totalCount} ({completionPct}%)
          </span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2 mt-2 overflow-hidden">
          <div
            className="bg-[#D4A843] h-full transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* KPI Grid — one card per department */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DeptKpiCard
          href="/admin/marketing"
          dept="marketing"
          icon="📈"
          title="التسويق"
          metric={kpis?.total_merchants ?? "—"}
          metricLabel="شركة في DB"
          subMetric={kpis ? `${kpis.total_listings} إعلان` : "—"}
          loading={loading}
        />
        <DeptKpiCard
          href="/admin/sales"
          dept="sales"
          icon="💼"
          title="المبيعات"
          metric={kpis?.contacted_today ?? "—"}
          metricLabel={`من ${kpis?.cap || 50} اليوم`}
          subMetric={
            kpis && kpis.escalations_pending > 0
              ? `🚨 ${kpis.escalations_pending} محتاج رد`
              : "0 escalations"
          }
          highlight={kpis ? kpis.escalations_pending > 0 : false}
          loading={loading}
        />
        <DeptKpiCard
          href="/admin/cs"
          dept="cs"
          icon="💚"
          title="خدمة العملاء"
          metric="—"
          metricLabel="محادثات مفتوحة"
          subMetric="0 معلقة"
          loading={loading}
        />
        <DeptKpiCard
          href="/admin/finance"
          dept="finance"
          icon="💰"
          title="المالية"
          metric="—"
          metricLabel="إيرادات الشهر"
          subMetric="0 ج"
          loading={loading}
        />
      </div>

      {/* Today's Checklist */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-l from-amber-50 to-white">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-900">📋 مهام اليوم</h2>
            <span className="text-xs text-gray-500 mr-auto">
              يُعاد ضبطها تلقائياً منتصف الليل
            </span>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { key: "morning", label: "🌅 الصباح", time: "(15 دقيقة)" },
            { key: "midday", label: "☀️ منتصف اليوم", time: "(30 دقيقة)" },
            { key: "evening", label: "🌙 المساء", time: "(15 دقيقة)" },
          ].map((bucket) => {
            const items = tasksByBucket[bucket.key as keyof typeof tasksByBucket];
            return (
              <div key={bucket.key} className="px-5 py-3">
                <div className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span>{bucket.label}</span>
                  <span className="text-xs text-gray-400 font-normal">
                    {bucket.time}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {items.map((task) => (
                    <div key={task.id}>
                      <TaskRow
                        task={task}
                        checked={!!checked[task.id]}
                        onToggle={() => toggleTask(task.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Playbook (Daily / Weekly / Monthly) */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#1B7A3D]" />
            <h2 className="text-lg font-bold text-gray-900">📚 دليل العمل</h2>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(
              [
                { id: "daily" as const, label: "يومي" },
                { id: "weekly" as const, label: "أسبوعي" },
                { id: "monthly" as const, label: "شهري" },
              ]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  tab === t.id
                    ? "bg-white text-[#1B7A3D] shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          {tab === "daily" && (
            <div className="text-sm text-gray-600 leading-relaxed">
              <p className="mb-3">
                <b>دليل اليوم</b> هو الـ checklist فوق. اتبعه كل يوم — حوالي{" "}
                <b>60 دقيقة</b> إجمالي.
              </p>
              <p className="text-xs text-gray-500">
                💡 <b>نصيحة:</b> الـ checklist بيـ persist في المتصفح ويتم
                إعادة ضبطه تلقائياً منتصف الليل. لو شغلت من جهاز تاني، الـ
                checklist يفضل من الصفر.
              </p>
            </div>
          )}
          {tab === "weekly" && <PlaybookGrid sections={WEEKLY} note="مرة واحدة كل أسبوع — يفضّل يوم محدد (مثلاً السبت)." totalEstimate="1-2 ساعة" />}
          {tab === "monthly" && <PlaybookGrid sections={MONTHLY} note="أول 3 أيام من الشهر الجديد — تخطيط + إغلاق + استراتيجية." totalEstimate="يوم كامل" />}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <QuickLink href="/admin/crm/whales?category=properties" icon={Rocket} label="ابدأ حصاد Ahmed" color="bg-[#D4A843]" />
        <QuickLink href="/admin/crm/escalations" icon={Inbox} label="محتاج رد" color="bg-amber-600" />
        <QuickLink href="/admin/marketplace/bookmarklet" icon={Wheat} label="Bookmarklet" color="bg-emerald-600" />
        <QuickLink href="/admin/guide" icon={ListTodo} label="دليل العمل" color="bg-blue-600" />
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function TaskRow({
  task,
  checked,
  onToggle,
}: {
  task: DailyTask;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors ${
        checked ? "opacity-50" : ""
      }`}
    >
      <button onClick={onToggle} className="mt-0.5 shrink-0">
        {checked ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        ) : (
          <Circle className="w-5 h-5 text-gray-300 hover:text-gray-500" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-medium ${
              checked ? "line-through text-gray-500" : "text-gray-900"
            }`}
          >
            {task.label}
          </span>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 rounded">
            {task.estimate}
          </span>
        </div>
        {task.desc && (
          <div className="text-xs text-gray-500 mt-0.5">{task.desc}</div>
        )}
      </div>
      {task.href && (
        <Link
          href={task.href}
          className="text-xs text-[#1B7A3D] hover:text-[#145C2E] font-medium shrink-0 flex items-center gap-0.5"
        >
          افتح
          <ArrowLeft className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function DeptKpiCard({
  href,
  dept,
  icon,
  title,
  metric,
  metricLabel,
  subMetric,
  loading,
  highlight,
}: {
  href: string;
  dept: string;
  icon: string;
  title: string;
  metric: string | number;
  metricLabel: string;
  subMetric: string;
  loading?: boolean;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl p-4 border-2 transition-all hover:shadow-md ${
        highlight
          ? "bg-amber-50 border-amber-300"
          : "bg-white border-gray-100 hover:border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-600">{title}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 leading-tight">
        {loading ? "..." : metric}
      </div>
      <div className="text-[11px] text-gray-500 mt-0.5">{metricLabel}</div>
      <div
        className={`text-xs mt-2 pt-2 border-t border-gray-100 ${
          highlight ? "text-amber-700 font-medium" : "text-gray-500"
        }`}
      >
        {subMetric}
      </div>
    </Link>
  );
}

function PlaybookGrid({
  sections,
  note,
  totalEstimate,
}: {
  sections: PlaybookSection[];
  note: string;
  totalEstimate: string;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-900 flex items-center justify-between">
        <span>💡 {note}</span>
        <span className="font-bold">⏱️ {totalEstimate}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map((sec, i) => (
          <div
            key={`${sec.dept}-${i}`}
            className="border border-gray-200 rounded-xl p-4 bg-gray-50/50"
          >
            <div className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-base">{sec.emoji}</span>
              {sec.title}
            </div>
            <ul className="space-y-1.5">
              {sec.items.map((it, j) => (
                <li key={j} className="text-xs text-gray-700 flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <div className="flex-1">
                    <span>{it.task}</span>
                    {it.href && (
                      <Link
                        href={it.href}
                        className="mr-1 text-[#1B7A3D] hover:underline text-[11px] font-medium"
                      >
                        (افتح)
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className={`${color} text-white rounded-xl p-3 flex items-center gap-2 hover:opacity-90 transition-opacity`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
