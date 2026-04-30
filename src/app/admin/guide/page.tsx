"use client";

/**
 * /admin/guide — User Guide / Operating Manual
 *
 * The full per-role daily playbook. Anyone on the team opens this
 * page on their first day and learns exactly what to do, in what
 * order, with which tool, and what the success metric is.
 *
 * Five role tabs (CEO / Marketing / Sales / CS / Finance), each with
 * a "Day in the life" timeline. Plus FAQ at the bottom for the
 * common edge cases.
 */

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Crown,
  TrendingUp,
  Briefcase,
  Heart,
  DollarSign,
  HelpCircle,
  ExternalLink,
  Clock,
  AlertCircle,
} from "lucide-react";

type RoleTab = "ceo" | "marketing" | "sales" | "cs" | "finance" | "faq";

interface Step {
  time?: string;
  title: string;
  detail?: string;
  href?: string;
  bullets?: string[];
  warn?: string;
}

interface DayBlock {
  bucket: string;
  duration: string;
  steps: Step[];
}

interface RoleGuide {
  emoji: string;
  title: string;
  who: string;
  goal: string;
  blocks: DayBlock[];
  successMetrics: string[];
}

const GUIDES: Record<Exclude<RoleTab, "faq">, RoleGuide> = {
  ceo: {
    emoji: "👑",
    title: "المدير العام (CEO)",
    who: "المؤسس / المدير التنفيذي",
    goal: "متابعة كل الأقسام + اتخاذ القرارات الكبرى + التواصل مع الحوت",
    blocks: [
      {
        bucket: "🌅 الصباح",
        duration: "15-20 دقيقة",
        steps: [
          {
            time: "08:30",
            title: "افتح لوحة القيادة",
            href: "/admin/dashboard",
            detail: "شوف progress اليوم (هل الفريق بدأ؟) + KPIs الرئيسية",
          },
          {
            time: "08:35",
            title: "راجع KPIs كل قسم",
            detail: "اضغط على كل KPI card → تنقل لصفحة القسم",
            bullets: [
              "📈 التسويق: عدد الإعلانات الجديدة + الحوت",
              "💼 المبيعات: محتاج رد إنسان (escalations) — لو > 0 أولوية!",
              "💚 خدمة العملاء: محادثات معلقة",
              "💰 المالية: إيرادات الشهر",
            ],
          },
        ],
      },
      {
        bucket: "☀️ منتصف اليوم",
        duration: "30-60 دقيقة",
        steps: [
          {
            time: "12:00",
            title: "تواصل شخصي مع الحوت",
            href: "/admin/crm/whales?category=properties",
            detail: "أعلى 9 شركات في الإسكندرية — تواصل واتس مباشر",
            bullets: [
              "اضغط 💬 WhatsApp بجانب الشركة",
              "بعد المكالمة: 📝 سجل الملاحظات",
              "علّم الحالة: ✉️ تم التواصل / ✅ مسجّل / ❌ رفض",
            ],
          },
          {
            time: "13:00",
            title: "راجع escalations",
            href: "/admin/crm/escalations",
            detail: "محادثات Ahmed اللي حوّلها للبشر",
            warn: "أي escalation متأخر أكثر من ساعة = خسارة محتملة",
          },
        ],
      },
      {
        bucket: "🌙 المساء",
        duration: "10-15 دقيقة",
        steps: [
          {
            time: "20:00",
            title: "مراجعة آخر اليوم",
            href: "/admin/dashboard",
            detail: "checklist اليوم اكتمل؟ KPIs اتحركت؟",
          },
          {
            time: "20:10",
            title: "راجع تقدم الفريق",
            href: "/admin/team",
            detail: "كل عضو فريق وصل أهدافه اليوم؟",
          },
        ],
      },
    ],
    successMetrics: [
      "✅ كل خانات checklist اليوم متعلّمة",
      "✅ 0 escalations متأخرة",
      "✅ تواصل مع 1-2 حوت يومياً (شخصي)",
      "✅ مراجعة KPIs الأقسام",
    ],
  },
  marketing: {
    emoji: "📈",
    title: "مدير التسويق",
    who: "CMO / Marketing Manager",
    goal: "تكبير قاعدة بيانات السماسرة + تحديد الحوت + جذب البائعين الجدد",
    blocks: [
      {
        bucket: "🌅 الصباح",
        duration: "20 دقيقة",
        steps: [
          {
            time: "09:00",
            title: "حصاد البيانات اليومي",
            href: "/admin/crm/harvester",
            detail: "شغّل الـ Bookmarklet على المنصات الـ 3",
            bullets: [
              "Dubizzle (الإسكندرية → properties for sale)",
              "AqarMap (alexandria → properties)",
              "SemsarMasr (cid=952, purpose=sale, g=979)",
            ],
          },
          {
            time: "09:20",
            title: "راجع الإعلانات الجديدة",
            href: "/admin/marketing",
            detail: "كم سمسار جديد دخل DB؟ كم listings جديدة؟",
          },
        ],
      },
      {
        bucket: "☀️ منتصف اليوم",
        duration: "30 دقيقة",
        steps: [
          {
            time: "13:00",
            title: "تحديث الـ Pareto",
            href: "/admin/crm/whales?category=properties",
            detail: "الحوت اتغيروا؟ في شركات جديدة دخلت Top 20%؟",
          },
          {
            time: "13:15",
            title: "نظافة DB",
            href: "/admin/crm/sellers?category=properties",
            detail: "ابحث عن duplicates / merchants محتاجة دمج يدوي",
          },
        ],
      },
      {
        bucket: "🌙 المساء",
        duration: "15 دقيقة",
        steps: [
          {
            time: "17:00",
            title: "تقرير اليوم",
            detail: "اكتب رسالة في group Marketing بعدد الإعلانات الجديدة",
          },
        ],
      },
    ],
    successMetrics: [
      "✅ 3 منصات حُصدت يومياً",
      "✅ نمو DB أسبوعي بنسبة 5%+",
      "✅ Top 20% (الحوت) محدّد ومُحدَّث",
      "✅ Conversion rate من الحصاد → التواصل > 30%",
    ],
  },
  sales: {
    emoji: "💼",
    title: "مدير المبيعات",
    who: "Sales Manager",
    goal: "تحويل البائعين من DB → عملاء مسجلين عبر Ahmed AI + التواصل اليدوي",
    blocks: [
      {
        bucket: "🌅 الصباح",
        duration: "15 دقيقة",
        steps: [
          {
            time: "10:00",
            title: "افتح صفحة المبيعات",
            href: "/admin/sales",
            detail: "راجع KPIs: محتاج رد + متبقي اليوم + مسجّل اليوم",
          },
          {
            time: "10:05",
            title: "ابدأ Ahmed batch اليومي",
            href: "/admin/crm/whales?category=properties",
            detail: "🚀 ابدأ حصاد اليوم → اختر 10-50 سمسار",
            warn: "حد أقصى 50 رسالة/يوم. ابدأ بـ 10 لو الـ DB صغير",
          },
        ],
      },
      {
        bucket: "☀️ منتصف اليوم — الأهم!",
        duration: "60-90 دقيقة",
        steps: [
          {
            time: "12:00",
            title: "رد على كل escalations",
            href: "/admin/crm/escalations",
            detail: "Ahmed بيحوّل المعقد للبشر — لازم ترد بسرعة",
            bullets: [
              "اقرأ المحادثة كاملة",
              "اضغط 💬 افتح WhatsApp ورد يدوياً",
              "بعد الرد: ✅ تم الحل أو 🔄 أعد لأحمد",
            ],
            warn: "هدف SLA: رد خلال ساعة من الـ escalation",
          },
          {
            time: "13:00",
            title: "Seller 360 — متابعة محادثات نشطة",
            href: "/admin/sales/crm",
            detail: "السماسرة في pipeline (interested/contacted) — تابعهم",
          },
        ],
      },
      {
        bucket: "🌙 المساء",
        duration: "15 دقيقة",
        steps: [
          {
            time: "18:00",
            title: "تقرير الأداء اليومي",
            detail: "كم رسالة بعتت Ahmed؟ كم رد إيجابي؟ كم تسجيل؟",
            bullets: [
              "ابعت رسالة في group Sales",
              "علّم patterns متكررة في الـ escalations",
            ],
          },
        ],
      },
    ],
    successMetrics: [
      "✅ Daily cap (50 رسالة) مستخدم بانتظام",
      "✅ 0 escalations متأخرة (> ساعة)",
      "✅ 10%+ من الرسائل بترد إيجابي",
      "✅ 3-5 تسجيلات يومياً",
    ],
  },
  cs: {
    emoji: "💚",
    title: "خدمة العملاء",
    who: "CS Manager / CS Agent",
    goal: "دعم العملاء المسجلين + حل المشاكل + جمع feedback",
    blocks: [
      {
        bucket: "🌅 الصباح",
        duration: "15 دقيقة",
        steps: [
          {
            time: "09:30",
            title: "افتح inbox",
            href: "/admin/cs/conversations",
            detail: "كل محادثات Sara — رد على المعلق",
          },
          {
            time: "09:40",
            title: "راجع تصعيدات الدعم",
            href: "/admin/cs/escalations",
            detail: "محادثات معقدة محتاجة قرار",
          },
        ],
      },
      {
        bucket: "☀️ منتصف اليوم",
        duration: "60 دقيقة",
        steps: [
          {
            time: "11:00",
            title: "رد على المحادثات (real-time)",
            href: "/admin/cs/conversations",
            detail: "هدف الرد: < 5 دقائق",
            warn: "رد بطيء = عميل مش راضي",
          },
          {
            time: "13:00",
            title: "تحديث القوالب",
            href: "/admin/cs/templates",
            detail: "أسئلة جديدة تتكرر → أضف رد جاهز",
          },
        ],
      },
      {
        bucket: "🌙 المساء",
        duration: "20 دقيقة",
        steps: [
          {
            time: "17:00",
            title: "تقرير اليوم",
            href: "/admin/cs/reports",
            detail: "كم محادثة حُلّت؟ متوسط زمن الرد؟ CSAT؟",
          },
        ],
      },
    ],
    successMetrics: [
      "✅ متوسط زمن الرد < 5 دقائق",
      "✅ 0 محادثات بدون رد > 30 دقيقة",
      "✅ CSAT ≥ 4.5/5",
      "✅ تحديث FAQs أسبوعياً",
    ],
  },
  finance: {
    emoji: "💰",
    title: "المالية",
    who: "CFO",
    goal: "تتبع الإيرادات + تأكيد المدفوعات + تقارير شهرية",
    blocks: [
      {
        bucket: "🌅 الصباح",
        duration: "15 دقيقة",
        steps: [
          {
            time: "10:00",
            title: "افتح لوحة المالية",
            href: "/admin/finance",
            detail: "راجع KPIs: إيرادات الشهر + اشتراكات نشطة + مدفوعات معلقة",
          },
          {
            time: "10:10",
            title: "تأكيد المدفوعات الجديدة",
            href: "/admin/finance/revenue",
            detail: "Vodafone Cash / InstaPay → تأكيد كل إيصال",
          },
        ],
      },
      {
        bucket: "☀️ منتصف اليوم",
        duration: "30 دقيقة",
        steps: [
          {
            time: "13:00",
            title: "تفعيل الباقات الجديدة",
            href: "/admin/finance/subscriptions",
            detail: "بعد الدفع → فعّل Silver/Gold/Diamond للسمسار",
          },
          {
            time: "13:30",
            title: "تتبع الـ Featured Listings",
            detail: "السماسرة اللي دفعوا للـ featured — مدتهم متبقية كم؟",
          },
        ],
      },
      {
        bucket: "🌙 المساء",
        duration: "10 دقيقة",
        steps: [
          {
            time: "17:30",
            title: "تقرير اليوم",
            detail: "كم إيراد دخل؟ كم باقة فُعّلت؟ كم featured ينتهي بكره؟",
          },
        ],
      },
    ],
    successMetrics: [
      "✅ كل إيصال مؤكد خلال 4 ساعات",
      "✅ كل باقة مفعّلة خلال 2 ساعة من الدفع",
      "✅ تقرير شهري ينتهي خلال 3 أيام",
      "✅ 0 مدفوعات معلقة > يوم",
    ],
  },
};

