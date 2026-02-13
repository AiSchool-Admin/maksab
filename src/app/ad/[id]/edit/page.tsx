"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Edit3, Loader2, Home } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { getCategoryById } from "@/lib/categories/categories-config";
import {
  generateAutoTitle,
  generateAutoDescription,
} from "@/lib/categories/generate";
import { supabase } from "@/lib/supabase/client";
import Step2CategoryDetails from "@/components/ad/steps/Step2CategoryDetails";
import Step3PricePhotos from "@/components/ad/steps/Step3PricePhotos";
import Step4LocationReview from "@/components/ad/steps/Step4LocationReview";
import type { PriceData } from "@/components/ad/steps/Step3PricePhotos";
import type { CompressedImage } from "@/lib/utils/image-compress";
import type { VideoFile } from "@/lib/utils/video-compress";
import type { AudioRecording } from "@/lib/utils/audio-recorder";

const TOTAL_STEPS = 3;
const stepTitles = ["تعديل التفاصيل", "السعر والصور", "الموقع والمراجعة"];

interface EditDraft {
  categoryId: string;
  subcategoryId: string;
  saleType: string;
  categoryFields: Record<string, unknown>;
  priceData: PriceData;
  governorate: string;
  city: string;
  title: string;
  description: string;
  isTitleDescEdited: boolean;
  existingImages: string[];
}

function getInitialPriceData(): PriceData {
  return {
    price: "",
    isNegotiable: false,
    auctionStartPrice: "",
    auctionBuyNowPrice: "",
    auctionDuration: 24,
    auctionMinIncrement: "",
    liveAuctionScheduledAt: "",
    exchangeWantedCategoryId: "",
    exchangeWantedSubcategoryId: "",
    exchangeWantedFields: {},
    exchangeWantedTitle: "",
    exchangeNotes: "",
    exchangeAcceptsPriceDiff: false,
    exchangePriceDiff: "",
    exchangeDescription: "",
  };
}

