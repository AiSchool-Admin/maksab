"use client";

import { useState } from "react";
import { MapPin, Pencil } from "lucide-react";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { governorateOptions, getCityOptions } from "@/lib/data/governorates";
import type { CompressedImage } from "@/lib/utils/image-compress";

interface Step4Props {
  governorate: string;
  city: string;
  title: string;
  description: string;
  isTitleDescEdited: boolean;
  images: CompressedImage[];
  saleType: string;
  priceLabel: string;
  onGovernorateChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onTitleDescEditToggle: () => void;
  onDetectLocation: () => void;
  isDetectingLocation: boolean;
  errors: Record<string, string>;
}

export default function Step4LocationReview({
  governorate,
  city,
  title,
  description,
  isTitleDescEdited,
  images,
  saleType,
  priceLabel,
  onGovernorateChange,
  onCityChange,
  onTitleChange,
  onDescriptionChange,
  onTitleDescEditToggle,
  onDetectLocation,
  isDetectingLocation,
  errors,
}: Step4Props) {
  const [showEdit, setShowEdit] = useState(false);
  const cityOptions = getCityOptions(governorate);

  const saleTypeBadge =
    saleType === "cash"
      ? "💵 بيع نقدي"
      : saleType === "auction"
        ? "🔨 مزاد"
        : "🔄 تبديل";

  return (
    <div className="space-y-6">
      {/* Location */}
      <div>
        <h3 className="text-sm font-bold text-dark mb-3">الموقع</h3>

        <button
          type="button"
          onClick={onDetectLocation}
          disabled={isDetectingLocation}
          className="w-full flex items-center justify-center gap-2 py-3 mb-3 rounded-xl bg-brand-green-light text-brand-green font-semibold text-sm hover:bg-brand-green/20 transition-colors disabled:opacity-50"
        >
          <MapPin size={18} />
          {isDetectingLocation ? "جاري تحديد الموقع..." : "استخدم موقعي الحالي"}
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-text">أو</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="space-y-3">
          <Select
            label="المحافظة"
            name="governorate"
            value={governorate}
            onChange={(e) => onGovernorateChange(e.target.value)}
            options={governorateOptions}
            placeholder="اختار المحافظة"
            error={errors.governorate}
            required
          />
          <Select
            label="المدينة / المنطقة"
            name="city"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            options={cityOptions}
            placeholder={governorate ? "اختار المدينة" : "اختار المحافظة الأول"}
            disabled={!governorate}
          />
        </div>
      </div>

      {/* Ad Preview / Review */}
      <div>
        <h3 className="text-sm font-bold text-dark mb-3">مراجعة الإعلان</h3>

        <div className="bg-gray-light rounded-2xl p-4 space-y-3">
          {/* Image preview */}
          {images.length > 0 && (
            <div className="rounded-xl overflow-hidden">
              <img
                src={images[0].preview}
                alt="صورة الإعلان"
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {/* Title */}
          <h4 className="font-bold text-dark text-base leading-relaxed">
            {title || "عنوان الإعلان"}
          </h4>

          {/* Description */}
          <p className="text-sm text-gray-text leading-relaxed">
            {description || "وصف الإعلان"}
          </p>

          {/* Price & type */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-brand-green">
              {priceLabel}
            </span>
            <span className="text-xs bg-white rounded-lg px-2 py-1 font-medium text-dark">
              {saleTypeBadge}
            </span>
          </div>

          {/* Location */}
          {governorate && (
            <div className="flex items-center gap-1 text-xs text-gray-text">
              <MapPin size={12} />
              <span>
                {governorate}
                {city ? ` — ${city}` : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Edit title/description */}
      <div>
        <button
          type="button"
          onClick={() => {
            setShowEdit(!showEdit);
            if (!isTitleDescEdited) onTitleDescEditToggle();
          }}
          className="flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-green-dark transition-colors"
        >
          <Pencil size={14} />
          تعديل العنوان والوصف
        </button>

        {showEdit && (
          <div className="mt-3 space-y-3">
            <Input
              label="العنوان"
              name="title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="عنوان الإعلان"
              error={errors.title}
              required
            />
            <div className="w-full">
              <label className="block text-sm font-medium text-dark mb-1.5">
                الوصف
              </label>
              <textarea
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="وصف الإعلان..."
                rows={4}
                className="w-full px-4 py-3 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark placeholder:text-gray-text resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
