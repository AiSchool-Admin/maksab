"use client";

import { useState } from "react";
import Image from "next/image";

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const hasImages = images.length > 0;
  const total = hasImages ? images.length : 1;

  const goTo = (index: number) => {
    if (index >= 0 && index < total) setCurrent(index);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    // RTL: swipe left = next, swipe right = prev (reversed)
    if (Math.abs(diff) > 50) {
      if (diff < 0) goTo(current + 1);
      else goTo(current - 1);
    }
    setTouchStart(null);
  };

  return (
    <div className="relative bg-gray-light">
      {/* Image area */}
      <div
        className="aspect-[4/3] overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {hasImages ? (
          <Image
            src={images[current]}
            alt={`${title} — صورة ${current + 1}`}
            fill
            sizes="100vw"
            className="object-cover"
            priority={current === 0}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">
            📷
          </div>
        )}
      </div>

      {/* Indicator dots */}
      {total > 1 && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current
                  ? "bg-white w-5"
                  : "bg-white/50"
              }`}
              aria-label={`صورة ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Counter badge */}
      {total > 1 && (
        <span className="absolute top-3 start-3 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-sm">
          {current + 1}/{total}
        </span>
      )}
    </div>
  );
}
