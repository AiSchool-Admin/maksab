"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Video,
  Camera,
  Mic,
  StopCircle,
  Loader2,
  Sparkles,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import type { ProductAnalysis } from "@/lib/ai/ai-service";

// ── Types ──────────────────────────────────────────────

interface VideoToListingProps {
  onAnalysisComplete: (analysis: ProductAnalysis, imageDataUrls: string[]) => void;
  onCancel: () => void;
}

type ComponentState =
  | "idle"
  | "recording"
  | "extracting"
  | "analyzing"
  | "done"
  | "error";

// ── Component ──────────────────────────────────────────

export default function VideoToListing({
  onAnalysisComplete,
  onCancel,
}: VideoToListingProps) {
  // State
  const [state, setState] = useState<ComponentState>("idle");
  const [frames, setFrames] = useState<string[]>([]);
  const [transcript, setTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const recordedBlobRef = useRef<Blob | null>(null);

  const MAX_DURATION = 30;

  // ── Cleanup ────────────────────────────────────────

  const stopMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
      recognitionRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopMediaStream();
    stopTimer();
    stopRecognition();
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  }, [stopMediaStream, stopTimer, stopRecognition]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // ── Start Recording ────────────────────────────────

  const startRecording = async () => {
    setError(null);
    setTranscript("");
    setLiveTranscript("");
    setElapsedSeconds(0);
    setFrames([]);
    setAnalysis(null);
    chunksRef.current = [];
    recordedBlobRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      mediaStreamRef.current = stream;

      // Show live preview
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true;
        await videoPreviewRef.current.play();
      }

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : "video/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        recordedBlobRef.current = blob;
      };

      recorder.start(500); // Collect data every 500ms

      // Start timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(elapsed);
        if (elapsed >= MAX_DURATION) {
          stopRecording();
        }
      }, 250);

      // Start speech recognition
      startSpeechRecognition();

      setState("recording");
    } catch (err) {
      console.error("[VideoToListing] Camera access error:", err);
      cleanup();
      setError("مش قادرين نفتح الكاميرا. تأكد إنك سامح بالوصول للكاميرا والمايك");
      setState("error");
    }
  };

  // ── Speech Recognition ─────────────────────────────

  const startSpeechRecognition = () => {
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? (window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionAPI) {
      // Speech recognition not supported — continue without it
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SpeechRecognitionAPI as any)();
    recognition.lang = "ar-EG";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
          setTranscript(finalTranscript.trim());
        } else {
          interimText += result[0].transcript;
        }
      }
      setLiveTranscript(finalTranscript + interimText);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      // "no-speech" and "aborted" are expected, don't treat as errors
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("[VideoToListing] Speech recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      // If still recording, restart recognition (it can timeout)
      if (mediaRecorderRef.current?.state === "recording") {
        try {
          recognition.start();
        } catch {
          // May fail if already started
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      console.warn("[VideoToListing] Could not start speech recognition");
    }
  };

  // ── Stop Recording ─────────────────────────────────

  const stopRecording = useCallback(() => {
    stopTimer();
    stopRecognition();

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    // Stop preview but keep stream briefly for the blob to finalize
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }

    setState("extracting");

    // Wait a beat for onstop to fire, then extract frames
    setTimeout(() => {
      extractFramesAndAnalyze();
    }, 500);
  }, [stopTimer, stopRecognition]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Frame Extraction ───────────────────────────────

  const extractFramesAndAnalyze = async () => {
    try {
      const blob = recordedBlobRef.current;
      if (!blob || blob.size === 0) {
        throw new Error("مفيش فيديو متسجل");
      }

      const videoUrl = URL.createObjectURL(blob);
      const extractedFrames = await extractKeyFrames(videoUrl);
      URL.revokeObjectURL(videoUrl);

      if (extractedFrames.length === 0) {
        throw new Error("مقدرناش نستخرج صور من الفيديو");
      }

      setFrames(extractedFrames);
      stopMediaStream();

      // Now analyze
      setState("analyzing");
      await analyzeFramesAndTranscript(extractedFrames, transcript);
    } catch (err) {
      console.error("[VideoToListing] Frame extraction error:", err);
      stopMediaStream();
      setError(err instanceof Error ? err.message : "حصل مشكلة في استخراج الصور من الفيديو");
      setState("error");
    }
  };

  /**
   * Extract 3 key frames from the recorded video at 10%, 50%, 90%.
   * MediaRecorder WebM blobs often have duration = Infinity or 0,
   * so we use the elapsed recording time as a fallback.
   */
  const extractKeyFrames = (videoUrl: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.src = videoUrl;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      const capturedFrames: string[] = [];
      let currentSeekIndex = 0;

      const captureFrame = () => {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          // Skip invalid frames
          currentSeekIndex++;
          return;
        }
        canvas.width = Math.min(video.videoWidth, 1280);
        canvas.height = Math.min(
          video.videoHeight,
          Math.round((canvas.width / video.videoWidth) * video.videoHeight)
        );
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        capturedFrames.push(dataUrl);

        currentSeekIndex++;
      };

      // Use the recording duration we tracked as fallback
      const recordedDuration = elapsedSeconds > 0 ? elapsedSeconds : MAX_DURATION;
      const seekTimes = [
        Math.max(0.5, recordedDuration * 0.1),
        Math.max(1, recordedDuration * 0.5),
        Math.max(1.5, recordedDuration * 0.9),
      ];

      video.addEventListener("seeked", () => {
        captureFrame();
        if (currentSeekIndex < seekTimes.length) {
          video.currentTime = seekTimes[currentSeekIndex];
        } else {
          video.removeEventListener("seeked", captureFrame);
          video.src = "";
          resolve(capturedFrames);
        }
      });

      video.addEventListener("loadedmetadata", () => {
        // Use actual duration if valid, otherwise use recorded elapsed time
        const duration = (video.duration > 0 && isFinite(video.duration))
          ? video.duration
          : recordedDuration;

        if (duration <= 0) {
          // Even fallback failed — try to capture at least the first frame
          video.currentTime = 0.5;
          return;
        }

        // Recalculate seek times with actual duration if available
        if (video.duration > 0 && isFinite(video.duration)) {
          seekTimes[0] = Math.max(0.1, video.duration * 0.1);
          seekTimes[1] = Math.max(0.5, video.duration * 0.5);
          seekTimes[2] = Math.max(1, video.duration * 0.9);
        }

        video.currentTime = seekTimes[0];
      });

      video.addEventListener("error", () => {
        if (capturedFrames.length > 0) {
          resolve(capturedFrames);
        } else {
          reject(new Error("فشل في تحميل الفيديو"));
        }
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        if (capturedFrames.length > 0) {
          resolve(capturedFrames);
        } else {
          reject(new Error("استخراج الصور أخد وقت طويل"));
        }
      }, 15000);
    });
  };

  // ── Analysis ───────────────────────────────────────

  const analyzeFramesAndTranscript = async (
    frameDataUrls: string[],
    transcriptText: string,
  ) => {
    try {
      // Run image analysis and text parsing in parallel
      const imagePromise = fetch("/api/ai/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: frameDataUrls }),
      }).then((res) => res.json());

      const textPromise = transcriptText.trim().length > 5
        ? fetch("/api/ai/parse-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: transcriptText }),
          }).then((res) => res.json())
        : Promise.resolve(null);

      const [imageResult, textResult] = await Promise.all([imagePromise, textPromise]);

      if (!imageResult.success && !textResult?.success) {
        // AI not available — create fallback analysis so user can proceed with captured frames
        const fallback: ProductAnalysis = {
          category_id: "",
          subcategory_id: null,
          category_fields: {},
          suggested_title: transcriptText.trim()
            ? (transcriptText.length > 60 ? transcriptText.substring(0, 60) + "..." : transcriptText)
            : "منتج جديد",
          suggested_description: transcriptText.trim() || "منتج معروض للبيع على مكسب",
          confidence: 0,
          detected_items: [],
        };
        setAnalysis(fallback);
        setState("done");
        return;
      }

      const imageAnalysis: ProductAnalysis | null = imageResult.success
        ? imageResult.analysis
        : null;
      const textAnalysis: ProductAnalysis | null = textResult?.success
        ? textResult.analysis
        : null;

      const merged = mergeAnalyses(imageAnalysis, textAnalysis);
      setAnalysis(merged);
      setState("done");
    } catch (err) {
      console.error("[VideoToListing] Analysis error:", err);
      setError(err instanceof Error ? err.message : "حصل مشكلة في التحليل. جرب تاني");
      setState("error");
    }
  };

  /**
   * Merge image-based and text-based analyses.
   * Image analysis is preferred for visual fields (category, brand, model, condition).
   * Text analysis is preferred for price, description details, sale type, location.
   * Highest confidence wins for shared fields.
   */
  const mergeAnalyses = (
    imageAnalysis: ProductAnalysis | null,
    textAnalysis: ProductAnalysis | null,
  ): ProductAnalysis => {
    // If only one analysis is available, use it
    if (!imageAnalysis && textAnalysis) return textAnalysis;
    if (imageAnalysis && !textAnalysis) return imageAnalysis;
    if (!imageAnalysis && !textAnalysis) {
      throw new Error("مفيش نتائج تحليل");
    }

    // Both exist — merge them
    const img = imageAnalysis!;
    const txt = textAnalysis!;

    // Image wins for visual fields
    const category_id = img.confidence >= txt.confidence ? img.category_id : txt.category_id;
    const subcategory_id =
      img.confidence >= txt.confidence ? img.subcategory_id : txt.subcategory_id;

    // Merge category_fields: image provides visual fields, text fills the rest
    const mergedFields: Record<string, unknown> = {
      ...txt.category_fields,
      ...img.category_fields, // Image fields override text for visual attributes
    };

    // Text wins for price, sale_type, location
    const suggested_price = txt.suggested_price ?? img.suggested_price;
    const sale_type = txt.sale_type ?? img.sale_type;
    const governorate = txt.governorate ?? img.governorate;
    const city = txt.city ?? img.city;

    // Build title and description: prefer higher confidence source, enrich with the other
    const primarySource = img.confidence >= txt.confidence ? img : txt;
    const secondarySource = img.confidence >= txt.confidence ? txt : img;

    const suggested_title = primarySource.suggested_title || secondarySource.suggested_title;

    // Combine descriptions for richer content
    let suggested_description = primarySource.suggested_description || "";
    if (
      secondarySource.suggested_description &&
      secondarySource.suggested_description !== suggested_description
    ) {
      suggested_description += "\n" + secondarySource.suggested_description;
    }

    // Condition assessment: prefer image (visual condition is more reliable)
    const condition_assessment =
      img.condition_assessment || txt.condition_assessment;

    // Detected items: merge both lists
    const detected_items = [
      ...(img.detected_items || []),
      ...(txt.detected_items || []),
    ].filter((item, index, arr) => arr.indexOf(item) === index);

    // Overall confidence: weighted average (image 60%, text 40%)
    const confidence = img.confidence * 0.6 + txt.confidence * 0.4;

    return {
      category_id,
      subcategory_id,
      category_fields: mergedFields,
      suggested_title,
      suggested_description: suggested_description.trim(),
      suggested_price,
      sale_type,
      governorate,
      city,
      condition_assessment,
      confidence: Math.round(confidence * 100) / 100,
      detected_items,
    };
  };

  // ── Actions ────────────────────────────────────────

  const handleAccept = () => {
    if (analysis) {
      onAnalysisComplete(analysis, frames);
    }
  };

  const handleRetry = () => {
    cleanup();
    setFrames([]);
    setTranscript("");
    setLiveTranscript("");
    setElapsedSeconds(0);
    setAnalysis(null);
    setError(null);
    chunksRef.current = [];
    recordedBlobRef.current = null;
    setState("idle");
  };

  // ── Format timer ───────────────────────────────────

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Render ─────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Idle state ── */}
      {state === "idle" && (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-brand-green-light rounded-2xl flex items-center justify-center mx-auto">
            <Video size={36} className="text-brand-green" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-dark">
              صوّر فيديو واحكي عن المنتج
            </h3>
            <p className="text-sm text-gray-text mt-1">
              صوّر المنتج واتكلم عنه — هنحلل الصورة والكلام ونملأ الإعلان تلقائياً
            </p>
          </div>
          <button
            onClick={startRecording}
            className="w-full py-4 bg-brand-green text-white font-bold rounded-xl text-lg flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-colors active:scale-[0.98]"
          >
            <Camera size={22} />
            ابدأ التسجيل
          </button>
          <button
            onClick={onCancel}
            className="text-sm text-gray-text font-semibold"
          >
            اعمل الإعلان يدوي
          </button>
        </div>
      )}

      {/* ── Recording state ── */}
      {state === "recording" && (
        <div className="space-y-4">
          {/* Live camera preview */}
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Recording indicator */}
            <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
              <span className="w-3 h-3 bg-error rounded-full animate-pulse" />
              <span className="text-white text-sm font-bold font-mono">
                {formatTime(elapsedSeconds)}
              </span>
            </div>

            {/* Max duration indicator */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
              <span className="text-white/70 text-xs">
                الحد: {formatTime(MAX_DURATION)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div
                className="h-full bg-error transition-all duration-300"
                style={{ width: `${(elapsedSeconds / MAX_DURATION) * 100}%` }}
              />
            </div>
          </div>

          {/* Mic indicator + live transcript */}
          <div className="bg-gray-light rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Mic size={16} className="text-brand-green animate-pulse" />
              <span className="text-xs font-bold text-brand-green">
                بيسمعك...
              </span>
            </div>
            <p
              className="text-sm text-dark min-h-[2.5rem] leading-relaxed"
              dir="rtl"
            >
              {liveTranscript || (
                <span className="text-gray-text">
                  احكي عن المنتج — اذكر النوع والحالة والسعر...
                </span>
              )}
            </p>
          </div>

          {/* Stop button */}
          <button
            onClick={stopRecording}
            className="w-full py-4 bg-error text-white font-bold rounded-xl text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <StopCircle size={22} />
            وقّف التسجيل
          </button>
        </div>
      )}

      {/* ── Extracting frames state ── */}
      {state === "extracting" && (
        <div className="text-center space-y-4 py-8">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 border-4 border-brand-green/20 rounded-2xl" />
            <div className="absolute inset-0 border-4 border-brand-green border-t-transparent rounded-2xl animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Video size={28} className="text-brand-green" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-dark">بنستخرج الصور من الفيديو...</h3>
            <p className="text-sm text-gray-text mt-1">ثواني بس</p>
          </div>
        </div>
      )}

      {/* ── Analyzing state ── */}
      {state === "analyzing" && (
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
              بنحلل الفيديو بالذكاء الاصطناعي...
            </h3>
            <p className="text-sm text-gray-text mt-1">
              بنحلل الصور والكلام عشان نعمل إعلان كامل
            </p>
          </div>

          {/* Show extracted frames preview */}
          {frames.length > 0 && (
            <div className="flex justify-center gap-2">
              {frames.map((frame, i) => (
                <img
                  key={i}
                  src={frame}
                  alt={`إطار ${i + 1}`}
                  className="w-16 h-16 rounded-lg object-cover border-2 border-brand-green/30"
                />
              ))}
            </div>
          )}

          {/* Show transcript if captured */}
          {transcript && (
            <div className="bg-gray-light rounded-xl p-3 text-right mx-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Mic size={12} className="text-brand-green" />
                <span className="text-[11px] text-brand-green font-bold">تم التقاط الكلام</span>
              </div>
              <p className="text-xs text-gray-text leading-relaxed">{transcript}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Done state ── */}
      {state === "done" && analysis && (
        <div className="space-y-4">
          {/* Extracted frames */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {frames.map((frame, i) => (
              <img
                key={i}
                src={frame}
                alt={`إطار ${i + 1}`}
                className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
              />
            ))}
          </div>

          {/* Analysis results card */}
          <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-brand-green" />
              <span className="text-xs font-bold text-brand-green">
                تم التحليل — ثقة {Math.round(analysis.confidence * 100)}%
              </span>
            </div>

            <h3 className="text-base font-bold text-dark">
              {analysis.suggested_title}
            </h3>
            <p className="text-sm text-gray-text leading-relaxed">
              {analysis.suggested_description}
            </p>

            {/* Detected items tags */}
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

            {/* Condition assessment */}
            {analysis.condition_assessment && (
              <div className="bg-white rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-gray-text">تقييم الحالة:</span>
                <span className="text-sm font-bold text-dark">
                  {analysis.condition_assessment}
                </span>
              </div>
            )}

            {/* Suggested price */}
            {analysis.suggested_price && (
              <div className="bg-white rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-gray-text">السعر المقترح:</span>
                <span className="text-sm font-bold text-brand-green">
                  {analysis.suggested_price.toLocaleString("en-US")} جنيه
                </span>
              </div>
            )}

            {/* Transcript used */}
            {transcript && (
              <div className="bg-white/60 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Mic size={12} className="text-gray-text" />
                  <span className="text-[11px] text-gray-text">كلامك:</span>
                </div>
                <p className="text-xs text-gray-text leading-relaxed">
                  {transcript}
                </p>
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
              aria-label="سجّل تاني"
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

      {/* ── Error state ── */}
      {state === "error" && (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <X size={28} className="text-error" />
          </div>
          <div>
            <h3 className="text-base font-bold text-dark">حصل مشكلة</h3>
            <p className="text-sm text-gray-text mt-1">{error}</p>
          </div>

          {/* Show frames if we got any */}
          {frames.length > 0 && (
            <div className="flex justify-center gap-2">
              {frames.map((frame, i) => (
                <img
                  key={i}
                  src={frame}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover opacity-50"
                />
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
