"use client";

import { useState } from "react";
import StarRating from "./StarRating";
import Button from "@/components/ui/Button";
import { submitReview } from "@/lib/reviews/reviews-service";
import toast from "react-hot-toast";

interface ReviewFormProps {
  adId: string;
  sellerId: string;
  reviewerId: string;
  adTitle: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ReviewForm({
  adId,
  sellerId,
  reviewerId,
  adTitle,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("اختار التقييم الأول");
      return;
    }

    setIsSubmitting(true);
    const result = await submitReview({
      adId,
      reviewerId,
      sellerId,
      rating,
      comment: comment.trim() || undefined,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast.success("تم إرسال تقييمك بنجاح");
      onSuccess();
    } else {
      toast.error(result.error || "حصل مشكلة، جرب تاني");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-light rounded-xl p-3">
        <p className="text-[11px] text-gray-text mb-1">تقييم بخصوص:</p>
        <p className="text-sm font-bold text-dark">{adTitle}</p>
      </div>

      {/* Star rating */}
      <div className="text-center space-y-2">
        <p className="text-sm font-semibold text-dark">قيّم تجربتك مع البائع</p>
        <div className="flex justify-center">
          <StarRating
            rating={rating}
            size={36}
            interactive
            onChange={setRating}
          />
        </div>
        <p className="text-xs text-gray-text">
          {rating === 0 && "اضغط على النجوم"}
          {rating === 1 && "سيء جداً"}
          {rating === 2 && "سيء"}
          {rating === 3 && "مقبول"}
          {rating === 4 && "جيد"}
          {rating === 5 && "ممتاز"}
        </p>
      </div>

      {/* Comment */}
      <div>
        <label className="text-sm font-semibold text-dark block mb-2">
          اكتب مراجعتك (اختياري)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="شاركنا تجربتك..."
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
          disabled={rating === 0}
          className="flex-1"
        >
          إرسال التقييم
        </Button>
      </div>
    </div>
  );
}
