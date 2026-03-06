"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Star, PenLine } from "lucide-react";
import StoreReviewCard from "@/components/store/StoreReviewCard";
import StoreReviewForm from "@/components/store/StoreReviewForm";
import { ReviewCardSkeleton } from "@/components/store/StoreSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getStoreBySlug,
  getStoreReviews,
} from "@/lib/stores/store-service";
import type { StoreReview } from "@/types";

export default function StoreReviewsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, requireAuth } = useAuth();

  const [storeName, setStoreName] = useState("");
  const [storeId, setStoreId] = useState("");
  const [storeOwnerId, setStoreOwnerId] = useState("");
  const [avgRating, setAvgRating] = useState(0);
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const loadReviews = useCallback(async (sid: string, p: number, append = false) => {
    const result = await getStoreReviews(sid, p, 20);
    if (append) {
      setReviews((prev) => [...prev, ...result.reviews]);
    } else {
      setReviews(result.reviews);
    }
    setTotal(result.total);
  }, []);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const store = await getStoreBySlug(slug);
      if (!store) {
        setIsLoading(false);
        return;
      }
      setStoreName(store.name);
      setStoreId(store.id);
      setStoreOwnerId(store.user_id);
      setAvgRating(store.avg_rating || 0);

      await loadReviews(store.id, 1);
      setIsLoading(false);
    }
    load();
  }, [slug, loadReviews]);

  const loadMore = async () => {
    const nextPage = page + 1;
    await loadReviews(storeId, nextPage, true);
    setPage(nextPage);
  };

  const handleWriteReview = async () => {
    const authedUser = user || await requireAuth();
    if (!authedUser) return;

    if (authedUser.id === storeOwnerId) {
      const { default: toast } = await import("react-hot-toast");
      toast.error("مينفعش تقيّم متجرك");
      return;
    }

    setShowReviewForm(true);
  };

  const handleReviewSuccess = async () => {
    setShowReviewForm(false);
    setPage(1);
    await loadReviews(storeId, 1);
    // Re-fetch store to get updated avg_rating (loadReviews already sets total)
    const store = await getStoreBySlug(slug);
    if (store) {
      setAvgRating(store.avg_rating || 0);
    }
  };

  const isOwner = user?.id === storeOwnerId;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => router.back()} className="p-1" aria-label="رجوع">
          <ArrowRight size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-dark">
            تقييمات {storeName}
          </h1>
          <div className="flex items-center gap-1 text-xs text-gray-text">
            <Star size={11} className="text-brand-gold fill-brand-gold" />
            <span>{avgRating.toFixed(1)}</span>
            <span>({total} تقييم)</span>
          </div>
        </div>
        {!isOwner && !showReviewForm && (
          <button
            onClick={handleWriteReview}
            className="flex items-center gap-1.5 bg-brand-green text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-brand-green-dark transition-colors"
          >
            <PenLine size={14} />
            <span>اكتب تقييم</span>
          </button>
        )}
      </header>

      {/* Review Form */}
      {showReviewForm && storeId && (
        <div className="px-4 mt-4">
          <StoreReviewForm
            storeId={storeId}
            onSuccess={handleReviewSuccess}
            onCancel={() => setShowReviewForm(false)}
          />
        </div>
      )}

      {/* Rating summary */}
      {!isLoading && reviews.length > 0 && (
        <div className="bg-white mx-4 mt-4 rounded-xl border border-gray-light p-4">
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-bold text-dark">
              {avgRating.toFixed(1)}
            </span>
            <div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={18}
                    className={
                      i <= Math.round(avgRating)
                        ? "text-brand-gold fill-brand-gold"
                        : "text-gray-200"
                    }
                  />
                ))}
              </div>
              <p className="text-xs text-gray-text mt-1">
                بناءً على {total} تقييم
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reviews list */}
      <div className="px-4 mt-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <ReviewCardSkeleton key={i} />
          ))
        ) : reviews.length > 0 ? (
          <>
            {reviews.map((review) => (
              <StoreReviewCard key={review.id} review={review} />
            ))}
            {reviews.length < total && (
              <button
                onClick={loadMore}
                className="w-full text-sm text-brand-green font-semibold py-3 hover:bg-brand-green-light rounded-xl transition-colors"
              >
                عرض المزيد
              </button>
            )}
          </>
        ) : (
          <div>
            <EmptyState
              icon="⭐"
              title="مفيش تقييمات لسه"
              description="المتجر ده لسه محدش قيّمه. كن أول واحد!"
            />
            {!isOwner && !showReviewForm && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={handleWriteReview}
                  className="flex items-center gap-2 bg-brand-green text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-brand-green-dark transition-colors"
                >
                  <PenLine size={16} />
                  <span>اكتب أول تقييم</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
