"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, PlusCircle, Home } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSessionToken } from "@/lib/supabase/auth";
import { getCategoryById } from "@/lib/categories/categories-config";
import {
  generateAutoTitle,
  generateAutoDescription,
} from "@/lib/categories/generate";
import type { SaleType } from "@/types";
import type { CompressedImage } from "@/lib/utils/image-compress";
import type { VideoFile } from "@/lib/utils/video-compress";
import type { AudioRecording } from "@/lib/utils/audio-recorder";
import type { PriceData } from "@/components/ad/steps/Step3PricePhotos";
import { useTrackSignal } from "@/lib/hooks/useTrackSignal";
import SellerInsightsCard from "@/components/ad/SellerInsightsCard";
import ShareButtons from "@/components/ad/ShareButtons";
import Step1CategorySaleType from "@/components/ad/steps/Step1CategorySaleType";
import Step2CategoryDetails from "@/components/ad/steps/Step2CategoryDetails";
import Step3PricePhotos from "@/components/ad/steps/Step3PricePhotos";
import Step4LocationReview from "@/components/ad/steps/Step4LocationReview";

const STORAGE_KEY = "maksab_ad_draft";
const TOTAL_STEPS = 3;

const stepTitles = [
  "اختار القسم",
  "تفاصيل المنتج",
  "السعر والنشر",
];

/* ── Persistable data (no File/Blob) ─────────────────────── */
interface DraftData {
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
  currentStep: number;
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
    // Exchange — Structured
    exchangeWantedCategoryId: "",
    exchangeWantedSubcategoryId: "",
    exchangeWantedFields: {},
    exchangeWantedTitle: "",
    exchangeNotes: "",
    exchangeAcceptsPriceDiff: false,
    exchangePriceDiff: "",
    // Backward compat
    exchangeDescription: "",
  };
}

function getInitialDraft(): DraftData {
  return {
    categoryId: "",
    subcategoryId: "",
    saleType: "cash",
    categoryFields: {},
    priceData: getInitialPriceData(),
    governorate: "القاهرة",
    city: "",
    title: "",
    description: "",
    isTitleDescEdited: false,
    currentStep: 1,
  };
}

function loadDraft(): DraftData {
  if (typeof window === "undefined") return getInitialDraft();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...getInitialDraft(), ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return getInitialDraft();
}

