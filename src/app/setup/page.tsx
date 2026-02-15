"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, Copy, Check, ExternalLink, Database, Users, ShoppingBag } from "lucide-react";
import Button from "@/components/ui/Button";

type StepStatus = "idle" | "loading" | "success" | "error";

export default function SetupPage() {
  const [serviceKey, setServiceKey] = useState("");
  const [sqlCopied, setSqlCopied] = useState(false);
  const [step1Status, setStep1Status] = useState<StepStatus>("idle");
  const [step2Status, setStep2Status] = useState<StepStatus>("idle");
  const [step2Results, setStep2Results] = useState<Record<string, string> | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  const supabaseRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/\/\/([^.]+)\./)?.[1] || "";
  const sqlEditorUrl = `https://supabase.com/dashboard/project/${supabaseRef}/sql/new`;

  const handleCopySQL = async () => {
    try {
      const res = await fetch("/api/admin/complete-setup-sql");
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 3000);
    } catch {
      // Fallback: open the file directly
      window.open(`https://raw.githubusercontent.com/AiSchool-Admin/maksab/claude/setup-nextjs-arabic-rtl-6r2mK/supabase/complete-setup.sql`, "_blank");
    }
  };

  const handleSeedData = async () => {
    if (!serviceKey.trim()) {
      setStep2Error("لازم تدخل الـ Service Role Key");
      return;
    }

    setStep2Status("loading");
    setStep2Error(null);
    setStep2Results(null);

    try {
      const res = await fetch(`/api/admin/setup-db?secret=${encodeURIComponent(serviceKey.trim())}`);
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
    } catch (err) {
      setStep2Status("error");
      setStep2Error("حصل خطأ في الاتصال. تأكد إن الـ Service Role Key صحيح");
    }
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-brand-green text-white px-5 py-6">
        <h1 className="text-xl font-bold mb-1">إعداد قاعدة بيانات مكسب</h1>
        <p className="text-sm text-white/80">خطوتين بس وكل حاجة هتشتغل</p>
      </div>

      <div className="px-5 py-6 space-y-8">

        {/* ── Step 1: Run SQL ─────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${step1Status === "success" ? "bg-green-100" : "bg-brand-green/10"}`}>
              {step1Status === "success" ? (
                <CheckCircle2 size={22} className="text-green-600" />
              ) : (
                <Database size={20} className="text-brand-green" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-dark">الخطوة 1: إنشاء الجداول</h2>
              <p className="text-xs text-gray-text">مرة واحدة بس — بتعمل كل جداول التطبيق</p>
            </div>
          </div>

          <div className="bg-gray-light rounded-xl p-4 space-y-3">
            <p className="text-sm text-dark">
              <strong>1.</strong> دوس على الزرار ده عشان تنسخ كود الـ SQL:
            </p>

            <button
              onClick={handleCopySQL}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white rounded-xl border-2 border-brand-green text-brand-green font-semibold hover:bg-brand-green/5 transition-all"
            >
              {sqlCopied ? (
                <>
                  <Check size={18} />
                  تم النسخ!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  انسخ كود SQL الكامل
                </>
              )}
            </button>

            <p className="text-sm text-dark">
              <strong>2.</strong> افتح Supabase SQL Editor:
            </p>

            <a
              href={sqlEditorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-green text-white rounded-xl font-semibold hover:bg-brand-green-dark transition-all"
            >
              <ExternalLink size={18} />
              افتح SQL Editor
            </a>

            <p className="text-sm text-dark">
              <strong>3.</strong> الصق الكود في SQL Editor ودوس <strong>Run</strong>
            </p>

            <p className="text-sm text-dark">
              <strong>4.</strong> لما ينجح، دوس هنا:
            </p>

            <button
              onClick={() => setStep1Status("success")}
              className={`w-full py-2.5 rounded-xl font-semibold transition-all ${
                step1Status === "success"
                  ? "bg-green-100 text-green-700"
                  : "bg-white border-2 border-gray-300 text-dark hover:border-brand-green"
              }`}
            >
              {step1Status === "success" ? "تم — الجداول جاهزة ✓" : "خلصت — الجداول اتعملت"}
            </button>
          </div>
        </section>

        {/* ── Step 2: Seed Data ─────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${step2Status === "success" ? "bg-green-100" : "bg-brand-gold/10"}`}>
              {step2Status === "success" ? (
                <CheckCircle2 size={22} className="text-green-600" />
              ) : step2Status === "loading" ? (
                <Loader2 size={20} className="text-brand-gold animate-spin" />
              ) : (
                <ShoppingBag size={20} className="text-brand-gold" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-dark">الخطوة 2: تعبئة البيانات</h2>
              <p className="text-xs text-gray-text">أقسام، محافظات، مدن، وبروفايلات المستخدمين</p>
            </div>
          </div>

          <div className="bg-gray-light rounded-xl p-4 space-y-3">
            <p className="text-sm text-dark">
              أدخل الـ <strong>Service Role Key</strong> من:
            </p>
            <p className="text-xs text-gray-text">
              Supabase Dashboard → Settings → API → service_role (secret)
            </p>

            {supabaseRef && (
              <a
                href={`https://supabase.com/dashboard/project/${supabaseRef}/settings/api`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-green font-semibold flex items-center gap-1 hover:underline"
              >
                <ExternalLink size={12} />
                افتح صفحة الـ API Keys
              </a>
            )}

            <input
              type="password"
              value={serviceKey}
              onChange={(e) => {
                setServiceKey(e.target.value);
                setStep2Error(null);
              }}
              placeholder="eyJhbGci... (الـ service_role key)"
              className="w-full px-4 py-3 bg-white rounded-xl border-2 border-transparent focus:border-brand-green focus:outline-none transition-all text-dark text-sm placeholder:text-gray-text"
              dir="ltr"
            />

            {step2Error && (
              <div className="flex items-start gap-2 text-error text-xs">
                <XCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{step2Error}</span>
              </div>
            )}

            <Button
              fullWidth
              size="lg"
              isLoading={step2Status === "loading"}
              onClick={handleSeedData}
              disabled={!serviceKey.trim() || step2Status === "loading"}
            >
              {step2Status === "success" ? "تم بنجاح! ✓" : "شغّل التعبئة"}
            </Button>

            {/* Results */}
            {step2Results && (
              <div className="bg-white rounded-xl p-3 space-y-1.5">
                {Object.entries(step2Results).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    {value.startsWith("خطأ") ? (
                      <XCircle size={14} className="text-error flex-shrink-0" />
                    ) : (
                      <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                    )}
                    <span className="text-gray-text">{key}:</span>
                    <span className={value.startsWith("خطأ") ? "text-error" : "text-dark"}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── All Done ─────────────────────────────────── */}
        {step1Status === "success" && step2Status === "success" && (
          <section className="bg-green-50 border border-green-200 rounded-xl p-5 text-center space-y-3">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-dark">مبروك! التطبيق جاهز</h3>
            <p className="text-sm text-gray-text">
              كل الجداول والبيانات اتعملت. دلوقتي تقدر تضيف إعلانات وتستخدم التطبيق
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Link href="/" className="px-6 py-2.5 bg-brand-green text-white rounded-xl font-semibold hover:bg-brand-green-dark transition-all">
                الصفحة الرئيسية
              </Link>
              <Link href="/ad/create" className="px-6 py-2.5 bg-brand-gold text-white rounded-xl font-semibold hover:bg-brand-gold/90 transition-all">
                أضف إعلان
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
