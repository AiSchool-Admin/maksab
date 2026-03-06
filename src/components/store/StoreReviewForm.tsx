"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import Button from "@/components/ui/Button";
import { getSessionToken } from "@/lib/supabase/auth";
import toast from "react-hot-toast";

interface StoreReviewFormProps {
  storeId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const RATING_LABELS: Record<number, string> = {
  0: "اضغط على النجوم",
  1: "سيء جداً",
  2: "سيء",
  3: "مقبول",
  4: "جيد",
  5: "ممتاز",
};

const SUB_RATINGS = [
  { key: "quality_rating", label: "جودة المنتجات" },
  { key: "accuracy_rating", label: "دقة الوصف" },
  { key: "response_rating", label: "سرعة الاستجابة" },
  { key: "commitment_rating", label: "الالتزام بالمواعيد" },
] as const;

function InteractiveStars({
  rating,
  onChange,
  size = 28,
}: {
  rating: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110 active:scale-95"
          aria-label={`${i} نجمة`}
        >
          <Star
            size={size}
            className={
              i <= rating
                ? "text-brand-gold fill-brand-gold"
                : "text-gray-300"
            }
            fill={i <= rating ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );
}

export default function StoreReviewForm({
  storeId,
  onSuccess,
  onCancel,
}: StoreReviewFormProps) {
  const [overallRating, setOverallRating] = useState(0);
  const [subRatings, setSubRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubRating = (key: string, value: number) => {
    setSubRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      toast.error("اختار التقييم العام الأول");
      return;
    }

    const sessionToken = getSessionToken();
    if (!sessionToken) {
      toast.error("لازم تسجل دخول الأول");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/stores/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          session_token: sessionToken,
          overall_rating: overallRating,
          quality_rating: subRatings.quality_rating || null,
          accuracy_rating: subRatings.accuracy_rating || null,
          response_rating: subRatings.response_rating || null,
          commitment_rating: subRatings.commitment_rating || null,
          comment: comment.trim() || null,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("تم إرسال تقييمك بنجاح! شكراً ليك");
        onSuccess();
      } else if (res.status === 409) {
        toast.error("أنت قيّمت المتجر ده قبل كده");
      } else if (res.status === 400 && data.error?.includes("متجرك")) {
        toast.error("مينفعش تقيّم متجرك");
      } else {
        toast.error(data.error || "حصل مشكلة، جرب تاني");
      }
    } catch {
      toast.error("حصل مشكلة في الاتصال، جرب تاني");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-light p-5 space-y-5">
      <h3 className="text-lg font-bold text-dark text-center">قيّم المتجر</h3>

      {/* Overall Rating */}
      <div className="text-center space-y-2">
        <p className="text-sm font-semibold text-dark">التقييم العام</p>
        <div className="flex justify-center">
          <InteractiveStars
            rating={overallRating}
            onChange={setOverallRating}
            size={36}
          />
        </div>
        <p className="text-xs text-gray-text">{RATING_LABELS[overallRating]}</p>
      </div>

      {/* Sub-ratings */}
      {overallRating > 0 && (
        <div className="space-y-3 bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-text mb-2">
            تقييمات تفصيلية (اختياري)
          </p>
          {SUB_RATINGS.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-dark">{label}</span>
              <InteractiveStars
                rating={subRatings[key] || 0}
                onChange={(v) => handleSubRating(key, v)}
                size={18}
              />
            </div>
          ))}
        </div>
      )}

      {/* Comment */}
      <div>
        <label className="text-sm font-semibold text-dark block mb-2">
          اكتب مراجعتك (اختياري)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="شاركنا تجربتك مع المتجر..."
          className="w-full border border-gray-light rounded-xl p-3 text-sm text-dark placeholder:text-gray-text/50 resize-none focus:outline-none focus:border-brand-green transition-colors"
          rows={3}
          maxLength={500}
        />
        <p className="text-[11px] text-gray-text mt-1 text-start">
          {comment.length}/500
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="ghost"
          size="md"
          onClick={onCancel}
          className="flex-1"
        >
          إلغاء
        </Button>
        <Button
          size="md"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={overallRating === 0}
          className="flex-1"
        >
          إرسال التقييم
        </Button>
      </div>
    </div>
  );
}
