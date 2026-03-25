"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { useAuth } from "@/components/auth/AuthProvider";

/* ─── Types ─── */

interface ValuationResult {
  estimated_min: number;
  estimated_max: number;
  estimated_avg: number;
  confidence_score: number;
  comparable_count: number;
  data_freshness_days: number;
  ai_analysis: string;
  market_trend: string;
  trend_pct: number;
  comparables: Array<{ title: string; price: number; source: string; date: string }>;
}

/* ─── Car Options ─── */

const CAR_MAKES = [
  "تويوتا", "هيونداي", "شيفروليه", "نيسان", "كيا", "BMW", "مرسيدس",
  "فيات", "سكودا", "أوبل", "بيجو", "سوزوكي", "ميتسوبيشي", "هوندا",
  "MG", "شيري", "BYD", "جيلي", "رينو", "أخرى",
];

const CAR_CONDITIONS = [
  { value: "excellent", label: "ممتازة" },
  { value: "good", label: "جيدة" },
  { value: "fair", label: "مقبولة" },
  { value: "poor", label: "تحتاج صيانة" },
];

const PROPERTY_TYPES = [
  { value: "apartment", label: "شقة" },
  { value: "villa", label: "فيلا" },
  { value: "duplex", label: "دوبلكس" },
  { value: "studio", label: "استوديو" },
  { value: "office", label: "مكتب" },
  { value: "shop", label: "محل" },
  { value: "land", label: "أرض" },
];

const FINISHING_OPTIONS = [
  { value: "fully_finished", label: "سوبر لوكس" },
  { value: "semi", label: "نص تشطيب" },
  { value: "bare", label: "على المحارة" },
];

const ALEX_DISTRICTS = [
  "سيدي بشر", "ستانلي", "كليوباترا", "سموحة", "المندرة", "المعمورة",
  "ميامي", "سيدي جابر", "لوران", "جليم", "رشدي", "بحري",
  "المنتزه", "العصافرة", "أبو قير", "العجمي", "الدخيلة", "برج العرب",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => currentYear - i);

/* ─── Main Page ─── */

