"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface MarketStats {
  sellers_total: number;
  sellers_with_phone: number;
  sellers_contacted: number;
  sellers_signed_up: number;
  listings_total: number;
  listings_properties: number;
  listings_vehicles: number;
  phones_extracted: number;
  messages_sent: number;
  messages_delivered: number;
  last_harvest_at: string | null;
  harvest_scopes_active: number;
  harvest_scopes_total: number;
}

const GOVERNORATES = [
  { value: "القاهرة", label: "القاهرة" },
  { value: "الجيزة", label: "الجيزة" },
  { value: "الإسكندرية", label: "الإسكندرية" },
  { value: "القليوبية", label: "القليوبية" },
  { value: "الشرقية", label: "الشرقية" },
  { value: "الدقهلية", label: "الدقهلية" },
  { value: "البحيرة", label: "البحيرة" },
  { value: "الغربية", label: "الغربية" },
  { value: "المنوفية", label: "المنوفية" },
  { value: "كفر الشيخ", label: "كفر الشيخ" },
  { value: "دمياط", label: "دمياط" },
  { value: "بورسعيد", label: "بورسعيد" },
  { value: "الإسماعيلية", label: "الإسماعيلية" },
  { value: "السويس", label: "السويس" },
  { value: "شمال سيناء", label: "شمال سيناء" },
  { value: "جنوب سيناء", label: "جنوب سيناء" },
  { value: "الفيوم", label: "الفيوم" },
  { value: "بني سويف", label: "بني سويف" },
  { value: "المنيا", label: "المنيا" },
  { value: "أسيوط", label: "أسيوط" },
  { value: "سوهاج", label: "سوهاج" },
  { value: "قنا", label: "قنا" },
  { value: "الأقصر", label: "الأقصر" },
  { value: "أسوان", label: "أسوان" },
  { value: "البحر الأحمر", label: "البحر الأحمر" },
  { value: "الوادي الجديد", label: "الوادي الجديد" },
  { value: "مطروح", label: "مطروح" },
];

type Phase = "idle" | "building" | "marketing" | "sales";

