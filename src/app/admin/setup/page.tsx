"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Database,
  ShoppingBag,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Download,
  FileCode,
} from "lucide-react";
import { useAdmin, getAdminHeaders } from "../layout";

type StepStatus = "idle" | "loading" | "success" | "error";

interface TableCheckResult {
  tables: Record<string, boolean>;
  missingTables: string[];
  allPresent: boolean;
}

const TABLE_LABELS: Record<string, string> = {
  profiles: "بروفايلات المستخدمين",
  categories: "الأقسام",
  subcategories: "الأقسام الفرعية",
  ads: "الإعلانات",
  favorites: "المفضلة",
  conversations: "المحادثات",
  messages: "الرسائل",
  auction_bids: "المزايدات",
  analytics_events: "تتبع الأحداث",
  buy_requests: "طلبات الشراء",
  buy_request_matches: "مطابقات طلبات الشراء",
};

export default function AdminSetupPage() {
  const admin = useAdmin();
  const [sqlCopied, setSqlCopied] = useState(false);
  const [step1Status, setStep1Status] = useState<StepStatus>("idle");
  const [step2Status, setStep2Status] = useState<StepStatus>("idle");
  const [step2Results, setStep2Results] = useState<Record<string, string> | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  const [tableCheck, setTableCheck] = useState<TableCheckResult | null>(null);
  const [checking, setChecking] = useState(true);
  const [fullSqlCopied, setFullSqlCopied] = useState(false);

  const supabaseRef =
    (typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : ""
    )?.match(/\/\/([^.]+)\./)?.[1] || "";

  const sqlEditorUrl = supabaseRef
    ? `https://supabase.com/dashboard/project/${supabaseRef}/sql/new`
    : "https://supabase.com/dashboard";

  useEffect(() => {
    if (admin) checkTables();
  }, [admin]);

  async function checkTables() {
    setChecking(true);
    try {
      const res = await fetch("/api/admin/setup-db?check=1");
      const data = await res.json();
      setTableCheck(data);
      if (data.allPresent) {
        setStep1Status("success");
      }
    } catch {
      // Ignore
    } finally {
      setChecking(false);
    }
  }

  const handleCopySQL = async () => {
    try {
      const res = await fetch("/api/admin/complete-setup-sql");
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 3000);
    } catch {
      alert("مش قادر ينسخ — جرب تفتح الرابط /api/admin/complete-setup-sql وانسخ من هناك");
    }
  };

  const handleSeedData = async () => {
    setStep2Status("loading");
    setStep2Error(null);
    setStep2Results(null);

    try {
      const res = await fetch("/api/admin/setup-db", {
        headers: {
          ...getAdminHeaders(),
          "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SETUP_SECRET || "",
        },
      });
      const data = await res.json();

      if (data.results) {
        setStep2Results(data.results);
      }

      if (data.success) {
        setStep2Status("success");
      } else {
        setStep2Status("error");
        setStep2Error(data.error || data.message || "حصلت مشكلة");
      }
    } catch {
      setStep2Status("error");
      setStep2Error("حصل خطأ في الاتصال");
    }
  };

  const handleAdminSetup = async () => {
    try {
      const res = await fetch("/api/admin/setup", {
        headers: {
          ...getAdminHeaders(),
          "x-setup-secret": process.env.NEXT_PUBLIC_ADMIN_SETUP_SECRET || "",
        },
      });
      const data = await res.json();
      if (data.success) {
        alert("تم إعداد نظام الأدمن بنجاح!\n\n" + (data.next_step || ""));
      } else {
        alert(data.message || "حصلت مشكلة");
      }
    } catch {
      alert("حصل خطأ في الاتصال");
    }
  };

  const hasMissingTables =
    tableCheck && tableCheck.missingTables && tableCheck.missingTables.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark">إعداد قاعدة البيانات</h2>
        <p className="text-xs text-gray-text">فحص وإعداد جداول التطبيق وتعبئة البيانات</p>
      </div>

      {/* Table Status Overview */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-dark flex items-center gap-2">
            <Database size={16} className="text-brand-green" />
            حالة الجداول
          </h3>
          <button
            onClick={checkTables}
            disabled={checking}
            className="text-xs text-brand-green hover:text-brand-green-dark flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw size={12} className={checking ? "animate-spin" : ""} />
            إعادة الفحص
          </button>
        </div>

        {checking ? (
          <div className="flex items-center gap-3 py-4">
            <Loader2 size={18} className="text-brand-green animate-spin" />
            <span className="text-sm text-gray-text">جاري فحص الجداول...</span>
          </div>
        ) : tableCheck ? (
          <div className="space-y-3">
            {/* Summary */}
            {tableCheck.allPresent ? (
              <div className="flex items-center gap-2 bg-brand-green-light rounded-xl px-4 py-3">
                <CheckCircle2 size={18} className="text-brand-green" />
                <span className="text-sm font-medium text-brand-green">كل الجداول موجودة وشغالة</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-red-50 rounded-xl px-4 py-3">
                <AlertTriangle size={18} className="text-error" />
                <span className="text-sm font-medium text-error">
                  {tableCheck.missingTables.length} جدول ناقص
                </span>
              </div>
            )}

            {/* Table grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {Object.entries(tableCheck.tables).map(([name, exists]) => (
                <div
                  key={name}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                    exists
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {exists ? (
                    <CheckCircle2 size={12} className="flex-shrink-0" />
                  ) : (
                    <XCircle size={12} className="flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="font-mono block truncate">{name}</span>
                    <span className="text-[10px] opacity-70">{TABLE_LABELS[name] || ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-text py-4">مش قادر يتحقق من الجداول</p>
        )}
      </div>

      {/* Step 1: Create Tables */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
              step1Status === "success"
                ? "bg-green-100 text-green-600"
                : "bg-brand-green/10 text-brand-green"
            }`}
          >
            {step1Status === "success" ? <CheckCircle2 size={16} /> : "1"}
          </div>
          <div>
            <h3 className="text-sm font-bold text-dark">إنشاء الجداول</h3>
            <p className="text-[10px] text-gray-text">انسخ SQL وشغّله في Supabase SQL Editor</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/admin/full-setup-sql");
                const text = await res.text();
                await navigator.clipboard.writeText(text);
                setFullSqlCopied(true);
                setTimeout(() => setFullSqlCopied(false), 3000);
              } catch {
                window.open("/api/admin/full-setup-sql", "_blank");
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-green text-white rounded-xl text-sm font-medium hover:bg-brand-green-dark transition-colors"
          >
            {fullSqlCopied ? (
              <>
                <Check size={14} />
                تم النسخ!
              </>
            ) : (
              <>
                <FileCode size={14} />
                انسخ Full Setup SQL (كل الجداول)
              </>
            )}
          </button>

          <button
            onClick={handleCopySQL}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-dark rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            {sqlCopied ? (
              <>
                <Check size={14} />
                تم النسخ!
              </>
            ) : (
              <>
                <Copy size={14} />
                انسخ SQL للجداول الناقصة فقط
              </>
            )}
          </button>

          <a
            href={sqlEditorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-dark rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <ExternalLink size={14} />
            افتح SQL Editor
          </a>

          <a
            href="/api/admin/full-setup-sql"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-text rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            حمّل ملف SQL كامل
          </a>

          <button
            onClick={async () => {
              setStep1Status("loading");
              await checkTables();
              setStep1Status(tableCheck?.allPresent ? "success" : "error");
            }}
            disabled={step1Status === "loading"}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-text rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {step1Status === "loading" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            تحقق من الجداول
          </button>
        </div>

        {hasMissingTables && (
          <div className="bg-red-50 rounded-xl p-3 space-y-1">
            <p className="text-xs font-medium text-red-600">جداول ناقصة:</p>
            <div className="flex flex-wrap gap-1.5">
              {tableCheck!.missingTables.map((t) => (
                <span key={t} className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-mono">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Seed Data */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
              step2Status === "success"
                ? "bg-green-100 text-green-600"
                : "bg-brand-gold/10 text-brand-gold"
            }`}
          >
            {step2Status === "success" ? <CheckCircle2 size={16} /> : "2"}
          </div>
          <div>
            <h3 className="text-sm font-bold text-dark">تعبئة البيانات</h3>
            <p className="text-[10px] text-gray-text">أقسام، أقسام فرعية، وبيانات أساسية</p>
          </div>
        </div>

        <button
          onClick={handleSeedData}
          disabled={step2Status === "loading"}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-gold text-white rounded-xl text-sm font-medium hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
        >
          {step2Status === "loading" ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              جاري التعبئة...
            </>
          ) : step2Status === "success" ? (
            <>
              <CheckCircle2 size={14} />
              تم بنجاح!
            </>
          ) : (
            <>
              <ShoppingBag size={14} />
              شغّل تعبئة البيانات
            </>
          )}
        </button>

        {step2Error && (
          <div className="flex items-start gap-2 bg-red-50 rounded-xl p-3">
            <XCircle size={14} className="text-error flex-shrink-0 mt-0.5" />
            <span className="text-xs text-error">{step2Error}</span>
          </div>
        )}

        {step2Results && (
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            {Object.entries(step2Results).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                {value.startsWith("خطأ") ? (
                  <XCircle size={12} className="text-error flex-shrink-0" />
                ) : (
                  <CheckCircle2 size={12} className="text-green-600 flex-shrink-0" />
                )}
                <span className="text-gray-text font-medium">{key}:</span>
                <span className={value.startsWith("خطأ") ? "text-error" : "text-dark"}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 3: Admin Setup */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold bg-blue-50 text-blue-600">
            3
          </div>
          <div>
            <h3 className="text-sm font-bold text-dark">إعداد نظام الأدمن</h3>
            <p className="text-[10px] text-gray-text">إضافة عمود is_admin للبروفايلات</p>
          </div>
        </div>

        <button
          onClick={handleAdminSetup}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <Database size={14} />
          شغّل إعداد الأدمن
        </button>

        <p className="text-[10px] text-gray-text">
          لو الزرار مشتغلش، نفّذ الأمر ده يدوياً في SQL Editor:
        </p>
        <code className="block text-[10px] bg-gray-50 rounded-lg p-2 font-mono text-dark" dir="ltr">
          ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
        </code>
      </div>

      {/* Cache Clear */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-dark flex items-center gap-2">
          <Trash2 size={14} className="text-gray-text" />
          مسح الكاش
        </h3>
        <p className="text-xs text-gray-text">
          لو عملت الجداول بس لسه بتظهر أخطاء، دوس هنا عشان تمسح كاش التطبيق
        </p>
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.removeItem("maksab_buy_requests_available");
              localStorage.removeItem("maksab_analytics_flush_disabled");
              localStorage.removeItem("maksab_analytics_queue");
              alert("تم مسح الكاش!");
              window.location.reload();
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-text rounded-xl text-xs font-medium hover:bg-gray-100 transition-colors"
        >
          <Trash2 size={12} />
          امسح الكاش
        </button>
      </div>

      {/* All Done */}
      {step1Status === "success" && step2Status === "success" && (
        <div className="bg-brand-green-light rounded-xl p-5 text-center space-y-2">
          <CheckCircle2 size={32} className="text-brand-green mx-auto" />
          <h3 className="text-lg font-bold text-dark">التطبيق جاهز!</h3>
          <p className="text-xs text-gray-text">كل الجداول والبيانات اتعملت بنجاح</p>
        </div>
      )}
    </div>
  );
}