const FAQS: Array<{ q: string; a: string; href?: string }> = [
  {
    q: "كيف أبدأ يومي إذا أنا CEO؟",
    a: "افتح /admin/dashboard. هتلاقي checklist اليوم — تابعها بالترتيب (صباح / منتصف / مساء). أهم شيء: ردود escalations — لازم خلال ساعة.",
    href: "/admin/dashboard",
  },
  {
    q: "Ahmed مش بيرد على رسالة سمسار. ليه؟",
    a: "Ahmed بيـ escalate أي شيء معقد (تفاوض عمولة، شراكة، شكوى تقنية). افتح /admin/crm/escalations ورد بنفسك. ده طبيعي وأمان.",
    href: "/admin/crm/escalations",
  },
  {
    q: "كيف أضيف عضو فريق جديد؟",
    a: "افتح /admin/team → زر Add Member. اختار الدور (CMO / Sales Manager / إلخ). الـ user الجديد يعمل login بإيميله، الـ sidebar هيظهر له القسم بتاعه فقط.",
    href: "/admin/team",
  },
  {
    q: "DB فاضي بعد reset. كيف استعيد البيانات؟",
    a: "1) امسح الـ localStorage الخاص بالـ Bookmarklet (Console → اكتب الكود اللي ذكرته في README). 2) اسحب Bookmarklet جديد. 3) شغّله على المنصات الـ 3 — في 30 دقيقة هتجمع شهر كامل.",
  },
  {
    q: "الـ Bookmarklet بطيء جداً. ليه؟",
    a: "أول حصاد: 30-60 دقيقة لكل منصة. بعد كده early-exit بيـ skip الإعلانات المحصودة → 5-10 دقائق فقط للـ runs اللاحقة.",
  },
  {
    q: "كيف أعرف أن WhatsApp Cloud API شغّال؟",
    a: "افتح /admin/crm/whales → اضغط 🚀 ابدأ حصاد اليوم → اختار 1 سمسار → اضغط ابعت. لو رجع 'sent: 1' = شغّال. لو 'failed' = راجع env vars في Vercel.",
    href: "/admin/crm/whales?category=properties",
  },
  {
    q: "اللي حصل: سمسار رفض. أعمل إيه؟",
    a: "علّم 'رفض' في الـ whales page. الـ system هيـ skip منه في الـ batch القادم. لو هو سمسار مهم (whale)، تواصل بنفسك بعد أسبوع وحاول.",
  },
  {
    q: "السمسار سجل لكن مش بيستخدم المنصة. أعمل إيه؟",
    a: "ده شغل CS. سارة بتتواصل تلقائياً بعد 7 أيام. لو لسه مش نشط، ابعت رسالة شخصية تعرض المساعدة.",
  },
  {
    q: "متى أوسّع scope Ahmed؟",
    a: "بعد 100 محادثة بدون escalation متكرر، ابدأ تخفف الـ guards في الـ Ahmed prompt. اعمل مراجعة شهرية لكل الـ escalations عشان تعرف الـ patterns.",
  },
  {
    q: "اشتركت في باقة بس لم أحصل على مميزاتها",
    a: "للعميل: تواصل CS. للأدمن: راجع /admin/finance/subscriptions — هل الباقة مفعّلة؟ لو لأ، فعّلها يدوياً بعد تأكيد الإيصال.",
    href: "/admin/finance/subscriptions",
  },
];