function saveDraft(data: DraftData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default function CreateAdPage() {
  const router = useRouter();
  const { user, requireAuth } = useAuth();
  const { track } = useTrackSignal();

  /* ── State ─────────────────────────────────────────── */
  const [draft, setDraft] = useState<DraftData>(getInitialDraft);
  const [images, setImages] = useState<CompressedImage[]>([]);
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [voiceNote, setVoiceNote] = useState<AudioRecording | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishedAdId, setPublishedAdId] = useState<string | null>(null);
  const initialized = useRef(false);

  // Load draft from localStorage on mount (+ check for AI scanner prefill)
  useEffect(() => {
    if (!initialized.current) {
      // Check if coming from PriceScanner with prefill data
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("prefill") === "ai-scanner") {
        try {
          const stored = localStorage.getItem("maksab_prefill_ad");
          if (stored) {
            const data = JSON.parse(stored);
            localStorage.removeItem("maksab_prefill_ad");
            const prefillDraft: DraftData = {
              ...getInitialDraft(),
              categoryId: data.category_id || "",
              subcategoryId: data.subcategory_id || "",
              saleType: data.sale_type || "cash",
              categoryFields: data.category_fields || {},
              title: data.suggested_title || "",
              description: data.suggested_description || "",
              priceData: {
                ...getInitialPriceData(),
                price: data.suggested_price ? String(data.suggested_price) : "",
              },
              governorate: data.governorate || "القاهرة",
              city: data.city || "",
              isTitleDescEdited: true,
              currentStep: 1,
            };
            setDraft(prefillDraft);
            initialized.current = true;
            return;
          }
        } catch { /* ignore */ }
      }

      setDraft(loadDraft());
      initialized.current = true;
    }
  }, []);

  // Auto-save on draft change (after init)
  useEffect(() => {
    if (initialized.current) {
      saveDraft(draft);
    }
  }, [draft]);

  /* ── Helper to update draft ────────────────────────── */
  const updateDraft = useCallback(
    (updates: Partial<DraftData>) => {
      setDraft((prev) => ({ ...prev, ...updates }));
      setErrors({});
    },
    [],
  );

  /* ── Auto title/desc generation ────────────────────── */
  const regenerateTitleDesc = useCallback(
    (d: DraftData) => {
      if (d.isTitleDescEdited) return d;
      const config = getCategoryById(d.categoryId);
      if (!config) return d;
      return {
        ...d,
        title: generateAutoTitle(config, d.categoryFields, d.subcategoryId || undefined),
        description: generateAutoDescription(config, d.categoryFields, d.subcategoryId || undefined),
      };
    },
    [],
  );

  /* ── Step validation ───────────────────────────────── */
  const validateStep = useCallback(
    (step: number): boolean => {
      const errs: Record<string, string> = {};

      if (step === 1) {
        if (!draft.categoryId) errs.category = "اختار القسم";
        if (!draft.saleType) errs.saleType = "اختار نوع البيع";
      }

      if (step === 2) {
        const config = getCategoryById(draft.categoryId);
        if (config) {
          // Use subcategory override for required fields if available
          const override = draft.subcategoryId ? config.subcategoryOverrides?.[draft.subcategoryId] : undefined;
          const reqFields = override?.requiredFields ?? config.requiredFields;
          for (const reqId of reqFields) {
            // Skip fields hidden for current subcategory
            const field = config.fields.find((f) => f.id === reqId);
            if (draft.subcategoryId && field?.hiddenForSubcategories?.includes(draft.subcategoryId)) continue;
            const val = draft.categoryFields[reqId];
            if (val === undefined || val === null || val === "") {
              errs[reqId] = `${field?.label || reqId} مطلوب`;
            }
          }
        }
      }

      if (step === 3) {
        if (draft.saleType === "cash") {
          if (!draft.priceData.price) errs.price = "السعر مطلوب";
        } else if (draft.saleType === "auction") {
          if (!draft.priceData.auctionStartPrice)
            errs.auctionStartPrice = "سعر الافتتاح مطلوب";
        } else if (draft.saleType === "live_auction") {
          if (!draft.priceData.auctionStartPrice)
            errs.auctionStartPrice = "سعر الافتتاح مطلوب";
          if (!draft.priceData.liveAuctionScheduledAt)
            errs.liveAuctionScheduledAt = "حدد موعد البث المباشر";
        } else if (draft.saleType === "exchange") {
          if (!draft.priceData.exchangeWantedCategoryId)
            errs.exchangeWantedCategory = "اختار قسم البديل المطلوب";
        }
        if (images.length === 0) errs.images = "أضف صورة واحدة على الأقل";
        // Location validation (merged from old step 4)
        if (!draft.governorate) errs.governorate = "اختار المحافظة";
        if (!draft.title.trim()) errs.title = "العنوان مطلوب";
      }

      setErrors(errs);
      return Object.keys(errs).length === 0;
    },
    [draft, images],
  );

  /* ── Navigation ────────────────────────────────────── */
  const goNext = useCallback(() => {
    if (!validateStep(draft.currentStep)) return;

    if (draft.currentStep < TOTAL_STEPS) {
      const next = draft.currentStep + 1;
      let updated = { ...draft, currentStep: next };
      // Auto-generate title/desc when entering step 3 (combined price + location + review)
      if (next === 3) {
        updated = regenerateTitleDesc(updated);
      }
      setDraft(updated);
    }
  }, [draft, validateStep, regenerateTitleDesc]);

  const goPrev = useCallback(() => {
    if (draft.currentStep > 1) {
      updateDraft({ currentStep: draft.currentStep - 1 });
    }
  }, [draft.currentStep, updateDraft]);

  /* ── GPS location detection with reverse geocoding ──── */
  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use OpenStreetMap Nominatim for free reverse geocoding
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar&zoom=10`,
            { headers: { "User-Agent": "Maksab-App" } }
          );
          if (res.ok) {
            const data = await res.json();
            const address = data.address || {};
            // Try to extract governorate and city from the response
            const state = address.state || address.governorate || address.county || "";
            const cityName = address.city || address.town || address.suburb || address.village || address.city_district || "";

            // Map OSM state name to our governorate names
            const { governorates: govList } = await import("@/lib/data/governorates");
            const matchedGov = govList.find((g: string) =>
              state.includes(g) || g.includes(state) ||
              // Handle common aliases
              (state.includes("القاهرة") && g === "القاهرة") ||
              (state.includes("الجيزة") && g === "الجيزة") ||
              (state.includes("الاسكندرية") && g === "الإسكندرية") ||
              (state.includes("اسكندرية") && g === "الإسكندرية")
            );

            if (matchedGov) {
              updateDraft({ governorate: matchedGov, city: cityName || "" });
            } else if (state) {
              // Fallback: use the state name directly
              updateDraft({ governorate: state, city: cityName || "" });
            } else {
              updateDraft({ governorate: "القاهرة", city: "" });
            }
          } else {
            updateDraft({ governorate: "القاهرة", city: "" });
          }
        } catch {
          // Reverse geocoding failed — set empty so user picks manually
          updateDraft({ governorate: "", city: "" });
        }
        setIsDetectingLocation(false);
      },
      () => {
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [updateDraft]);

  /* ── Publish ───────────────────────────────────────── */
  const handlePublish = useCallback(async () => {
    if (!validateStep(3)) return;

    // Require auth
    const authedUser = user || (await requireAuth());
    if (!authedUser) return;

    setIsPublishing(true);

    try {
      // Upload images via /api/upload (FormData, not base64 in JSON)
      const uploadedImageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        try {
          const formData = new FormData();
          formData.append("file", images[i].file);
          formData.append("bucket", "ad-images");
          formData.append(
            "path",
            `ads/${authedUser.id}/${Date.now()}_${i}.jpg`,
          );

          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.url) {
              uploadedImageUrls.push(uploadData.url);
            }
          }
        } catch {
          // Skip failed image upload
        }
      }

      // Upload video if present
      let videoUrl: string | null = null;
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

      // Upload voice note if present
      let voiceNoteUrl: string | null = null;
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

      // Build ad data for server API
      const adData = {
        category_id: draft.categoryId,
        subcategory_id: draft.subcategoryId || null,
        sale_type: (draft.saleType === "live_auction" ? "auction" : draft.saleType) as SaleType,
        title: draft.title,
        description: draft.description,
        category_fields: {
          ...draft.categoryFields,
          ...(videoUrl ? { _video_url: videoUrl } : {}),
          ...(voiceNoteUrl ? { _voice_note_url: voiceNoteUrl } : {}),
          ...(draft.saleType === "live_auction"
            ? { is_live_auction: true, live_scheduled_at: draft.priceData.liveAuctionScheduledAt }
            : {}),
          ...(draft.saleType === "exchange" && draft.priceData.exchangeWantedCategoryId
            ? {
                exchange_wanted: {
                  category_id: draft.priceData.exchangeWantedCategoryId,
                  subcategory_id: draft.priceData.exchangeWantedSubcategoryId || null,
                  fields: draft.priceData.exchangeWantedFields,
                  title: draft.priceData.exchangeWantedTitle,
                },
              }
            : {}),
        },
        governorate: draft.governorate,
        city: draft.city || null,
        price: draft.saleType === "cash" ? Number(draft.priceData.price) : null,
        is_negotiable: draft.saleType === "cash" ? draft.priceData.isNegotiable : false,
        auction_start_price:
          draft.saleType === "auction" || draft.saleType === "live_auction"
            ? Number(draft.priceData.auctionStartPrice)
            : null,
        auction_buy_now_price:
          (draft.saleType === "auction" || draft.saleType === "live_auction") && draft.priceData.auctionBuyNowPrice
            ? Number(draft.priceData.auctionBuyNowPrice)
            : null,
        auction_duration_hours:
          draft.saleType === "auction" || draft.saleType === "live_auction"
            ? draft.priceData.auctionDuration
            : null,
        auction_min_increment:
          (draft.saleType === "auction" || draft.saleType === "live_auction") && draft.priceData.auctionMinIncrement
            ? Number(draft.priceData.auctionMinIncrement)
            : null,
        auction_ends_at:
          draft.saleType === "auction" || draft.saleType === "live_auction"
            ? new Date(Date.now() + (draft.priceData.auctionDuration || 24) * 3600000).toISOString()
            : null,
        auction_status:
          draft.saleType === "auction" || draft.saleType === "live_auction" ? "active" : null,
        exchange_description:
          draft.saleType === "exchange"
            ? (draft.priceData.exchangeWantedTitle || draft.priceData.exchangeNotes || draft.priceData.exchangeDescription || null)
            : null,
        exchange_accepts_price_diff:
          draft.saleType === "exchange" ? draft.priceData.exchangeAcceptsPriceDiff : false,
        exchange_price_diff:
          draft.saleType === "exchange" && draft.priceData.exchangePriceDiff
            ? Number(draft.priceData.exchangePriceDiff)
            : null,
        images: uploadedImageUrls,
      };

      // If user is a merchant with a store, attach store_id to the ad
      if (authedUser.store_id) {
        (adData as Record<string, unknown>).store_id = authedUser.store_id;
      }

      // Call server-side API (uses service role key — bypasses RLS)
      const res = await fetch("/api/ads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: authedUser.id, session_token: getSessionToken(), ad_data: adData }),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error("Ad publish error:", result);
        setErrors({ publish: result.error || "حصل مشكلة في نشر الإعلان. جرب تاني" });
        setIsPublishing(false);
        return;
      }

      // Track ad_created signal
      track("ad_created", {
        categoryId: draft.categoryId,
        subcategoryId: draft.subcategoryId,
        signalData: {
          saleType: draft.saleType,
          title: draft.title,
          price: draft.saleType === "cash" ? Number(draft.priceData.price) : null,
        },
        governorate: draft.governorate,
      });

      // Notify matching buyers (fire and forget)
      if (result.ad_id) {
        fetch("/api/notifications/on-ad-created", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ad: {
              id: result.ad_id,
              title: draft.title,
              category_id: draft.categoryId,
              subcategory_id: draft.subcategoryId,
              sale_type: draft.saleType === "live_auction" ? "auction" : draft.saleType,
              price: draft.saleType === "cash" ? Number(draft.priceData.price) : null,
              governorate: draft.governorate,
              user_id: authedUser.id,
              category_fields: draft.categoryFields,
            },
          }),
        }).catch(() => {});
      }

      // Success — award loyalty points
      if (user?.id) {
        import("@/lib/loyalty/loyalty-service").then(({ awardPoints, checkReferralFirstAd }) => {
          awardPoints(user.id, "ad_created", result.ad_id);
          checkReferralFirstAd(user.id);
        });
      }

      clearDraft();
      setPublishedAdId(result.ad_id || null);
      setPublished(true);
    } catch {
      setErrors({ publish: "حصل مشكلة، جرب تاني" });
    } finally {
      setIsPublishing(false);
    }
  }, [draft, images, videoFile, voiceNote, user, requireAuth, validateStep, track]);

  /* ── Price label for preview ───────────────────────── */
  const getPriceLabel = () => {
    if (draft.saleType === "cash" && draft.priceData.price) {
      const formatted = Number(draft.priceData.price).toLocaleString("en-US");
      return `${formatted} جنيه${draft.priceData.isNegotiable ? " (قابل للتفاوض)" : ""}`;
    }
    if (draft.saleType === "auction" && draft.priceData.auctionStartPrice) {
      return `يبدأ من ${Number(draft.priceData.auctionStartPrice).toLocaleString("en-US")} جنيه`;
    }
    if (draft.saleType === "live_auction" && draft.priceData.auctionStartPrice) {
      return `📡 مزاد مباشر — يبدأ من ${Number(draft.priceData.auctionStartPrice).toLocaleString("en-US")} جنيه`;
    }
    if (draft.saleType === "exchange") {
      const wanted = draft.priceData.exchangeWantedTitle;
      return wanted ? `🔄 للتبديل بـ ${wanted}` : "للتبديل";
    }
    return "";
  };

  /* ── Success screen ────────────────────────────────── */
  if (published) {
    const adUrl = publishedAdId ? `${typeof window !== "undefined" ? window.location.origin : ""}/ad/${publishedAdId}` : undefined;

    return (
      <main className="min-h-screen bg-white px-4 py-8">
        <div className="max-w-md mx-auto space-y-5">
          <div className="text-center space-y-3">
            <div className="text-6xl">🎉</div>
            <h2 className="text-3xl font-bold text-dark">تم نشر إعلانك!</h2>
            <p className="text-sm text-gray-text">
              إعلانك اتنشر بنجاح ويقدر الناس تشوفه دلوقتي
            </p>
          </div>

          {/* Share CTA — Viral Loop */}
          <div className="bg-gradient-to-bl from-brand-green-light to-brand-gold-light rounded-2xl border border-green-200 p-5 space-y-3">
            <div className="text-center space-y-1">
              <p className="text-base font-bold text-dark">شارك إعلانك وبيع أسرع!</p>
              <p className="text-xs text-gray-text">الإعلانات اللي بتتشارك بتتباع أسرع 3 مرات</p>
            </div>
            <ShareButtons
              title={draft.title}
              url={adUrl}
              priceText={getPriceLabel()}
              variant="inline"
            />
          </div>

          {/* Seller insights */}
          {draft.categoryId && draft.title && draft.governorate && (
            <SellerInsightsCard
              categoryId={draft.categoryId}
              title={draft.title}
              governorate={draft.governorate}
              hasImages={images.length > 0}
            />
          )}

          <div className="flex flex-col gap-2 pt-2">
            {publishedAdId && (
              <Button fullWidth onClick={() => router.push(`/ad/${publishedAdId}`)}>
                شوف إعلانك
              </Button>
            )}
            <Button fullWidth variant={publishedAdId ? "outline" : "primary"} onClick={() => router.push("/")}>
              الصفحة الرئيسية
            </Button>
            <Button
              fullWidth
              variant="outline"
              onClick={() => {
                setDraft(getInitialDraft());
                setImages([]);
                setVideoFile(null);
                setVoiceNote(null);
                setPublished(false);
                setPublishedAdId(null);
                setErrors({});
              }}
            >
              أضف إعلان تاني
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
              onClick={() =>
                draft.currentStep > 1 ? goPrev() : router.back()
              }
              className="p-1 -me-1 text-gray-text hover:text-dark transition-colors"
              aria-label="رجوع"
            >
              <ChevronRight size={24} />
            </button>
            <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center shadow-sm">
              <PlusCircle size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-dark leading-tight">
                {stepTitles[draft.currentStep - 1]}
              </h1>
              <p className="text-[10px] text-brand-green font-bold">إعلانك في ٣ خطوات بس</p>
            </div>
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
              {draft.currentStep} / {TOTAL_STEPS}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-brand-green transition-all duration-300"
            style={{
              width: `${(draft.currentStep / TOTAL_STEPS) * 100}%`,
            }}
          />
        </div>
      </header>

      {/* Step content */}
      <div className="px-4 py-5">
        {draft.currentStep === 1 && (
          <Step1CategorySaleType
            categoryId={draft.categoryId}
            subcategoryId={draft.subcategoryId}
            saleType={draft.saleType}
            onCategoryChange={(id) => {
              const config = getCategoryById(id);
              const defaults: Record<string, unknown> = {};
              if (config) {
                for (const field of config.fields) {
                  if (field.defaultValue !== undefined) {
                    defaults[field.id] = field.defaultValue;
                  }
                }
              }
              updateDraft({
                categoryId: id,
                subcategoryId: "",
                categoryFields: defaults,
              });
            }}
            onSubcategoryChange={(id) =>
              updateDraft({ subcategoryId: id })
            }
            onSaleTypeChange={(type) => updateDraft({ saleType: type })}
          />
        )}

        {draft.currentStep === 2 && (
          <Step2CategoryDetails
            categoryId={draft.categoryId}
            subcategoryId={draft.subcategoryId || undefined}
            values={draft.categoryFields}
            errors={errors}
            onChange={(fieldId, value) => {
              setDraft((prev) => ({
                ...prev,
                categoryFields: {
                  ...prev.categoryFields,
                  [fieldId]: value,
                },
              }));
              setErrors({});
            }}
          />
        )}

        {draft.currentStep === 3 && (
          <>
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
              categoryId={draft.categoryId}
              subcategoryId={draft.subcategoryId}
              categoryFields={draft.categoryFields}
            />

            {/* Divider between price/media and location/review */}
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-text font-medium">الموقع والمراجعة</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

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
              onTitleDescEditToggle={() =>
                updateDraft({ isTitleDescEdited: true })
              }
              onDetectLocation={handleDetectLocation}
              isDetectingLocation={isDetectingLocation}
              errors={errors}
            />
          </>
        )}

        {/* Validation error for step 1 */}
        {draft.currentStep === 1 &&
          (errors.category || errors.saleType) && (
            <p className="mt-4 text-sm text-error text-center bg-error/5 rounded-xl p-3">
              {errors.category || errors.saleType}
            </p>
          )}

        {/* Publish error */}
        {errors.publish && (
          <p className="mt-4 text-sm text-error text-center bg-error/5 rounded-xl p-3">
            {errors.publish}
          </p>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-light p-4 flex gap-3 z-40">
        {draft.currentStep > 1 && (
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

        {draft.currentStep < TOTAL_STEPS ? (
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
            onClick={handlePublish}
            isLoading={isPublishing}
          >
            نشر الإعلان
          </Button>
        )}
      </div>
    </main>
  );
}
