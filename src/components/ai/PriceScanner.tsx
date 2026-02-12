"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Type,
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeft,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import type { ProductAnalysis } from "@/lib/ai/ai-service";

// ── Types ────────────────────────────────────────────

interface PriceScannerProps {
  onClose?: () => void;
}

interface PriceEstimate {
  estimated_price: number;
  price_range: { min: number; max: number };
  quick_sale_price: number;
  confidence: number;
  reasoning: string;
  market_trend: "up" | "down" | "stable";
  estimated_sell_days: number;
}

type ScannerState =
  | "idle"
  | "capturing"
  | "typing"
  | "analyzing_product"
  | "analyzing_price"
  | "done"
  | "error";

type InputMode = "photo" | "text";

// ── Category labels map ──────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  cars: "السيارات",
  real_estate: "العقارات",
  phones: "الموبايلات والتابلت",
  fashion: "الموضة",
  scrap: "الخردة",
  gold: "الذهب والفضة",
  luxury: "السلع الفاخرة",
  appliances: "الأجهزة المنزلية",
  furniture: "الأثاث والديكور",
  hobbies: "الهوايات",
  tools: "العدد والأدوات",
  services: "الخدمات",
};

// ── Helpers ───────────────────────────────────────────

function formatPrice(price: number): string {
  return price.toLocaleString("en-US");
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Component ────────────────────────────────────────

export default function PriceScanner({ onClose }: PriceScannerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<ScannerState>("idle");
  const [inputMode, setInputMode] = useState<InputMode | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [textInput, setTextInput] = useState("");
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Photo flow ─────────────────────────────────────

  const handlePhotoMode = () => {
    setInputMode("photo");
    setState("capturing");
    fileInputRef.current?.click();
  };

  const handleGallerySelect = () => {
    setInputMode("photo");
    setState("capturing");
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute("capture");
      fileInputRef.current.click();
      setTimeout(() => fileInputRef.current?.setAttribute("capture", "environment"), 100);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      setState("idle");
      setInputMode(null);
      return;
    }

    const dataUrls: string[] = [];
    for (const file of files.slice(0, 3)) {
      const dataUrl = await fileToDataUrl(file);
      dataUrls.push(dataUrl);
    }
    setImages(dataUrls);

    await analyzeFromPhoto(dataUrls);
  };

  const analyzeFromPhoto = async (photoDataUrls: string[]) => {
    setState("analyzing_product");
    setError(null);

    try {
      // Step 1: Analyze image to detect product
      const imageRes = await fetch("/api/ai/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: photoDataUrls }),
      });

      const imageData = await imageRes.json();
      if (!imageRes.ok || !imageData.success) {
        throw new Error(imageData.error || "فشل تحليل الصورة");
      }

      const productAnalysis: ProductAnalysis = imageData.analysis;
      setAnalysis(productAnalysis);

      // Step 2: Get price estimate
      setState("analyzing_price");

      const priceRes = await fetch("/api/ai/price-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: productAnalysis.category_id,
          category_fields: productAnalysis.category_fields,
          title: productAnalysis.suggested_title,
          governorate: productAnalysis.governorate || undefined,
        }),
      });

      const priceData = await priceRes.json();
      if (!priceRes.ok || !priceData.success) {
        throw new Error(priceData.error || "فشل تقدير السعر");
      }

      setPriceEstimate(priceData.estimate);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حصل مشكلة. جرب تاني");
      setState("error");
    }
  };

  // ── Text flow ──────────────────────────────────────

  const handleTextMode = () => {
    setInputMode("text");
    setState("typing");
  };

  const handleTextSubmit = async () => {
    if (textInput.trim().length < 5) return;

    setState("analyzing_product");
    setError(null);

    try {
      // Step 1: Parse text to detect product
      const parseRes = await fetch("/api/ai/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput.trim() }),
      });

      const parseData = await parseRes.json();
      if (!parseRes.ok || !parseData.success) {
        throw new Error(parseData.error || "فشل تحليل النص");
      }

      const productAnalysis: ProductAnalysis = parseData.analysis;
      setAnalysis(productAnalysis);

      // Step 2: Get price estimate
      setState("analyzing_price");

      const priceRes = await fetch("/api/ai/price-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: productAnalysis.category_id,
          category_fields: productAnalysis.category_fields,
          title: productAnalysis.suggested_title,
          governorate: productAnalysis.governorate || undefined,
        }),
      });

      const priceData = await priceRes.json();
      if (!priceRes.ok || !priceData.success) {
        throw new Error(priceData.error || "فشل تقدير السعر");
      }

      setPriceEstimate(priceData.estimate);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حصل مشكلة. جرب تاني");
      setState("error");
    }
  };

  // ── Navigation to create ad ────────────────────────

  const handleSellOnMaksab = () => {
    if (!analysis) return;

    // Store analysis data in localStorage so the create ad page can pick it up
    const prefillData = {
      category_id: analysis.category_id,
      subcategory_id: analysis.subcategory_id,
      category_fields: analysis.category_fields,
      suggested_title: analysis.suggested_title,
      suggested_description: analysis.suggested_description,
      suggested_price: priceEstimate?.estimated_price || analysis.suggested_price,
      images,
    };

    localStorage.setItem("maksab_prefill_ad", JSON.stringify(prefillData));
    router.push("/ad/create?prefill=ai-scanner");
  };

  // ── Reset ──────────────────────────────────────────

  const handleReset = () => {
    setState("idle");
    setInputMode(null);
    setImages([]);
    setTextInput("");
    setAnalysis(null);
    setPriceEstimate(null);
    setError(null);
  };

  // ── Trend icon helper ──────────────────────────────

  const getTrendInfo = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return {
          icon: <TrendingUp size={16} className="text-brand-green" />,
          label: "السعر في ارتفاع",
          color: "text-brand-green",
          bg: "bg-brand-green-light",
        };
      case "down":
        return {
          icon: <TrendingDown size={16} className="text-error" />,
          label: "السعر في انخفاض",
          color: "text-error",
          bg: "bg-red-50",
        };
      case "stable":
        return {
          icon: <Minus size={16} className="text-brand-gold" />,
          label: "السعر مستقر",
          color: "text-brand-gold",
          bg: "bg-brand-gold-light",
        };
    }
  };

  // ── Price range bar position (percentage) ──────────

  const getPriceBarPosition = (
    estimate: PriceEstimate,
  ): { estimatedPct: number; quickPct: number } => {
    const range = estimate.price_range.max - estimate.price_range.min;
    if (range <= 0) return { estimatedPct: 50, quickPct: 30 };

    const estimatedPct = Math.min(
      95,
      Math.max(5, ((estimate.estimated_price - estimate.price_range.min) / range) * 100),
    );
    const quickPct = Math.min(
      95,
      Math.max(5, ((estimate.quick_sale_price - estimate.price_range.min) / range) * 100),
    );

    return { estimatedPct, quickPct };
  };

  // ── Render ─────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white font-cairo" dir="rtl">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <button
          onClick={state === "idle" ? onClose : handleReset}
          className="flex items-center gap-1 text-gray-text hover:text-dark transition-colors"
          aria-label={state === "idle" ? "اغلق" : "ارجع"}
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-semibold">
            {state === "idle" ? "رجوع" : "ابدأ من الأول"}
          </span>
        </button>
        <div className="flex items-center gap-1.5">
          <Sparkles size={18} className="text-brand-gold" />
          <h1 className="text-base font-bold text-dark">كام سعره؟</h1>
        </div>
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {/* ── IDLE: Choose input mode ──────────────── */}
        {state === "idle" && (
          <div className="space-y-6">
            {/* Hero */}
            <div className="text-center space-y-3 pt-4">
              <div className="w-20 h-20 bg-brand-gold-light rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles size={36} className="text-brand-gold" />
              </div>
              <h2 className="text-xl font-bold text-dark">اعرف سعر أي حاجة</h2>
              <p className="text-sm text-gray-text leading-relaxed">
                صوّر المنتج أو اكتب تفاصيله وهنقولك يسوى كام في السوق المصري
              </p>
            </div>

            {/* Input mode buttons */}
            <div className="space-y-3">
              <button
                onClick={handlePhotoMode}
                className="w-full py-4 bg-brand-green text-white font-bold rounded-xl text-base flex items-center justify-center gap-3 hover:bg-brand-green-dark transition-colors active:scale-[0.98]"
              >
                <Camera size={22} />
                صوّر المنتج
              </button>

              <button
                onClick={handleGallerySelect}
                className="w-full py-3 bg-brand-green-light text-brand-green font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-green-100 transition-colors active:scale-[0.98]"
              >
                <Camera size={18} />
                اختار صورة من المعرض
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-text">أو</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                onClick={handleTextMode}
                className="w-full py-4 bg-gray-light text-dark font-bold rounded-xl text-base flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors active:scale-[0.98]"
              >
                <Type size={22} />
                اكتب التفاصيل
              </button>
            </div>

            {/* Examples */}
            <div className="bg-brand-gold-light rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-brand-gold">مثال:</p>
              <p className="text-xs text-gray-text leading-relaxed">
                &quot;آيفون 15 برو ماكس 256 جيجا مستعمل زيرو&quot;
              </p>
              <p className="text-xs text-gray-text leading-relaxed">
                &quot;غسالة توشيبا 10 كيلو موديل 2023&quot;
              </p>
              <p className="text-xs text-gray-text leading-relaxed">
                &quot;شقة 120 متر مدينة نصر 3 أوض سوبر لوكس&quot;
              </p>
            </div>
          </div>
        )}

        {/* ── TYPING: Text input ──────────────────── */}
        {state === "typing" && inputMode === "text" && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-gray-light rounded-2xl flex items-center justify-center mx-auto">
                <Type size={28} className="text-dark" />
              </div>
              <h2 className="text-lg font-bold text-dark">اكتب تفاصيل المنتج</h2>
              <p className="text-sm text-gray-text">
                اكتب أي تفاصيل تعرفها — النوع، الماركة، الحالة، إلخ
              </p>
            </div>

            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="مثلاً: آيفون 15 برو 256 جيجا أسود مستعمل زيرو..."
              rows={4}
              className="w-full p-4 border-2 border-gray-200 rounded-xl text-sm text-dark placeholder:text-gray-300 focus:border-brand-green focus:outline-none resize-none transition-colors"
              dir="rtl"
              autoFocus
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-text">
                {textInput.length}/1000 حرف
              </span>
              {textInput.trim().length < 5 && textInput.length > 0 && (
                <span className="text-xs text-error">اكتب على الأقل 5 حروف</span>
              )}
            </div>

            <button
              onClick={handleTextSubmit}
              disabled={textInput.trim().length < 5}
              className="w-full py-4 bg-brand-green text-white font-bold rounded-xl text-base flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles size={18} />
              اعرف السعر
            </button>
          </div>
        )}

        {/* ── ANALYZING: Spinner states ───────────── */}
        {(state === "analyzing_product" || state === "analyzing_price") && (
          <div className="text-center space-y-6 py-12">
            {/* Animated spinner */}
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 border-4 border-brand-green/15 rounded-full" />
              <div className="absolute inset-0 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={32} className="text-brand-green" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-dark">
                {state === "analyzing_product"
                  ? "بنتعرف على المنتج..."
                  : "بنحسب السعر العادل..."}
              </h3>
              <p className="text-sm text-gray-text">
                {state === "analyzing_product"
                  ? "بنحلل التفاصيل ونحدد القسم والماركة"
                  : "بنقارن بأسعار السوق المصري الحالية"}
              </p>
            </div>

            {/* Progress steps */}
            <div className="flex items-center justify-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                {state === "analyzing_product" ? (
                  <Loader2 size={14} className="text-brand-green animate-spin" />
                ) : (
                  <div className="w-3.5 h-3.5 bg-brand-green rounded-full flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">&#10003;</span>
                  </div>
                )}
                <span className={state === "analyzing_product" ? "text-brand-green font-semibold" : "text-brand-green"}>
                  تحليل المنتج
                </span>
              </div>
              <div className="w-6 h-px bg-gray-200" />
              <div className="flex items-center gap-1.5">
                {state === "analyzing_price" ? (
                  <Loader2 size={14} className="text-brand-green animate-spin" />
                ) : (
                  <div className="w-3.5 h-3.5 bg-gray-200 rounded-full" />
                )}
                <span className={state === "analyzing_price" ? "text-brand-green font-semibold" : "text-gray-text"}>
                  تقدير السعر
                </span>
              </div>
            </div>

            {/* Image preview during analysis */}
            {images.length > 0 && (
              <div className="flex justify-center gap-2 pt-2">
                {images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`صورة ${i + 1}`}
                    className="w-16 h-16 rounded-lg object-cover border-2 border-brand-green/20 opacity-70"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DONE: Results ───────────────────────── */}
        {state === "done" && analysis && priceEstimate && (
          <div className="space-y-5">
            {/* Product detection card */}
            <div className="bg-gray-light rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-brand-gold" />
                <span className="text-xs font-bold text-brand-gold">المنتج المكتشف</span>
                <span className="mr-auto text-[10px] text-gray-text bg-white px-2 py-0.5 rounded-full">
                  ثقة {Math.round(analysis.confidence * 100)}%
                </span>
              </div>

              {/* Image preview (if photo mode) */}
              {images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`صورة ${i + 1}`}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                  ))}
                </div>
              )}

              <h3 className="text-base font-bold text-dark">{analysis.suggested_title}</h3>

              {/* Product details chips */}
              <div className="flex flex-wrap gap-1.5">
                {analysis.category_id && (
                  <span className="text-[11px] bg-white px-2.5 py-1 rounded-full text-gray-text">
                    {CATEGORY_LABELS[analysis.category_id] || analysis.category_id}
                  </span>
                )}
                {analysis.condition_assessment && (
                  <span className="text-[11px] bg-white px-2.5 py-1 rounded-full text-gray-text">
                    {analysis.condition_assessment}
                  </span>
                )}
                {Object.entries(analysis.category_fields || {}).slice(0, 4).map(([key, value]) => (
                  <span
                    key={key}
                    className="text-[11px] bg-white px-2.5 py-1 rounded-full text-gray-text"
                  >
                    {String(value)}
                  </span>
                ))}
              </div>
            </div>

            {/* Main price estimate */}
            <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-5 space-y-4">
              <div className="text-center space-y-1">
                <p className="text-xs text-brand-green font-semibold">السعر المقدّر</p>
                <p className="text-3xl font-bold text-brand-green-dark">
                  {formatPrice(priceEstimate.estimated_price)}
                  <span className="text-base font-semibold mr-1">جنيه</span>
                </p>
              </div>

              {/* Price range bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] text-gray-text">
                  <span>{formatPrice(priceEstimate.price_range.min)} ج</span>
                  <span>{formatPrice(priceEstimate.price_range.max)} ج</span>
                </div>
                <div className="relative h-3 bg-white rounded-full overflow-hidden">
                  {/* Gradient bar */}
                  <div className="absolute inset-0 bg-gradient-to-l from-brand-green via-brand-gold to-error rounded-full" />
                  {/* Estimated price marker */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-brand-green-dark border-2 border-white rounded-full shadow-md z-10"
                    style={{ right: `${getPriceBarPosition(priceEstimate).estimatedPct}%`, transform: "translate(50%, -50%)" }}
                  />
                  {/* Quick sale marker */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-brand-gold border-2 border-white rounded-full shadow-sm z-10"
                    style={{ right: `${getPriceBarPosition(priceEstimate).quickPct}%`, transform: "translate(50%, -50%)" }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-brand-green-dark rounded-full" />
                    <span className="text-gray-text">السعر العادل</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-brand-gold rounded-full" />
                    <span className="text-gray-text">بيع سريع</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick sale price */}
            <div className="bg-brand-gold-light border border-brand-gold/20 rounded-xl p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-brand-gold font-semibold">لو عايز تبيع بسرعة</p>
                <p className="text-xs text-gray-text">سعر بيع سريع مقترح</p>
              </div>
              <p className="text-lg font-bold text-brand-gold">
                {formatPrice(priceEstimate.quick_sale_price)}
                <span className="text-xs font-semibold mr-0.5">جنيه</span>
              </p>
            </div>

            {/* Market trend + sell days */}
            <div className="grid grid-cols-2 gap-3">
              {/* Market trend */}
              {(() => {
                const trend = getTrendInfo(priceEstimate.market_trend);
                return (
                  <div className={`${trend.bg} rounded-xl p-3 space-y-1.5`}>
                    <div className="flex items-center gap-1.5">
                      {trend.icon}
                      <span className={`text-xs font-bold ${trend.color}`}>اتجاه السوق</span>
                    </div>
                    <p className={`text-sm font-bold ${trend.color}`}>{trend.label}</p>
                  </div>
                );
              })()}

              {/* Estimated sell days */}
              <div className="bg-gray-light rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-bold text-gray-text">مدة البيع المتوقعة</p>
                <p className="text-sm font-bold text-dark">
                  {priceEstimate.estimated_sell_days <= 1
                    ? "يوم واحد"
                    : priceEstimate.estimated_sell_days <= 2
                      ? "يومين"
                      : priceEstimate.estimated_sell_days <= 10
                        ? `${priceEstimate.estimated_sell_days} أيام`
                        : `${priceEstimate.estimated_sell_days} يوم`}
                </p>
              </div>
            </div>

            {/* AI reasoning */}
            <div className="bg-gray-light rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-brand-gold" />
                <span className="text-xs font-bold text-dark">تحليل الذكاء الاصطناعي</span>
              </div>
              <p className="text-sm text-gray-text leading-relaxed">
                {priceEstimate.reasoning}
              </p>
              <div className="flex items-center gap-1 pt-1">
                <div className="w-2 h-2 bg-brand-green rounded-full" />
                <span className="text-[10px] text-gray-text">
                  دقة التقدير: {Math.round(priceEstimate.confidence * 100)}%
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleSellOnMaksab}
                className="w-full py-4 bg-brand-green text-white font-bold rounded-xl text-base flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-colors active:scale-[0.98] shadow-lg shadow-brand-green/20"
              >
                <ShoppingBag size={20} />
                ابيعه على مكسب
              </button>

              <button
                onClick={handleReset}
                className="w-full py-3 bg-gray-light text-dark font-semibold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors active:scale-[0.98]"
              >
                <RefreshCw size={16} />
                اعرف سعر حاجة تانية
              </button>
            </div>
          </div>
        )}

        {/* ── ERROR ────────────────────────────────── */}
        {state === "error" && (
          <div className="text-center space-y-5 py-8">
            <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
              <Sparkles size={32} className="text-error" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-dark">حصل مشكلة</h3>
              <p className="text-sm text-gray-text leading-relaxed">{error}</p>
            </div>

            {/* Show captured images if any */}
            {images.length > 0 && (
              <div className="flex justify-center gap-2">
                {images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover opacity-50"
                  />
                ))}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleReset}
                className="w-full py-3 bg-brand-green text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-colors"
              >
                <RefreshCw size={16} />
                جرب تاني
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full py-3 text-sm text-gray-text font-semibold"
                >
                  اغلق
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
