"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Loader2, Check, X, RefreshCw, Sparkles } from "lucide-react";
import type { ProductAnalysis } from "@/lib/ai/ai-service";

interface VoiceToListingProps {
  onAnalysisComplete: (analysis: ProductAnalysis, transcript: string) => void;
  onCancel: () => void;
}

type VoiceState = "idle" | "listening" | "processing" | "done" | "error";

// Max recording durations in milliseconds
const MAX_SILENCE_MS = 15_000;
const MAX_TOTAL_MS = 60_000;

export default function VoiceToListing({ onAnalysisComplete, onCancel }: VoiceToListingProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [textInput, setTextInput] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptRef = useRef("");

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? (window as unknown as Record<string, unknown>).webkitSpeechRecognition ||
          (window as unknown as Record<string, unknown>).SpeechRecognition
        : null;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecognition();
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearTimers = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (totalTimerRef.current) {
      clearTimeout(totalTimerRef.current);
      totalTimerRef.current = null;
    }
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
      recognitionRef.current = null;
    }
    clearTimers();
  };

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      // Auto-stop after silence
      stopRecognition();
      const text = finalTranscriptRef.current.trim();
      if (text) {
        submitTranscript(text);
      } else {
        setError("مسمعناش حاجة. جرب تاني وتكلم بصوت واضح");
        setState("error");
      }
    }, MAX_SILENCE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitTranscript = async (text: string) => {
    setState("processing");
    setError(null);

    try {
      const response = await fetch("/api/ai/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // AI not available — create basic fallback so user can proceed with their text
        const fallback: ProductAnalysis = {
          category_id: "",
          subcategory_id: null,
          category_fields: {},
          suggested_title: text.length > 60 ? text.substring(0, 60) + "..." : text,
          suggested_description: text,
          confidence: 0,
          detected_items: [],
        };
        setAnalysis(fallback);
        setState("done");
        return;
      }

      setAnalysis(data.analysis);
      setState("done");
    } catch {
      // AI failed — still allow user to proceed with their text as description
      const fallback: ProductAnalysis = {
        category_id: "",
        subcategory_id: null,
        category_fields: {},
        suggested_title: text.length > 60 ? text.substring(0, 60) + "..." : text,
        suggested_description: text,
        confidence: 0,
        detected_items: [],
      };
      setAnalysis(fallback);
      setState("done");
    }
  };

  const startListening = () => {
    const SpeechRecognitionAPI =
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition ||
      (window as unknown as Record<string, unknown>).SpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    // Reset state
    setTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";
    setAnalysis(null);
    setError(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SpeechRecognitionAPI as any)();
    recognition.lang = "ar-EG";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState("listening");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) {
        finalTranscriptRef.current = finalText;
        setTranscript(finalText);
      }
      setInterimTranscript(interimText);

      // Reset silence timer on any speech activity
      resetSilenceTimer();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      stopRecognition();

      if (event.error === "no-speech") {
        setError("مسمعناش حاجة. جرب تاني وتكلم بصوت واضح");
      } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("محتاجين إذن الميكروفون. اسمح بالوصول للميكروفون وجرب تاني");
      } else if (event.error === "network") {
        setError("مفيش اتصال بالإنترنت. تأكد من الاتصال وجرب تاني");
      } else {
        setError("حصل مشكلة في التسجيل. جرب تاني");
      }
      setState("error");
    };

    recognition.onend = () => {
      // If still in listening state, recognition ended unexpectedly
      // Submit what we have if any
      if (state === "listening" || recognitionRef.current) {
        const text = finalTranscriptRef.current.trim();
        if (text) {
          submitTranscript(text);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();

    // Start silence timer
    resetSilenceTimer();

    // Total recording limit
    totalTimerRef.current = setTimeout(() => {
      stopRecognition();
      const text = finalTranscriptRef.current.trim();
      if (text) {
        submitTranscript(text);
      } else {
        setError("انتهى وقت التسجيل. جرب تاني");
        setState("error");
      }
    }, MAX_TOTAL_MS);
  };

  const handleStopListening = () => {
    stopRecognition();
    const text = finalTranscriptRef.current.trim();
    if (text) {
      submitTranscript(text);
    } else {
      setError("مسمعناش حاجة. جرب تاني أو اكتب التفاصيل");
      setState("error");
    }
  };

  const handleAccept = () => {
    if (analysis) {
      onAnalysisComplete(analysis, transcript || textInput);
    }
  };

  const handleRetry = () => {
    stopRecognition();
    setTranscript("");
    setInterimTranscript("");
    setTextInput("");
    finalTranscriptRef.current = "";
    setAnalysis(null);
    setError(null);
    setState("idle");
  };

  const handleTextSubmit = () => {
    const text = textInput.trim();
    if (!text) return;
    submitTranscript(text);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  // Browser not supported — show text-only fallback
  if (!isSupported) {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-gray-light rounded-2xl flex items-center justify-center mx-auto">
            <MicOff size={36} className="text-gray-text" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-dark">المتصفح مش بيدعم التسجيل الصوتي</h3>
            <p className="text-sm text-gray-text mt-1">
              ممكن تكتب تفاصيل المنتج وهنحللها بالذكاء الاصطناعي
            </p>
          </div>
        </div>

        {/* Text fallback */}
        <div className="space-y-3">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleTextKeyDown}
            placeholder="مثلاً: عندي آيفون 15 برو 256 جيجا أسود مستعمل زيرو عايز أبيعه بـ 30 ألف"
            className="w-full h-28 p-3 border border-gray-200 rounded-xl text-sm text-dark placeholder:text-gray-text/50 resize-none focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
            dir="rtl"
          />
          <button
            onClick={handleTextSubmit}
            disabled={!textInput.trim() || state === "processing"}
            className="w-full py-3 bg-brand-green text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === "processing" ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                جاري التحليل...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                حلل بالذكاء الاصطناعي
              </>
            )}
          </button>
          <button onClick={onCancel} className="w-full text-sm text-gray-text text-center py-1">
            اعمل الإعلان يدوي
          </button>
        </div>

        {/* Show analysis results even in unsupported mode */}
        {state === "done" && analysis && (
          <AnalysisResult
            analysis={analysis}
            onAccept={handleAccept}
            onRetry={handleRetry}
            onCancel={onCancel}
          />
        )}

        {state === "error" && error && (
          <ErrorDisplay error={error} onRetry={handleRetry} onCancel={onCancel} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Idle state — show mic button */}
      {state === "idle" && (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-brand-green-light rounded-2xl flex items-center justify-center mx-auto">
            <Mic size={36} className="text-brand-green" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-dark">اتكلم واِبيع</h3>
            <p className="text-sm text-gray-text mt-1">
              قول تفاصيل المنتج وهنملأ الإعلان تلقائياً بالذكاء الاصطناعي
            </p>
          </div>

          {/* Start recording button */}
          <button
            onClick={startListening}
            className="w-full py-4 bg-brand-green text-white font-bold rounded-xl text-lg flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-colors active:scale-[0.98]"
          >
            <Mic size={22} />
            ابدأ التسجيل
          </button>

          {/* Text input fallback */}
          <div className="relative">
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-text">أو اكتب التفاصيل هنا</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleTextKeyDown}
              placeholder="مثلاً: عندي آيفون 15 برو 256 جيجا أسود مستعمل زيرو عايز أبيعه بـ 30 ألف"
              className="w-full h-24 p-3 border border-gray-200 rounded-xl text-sm text-dark placeholder:text-gray-text/50 resize-none focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
              dir="rtl"
            />
            {textInput.trim() && (
              <button
                onClick={handleTextSubmit}
                className="mt-2 w-full py-3 bg-brand-green text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-colors"
              >
                <Sparkles size={18} />
                حلل بالذكاء الاصطناعي
              </button>
            )}
          </div>
        </div>
      )}

      {/* Listening state — pulsing mic + live transcript */}
      {state === "listening" && (
        <div className="text-center space-y-4">
          {/* Pulsing mic animation */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-brand-green/10 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-brand-green/20 animate-pulse" />
            <button
              onClick={handleStopListening}
              className="relative z-10 w-16 h-16 bg-brand-green rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              aria-label="وقف التسجيل"
            >
              <Mic size={28} className="text-white" />
            </button>
          </div>

          <div>
            <h3 className="text-lg font-bold text-dark">بنسمعك...</h3>
            <p className="text-xs text-gray-text mt-1">قول تفاصيل المنتج — اضغط الميكروفون لما تخلص</p>
          </div>

          {/* Live transcript display */}
          <div className="bg-gray-light rounded-xl p-4 min-h-[80px] text-right">
            {transcript || interimTranscript ? (
              <p className="text-sm text-dark leading-relaxed">
                {transcript}
                {interimTranscript && (
                  <span className="text-gray-text">{interimTranscript}</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-gray-text/50">الكلام هيظهر هنا...</p>
            )}
          </div>

          {/* Stop button */}
          <button
            onClick={handleStopListening}
            className="w-full py-3 bg-error/10 text-error font-bold rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
          >
            <MicOff size={18} />
            وقف التسجيل
          </button>
        </div>
      )}

      {/* Processing state */}
      {state === "processing" && (
        <div className="text-center space-y-4 py-8">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 border-4 border-brand-green/20 rounded-2xl" />
            <div className="absolute inset-0 border-4 border-brand-green border-t-transparent rounded-2xl animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={28} className="text-brand-green" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-dark">بنحلل كلامك بالذكاء الاصطناعي...</h3>
            <p className="text-sm text-gray-text mt-1">ثواني وهيكون جاهز</p>
          </div>

          {/* Show what was said */}
          {(transcript || textInput) && (
            <div className="bg-gray-light rounded-xl p-3">
              <p className="text-sm text-dark leading-relaxed">
                &quot;{transcript || textInput}&quot;
              </p>
            </div>
          )}
        </div>
      )}

      {/* Done — show analysis results */}
      {state === "done" && analysis && (
        <AnalysisResult
          analysis={analysis}
          onAccept={handleAccept}
          onRetry={handleRetry}
          onCancel={onCancel}
        />
      )}

      {/* Error state */}
      {state === "error" && (
        <ErrorDisplay error={error} onRetry={handleRetry} onCancel={onCancel} />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────

function AnalysisResult({
  analysis,
  onAccept,
  onRetry,
  onCancel,
}: {
  analysis: ProductAnalysis;
  onAccept: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
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

        {analysis.category_id && (
          <div className="bg-white rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-gray-text">القسم:</span>
            <span className="text-sm font-semibold text-dark">{analysis.category_id}</span>
          </div>
        )}

        {analysis.sale_type && (
          <div className="bg-white rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-gray-text">نوع البيع:</span>
            <span className="text-sm font-semibold text-dark">
              {analysis.sale_type === "cash"
                ? "بيع نقدي"
                : analysis.sale_type === "auction"
                  ? "مزاد"
                  : analysis.sale_type === "exchange"
                    ? "تبديل"
                    : analysis.sale_type}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 py-3 bg-brand-green text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-colors"
        >
          <Check size={18} />
          تمام، كمّل الإعلان
        </button>
        <button
          onClick={onRetry}
          className="px-4 py-3 bg-gray-light text-gray-text rounded-xl hover:bg-gray-200 transition-colors"
          aria-label="جرب تاني"
        >
          <RefreshCw size={18} />
        </button>
      </div>
      <button onClick={onCancel} className="w-full text-sm text-gray-text text-center py-1">
        اعمل الإعلان يدوي
      </button>
    </div>
  );
}

function ErrorDisplay({
  error,
  onRetry,
  onCancel,
}: {
  error: string | null;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="text-center space-y-4 py-4">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
        <X size={28} className="text-error" />
      </div>
      <div>
        <h3 className="text-base font-bold text-dark">حصل مشكلة</h3>
        <p className="text-sm text-gray-text mt-1">{error}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onRetry}
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
  );
}
