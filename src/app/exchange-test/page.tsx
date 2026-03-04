"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Zap,
  Target,
  Sparkles,
} from "lucide-react";

interface Scenario {
  name: string;
  description: string;
  test_ad: string;
  expected_score: string;
}

interface Account {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: string;
}

interface SeedResult {
  success: boolean;
  message: string;
  results: Record<string, string>;
  scenarios: Scenario[];
  accounts: Account[];
}

export default function ExchangeTestPage() {
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"scenarios" | "accounts" | "howto">("howto");

  const handleSeed = async () => {
    setIsSeeding(true);
    setSeedError(null);
    try {
      const res = await fetch("/api/admin/seed-exchange-test", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setSeedError(data.error);
      } else {
        setSeedResult(data);
        setActiveTab("scenarios");
      }
    } catch (err) {
      setSeedError(`فشل الاتصال: ${err instanceof Error ? err.message : "خطأ غير معروف"}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-brand-green to-brand-green-dark text-white p-4 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <ArrowLeftRight size={24} />
            <h1 className="text-3xl font-bold font-cairo">تجربة نظام التبديل الذكي</h1>
          </div>
          <p className="text-sm opacity-90 font-cairo">
            اختبر كل سيناريوهات التبديل: تطابق مثالي، تطابق قوي، تبديل ثلاثي، عبر الأقسام، وأكتر
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 -mt-3 space-y-4">
        {/* Seed Button */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-brand-gold" />
              <h2 className="text-lg font-bold text-dark font-cairo">الخطوة 1: تجهيز البيانات</h2>
            </div>
            {seedResult?.success && (
              <span className="flex items-center gap-1 text-[11px] text-brand-green font-bold">
                <CheckCircle size={14} />
                جاهز
              </span>
            )}
          </div>

          <p className="text-xs text-gray-text mb-3 font-cairo">
            هيتم إنشاء 8 مستخدمين و 12 إعلان تبديل بسيناريوهات مختلفة
          </p>

          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="w-full py-2.5 bg-brand-green text-white text-sm font-bold rounded-xl font-cairo flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSeeding ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                جاري التجهيز...
              </>
            ) : seedResult ? (
              <>
                <RefreshCw size={16} />
                إعادة التجهيز
              </>
            ) : (
              <>
                <Zap size={16} />
                جهّز بيانات الاختبار
              </>
            )}
          </button>

          {seedError && (
            <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs text-red-700 font-cairo flex items-center gap-1">
                <XCircle size={14} />
                {seedError}
              </p>
            </div>
          )}

          {seedResult && (
            <div className="mt-3 space-y-1">
              {Object.entries(seedResult.results).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-text font-cairo">{key}:</span>
                  <span className={`font-cairo font-medium ${value.startsWith("خطأ") ? "text-red-600" : "text-brand-green"}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-200">
          {(["howto", "scenarios", "accounts"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg font-cairo transition-colors ${
                activeTab === tab
                  ? "bg-brand-green text-white"
                  : "text-gray-text hover:bg-gray-100"
              }`}
            >
              {tab === "howto" ? "كيف تجرب" : tab === "scenarios" ? "السيناريوهات" : "الحسابات"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "howto" && <HowToSection />}
        {activeTab === "scenarios" && <ScenariosSection scenarios={seedResult?.scenarios || DEFAULT_SCENARIOS} />}
        {activeTab === "accounts" && <AccountsSection accounts={seedResult?.accounts || []} />}
      </div>
    </div>
  );
}

/* ── How To Section ── */

function HowToSection() {
  const steps = [
    {
      num: 1,
      title: "جهّز البيانات",
      desc: "اضغط زر \"جهّز بيانات الاختبار\" فوق — هيعمل 8 مستخدمين و 12 إعلان",
      icon: "🔧",
    },
    {
      num: 2,
      title: "افتح إعلان تبديل",
      desc: "اضغط على أي سيناريو من التاب التاني — هيفتح صفحة الإعلان",
      icon: "📱",
    },
    {
      num: 3,
      title: "شوف قسم \"تبديلات مناسبة\"",
      desc: "انزل تحت في صفحة الإعلان — هتلاقي التطابقات مقسمة بالنسب",
      icon: "🎯",
    },
    {
      num: 4,
      title: "جرب التبديل الثلاثي",
      desc: "افتح إعلان يوسف (سامسونج→سيارة) — هتلاقي سلسلة تبديل ثلاثي",
      icon: "🔄",
    },
    {
      num: 5,
      title: "جرب إنشاء إعلان تبديل جديد",
      desc: "روح صفحة إضافة إعلان → اختار تبديل → هتلاقي النموذج المنظم الجديد",
      icon: "➕",
    },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.num} className="bg-white rounded-xl border border-gray-200 p-3 flex gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-green-light flex items-center justify-center flex-shrink-0">
            <span className="text-lg">{step.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-5 h-5 bg-brand-green text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {step.num}
              </span>
              <h3 className="text-sm font-bold text-dark font-cairo">{step.title}</h3>
            </div>
            <p className="text-xs text-gray-text font-cairo">{step.desc}</p>
          </div>
        </div>
      ))}

      {/* Quick link to create ad */}
      <Link
        href="/ad/create"
        className="block bg-brand-green-light border-2 border-brand-green border-dashed rounded-xl p-3 text-center hover:bg-green-100 transition-colors"
      >
        <span className="text-sm font-bold text-brand-green font-cairo">
          ➕ جرب إنشاء إعلان تبديل جديد
        </span>
      </Link>
    </div>
  );
}

/* ── Scenarios Section ── */

const DEFAULT_SCENARIOS: Scenario[] = [
  {
    name: "تطابق مثالي ثنائي الاتجاه (موبايلات)",
    description: "يوسف عنده آيفون وعايز سامسونج ← مريم عندها سامسونج وعايزة آيفون",
    test_ad: "/ad/ex111111-0001-0001-0001-000000000001",
    expected_score: "~95 (perfect)",
  },
  {
    name: "تطابق قوي (موبايلات)",
    description: "كريم عنده شاومي وعايز آيفون ← يوسف عنده آيفون",
    test_ad: "/ad/ex333333-0003-0003-0003-000000000001",
    expected_score: "~60 (strong)",
  },
  {
    name: "تبديل ثلاثي (موبايل→سيارة→ذهب)",
    description: "يوسف (موبايل→سيارة) → تامر (سيارة→ذهب) → هدى (ذهب→موبايل)",
    test_ad: "/ad/ex111111-0001-0001-0001-000000000002",
    expected_score: "chain detected",
  },
  {
    name: "تطابق مثالي عبر الأقسام (أجهزة↔أثاث)",
    description: "سمير (غسالة→غرفة نوم) ← دينا (غرفة نوم→غسالة)",
    test_ad: "/ad/ex666666-0006-0006-0006-000000000001",
    expected_score: "~85 (perfect)",
  },
  {
    name: "تبديل PS5 بموبايل",
    description: "مريم عندها PS5 وعايزة آيفون ← يوسف عنده آيفون",
    test_ad: "/ad/ex222222-0002-0002-0002-000000000002",
    expected_score: "~35 (partial — cross-category)",
  },
  {
    name: "إعلان نص قديم (backward compat)",
    description: "رانيا عندها كيا سبورتاج — إعلان قديم بدون بيانات منظمة",
    test_ad: "/ad/ex888888-0008-0008-0008-000000000001",
    expected_score: "text-based fallback",
  },
];

function ScenariosSection({ scenarios }: { scenarios: Scenario[] }) {
  const scenarioIcons = ["🎯", "💪", "🔄", "🔀", "🎮", "📝"];
  const scenarioColors = [
    "border-green-200 bg-green-50",
    "border-blue-200 bg-blue-50",
    "border-purple-200 bg-purple-50",
    "border-emerald-200 bg-emerald-50",
    "border-orange-200 bg-orange-50",
    "border-gray-200 bg-gray-50",
  ];

  return (
    <div className="space-y-3">
      {scenarios.map((s, i) => (
        <div
          key={i}
          className={`rounded-xl border p-3 ${scenarioColors[i] || "border-gray-200 bg-white"}`}
        >
          <div className="flex items-start gap-2 mb-2">
            <span className="text-lg">{scenarioIcons[i] || "📦"}</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-dark font-cairo">{s.name}</h3>
              <p className="text-xs text-gray-text font-cairo mt-0.5">{s.description}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] font-mono bg-white px-2 py-1 rounded-lg border text-gray-text">
              النتيجة المتوقعة: {s.expected_score}
            </span>
            <Link
              href={s.test_ad}
              className="flex items-center gap-1 text-xs font-bold text-brand-green bg-white px-3 py-1.5 rounded-lg border border-brand-green hover:bg-brand-green hover:text-white transition-colors font-cairo"
            >
              <ExternalLink size={12} />
              افتح الإعلان
            </Link>
          </div>
        </div>
      ))}

      {/* Visual chain diagram */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-purple-600" />
          <h3 className="text-sm font-bold text-purple-800 font-cairo">
            رسم التبديل الثلاثي
          </h3>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs font-cairo">
          <div className="bg-white border border-purple-200 rounded-lg p-2 text-center">
            <span className="text-lg block mb-1">📱</span>
            <p className="font-bold text-dark text-[10px]">يوسف</p>
            <p className="text-[9px] text-purple-600">سامسونج A54</p>
            <p className="text-[9px] text-gray-text">عايز سيارة</p>
          </div>
          <ArrowRight size={16} className="text-purple-400 flex-shrink-0" />
          <div className="bg-white border border-purple-200 rounded-lg p-2 text-center">
            <span className="text-lg block mb-1">🚗</span>
            <p className="font-bold text-dark text-[10px]">تامر</p>
            <p className="text-[9px] text-purple-600">هيونداي أكسنت</p>
            <p className="text-[9px] text-gray-text">عايز ذهب</p>
          </div>
          <ArrowRight size={16} className="text-purple-400 flex-shrink-0" />
          <div className="bg-white border border-purple-200 rounded-lg p-2 text-center">
            <span className="text-lg block mb-1">💰</span>
            <p className="font-bold text-dark text-[10px]">هدى</p>
            <p className="text-[9px] text-purple-600">سلسلة ذهب</p>
            <p className="text-[9px] text-gray-text">عايزة موبايل</p>
          </div>
        </div>
        <div className="flex justify-center mt-2">
          <span className="text-[10px] text-purple-600 font-bold font-cairo bg-purple-100 px-3 py-1 rounded-full">
            🔄 كل واحد ياخد اللي عايزه!
          </span>
        </div>
      </div>

      {/* Scoring explanation */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-brand-green" />
          <h3 className="text-sm font-bold text-dark font-cairo">نظام التقييم (0-100)</h3>
        </div>
        <div className="space-y-2">
          {[
            { label: "تطابق القسم", points: "30 نقطة", detail: "20 للقسم + 10 للفرعي", color: "bg-blue-100 text-blue-700" },
            { label: "تطابق الحقول", points: "40 نقطة", detail: "الماركة، الموديل، الحالة...", color: "bg-green-100 text-green-700" },
            { label: "تطابق ثنائي", points: "30 نقطة", detail: "التاني عايز اللي عندك؟", color: "bg-purple-100 text-purple-700" },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.color}`}>
                {item.points}
              </span>
              <div>
                <span className="text-xs font-bold text-dark font-cairo">{item.label}</span>
                <span className="text-[10px] text-gray-text font-cairo me-1">— {item.detail}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
          {[
            { emoji: "🎯", label: "تطابق مثالي", range: "80-100", color: "text-brand-green" },
            { emoji: "💪", label: "تطابق قوي", range: "60-79", color: "text-blue-600" },
            { emoji: "👍", label: "مطابقة جيدة", range: "40-59", color: "text-brand-gold" },
            { emoji: "🔍", label: "مطابقة جزئية", range: "0-39", color: "text-gray-text" },
          ].map((level) => (
            <div key={level.label} className="flex items-center gap-2 text-xs">
              <span>{level.emoji}</span>
              <span className={`font-bold font-cairo ${level.color}`}>{level.label}</span>
              <span className="text-gray-text">({level.range})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Accounts Section ── */

function AccountsSection({ accounts }: { accounts: Account[] }) {
  if (accounts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p className="text-sm text-gray-text font-cairo">جهّز البيانات أولاً لرؤية الحسابات</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-text font-cairo">
        الباسورد لكل الحسابات: <span className="font-mono font-bold text-dark">Test123456</span>
      </p>
      {accounts.map((acc) => (
        <div key={acc.email} className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-bold text-dark font-cairo">{acc.name}</span>
            <span className="text-[10px] text-gray-text font-cairo">{acc.role}</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            <div>
              <span className="text-gray-text font-cairo">الإيميل: </span>
              <span className="font-mono text-dark">{acc.email}</span>
            </div>
            <div>
              <span className="text-gray-text font-cairo">الموبايل: </span>
              <span className="font-mono text-dark">{acc.phone}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
