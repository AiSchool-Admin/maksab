"use client";

import { useState, useEffect } from "react";

interface Props {
  images: string[];
  title: string;
  fallbackIcon: string;
}

/**
 * Interactive image gallery:
 *   - Click a thumbnail → swap the main image
 *   - Click the main image → open full-screen lightbox
 *   - Arrow keys (when lightbox open) → previous/next image
 *   - Escape → close lightbox
 */
export default function ImageGallery({ images, title, fallbackIcon }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      else if (e.key === "ArrowLeft") {
        // RTL: ArrowLeft = next
        setActiveIdx((i) => (i + 1) % images.length);
      } else if (e.key === "ArrowRight") {
        setActiveIdx((i) => (i - 1 + images.length) % images.length);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, images.length]);

  if (images.length === 0) {
    return (
      <div className="aspect-[4/3] bg-gray-100 rounded-2xl flex items-center justify-center text-6xl mb-4">
        {fallbackIcon}
      </div>
    );
  }

  const activeImg = images[activeIdx] || images[0];

  return (
    <>
      <div className="space-y-2 mb-4">
        {/* Main image — click to open lightbox */}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block w-full aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden shadow-sm cursor-zoom-in relative group"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImg}
            alt={title}
            className="w-full h-full object-cover transition-opacity"
          />
          <span className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
            🔍 اضغط للتكبير
          </span>
          {images.length > 1 && (
            <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">
              {activeIdx + 1} / {images.length}
            </span>
          )}
        </button>

        {/* Thumbnail strip — click to swap main */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIdx(i)}
                className={`flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden transition-all ${
                  i === activeIdx
                    ? "ring-2 ring-[#1B7A3D] ring-offset-2"
                    : "opacity-70 hover:opacity-100"
                }`}
                aria-label={`صورة ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={`${title} ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
          dir="rtl"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(false);
            }}
            className="absolute top-4 left-4 bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl"
            aria-label="إغلاق"
          >
            ✕
          </button>

          {/* Counter */}
          {images.length > 1 && (
            <span className="absolute top-4 right-4 bg-white/10 text-white text-sm px-3 py-1 rounded-lg">
              {activeIdx + 1} / {images.length}
            </span>
          )}

          {/* Prev/Next */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx((i) => (i - 1 + images.length) % images.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                aria-label="السابق"
              >
                ›
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx((i) => (i + 1) % images.length);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                aria-label="التالي"
              >
                ‹
              </button>
            </>
          )}

          {/* Main image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImg}
            alt={title}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
