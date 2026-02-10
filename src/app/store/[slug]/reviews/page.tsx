"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Star } from "lucide-react";
import StoreReviewCard from "@/components/store/StoreReviewCard";
import { ReviewCardSkeleton } from "@/components/store/StoreSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import {
  getStoreBySlug,
  getStoreReviews,
} from "@/lib/stores/store-service";
import type { StoreReview } from "@/types";

export default function StoreReviewsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [storeName, setStoreName] = useState("");
  const [storeId, setStoreId] = useState("");
  const [avgRating, setAvgRating] = useState(0);
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

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
      setAvgRating(store.avg_rating);

      const result = await getStoreReviews(store.id, 1, 20);
      setReviews(result.reviews);
      setTotal(result.total);
      setIsLoading(false);
    }
    load();
  }, [slug]);

  const loadMore = async () => {
    const nextPage = page + 1;
    const result = await getStoreReviews(storeId, nextPage, 20);
    setReviews((prev) => [...prev, ...result.reviews]);
    setPage(nextPage);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => router.back()} className="p-1">
          <ArrowRight size={20} />
        </button>
        <div>
          <h1 className="text-base font-bold text-dark">
            تقييمات {storeName}
          </h1>
          <div className="flex items-center gap-1 text-xs text-gray-text">
            <Star size={11} className="text-brand-gold fill-brand-gold" />
            <span>{avgRating.toFixed(1)}</span>
            <span>({total} تقييم)</span>
          </div>
        </div>
      </header>

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
          <EmptyState
            icon="⭐"
            title="مفيش تقييمات لسه"
            description="المتجر ده لسه محدش قيّمه. كن أول واحد!"
          />
        )}
      </div>
    </div>
  );
}