export default function ValuationPage() {
  const { user } = useAuth();
  const [assetType, setAssetType] = useState<"car" | "property">("car");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Car fields
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState(2022);
  const [carMileage, setCarMileage] = useState("");
  const [carCondition, setCarCondition] = useState("good");

  // Property fields
  const [propertyType, setPropertyType] = useState("apartment");
  const [propertyArea, setPropertyArea] = useState("");
  const [propertyRooms, setPropertyRooms] = useState(3);
  const [propertyFloor, setPropertyFloor] = useState("");
  const [propertyFinishing, setPropertyFinishing] = useState("fully_finished");
  const [district, setDistrict] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        asset_type: assetType,
        governorate: "alexandria",
        district: district || undefined,
        user_id: user?.id || undefined,
      };

      if (assetType === "car") {
        if (!carMake) { setError("اختار الماركة"); setLoading(false); return; }
        body.car_make = carMake;
        body.car_model = carModel || undefined;
        body.car_year = carYear;
        body.car_mileage = carMileage ? parseInt(carMileage) : undefined;
        body.car_condition = carCondition;
      } else {
        if (!propertyArea) { setError("اكتب المساحة"); setLoading(false); return; }
        body.property_type = propertyType;
        body.property_area_sqm = parseInt(propertyArea);
        body.property_rooms = propertyRooms;
        body.property_floor = propertyFloor ? parseInt(propertyFloor) : undefined;
        body.property_finishing = propertyFinishing;
      }

      const res = await fetch("/api/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ValuationResult = await res.json();
      setResult(data);
    } catch {
      setError("حصلت مشكلة — جرّب تاني");
    }
    setLoading(false);
  };

  const formatPrice = (n: number) => n ? n.toLocaleString("en-US") : "0";
  const trendIcon = result?.market_trend === "rising" ? "↗️" : result?.market_trend === "falling" ? "↘️" : "➡️";

  return (
    <main className="min-h-screen bg-white pb-20">
      <Header title="قيّم أصلك" showBack />

      <div className="px-4 pt-4 max-w-lg mx-auto">
        {/* Hero */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-green-light flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🔍</span>
          </div>
          <h1 className="text-2xl font-bold text-dark mb-1">قيّم أصلك في 30 ثانية</h1>
          <p className="text-sm text-gray-text">تقييم فوري مجاني بناءً على بيانات السوق الحقيقية</p>
        </div>

        {/* Asset Type Tabs */}
        <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl mb-6">
          {[
            { key: "car" as const, label: "🚗 سيارة", },
            { key: "property" as const, label: "🏠 عقار", },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setAssetType(key); setResult(null); setError(null); }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                assetType === key
                  ? "bg-brand-green text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ═══ Car Form ═══ */}
        {assetType === "car" && !result && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-dark mb-1.5 block">الماركة *</label>
              <select
                value={carMake}
                onChange={(e) => setCarMake(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-green focus:outline-none"
              >
                <option value="">اختار الماركة</option>
                {CAR_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-dark mb-1.5 block">الموديل</label>
              <input
                type="text"
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
                placeholder="مثال: كورولا، X5، سيراتو..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-green focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-dark mb-1.5 block">السنة</label>
                <select
                  value={carYear}
                  onChange={(e) => setCarYear(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-green focus:outline-none"
                >
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-dark mb-1.5 block">الكيلومترات</label>
                <input
                  type="number"
                  value={carMileage}
                  onChange={(e) => setCarMileage(e.target.value)}
                  placeholder="50,000"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-green focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-dark mb-1.5 block">الحالة</label>
              <div className="flex flex-wrap gap-2">
                {CAR_CONDITIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setCarCondition(value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                      carCondition === value
                        ? "border-brand-green bg-brand-green-light text-brand-green"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ Property Form ═══ */}
        {assetType === "property" && !result && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-dark mb-1.5 block">نوع العقار</label>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setPropertyType(value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                      propertyType === value
                        ? "border-brand-green bg-brand-green-light text-brand-green"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-dark mb-1.5 block">المساحة (م²) *</label>
                <input
                  type="number"
                  value={propertyArea}
                  onChange={(e) => setPropertyArea(e.target.value)}
                  placeholder="150"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-green focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-dark mb-1.5 block">عدد الغرف</label>
                <select
                  value={propertyRooms}
                  onChange={(e) => setPropertyRooms(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-green focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6].map((r) => <option key={r} value={r}>{r} غرف</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-dark mb-1.5 block">الطابق</label>
                <input
                  type="number"
                  value={propertyFloor}
                  onChange={(e) => setPropertyFloor(e.target.value)}
                  placeholder="3"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-green focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-dark mb-1.5 block">التشطيب</label>
                <select
                  value={propertyFinishing}
                  onChange={(e) => setPropertyFinishing(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-green focus:outline-none"
                >
                  {FINISHING_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-dark mb-1.5 block">المنطقة</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-brand-green focus:outline-none"
              >
                <option value="">اختار المنطقة (اختياري)</option>
                {ALEX_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        {/* Submit Button */}
        {!result && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-6 py-4 bg-brand-green hover:bg-brand-green-dark text-white font-bold rounded-xl text-base transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-brand-green/20"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                بيحسب...
              </span>
            ) : (
              "🔍 احسب القيمة الآن"
            )}
          </button>
        )}

        {/* ═══ Results ═══ */}
        {result && (
          <div className="space-y-4 mt-2">
            {/* Price Range */}
            <div className="bg-gradient-to-bl from-brand-green-light to-emerald-50 border-2 border-brand-green/30 rounded-2xl p-6 text-center">
              <p className="text-sm text-gray-text mb-2">💰 القيمة التقديرية</p>
              <p className="text-xl font-bold text-dark mb-1">
                {formatPrice(result.estimated_min)} — {formatPrice(result.estimated_max)} جنيه
              </p>
              <div className="w-full bg-white/60 rounded-full h-2 my-3">
                <div className="h-full bg-brand-green rounded-full" style={{ width: `${result.confidence_score}%` }} />
              </div>
              <p className="text-lg font-bold text-brand-green">
                السعر الأنسب: {formatPrice(result.estimated_avg)} جنيه
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-dark">{result.comparable_count}</p>
                <p className="text-[10px] text-gray-text">إعلان مشابه 📊</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-dark">{result.data_freshness_days}d</p>
                <p className="text-[10px] text-gray-text">عمر البيانات 📅</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-dark">{result.confidence_score}%</p>
                <p className="text-[10px] text-gray-text">دقة التقييم 🎯</p>
              </div>
            </div>

            {/* AI Analysis */}
            {result.ai_analysis && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-bold text-dark mb-2">🤖 تحليل مكسب:</p>
                <p className="text-sm text-gray-700 leading-relaxed">{result.ai_analysis}</p>
              </div>
            )}

            {/* Trend */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-dark">📈 اتجاه السوق</p>
                <p className="text-xs text-gray-text">آخر 3 شهور</p>
              </div>
              <div className="text-left">
                <p className="text-lg font-bold">
                  {trendIcon} {result.trend_pct > 0 ? "+" : ""}{result.trend_pct}%
                </p>
                <p className="text-xs text-gray-text">
                  {result.market_trend === "rising" ? "صاعد" : result.market_trend === "falling" ? "هابط" : "مستقر"}
                </p>
              </div>
            </div>

            {/* Comparables */}
            {result.comparables.length > 0 && (
              <div>
                <p className="text-sm font-bold text-dark mb-2">إعلانات مشابهة:</p>
                <div className="space-y-2">
                  {result.comparables.map((c, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-dark font-medium truncate">{c.title}</p>
                        <p className="text-[10px] text-gray-text">{c.source}</p>
                      </div>
                      <p className="text-sm font-bold text-brand-green mr-3">{formatPrice(c.price)} ج</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href="/ad/create"
                className="flex-1 py-3 bg-brand-green text-white font-bold rounded-xl text-sm text-center hover:bg-brand-green-dark transition-colors"
              >
                أنشر إعلان
              </Link>
              <button
                onClick={() => { setResult(null); setError(null); }}
                className="flex-1 py-3 bg-gray-100 text-dark font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors"
              >
                تقييم جديد
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNavWithBadge />
    </main>
  );
}