export default function EditAdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, requireAuth } = useAuth();

  const [isLoadingAd, setIsLoadingAd] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [images, setImages] = useState<CompressedImage[]>([]);
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [voiceNote, setVoiceNote] = useState<AudioRecording | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load ad data
  useEffect(() => {
    async function loadAd() {
      setIsLoadingAd(true);
      try {
        const { data, error } = await supabase
          .from("ads" as never)
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error || !data) {
          setNotFound(true);
          setIsLoadingAd(false);
          return;
        }

        const row = data as Record<string, unknown>;
        const categoryFields = (row.category_fields as Record<string, unknown>) ?? {};
        const saleType = categoryFields.is_live_auction ? "live_auction" : (row.sale_type as string);

        const priceData: PriceData = {
          ...getInitialPriceData(),
          price: row.price ? String(row.price) : "",
          isNegotiable: (row.is_negotiable as boolean) ?? false,
          auctionStartPrice: row.auction_start_price ? String(row.auction_start_price) : "",
          auctionBuyNowPrice: row.auction_buy_now_price ? String(row.auction_buy_now_price) : "",
          auctionDuration: (row.auction_duration_hours as number) ?? 24,
          auctionMinIncrement: row.auction_min_increment ? String(row.auction_min_increment) : "",
          exchangeDescription: (row.exchange_description as string) ?? "",
          exchangeAcceptsPriceDiff: (row.exchange_accepts_price_diff as boolean) ?? false,
          exchangePriceDiff: row.exchange_price_diff ? String(row.exchange_price_diff) : "",
        };

        // Restore structured exchange data from category_fields
        if (categoryFields.exchange_wanted) {
          const ew = categoryFields.exchange_wanted as Record<string, unknown>;
          priceData.exchangeWantedCategoryId = (ew.category_id as string) ?? "";
          priceData.exchangeWantedSubcategoryId = (ew.subcategory_id as string) ?? "";
          priceData.exchangeWantedFields = (ew.fields as Record<string, unknown>) ?? {};
          priceData.exchangeWantedTitle = (ew.title as string) ?? "";
        }

        setDraft({
          categoryId: (row.category_id as string) ?? "",
          subcategoryId: (row.subcategory_id as string) ?? "",
          saleType,
          categoryFields,
          priceData,
          governorate: (row.governorate as string) ?? "",
          city: (row.city as string) ?? "",
          title: (row.title as string) ?? "",
          description: (row.description as string) ?? "",
          isTitleDescEdited: true, // Don't auto-generate for edits
          existingImages: (row.images as string[]) ?? [],
        });
      } catch {
        setNotFound(true);
      } finally {
        setIsLoadingAd(false);
      }
    }

    loadAd();
  }, [id]);

  const updateDraft = useCallback(
    (updates: Partial<EditDraft>) => {
      setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
      setErrors({});
    },
    [],
  );

  // Validation
  const validateStep = useCallback(
    (step: number): boolean => {
      if (!draft) return false;
      const errs: Record<string, string> = {};

      if (step === 1) {
        const config = getCategoryById(draft.categoryId);
        if (config) {
          const override = draft.subcategoryId ? config.subcategoryOverrides?.[draft.subcategoryId] : undefined;
          const reqFields = override?.requiredFields ?? config.requiredFields;
          for (const reqId of reqFields) {
            const field = config.fields.find((f) => f.id === reqId);
            if (draft.subcategoryId && field?.hiddenForSubcategories?.includes(draft.subcategoryId)) continue;
            const val = draft.categoryFields[reqId];
            if (val === undefined || val === null || val === "") {
              errs[reqId] = `${field?.label || reqId} مطلوب`;
            }
          }
        }
      }

      if (step === 2) {
        if (draft.saleType === "cash" && !draft.priceData.price) {
          errs.price = "السعر مطلوب";
        }
        if ((draft.saleType === "auction" || draft.saleType === "live_auction") && !draft.priceData.auctionStartPrice) {
          errs.auctionStartPrice = "سعر الافتتاح مطلوب";
        }
        if (draft.saleType === "exchange" && !draft.priceData.exchangeWantedCategoryId) {
          errs.exchangeWantedCategory = "اختار قسم البديل المطلوب";
        }
        if (images.length === 0 && draft.existingImages.length === 0) {
          errs.images = "أضف صورة واحدة على الأقل";
        }
      }

      if (step === 3) {
        if (!draft.governorate) errs.governorate = "اختار المحافظة";
        if (!draft.title.trim()) errs.title = "العنوان مطلوب";
      }

      setErrors(errs);
      return Object.keys(errs).length === 0;
    },
    [draft, images],
  );

  const goNext = useCallback(() => {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, validateStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }, [currentStep]);

  // Save changes
  const handleSave = useCallback(async () => {
    if (!draft || !validateStep(3)) return;

    const authedUser = user || (await requireAuth());
    if (!authedUser) return;

    setIsSaving(true);
    try {
      // Upload new images
      const uploadedUrls: string[] = [...draft.existingImages];
      for (let i = 0; i < images.length; i++) {
        try {
          const img = images[i];
          const path = `ads/${authedUser.id}/${Date.now()}_${i}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from("ad-images")
            .upload(path, img.file);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from("ad-images").getPublicUrl(path);
            uploadedUrls.push(publicUrl);
          }
        } catch {
          // Skip failed uploads
        }
      }

      // Upload video if new
      let videoUrl: string | null = (draft.categoryFields._video_url as string) || null;
      if (videoFile) {
        try {
          const vf = new FormData();
          vf.append("file", videoFile.file);
          vf.append("bucket", "ad-videos");
          vf.append("path", `ads/${authedUser.id}/${Date.now()}_video.${videoFile.file.name.split(".").pop() || "mp4"}`);
          const vRes = await fetch("/api/upload", { method: "POST", body: vf });
          if (vRes.ok) {
            const vData = await vRes.json();
            if (vData.url) videoUrl = vData.url;
          }
        } catch { /* skip */ }
      }

      // Upload voice note if new
      let voiceNoteUrl: string | null = (draft.categoryFields._voice_note_url as string) || null;
      if (voiceNote) {
        try {
          const af = new FormData();
          af.append("file", voiceNote.file);
          af.append("bucket", "ad-audio");
          af.append("path", `ads/${authedUser.id}/${Date.now()}_voice.${voiceNote.file.name.split(".").pop() || "webm"}`);
          const aRes = await fetch("/api/upload", { method: "POST", body: af });
          if (aRes.ok) {
            const aData = await aRes.json();
            if (aData.url) voiceNoteUrl = aData.url;
          }
        } catch { /* skip */ }
      }

      const updatedCategoryFields = {
        ...draft.categoryFields,
        ...(videoUrl ? { _video_url: videoUrl } : {}),
        ...(voiceNoteUrl ? { _voice_note_url: voiceNoteUrl } : {}),
      };

      const updateData: Record<string, unknown> = {
        title: draft.title,
        description: draft.description,
        category_fields: updatedCategoryFields,
        governorate: draft.governorate,
        city: draft.city || null,
        images: uploadedUrls,
        updated_at: new Date().toISOString(),
      };

      // Update price fields based on sale type
      if (draft.saleType === "cash") {
        updateData.price = Number(draft.priceData.price);
        updateData.is_negotiable = draft.priceData.isNegotiable;
      }
      if (draft.saleType === "auction" || draft.saleType === "live_auction") {
        updateData.auction_start_price = Number(draft.priceData.auctionStartPrice);
        if (draft.priceData.auctionBuyNowPrice) {
          updateData.auction_buy_now_price = Number(draft.priceData.auctionBuyNowPrice);
        }
        if (draft.priceData.auctionMinIncrement) {
          updateData.auction_min_increment = Number(draft.priceData.auctionMinIncrement);
        }
      }
      if (draft.saleType === "exchange") {
        updateData.exchange_description = draft.priceData.exchangeWantedTitle || draft.priceData.exchangeNotes || draft.priceData.exchangeDescription || null;
        updateData.exchange_accepts_price_diff = draft.priceData.exchangeAcceptsPriceDiff;
        if (draft.priceData.exchangePriceDiff) {
          updateData.exchange_price_diff = Number(draft.priceData.exchangePriceDiff);
        }
      }

      const { error: updateError } = await supabase
        .from("ads" as never)
        .update(updateData as never)
        .eq("id", id);

      if (updateError) {
        setErrors({ save: "حصلت مشكلة في حفظ التعديلات. جرب تاني" });
        setIsSaving(false);
        return;
      }

      setSaved(true);
    } catch {
      setErrors({ save: "حصلت مشكلة. جرب تاني" });
    } finally {
      setIsSaving(false);
    }
  }, [draft, images, id, user, requireAuth, validateStep]);

  // Price label for preview
  const getPriceLabel = () => {
    if (!draft) return "";
    if (draft.saleType === "cash" && draft.priceData.price) {
      return `${Number(draft.priceData.price).toLocaleString("en-US")} جنيه${draft.priceData.isNegotiable ? " (قابل للتفاوض)" : ""}`;
    }
    if ((draft.saleType === "auction" || draft.saleType === "live_auction") && draft.priceData.auctionStartPrice) {
      return `يبدأ من ${Number(draft.priceData.auctionStartPrice).toLocaleString("en-US")} جنيه`;
    }
    if (draft.saleType === "exchange") {
      return draft.priceData.exchangeWantedTitle ? `🔄 للتبديل بـ ${draft.priceData.exchangeWantedTitle}` : "للتبديل";
    }
    return "";
  };

  // Loading state
  if (isLoadingAd) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="animate-spin text-brand-green mx-auto" />
          <p className="text-sm text-gray-text">جاري تحميل الإعلان...</p>
        </div>
      </main>
    );
  }

  // Not found
  if (notFound || !draft) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-6xl">🔍</p>
          <h2 className="text-lg font-bold text-dark">الإعلان مش موجود</h2>
          <p className="text-sm text-gray-text">
            ممكن يكون اتحذف أو الرابط غلط
          </p>
          <Button onClick={() => router.push("/my-ads")}>
            إعلاناتي
          </Button>
        </div>
      </main>
    );
  }

  // Success
  if (saved) {
    return (
      <main className="min-h-screen bg-white px-4 py-8">
        <div className="max-w-md mx-auto text-center space-y-5">
          <div className="text-6xl">✅</div>
          <h2 className="text-xl font-bold text-dark">تم تحديث إعلانك!</h2>
          <p className="text-sm text-gray-text">
            التعديلات اتحفظت بنجاح
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button fullWidth onClick={() => router.push(`/ad/${id}`)}>
              عرض الإعلان
            </Button>
            <Button
              fullWidth
              variant="outline"
              onClick={() => router.push("/my-ads")}
            >
              إعلاناتي
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-light">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <button
              onClick={() => (currentStep > 1 ? goPrev() : router.back())}
              className="p-1 -me-1 text-gray-text hover:text-dark transition-colors"
              aria-label="رجوع"
            >
              <ChevronRight size={24} />
            </button>
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
              <Edit3 size={18} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-dark">
              {stepTitles[currentStep - 1]}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-1.5 text-brand-green hover:text-brand-green-dark hover:bg-green-50 rounded-full transition-colors"
              aria-label="الرئيسية"
            >
              <Home size={18} />
            </Link>
            <span className="text-sm text-gray-text font-medium">
              {currentStep} / {TOTAL_STEPS}
            </span>
          </div>
        </div>
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </header>

      {/* Step content */}
      <div className="px-4 py-5">
        {currentStep === 1 && (
          <Step2CategoryDetails
            categoryId={draft.categoryId}
            subcategoryId={draft.subcategoryId || undefined}
            values={draft.categoryFields}
            errors={errors}
            onChange={(fieldId, value) => {
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      categoryFields: { ...prev.categoryFields, [fieldId]: value },
                    }
                  : prev,
              );
              setErrors({});
            }}
          />
        )}

        {currentStep === 2 && (
          <Step3PricePhotos
            saleType={draft.saleType}
            priceData={draft.priceData}
            images={images}
            videoFile={videoFile}
            voiceNote={voiceNote}
            onPriceChange={(key, value) =>
              updateDraft({
                priceData: { ...draft.priceData, [key]: value },
              })
            }
            onImagesChange={setImages}
            onVideoChange={setVideoFile}
            onVoiceNoteChange={setVoiceNote}
            errors={errors}
          />
        )}

        {currentStep === 3 && (
          <Step4LocationReview
            governorate={draft.governorate}
            city={draft.city}
            title={draft.title}
            description={draft.description}
            isTitleDescEdited={draft.isTitleDescEdited}
            images={images}
            saleType={draft.saleType}
            priceLabel={getPriceLabel()}
            onGovernorateChange={(v) => updateDraft({ governorate: v })}
            onCityChange={(v) => updateDraft({ city: v })}
            onTitleChange={(v) => updateDraft({ title: v })}
            onDescriptionChange={(v) => updateDraft({ description: v })}
            onTitleDescEditToggle={() => updateDraft({ isTitleDescEdited: true })}
            onDetectLocation={() => {}}
            isDetectingLocation={false}
            errors={errors}
          />
        )}

        {/* Existing images preview */}
        {currentStep === 2 && draft.existingImages.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-dark mb-2">
              الصور الحالية ({draft.existingImages.length})
            </p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {draft.existingImages.map((url, i) => (
                <div key={i} className="relative flex-shrink-0">
                  <img
                    src={url}
                    alt={`صورة ${i + 1}`}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <button
                    onClick={() => {
                      updateDraft({
                        existingImages: draft.existingImages.filter((_, idx) => idx !== i),
                      });
                    }}
                    className="absolute -top-1 -end-1 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Errors */}
        {errors.save && (
          <p className="mt-4 text-sm text-error text-center bg-error/5 rounded-xl p-3">
            {errors.save}
          </p>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-light p-4 flex gap-3 z-40">
        {currentStep > 1 && (
          <Button
            variant="outline"
            size="lg"
            onClick={goPrev}
            icon={<ChevronRight size={18} />}
            className="flex-shrink-0"
          >
            السابق
          </Button>
        )}

        {currentStep < TOTAL_STEPS ? (
          <Button
            fullWidth
            size="lg"
            onClick={goNext}
            icon={<ChevronLeft size={18} />}
          >
            التالي
          </Button>
        ) : (
          <Button
            fullWidth
            size="lg"
            onClick={handleSave}
            isLoading={isSaving}
          >
            حفظ التعديلات
          </Button>
        )}
      </div>
    </main>
  );
}