export default function GuidePage() {
  const [tab, setTab] = useState<RoleTab>("ceo");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const tabs: Array<{ id: RoleTab; emoji: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "ceo", emoji: "👑", label: "المدير العام", icon: Crown },
    { id: "marketing", emoji: "📈", label: "التسويق", icon: TrendingUp },
    { id: "sales", emoji: "💼", label: "المبيعات", icon: Briefcase },
    { id: "cs", emoji: "💚", label: "خدمة العملاء", icon: Heart },
    { id: "finance", emoji: "💰", label: "المالية", icon: DollarSign },
    { id: "faq", emoji: "❓", label: "الأسئلة الشائعة", icon: HelpCircle },
  ];

  return (
    <div dir="rtl" className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1B7A3D] to-[#145C2E] rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">📖 دليل العمل اليومي</h1>
        <p className="text-sm opacity-90">
          خطوة بخطوة لكل دور في فريق مكسب — اختار دورك واتبع التوقيت
        </p>
      </div>

      {/* Role Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-[#1B7A3D] text-white shadow-md"
                : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
            }`}
          >
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab !== "faq" ? (
        <RoleContent guide={GUIDES[tab]} />
      ) : (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 flex items-start gap-2">
            <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold mb-0.5">10 أسئلة متكررة</div>
              <div className="text-xs">
                لو سؤالك مش هنا، ابعت رسالة في group #help على Slack
              </div>
            </div>
          </div>
          {FAQS.map((f, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full px-5 py-3 flex items-center justify-between text-right hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{f.q}</span>
                {expandedFaq === i ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                )}
              </button>
              {expandedFaq === i && (
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {f.a}
                  </p>
                  {f.href && (
                    <Link
                      href={f.href}
                      className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-[#1B7A3D] hover:text-[#145C2E]"
                    >
                      افتح الصفحة
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleContent({ guide }: { guide: RoleGuide }) {
  return (
    <div className="space-y-5">
      {/* Role intro */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{guide.emoji}</span>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{guide.title}</h2>
            <p className="text-xs text-gray-500">{guide.who}</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-900">
          <span className="font-bold">🎯 الهدف اليومي:</span> {guide.goal}
        </div>
      </div>

      {/* Time blocks */}
      {guide.blocks.map((block, bi) => (
        <div
          key={bi}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-l from-amber-50 to-white flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <span>{block.bucket}</span>
            </h3>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {block.duration}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {block.steps.map((step, si) => (
              <div key={si} className="p-5">
                <div className="flex items-start gap-3">
                  {step.time && (
                    <div className="shrink-0 px-2 py-1 bg-gray-100 rounded font-mono text-xs text-gray-700 mt-0.5">
                      {step.time}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 mb-1">
                      {step.title}
                    </div>
                    {step.detail && (
                      <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                        {step.detail}
                      </p>
                    )}
                    {step.bullets && (
                      <ul className="space-y-1 mt-2">
                        {step.bullets.map((b, bi2) => (
                          <li
                            key={bi2}
                            className="text-xs text-gray-700 flex items-start gap-2"
                          >
                            <span className="text-gray-400 mt-1">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {step.warn && (
                      <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{step.warn}</span>
                      </div>
                    )}
                    {step.href && (
                      <Link
                        href={step.href}
                        className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-[#1B7A3D] hover:text-[#145C2E]"
                      >
                        افتح الصفحة
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Success metrics */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
        <h3 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
          🎯 معايير النجاح اليومي
        </h3>
        <ul className="space-y-1.5">
          {guide.successMetrics.map((m, i) => (
            <li key={i} className="text-sm text-emerald-800">
              {m}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
