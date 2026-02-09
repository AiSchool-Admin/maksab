"use client";

import { GitCompareArrows, Check } from "lucide-react";
import { useComparisonStore, type ComparisonAd } from "@/stores/comparison-store";
import toast from "react-hot-toast";

interface AddToCompareButtonProps {
  ad: ComparisonAd;
  variant?: "icon" | "full";
}

export default function AddToCompareButton({
  ad,
  variant = "icon",
}: AddToCompareButtonProps) {
  const { ads, addAd, removeAd } = useComparisonStore();
  const isAdded = ads.some((a) => a.id === ad.id);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAdded) {
      removeAd(ad.id);
      return;
    }

    // Check same category
    if (ads.length > 0 && ads[0].categoryId !== ad.categoryId) {
      toast.error("يمكنك مقارنة إعلانات من نفس القسم فقط");
      return;
    }

    const success = addAd(ad);
    if (!success) {
      toast.error("الحد الأقصى للمقارنة 3 إعلانات");
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleToggle}
        className={`p-1.5 rounded-full backdrop-blur-sm transition-colors btn-icon-sm ${
          isAdded
            ? "bg-brand-green/10 text-brand-green"
            : "bg-white/80 text-gray-text hover:text-brand-green"
        }`}
        aria-label={isAdded ? "إزالة من المقارنة" : "إضافة للمقارنة"}
      >
        {isAdded ? <Check size={16} /> : <GitCompareArrows size={16} />}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2 w-full rounded-xl px-4 py-3 transition-colors ${
        isAdded
          ? "bg-brand-green-light text-brand-green border border-brand-green/30"
          : "bg-gray-light text-gray-text hover:bg-gray-200 border border-transparent"
      }`}
    >
      {isAdded ? <Check size={18} /> : <GitCompareArrows size={18} />}
      <span className="text-sm font-bold">
        {isAdded ? "تم الإضافة للمقارنة" : "أضف للمقارنة"}
      </span>
    </button>
  );
}
