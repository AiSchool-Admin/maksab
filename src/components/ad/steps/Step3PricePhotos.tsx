"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  ImagePlus,
  X,
  Star,
  Sparkles,
  Video,
  Mic,
  StopCircle,
  Play,
  Pause,
  Trash2,
  Upload,
  Loader2,
} from "lucide-react";
import Input from "@/components/ui/Input";
import ExchangeWantedForm from "./ExchangeWantedForm";
import type { CompressedImage } from "@/lib/utils/image-compress";
import { compressImage } from "@/lib/utils/image-compress";
import type { VideoFile } from "@/lib/utils/video-compress";
import { processVideo, MAX_VIDEO_DURATION } from "@/lib/utils/video-compress";
import type { AudioRecording } from "@/lib/utils/audio-recorder";
import { VoiceRecorder, MAX_AUDIO_DURATION } from "@/lib/utils/audio-recorder";
import PriceSuggestionCard from "@/components/price/PriceSuggestionCard";
import PhotoEnhancer from "@/components/ai/PhotoEnhancer";

const MAX_IMAGES = 5;

export interface PriceData {
  // Cash
  price: string;
  isNegotiable: boolean;
  useDayPrice: boolean;
  // Auction
  auctionStartPrice: string;
  auctionBuyNowPrice: string;
  auctionDuration: number;
  auctionMinIncrement: string;
  // Live Auction
  liveAuctionScheduledAt: string;
  // Exchange — Structured
  exchangeWantedCategoryId: string;
  exchangeWantedSubcategoryId: string;
  exchangeWantedFields: Record<string, unknown>;
  exchangeWantedTitle: string;
  exchangeNotes: string;
  exchangeAcceptsPriceDiff: boolean;
  exchangePriceDiff: string;
  // Backward compat: auto-generated from structured data
  exchangeDescription: string;
}

interface Step3Props {
  saleType: string;
  priceData: PriceData;
  images: CompressedImage[];
  videoFile: VideoFile | null;
  voiceNote: AudioRecording | null;
  onPriceChange: <K extends keyof PriceData>(key: K, value: PriceData[K]) => void;
  onImagesChange: (images: CompressedImage[]) => void;
  onVideoChange: (video: VideoFile | null) => void;
  onVoiceNoteChange: (audio: AudioRecording | null) => void;
  errors: Record<string, string>;
  categoryId?: string;
  subcategoryId?: string;
  categoryFields?: Record<string, unknown>;
}

