"use client";

import { useRef } from "react";
import { Camera, X, Star } from "lucide-react";
import Input from "@/components/ui/Input";
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
  // Exchange
  exchangeDescription: string;
  exchangeAcceptsPriceDiff: boolean;
  exchangePriceDiff: string;
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

        {saleType === "exchange" && (
          <div className="space-y-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-dark mb-1.5">
                عايز تبدل بإيه؟ <span className="text-error">*</span>
              </label>
              <textarea
                value={priceData.exchangeDescription}
                onChange={(e) =>
                  onPriceChange("exchangeDescription", e.target.value)
                }
                placeholder="وصف الحاجة اللي عايز تبدل بيها..."
                rows={3}
                className={`w-full px-4 py-3 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark placeholder:text-gray-text resize-none ${
                  errors.exchangeDescription ? "border-error bg-error/5" : ""
                }`}
              />
              {errors.exchangeDescription && (
                <p className="mt-1 text-xs text-error">
                  {errors.exchangeDescription}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                onPriceChange(
                  "exchangeAcceptsPriceDiff",
                  !priceData.exchangeAcceptsPriceDiff,
                )
              }
              className="flex items-center gap-2 text-sm"
            >
              <span
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  priceData.exchangeAcceptsPriceDiff
                    ? "bg-brand-green border-brand-green"
                    : "border-gray-300"
                }`}
              >
                {priceData.exchangeAcceptsPriceDiff && (
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
              <span className="text-dark font-medium">أقبل فرق سعر</span>
            </button>

            {priceData.exchangeAcceptsPriceDiff && (
              <Input
                label="فرق السعر"
                name="exchangePriceDiff"
                type="number"
                inputMode="numeric"
                value={priceData.exchangePriceDiff}
                onChange={(e) =>
                  onPriceChange("exchangePriceDiff", e.target.value)
                }
                unit="جنيه"
                placeholder="0"
              />
            )}
          </div>
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