export default function MarketplacePage() {
  const [governorate, setGovernorate] = useState("الإسكندرية");
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [phaseProgress, setPhaseProgress] = useState<string>("");
  const [buildLog, setBuildLog] = useState<string[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/marketplace/stats?governorate=${encodeURIComponent(governorate)}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [governorate]);

  useEffect(() => {
    setLoading(true);
    fetchStats();
  }, [fetchStats]);

  const addLog = (msg: string) => {
    setBuildLog((prev) => [...prev, `${new Date().toLocaleTimeString("ar-EG")} — ${msg}`]);
  };

  const startBuild = async () => {
    setPhase("building");
    setBuildLog([]);
    addLog("🚀 بدء بناء السوق...");

    try {
      const res = await fetch("/api/admin/marketplace/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ governorate }),
      });
      const data = await res.json();

      if (data.success) {
        addLog(`✅ تم تفعيل ${data.scopes_activated} نطاق حصاد`);
        addLog(`📊 منصات: ${data.platforms.join("، ")}`);
        addLog(`⏰ أول حصاد خلال: ${data.first_harvest_in}`);
        addLog("🔄 الحصاد هيشتغل تلقائي كل 6 ساعات");
      } else {
        addLog(`❌ خطأ: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`❌ خطأ في الاتصال: ${err.message}`);
    }

    setPhase("idle");
    fetchStats();
  };

  const startMarketing = async () => {
    setPhase("marketing");
    setBuildLog([]);
    addLog("📢 بدء حملة التوعية...");

    try {
      const res = await fetch("/api/admin/marketplace/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ governorate }),
      });
      const data = await res.json();

      if (data.success) {
        addLog(`✅ تم إرسال ${data.messages_sent} رسالة`);
        addLog(`📱 واتساب: ${data.whatsapp_sent} | SMS: ${data.sms_sent}`);
        addLog(`⏭️ تم تخطي ${data.already_contacted} (تم التواصل سابقاً)`);
      } else {
        addLog(`❌ خطأ: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`❌ خطأ: ${err.message}`);
    }

    setPhase("idle");
    fetchStats();
  };

  const startSales = async () => {
    setPhase("sales");
    setBuildLog([]);
    addLog("💰 بدء حملة المبيعات...");

    try {
      const res = await fetch("/api/admin/marketplace/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ governorate }),
      });
      const data = await res.json();

      if (data.success) {
        addLog(`✅ تم إرسال ${data.offers_sent} عرض`);
        addLog(`🆓 عروض مجانية: ${data.free_offers} | 💎 مدفوعة: ${data.paid_offers}`);
        addLog(`⏭️ تم تخطي ${data.already_offered} (عُرض عليهم سابقاً)`);
      } else {
        addLog(`❌ خطأ: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`❌ خطأ: ${err.message}`);
    }

    setPhase("idle");
    fetchStats();
  };

  const s = stats;

  return (
    <div className="space-y-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏗️ بناء السوق</h1>
          <p className="text-sm text-gray-500 mt-1">اختار محافظة → ابني السوق → سوّق → بيع</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/admin/marketplace/bookmarklet"
            className="px-4 py-2 bg-green-100 text-green-800 rounded-xl text-sm font-bold hover:bg-green-200 transition"
          >
            🌾 ثبّت الحصّاد
          </a>
          <a
            href="/admin/marketplace/simulate"
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl text-sm font-bold hover:bg-purple-200 transition"
          >
            🧪 محاكاة السوق
          </a>
        </div>
      </div>

      {/* Step 1: Governorate Selector */}
      <div className="bg-white border-2 border-green-200 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
            1
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-800">اختار السوق</h2>
            <p className="text-sm text-gray-500">اختار المحافظة اللي عايز تبني فيها سوق مكسب</p>
          </div>
          <select
            value={governorate}
            onChange={(e) => setGovernorate(e.target.value)}
            className="px-4 py-3 bg-green-50 border-2 border-green-300 rounded-xl text-lg font-bold text-green-800 focus:ring-2 focus:ring-green-400"
          >
            {GOVERNORATES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      {!loading && s && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            label="المعلنين"
            value={s.sellers_total}
            sub={`${s.sellers_with_phone} بأرقام`}
            icon="👥"
            color="blue"
          />
          <KPICard
            label="الإعلانات"
            value={s.listings_total}
            sub={`🏠 ${s.listings_properties} | 🚗 ${s.listings_vehicles}`}
            icon="📋"
            color="green"
          />
          <KPICard
            label="تم التواصل"
            value={s.sellers_contacted}
            sub={`من ${s.sellers_with_phone} بأرقام`}
            icon="📱"
            color="purple"
          />
          <KPICard
            label="اشتركوا"
            value={s.sellers_signed_up}
            sub={`${s.sellers_total > 0 ? ((s.sellers_signed_up / s.sellers_total) * 100).toFixed(1) : 0}% تحويل`}
            icon="✅"
            color="emerald"
          />
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-24"></div>
            </div>
          ))}
        </div>
      )}

      {/* Phase Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Build Market */}
        <PhaseCard
          step={2}
          title="بناء السوق"
          description="حصاد كل المعلنين والإعلانات من كل المنصات"
          icon="🏗️"
          color="blue"
          buttonLabel="ابدأ البناء"
          buttonColor="bg-blue-600 hover:bg-blue-700"
          isActive={phase === "building"}
          isDisabled={phase !== "idle" && phase !== "building"}
          onClick={startBuild}
          metrics={s ? [
            { label: "نطاقات نشطة", value: `${s.harvest_scopes_active}/${s.harvest_scopes_total}` },
            { label: "آخر حصاد", value: s.last_harvest_at ? timeAgo(s.last_harvest_at) : "لم يتم" },
            { label: "أرقام مستخرجة", value: String(s.phones_extracted) },
          ] : []}
        />

        {/* Marketing */}
        <PhaseCard
          step={3}
          title="التسويق"
          description="إرسال رسائل توعية عن مكسب للمعلنين"
          icon="📢"
          color="purple"
          buttonLabel="ابدأ التسويق"
          buttonColor="bg-purple-600 hover:bg-purple-700"
          isActive={phase === "marketing"}
          isDisabled={phase !== "idle" && phase !== "marketing"}
          onClick={startMarketing}
          metrics={s ? [
            { label: "جاهز للتواصل", value: String(s.sellers_with_phone - s.sellers_contacted) },
            { label: "تم التواصل", value: String(s.sellers_contacted) },
            { label: "رسائل مرسلة", value: String(s.messages_sent) },
          ] : []}
        />

        {/* Sales */}
        <PhaseCard
          step={4}
          title="المبيعات"
          description="إرسال عروض الاشتراكات المجانية والمدفوعة"
          icon="💰"
          color="emerald"
          buttonLabel="ابدأ البيع"
          buttonColor="bg-emerald-600 hover:bg-emerald-700"
          isActive={phase === "sales"}
          isDisabled={phase !== "idle" && phase !== "sales"}
          onClick={startSales}
          metrics={s ? [
            { label: "جاهز للعرض", value: String(Math.max(0, s.sellers_contacted - s.sellers_signed_up)) },
            { label: "اشتركوا", value: String(s.sellers_signed_up) },
            { label: "نسبة التحويل", value: `${s.sellers_contacted > 0 ? ((s.sellers_signed_up / s.sellers_contacted) * 100).toFixed(1) : 0}%` },
          ] : []}
        />
      </div>

      {/* Pipeline Progress Bar */}
      {!loading && s && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="text-base font-bold text-gray-700 mb-4">📊 Pipeline — {governorate}</h3>
          <PipelineBar
            stages={[
              { label: "إعلانات", value: s.listings_total, color: "bg-gray-400" },
              { label: "معلنين", value: s.sellers_total, color: "bg-blue-400" },
              { label: "بأرقام", value: s.sellers_with_phone, color: "bg-blue-600" },
              { label: "تم التواصل", value: s.sellers_contacted, color: "bg-purple-500" },
              { label: "اشتركوا", value: s.sellers_signed_up, color: "bg-emerald-500" },
            ]}
          />
        </div>
      )}

      {/* Activity Log */}
      {buildLog.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-5 text-green-400 font-mono text-sm max-h-64 overflow-y-auto">
          <h3 className="text-white font-bold mb-3">📋 سجل العمليات</h3>
          {buildLog.map((line, i) => (
            <div key={i} className="py-1 border-b border-gray-800">{line}</div>
          ))}
          {phase !== "idle" && (
            <div className="py-1 animate-pulse">⏳ جاري التنفيذ...</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function KPICard({ label, value, sub, icon, color }: {
  label: string; value: number; sub: string; icon: string; color: string;
}) {
  const bgMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    purple: "bg-purple-50 border-purple-200",
    emerald: "bg-emerald-50 border-emerald-200",
  };
  const textMap: Record<string, string> = {
    blue: "text-blue-700",
    green: "text-green-700",
    purple: "text-purple-700",
    emerald: "text-emerald-700",
  };

  return (
    <div className={`rounded-2xl p-5 border ${bgMap[color] || "bg-gray-50 border-gray-200"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${textMap[color] || "text-gray-700"}`}>
        {value.toLocaleString("ar-EG")}
      </div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
    </div>
  );
}

function PhaseCard({ step, title, description, icon, color, buttonLabel, buttonColor, isActive, isDisabled, onClick, metrics }: {
  step: number; title: string; description: string; icon: string; color: string;
  buttonLabel: string; buttonColor: string;
  isActive: boolean; isDisabled: boolean; onClick: () => void;
  metrics: { label: string; value: string }[];
}) {
  const borderMap: Record<string, string> = {
    blue: "border-blue-200",
    purple: "border-purple-200",
    emerald: "border-emerald-200",
  };

  return (
    <div className={`bg-white rounded-2xl border-2 ${borderMap[color] || "border-gray-200"} p-5 flex flex-col`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-full bg-${color}-100 flex items-center justify-center font-bold text-${color}-700 text-sm`}>
          {step}
        </div>
        <div>
          <h3 className="font-bold text-gray-800">{icon} {title}</h3>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4 flex-1">
        {metrics.map((m, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-gray-500">{m.label}</span>
            <span className="font-bold text-gray-800">{m.value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onClick}
        disabled={isDisabled}
        className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
          isActive
            ? "bg-yellow-500 animate-pulse cursor-wait"
            : isDisabled
            ? "bg-gray-300 cursor-not-allowed"
            : buttonColor
        }`}
      >
        {isActive ? "⏳ جاري التنفيذ..." : buttonLabel}
      </button>
    </div>
  );
}

function PipelineBar({ stages }: { stages: { label: string; value: number; color: string }[] }) {
  const maxVal = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-600 w-24 text-left">{stage.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
            <div
              className={`${stage.color} h-full rounded-full transition-all duration-700 flex items-center justify-end px-2`}
              style={{ width: `${Math.max((stage.value / maxVal) * 100, 2)}%` }}
            >
              <span className="text-white text-xs font-bold">{stage.value.toLocaleString("ar-EG")}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "منذ أقل من ساعة";
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}