export default function Step3PricePhotos({
  saleType,
  priceData,
  images,
  videoFile,
  voiceNote,
  onPriceChange,
  onImagesChange,
  onVideoChange,
  onVoiceNoteChange,
  errors,
  categoryId,
  subcategoryId,
  categoryFields,
}: Step3Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [enhancingIndex, setEnhancingIndex] = useState<number | null>(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const handleEnhancedImage = (enhancedDataUrl: string) => {
    if (enhancingIndex === null) return;
    const byteString = atob(enhancedDataUrl.split(",")[1] || "");
    const mimeString = enhancedDataUrl.split(",")[0]?.split(":")[1]?.split(";")[0] || "image/jpeg";
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let j = 0; j < byteString.length; j++) {
      ia[j] = byteString.charCodeAt(j);
    }
    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], `enhanced-${enhancingIndex}.jpg`, { type: mimeString });
    const updated = [...images];
    if (images[enhancingIndex].preview.startsWith("blob:")) {
      URL.revokeObjectURL(images[enhancingIndex].preview);
    }
    updated[enhancingIndex] = { file, preview: enhancedDataUrl };
    onImagesChange(updated);
    setEnhancingIndex(null);
  };

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = MAX_IMAGES - images.length;
    const toAdd = Array.from(files).slice(0, remaining);
    const compressed: CompressedImage[] = [];
    for (const file of toAdd) {
      try {
        const result = await compressImage(file);
        compressed.push(result);
      } catch {
        // Skip failed images
      }
    }
    onImagesChange([...images, ...compressed]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = (index: number) => {
    if (images[index].preview.startsWith("blob:")) {
      URL.revokeObjectURL(images[index].preview);
    }
    onImagesChange(images.filter((_, i) => i !== index));
  };

  // ── Video handling ──────────────────────────────────────

  const handleAddVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingVideo(true);
    setVideoError(null);
    try {
      const processed = await processVideo(file);
      onVideoChange(processed);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "فشل تجهيز الفيديو");
    } finally {
      setIsProcessingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleRemoveVideo = () => {
    if (videoFile?.preview.startsWith("blob:")) {
      URL.revokeObjectURL(videoFile.preview);
    }
    onVideoChange(null);
    setVideoError(null);
  };

  return (
    <div className="space-y-6">
      {/* Price section */}
      <div>
        <h3 className="text-sm font-bold text-dark mb-4">السعر</h3>

        {saleType === "cash" && (
          <div className="space-y-3">
            {/* Day price option for gold/silver category */}
            {categoryId === "gold" && (
              <button
                type="button"
                onClick={() => {
                  const newVal = !priceData.useDayPrice;
                  onPriceChange("useDayPrice", newVal);
                  if (newVal) {
                    onPriceChange("price", "");
                  }
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  priceData.useDayPrice
                    ? "border-brand-gold bg-brand-gold-light"
                    : "border-gray-200 bg-gray-light hover:border-gray-300"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    priceData.useDayPrice ? "border-brand-gold bg-brand-gold" : "border-gray-300"
                  }`}
                >
                  {priceData.useDayPrice && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </span>
                <div className="text-start">
                  <span className={`text-sm font-bold ${priceData.useDayPrice ? "text-brand-gold" : "text-dark"}`}>
                    💰 سعر يوم البيع
                  </span>
                  <p className="text-[11px] text-gray-text mt-0.5">
                    السعر هيتحدد حسب سعر الذهب/الفضة يوم ما يتم البيع
                  </p>
                </div>
              </button>
            )}

            {!priceData.useDayPrice && (
              <>
                <Input
                  label="السعر"
                  name="price"
                  type="number"
                  inputMode="numeric"
                  value={priceData.price}
                  onChange={(e) => onPriceChange("price", e.target.value)}
                  unit="جنيه"
                  placeholder="0"
                  error={errors.price}
                  required={categoryId !== "gold"}
                />
                <button
                  type="button"
                  onClick={() => onPriceChange("isNegotiable", !priceData.isNegotiable)}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      priceData.isNegotiable ? "bg-brand-green border-brand-green" : "border-gray-300"
                    }`}
                  >
                    {priceData.isNegotiable && (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="text-dark font-medium">السعر فيه كلام</span>
                </button>

                {categoryId && (
                  <PriceSuggestionCard
                    categoryId={categoryId}
                    subcategoryId={subcategoryId}
                    brand={(categoryFields?.brand as string) || undefined}
                    model={(categoryFields?.model as string) || undefined}
                    condition={(categoryFields?.condition as string) || undefined}
                    onPriceSelect={(price) => onPriceChange("price", String(price))}
                  />
                )}
              </>
            )}

            {priceData.useDayPrice && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700 leading-relaxed">
                  💡 الإعلان هيظهر بـ &quot;سعر يوم البيع&quot; بدل سعر محدد. المشتري هيتواصل معاك لمعرفة السعر.
                </p>
              </div>
            )}
          </div>
        )}

        {saleType === "auction" && (
          <div className="space-y-4">
            <Input
              label="سعر الافتتاح"
              name="auctionStartPrice"
              type="number"
              inputMode="numeric"
              value={priceData.auctionStartPrice}
              onChange={(e) => onPriceChange("auctionStartPrice", e.target.value)}
              unit="جنيه"
              placeholder="0"
              error={errors.auctionStartPrice}
              required
            />
            <Input
              label="سعر &quot;اشتري الآن&quot; (اختياري)"
              name="auctionBuyNowPrice"
              type="number"
              inputMode="numeric"
              value={priceData.auctionBuyNowPrice}
              onChange={(e) => onPriceChange("auctionBuyNowPrice", e.target.value)}
              unit="جنيه"
              placeholder="0"
              hint="لو حد دفع المبلغ ده المزاد بينتهي فوراً"
            />
            <div>
              <label className="block text-sm font-medium text-dark mb-2">
                مدة المزاد <span className="text-error">*</span>
              </label>
              <div className="flex gap-2">
                {[24, 48, 72].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => onPriceChange("auctionDuration", hours)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                      priceData.auctionDuration === hours
                        ? "bg-brand-green text-white"
                        : "bg-gray-light text-dark hover:bg-gray-200"
                    }`}
                  >
                    {hours} ساعة
                  </button>
                ))}
              </div>
              {errors.auctionDuration && <p className="mt-1 text-xs text-error">{errors.auctionDuration}</p>}
            </div>
            <Input
              label="الحد الأدنى للمزايدة"
              name="auctionMinIncrement"
              type="number"
              inputMode="numeric"
              value={priceData.auctionMinIncrement}
              onChange={(e) => onPriceChange("auctionMinIncrement", e.target.value)}
              unit="جنيه"
              placeholder="50"
              hint="أقل مبلغ يزود بيه المزايد"
            />
          </div>
        )}

        {saleType === "live_auction" && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📡</span>
                <span className="text-sm font-bold text-orange-700">مزاد لايف — على الهوا 📡</span>
              </div>
              <p className="text-xs text-orange-600 leading-relaxed">
                المزاد اللايف بيتبث على الهوا والناس بتتفرج وتزايد. فيه رسوم إضافية على الخدمة دي:
              </p>
              <div className="bg-white rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-text">رسوم البث المباشر</span>
                  <span className="font-bold text-dark">50 جنيه</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-text">عمولة على البيع (2%)</span>
                  <span className="font-bold text-dark">بعد إتمام البيع</span>
                </div>
                <div className="border-t border-gray-100 pt-1.5 mt-1.5">
                  <p className="text-[10px] text-gray-text">
                    * رسوم البث مش بترجع. العمولة بتتخصم من سعر البيع النهائي.
                  </p>
                </div>
              </div>
            </div>
            <Input
              label="سعر الافتتاح"
              name="auctionStartPrice"
              type="number"
              inputMode="numeric"
              value={priceData.auctionStartPrice}
              onChange={(e) => onPriceChange("auctionStartPrice", e.target.value)}
              unit="جنيه"
              placeholder="0"
              error={errors.auctionStartPrice}
              required
            />
            <Input
              label={'سعر "اشتري الآن" (اختياري)'}
              name="auctionBuyNowPrice"
              type="number"
              inputMode="numeric"
              value={priceData.auctionBuyNowPrice}
              onChange={(e) => onPriceChange("auctionBuyNowPrice", e.target.value)}
              unit="جنيه"
              placeholder="0"
              hint="لو حد دفع المبلغ ده المزاد بينتهي فوراً"
            />
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">
                موعد البث المباشر <span className="text-error">*</span>
              </label>
              <input
                type="datetime-local"
                value={priceData.liveAuctionScheduledAt}
                onChange={(e) => onPriceChange("liveAuctionScheduledAt", e.target.value)}
                min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                className={`w-full px-4 py-3 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark ${
                  errors.liveAuctionScheduledAt ? "border-error bg-error/5" : ""
                }`}
                dir="ltr"
              />
              {errors.liveAuctionScheduledAt && <p className="mt-1 text-xs text-error">{errors.liveAuctionScheduledAt}</p>}
              <p className="mt-1 text-[11px] text-gray-text">حدد موعد البث بعد ساعة على الأقل من الآن</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-2">
                مدة المزاد <span className="text-error">*</span>
              </label>
              <div className="flex gap-2">
                {[24, 48, 72].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => onPriceChange("auctionDuration", hours)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                      priceData.auctionDuration === hours
                        ? "bg-brand-green text-white"
                        : "bg-gray-light text-dark hover:bg-gray-200"
                    }`}
                  >
                    {hours} ساعة
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="الحد الأدنى للمزايدة"
              name="auctionMinIncrement"
              type="number"
              inputMode="numeric"
              value={priceData.auctionMinIncrement}
              onChange={(e) => onPriceChange("auctionMinIncrement", e.target.value)}
              unit="جنيه"
              placeholder="50"
              hint="أقل مبلغ يزود بيه المزايد"
            />
            <div className="bg-gray-light rounded-xl p-3 flex items-start gap-2">
              <span className="text-sm mt-0.5">💡</span>
              <p className="text-[11px] text-gray-text leading-relaxed">
                لما تنشر المزاد اللايف أنت موافق على رسوم البث (50 جنيه) وعمولة 2% على سعر البيع النهائي.
                هنبعتلك رابط البث قبل الموعد بـ 15 دقيقة.
              </p>
            </div>
          </div>
        )}

        {saleType === "exchange" && (
          <ExchangeWantedForm
            wantedCategoryId={priceData.exchangeWantedCategoryId}
            wantedSubcategoryId={priceData.exchangeWantedSubcategoryId}
            wantedFields={priceData.exchangeWantedFields}
            wantedTitle={priceData.exchangeWantedTitle}
            notes={priceData.exchangeNotes}
            acceptsPriceDiff={priceData.exchangeAcceptsPriceDiff}
            priceDiff={priceData.exchangePriceDiff}
            errors={errors}
            onCategoryChange={(id) => {
              onPriceChange("exchangeWantedCategoryId", id);
              onPriceChange("exchangeWantedSubcategoryId", "");
              onPriceChange("exchangeWantedFields", {});
              onPriceChange("exchangeWantedTitle", "");
            }}
            onSubcategoryChange={(id) => onPriceChange("exchangeWantedSubcategoryId", id)}
            onFieldChange={(fieldId, value) =>
              onPriceChange("exchangeWantedFields", { ...priceData.exchangeWantedFields, [fieldId]: value })
            }
            onTitleChange={(title) => {
              onPriceChange("exchangeWantedTitle", title);
              onPriceChange("exchangeDescription", title);
            }}
            onNotesChange={(n) => onPriceChange("exchangeNotes", n)}
            onAcceptsPriceDiffChange={(v) => onPriceChange("exchangeAcceptsPriceDiff", v)}
            onPriceDiffChange={(v) => onPriceChange("exchangePriceDiff", v)}
          />
        )}
      </div>

      {/* ── Images section ───────────────────────────────── */}
      <div>
        <h3 className="text-sm font-bold text-dark mb-2">الصور (حتى {MAX_IMAGES})</h3>
        <p className="text-xs text-gray-text mb-3">أول صورة هي الصورة الرئيسية للإعلان</p>

        {errors.images && <p className="mb-2 text-xs text-error">{errors.images}</p>}

        <div className="grid grid-cols-4 gap-3">
          {images.map((img, index) => (
            <div key={index} className="relative aspect-square">
              <img src={img.preview} alt={`صورة ${index + 1}`} className="w-full h-full object-cover rounded-xl" />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute -top-1.5 -start-1.5 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center shadow"
              >
                <X size={14} />
              </button>
              <button
                type="button"
                onClick={() => setEnhancingIndex(index)}
                className="absolute -top-1.5 -end-1.5 w-6 h-6 bg-brand-green text-white rounded-full flex items-center justify-center shadow"
                aria-label="تحسين الصورة"
              >
                <Sparkles size={11} />
              </button>
              {index === 0 && (
                <span className="absolute bottom-1 start-1 bg-brand-gold text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                  <Star size={8} fill="white" />
                  رئيسية
                </span>
              )}
            </div>
          ))}

          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-brand-green flex flex-col items-center justify-center gap-1 text-gray-text hover:text-brand-green transition-colors"
            >
              <ImagePlus size={24} />
              <span className="text-[10px] font-medium">أضف صورة</span>
            </button>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleAddImages} className="sr-only" />
      </div>

      {/* ── Video section ────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-bold text-dark mb-2">فيديو المنتج (اختياري)</h3>
        <p className="text-xs text-gray-text mb-3">
          أضف فيديو قصير (حتى {MAX_VIDEO_DURATION} ثانية) يوضح المنتج للمشتري
        </p>

        {videoFile ? (
          <div className="space-y-2">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video
                src={videoFile.preview}
                controls
                playsInline
                className="w-full h-full object-contain"
                poster={videoFile.thumbnail || undefined}
              />
              <button
                type="button"
                onClick={handleRemoveVideo}
                className="absolute top-2 end-2 w-8 h-8 bg-error/90 text-white rounded-full flex items-center justify-center shadow-lg"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <p className="text-[11px] text-gray-text text-center">
              {Math.round(videoFile.duration)} ثانية — {(videoFile.file.size / (1024 * 1024)).toFixed(1)}MB
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (videoInputRef.current) {
                    videoInputRef.current.setAttribute("capture", "environment");
                    videoInputRef.current.click();
                  }
                }}
                disabled={isProcessingVideo}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-50 border-2 border-purple-200/60 rounded-xl text-purple-700 font-medium text-sm hover:border-purple-300 transition-colors disabled:opacity-50"
              >
                {isProcessingVideo ? <Loader2 size={18} className="animate-spin" /> : <Video size={18} />}
                <span>صوّر فيديو</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (videoInputRef.current) {
                    videoInputRef.current.removeAttribute("capture");
                    videoInputRef.current.click();
                  }
                }}
                disabled={isProcessingVideo}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-light border-2 border-transparent rounded-xl text-dark font-medium text-sm hover:border-gray-200 transition-colors disabled:opacity-50"
              >
                <Upload size={18} />
                <span>اختار فيديو</span>
              </button>
            </div>

            {videoError && <p className="text-xs text-error text-center">{videoError}</p>}
          </div>
        )}

        <input ref={videoInputRef} type="file" accept="video/*" onChange={handleAddVideo} className="sr-only" />
      </div>

      {/* ── Voice note section ───────────────────────────── */}
      <div>
        <h3 className="text-sm font-bold text-dark mb-2">تسجيل صوتي (اختياري)</h3>
        <p className="text-xs text-gray-text mb-3">
          سجّل وصف صوتي للمنتج (حتى {MAX_AUDIO_DURATION} ثانية) — المشتري يسمعك وأنت بتوصف
        </p>
        <VoiceNoteRecorder voiceNote={voiceNote} onVoiceNoteChange={onVoiceNoteChange} />
      </div>

      {/* Photo Enhancer Modal */}
      {enhancingIndex !== null && images[enhancingIndex] && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-auto">
            <PhotoEnhancer
              imageDataUrl={images[enhancingIndex].preview}
              onEnhanced={handleEnhancedImage}
              onCancel={() => setEnhancingIndex(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Voice Note Recorder sub-component ──────────────────────

function VoiceNoteRecorder({
  voiceNote,
  onVoiceNoteChange,
}: {
  voiceNote: AudioRecording | null;
  onVoiceNoteChange: (audio: AudioRecording | null) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    setError(null);

    // Check if MediaRecorder API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("المتصفح مش بيدعم التسجيل الصوتي. جرب متصفح تاني (Chrome أو Safari)");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("المتصفح مش بيدعم التسجيل الصوتي. جرب متصفح تاني (Chrome أو Safari)");
      return;
    }

    try {
      const recorder = new VoiceRecorder();
      recorderRef.current = recorder;
      await recorder.start();
      setIsRecording(true);
      setElapsed(0);

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const sec = Math.round((Date.now() - startTime) / 1000);
        setElapsed(sec);
        if (sec >= MAX_AUDIO_DURATION) {
          stopRecording();
        }
      }, 250);
    } catch (err) {
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "محتاجين إذن الميكروفون. اسمح بالوصول من إعدادات المتصفح وجرب تاني"
          : err instanceof Error && err.name === "NotFoundError"
            ? "مفيش ميكروفون متوصل. تأكد إن الجهاز فيه ميكروفون"
            : "مش قادرين نفتح الميكروفون. تأكد من الإذن وجرب تاني",
      );
    }
  };

  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);

    try {
      const recorder = recorderRef.current;
      if (!recorder) return;
      const recording = await recorder.stop();
      onVoiceNoteChange(recording);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل في حفظ التسجيل");
    }
    recorderRef.current = null;
  }, [onVoiceNoteChange]);

  const handleRemove = () => {
    if (voiceNote?.preview.startsWith("blob:")) {
      URL.revokeObjectURL(voiceNote.preview);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    onVoiceNoteChange(null);
  };

  const togglePlay = () => {
    if (!voiceNote) return;
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    const audio = new Audio(voiceNote.preview);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (voiceNote) {
    return (
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200/60 rounded-xl px-4 py-3">
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm active:scale-95 transition-transform"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ms-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Mic size={14} className="text-blue-500 flex-shrink-0" />
            <span className="text-sm font-bold text-dark">تسجيل صوتي</span>
          </div>
          <span className="text-[11px] text-gray-text">
            {formatTime(voiceNote.duration)} — {(voiceNote.file.size / 1024).toFixed(0)}KB
          </span>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center flex-shrink-0 hover:bg-error/20 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="space-y-3">
        <div className="bg-blue-50 border border-blue-200/60 rounded-xl p-4 text-center space-y-3">
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" />
            <div className="absolute inset-1 rounded-full bg-blue-500/20 animate-pulse" />
            <div className="relative w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <Mic size={22} className="text-white" />
            </div>
          </div>
          <div>
            <span className="text-lg font-bold text-dark font-mono">{formatTime(elapsed)}</span>
            <span className="text-xs text-gray-text mx-2">/ {formatTime(MAX_AUDIO_DURATION)}</span>
          </div>
          <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(elapsed / MAX_AUDIO_DURATION) * 100}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={stopRecording}
          className="w-full py-3 bg-error/10 text-error font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <StopCircle size={18} />
          وقّف التسجيل
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={startRecording}
        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 border-2 border-blue-200/60 rounded-xl text-blue-600 font-medium text-sm hover:border-blue-300 transition-colors active:scale-[0.98]"
      >
        <Mic size={18} />
        <span>ابدأ التسجيل الصوتي</span>
      </button>
      {error && <p className="text-xs text-error text-center">{error}</p>}
    </div>
  );
}
