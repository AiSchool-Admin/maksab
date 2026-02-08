"use client";

import { useRef } from "react";
import { Camera, X, Star } from "lucide-react";
import Input from "@/components/ui/Input";
import ExchangeWantedForm from "./ExchangeWantedForm";
import type { CompressedImage } from "@/lib/utils/image-compress";
import { compressImage } from "@/lib/utils/image-compress";

const MAX_IMAGES = 5;

export interface PriceData {
  // Cash
  price: string;
  isNegotiable: boolean;
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
  onPriceChange: <K extends keyof PriceData>(key: K, value: PriceData[K]) => void;
  onImagesChange: (images: CompressedImage[]) => void;
  errors: Record<string, string>;
}

export default function Step3PricePhotos({
  saleType,
  priceData,
  images,
  onPriceChange,
  onImagesChange,
  errors,
}: Step3Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(images[index].preview);
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Price section */}
      <div>
        <h3 className="text-sm font-bold text-dark mb-4">السعر</h3>

        {saleType === "cash" && (
          <div className="space-y-3">
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
              required
            />
            <button
              type="button"
              onClick={() =>
                onPriceChange("isNegotiable", !priceData.isNegotiable)
              }
              className="flex items-center gap-2 text-sm"
            >
              <span
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  priceData.isNegotiable
                    ? "bg-brand-green border-brand-green"
                    : "border-gray-300"
                }`}
              >
                {priceData.isNegotiable && (
                  <svg
                    width="12"
                    height="10"
                    viewBox="0 0 12 10"
                    fill="none"
                  >
                    <path
                      d="M1 5L4.5 8.5L11 1.5"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="text-dark font-medium">
                السعر قابل للتفاوض
              </span>
            </button>
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
              onChange={(e) =>
                onPriceChange("auctionStartPrice", e.target.value)
              }
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
              onChange={(e) =>
                onPriceChange("auctionBuyNowPrice", e.target.value)
              }
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
              {errors.auctionDuration && (
                <p className="mt-1 text-xs text-error">
                  {errors.auctionDuration}
                </p>
              )}
            </div>

            <Input
              label="الحد الأدنى للمزايدة"
              name="auctionMinIncrement"
              type="number"
              inputMode="numeric"
              value={priceData.auctionMinIncrement}
              onChange={(e) =>
                onPriceChange("auctionMinIncrement", e.target.value)
              }
              unit="جنيه"
              placeholder="50"
              hint="أقل مبلغ يزود بيه المزايد"
            />
          </div>
        )}

        {saleType === "live_auction" && (
          <div className="space-y-4">
            {/* Live auction fee notice */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📡</span>
                <span className="text-sm font-bold text-orange-700">
                  مزاد مباشر على الهواء
                </span>
              </div>
              <p className="text-xs text-orange-600 leading-relaxed">
                المزاد المباشر يتم بثه على الهواء للمشاهدين. يتم تطبيق رسوم إضافية على هذه الخدمة:
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
                    * رسوم البث غير قابلة للاسترداد. العمولة تُخصم من سعر البيع النهائي.
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
              onChange={(e) =>
                onPriceChange("auctionStartPrice", e.target.value)
              }
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
              onChange={(e) =>
                onPriceChange("auctionBuyNowPrice", e.target.value)
              }
              unit="جنيه"
              placeholder="0"
              hint="لو حد دفع المبلغ ده المزاد بينتهي فوراً"
            />

            {/* Schedule live auction */}
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">
                موعد البث المباشر <span className="text-error">*</span>
              </label>
              <input
                type="datetime-local"
                value={priceData.liveAuctionScheduledAt}
                onChange={(e) =>
                  onPriceChange("liveAuctionScheduledAt", e.target.value)
                }
                min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                className={`w-full px-4 py-3 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark ${
                  errors.liveAuctionScheduledAt ? "border-error bg-error/5" : ""
                }`}
                dir="ltr"
              />
              {errors.liveAuctionScheduledAt && (
                <p className="mt-1 text-xs text-error">
                  {errors.liveAuctionScheduledAt}
                </p>
              )}
              <p className="mt-1 text-[11px] text-gray-text">
                حدد موعد البث بعد ساعة على الأقل من الآن
              </p>
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
              onChange={(e) =>
                onPriceChange("auctionMinIncrement", e.target.value)
              }
              unit="جنيه"
              placeholder="50"
              hint="أقل مبلغ يزود بيه المزايد"
            />

            {/* Agreement */}
            <div className="bg-gray-light rounded-xl p-3 flex items-start gap-2">
              <span className="text-sm mt-0.5">💡</span>
              <p className="text-[11px] text-gray-text leading-relaxed">
                بنشر المزاد المباشر أنت موافق على دفع رسوم البث (50 جنيه) وعمولة 2% على سعر البيع النهائي.
                سيتم إرسال رابط البث قبل الموعد بـ 15 دقيقة.
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
            onSubcategoryChange={(id) =>
              onPriceChange("exchangeWantedSubcategoryId", id)
            }
            onFieldChange={(fieldId, value) =>
              onPriceChange("exchangeWantedFields", {
                ...priceData.exchangeWantedFields,
                [fieldId]: value,
              })
            }
            onTitleChange={(title) => {
              onPriceChange("exchangeWantedTitle", title);
              // Auto-sync to exchangeDescription for backward compatibility
              onPriceChange("exchangeDescription", title);
            }}
            onNotesChange={(n) => onPriceChange("exchangeNotes", n)}
            onAcceptsPriceDiffChange={(v) =>
              onPriceChange("exchangeAcceptsPriceDiff", v)
            }
            onPriceDiffChange={(v) => onPriceChange("exchangePriceDiff", v)}
          />
        )}
      </div>

      {/* Images section */}
      <div>
        <h3 className="text-sm font-bold text-dark mb-2">
          الصور (حتى {MAX_IMAGES})
        </h3>
        <p className="text-xs text-gray-text mb-3">
          الصورة الأولى هي الصورة الرئيسية للإعلان
        </p>

        {errors.images && (
          <p className="mb-2 text-xs text-error">{errors.images}</p>
        )}

        <div className="grid grid-cols-4 gap-3">
          {/* Existing images */}
          {images.map((img, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={img.preview}
                alt={`صورة ${index + 1}`}
                className="w-full h-full object-cover rounded-xl"
              />
              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute -top-1.5 -start-1.5 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center shadow"
              >
                <X size={14} />
              </button>
              {/* Main image badge */}
              {index === 0 && (
                <span className="absolute bottom-1 start-1 bg-brand-gold text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                  <Star size={8} fill="white" />
                  رئيسية
                </span>
              )}
            </div>
          ))}

          {/* Add button */}
          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-brand-green flex flex-col items-center justify-center gap-1 text-gray-text hover:text-brand-green transition-colors"
            >
              <Camera size={24} />
              <span className="text-[10px] font-medium">إضافة صورة</span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleAddImages}
          className="hidden"
        />
      </div>
    </div>
  );
}
