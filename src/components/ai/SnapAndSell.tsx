"use client";

import { useState, useRef } from "react";
import { Camera, Sparkles, Loader2, RefreshCw, Check, X } from "lucide-react";
import type { ProductAnalysis } from "@/lib/ai/ai-service";

interface SnapAndSellProps {
  onAnalysisComplete: (analysis: ProductAnalysis, imageDataUrls: string[]) => void;
  onCancel: () => void;
}

type AnalysisState = "idle" | "capturing" | "analyzing" | "done" | "error";

export default function SnapAndSell({ onAnalysisComplete, onCancel }: SnapAndSellProps) {
  const [state, setState] = useState<AnalysisState>("idle");
  const [images, setImages] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setState("capturing");

    const dataUrls: string[] = [];
    for (const file of files.slice(0, 3)) {
      const dataUrl = await fileToDataUrl(file);
      dataUrls.push(dataUrl);
    }
    setImages(dataUrls);

    // Analyze with AI
    setState("analyzing");
    setError(null);

    try {
      const response = await fetch("/api/ai/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: dataUrls }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "فشل التحليل");
      }

      setAnalysis(data.analysis);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حصل مشكلة في التحليل. جرب تاني");
      setState("error");
    }
  };

  const handleAccept = () => {
    if (analysis) {
      onAnalysisComplete(analysis, images);
    }
  };

  const handleRetry = () => {
    setImages([]);
    setAnalysis(null);
    setError(null);
    setState("idle");
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Idle state — prompt to take photo */}
      {state === "idle" && (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-brand-green-light rounded-2xl flex items-center justify-center mx-auto">
            <Camera size={36} className="text-brand-green" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-dark">صوّر واِبيع</h3>
            <p className="text-sm text-gray-text mt-1">
              صوّر المنتج وهنملأ الإعلان تلقائياً بالذكاء الاصطناعي
            </p>
          </div>
          <button
            onClick={handleCapture}
            className="w-full py-4 bg-brand-green text-white font-bold rounded-xl text-lg flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-colors active:scale-[0.98]"
          >
            <Camera size={22} />
            افتح الكاميرا
          </button>
          <button
            onClick={() => {
              // Allow gallery selection too
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute("capture");
                fileInputRef.current.click();
                // Restore capture for next time
                setTimeout(() => fileInputRef.current?.setAttribute("capture", "environment"), 100);
              }
            }}
            className="text-sm text-brand-green font-semibold"
          >
            أو اختار من المعرض
          </button>
        </div>
      )}

      {/* Analyzing state */}
      {(state === "capturing" || state === "analyzing") && (
        <div className="text-center space-y-4 py-8">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 border-4 border-brand-green/20 rounded-2xl" />
            <div className="absolute inset-0 border-4 border-brand-green border-t-transparent rounded-2xl animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={28} className="text-brand-green" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-dark">
              {state === "capturing" ? "جاري تجهيز الصور..." : "بنحلل المنتج بالذكاء الاصطناعي..."}
            </h3>
            <p className="text-sm text-gray-text mt-1">ثواني وهيكون جاهز</p>
          </div>

          {/* Show image previews */}
          {images.length > 0 && (
            <div className="flex justify-center gap-2">
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`صورة ${i + 1}`}
                  className="w-16 h-16 rounded-lg object-cover border-2 border-brand-green/30"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Done — show analysis results */}
      {state === "done" && analysis && (
        <div className="space-y-4">
          {/* Image preview */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`صورة ${i + 1}`}
                className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
              />
            ))}
          </div>

          {/* Analysis card */}
          <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-brand-green" />
              <span className="text-xs font-bold text-brand-green">
                تم التحليل — ثقة {Math.round(analysis.confidence * 100)}%
              </span>
            </div>

            <h3 className="text-base font-bold text-dark">{analysis.suggested_title}</h3>
            <p className="text-sm text-gray-text leading-relaxed">
              {analysis.suggested_description}
            </p>

            {analysis.detected_items && analysis.detected_items.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {analysis.detected_items.map((item, i) => (
                  <span
                    key={i}
                    className="text-[11px] bg-white px-2 py-0.5 rounded-full text-brand-green-dark"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}

            {analysis.suggested_price && (
              <div className="bg-white rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-gray-text">السعر المقترح:</span>
                <span className="text-sm font-bold text-brand-green">
                  {analysis.suggested_price.toLocaleString("en-US")} جنيه
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              className="flex-1 py-3 bg-brand-green text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-colors"
            >
              <Check size={18} />
              تمام، كمّل الإعلان
            </button>
            <button
              onClick={handleRetry}
              className="px-4 py-3 bg-gray-light text-gray-text rounded-xl hover:bg-gray-200 transition-colors"
              aria-label="صوّر تاني"
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <button
            onClick={onCancel}
            className="w-full text-sm text-gray-text text-center py-1"
          >
            اعمل الإعلان يدوي
          </button>
        </div>
      )}

      {/* Error state */}
      {state === "error" && (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <X size={28} className="text-error" />
          </div>
          <div>
            <h3 className="text-base font-bold text-dark">حصل مشكلة</h3>
            <p className="text-sm text-gray-text mt-1">{error}</p>
          </div>

          {images.length > 0 && (
            <div className="flex justify-center gap-2">
              {images.map((img, i) => (
                <img key={i} src={img} alt="" className="w-16 h-16 rounded-lg object-cover opacity-50" />
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              className="flex-1 py-3 bg-brand-green text-white font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              جرب تاني
            </button>
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-light text-dark font-bold rounded-xl"
            >
              اعمل يدوي
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
