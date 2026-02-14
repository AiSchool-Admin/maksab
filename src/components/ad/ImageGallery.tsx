"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { X, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

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
    <>
      <div className="relative bg-gray-light">
        {/* Image area */}
        <div
          className="aspect-[4/3] overflow-hidden cursor-zoom-in"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => hasImages && setIsZoomed(true)}
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

        {/* Zoom hint */}
        {hasImages && (
          <button
            type="button"
            onClick={() => setIsZoomed(true)}
            className="absolute top-3 end-3 bg-black/50 text-white p-1.5 rounded-lg backdrop-blur-sm hover:bg-black/70 transition-colors btn-icon-sm"
            aria-label="تكبير الصورة"
          >
            <ZoomIn size={16} />
          </button>
        )}

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

      {/* Full-screen zoom modal */}
      {isZoomed && hasImages && (
        <ImageZoomModal
          images={images}
          title={title}
          initialIndex={current}
          onClose={() => setIsZoomed(false)}
          onIndexChange={setCurrent}
        />
      )}
    </>
  );
}

/* ── Full-screen Image Zoom Modal ── */

function ImageZoomModal({
  images,
  title,
  initialIndex,
  onClose,
  onIndexChange,
}: {
  images: string[];
  title: string;
  initialIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const [current, setCurrentInternal] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const lastPinchRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const setCurrent = useCallback(
    (idx: number) => {
      setCurrentInternal(idx);
      onIndexChange(idx);
      // Reset zoom on image change
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    },
    [onIndexChange],
  );

  const goTo = (index: number) => {
    if (index >= 0 && index < images.length) setCurrent(index);
  };

  // Handle pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      lastPinchRef.current = dist;
    } else if (e.touches.length === 1) {
      if (scale > 1) {
        setIsDragging(true);
        lastTouchRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      } else {
        lastTouchRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchRef.current !== null) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const newScale = Math.max(1, Math.min(4, scale * (dist / lastPinchRef.current)));
      setScale(newScale);
      lastPinchRef.current = dist;
    } else if (e.touches.length === 1 && isDragging && scale > 1 && lastTouchRef.current) {
      const dx = e.touches[0].clientX - lastTouchRef.current.x;
      const dy = e.touches[0].clientY - lastTouchRef.current.y;
      setTranslate((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (lastPinchRef.current !== null) {
      lastPinchRef.current = null;
      if (scale <= 1.1) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }
    } else if (e.changedTouches.length === 1 && lastTouchRef.current && !isDragging) {
      const diff = lastTouchRef.current.x - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 60 && scale <= 1) {
        // Swipe for navigation (RTL aware)
        if (diff < 0) goTo(current + 1);
        else goTo(current - 1);
      }
    }
    setIsDragging(false);
    lastTouchRef.current = null;
  };

  // Double-tap to zoom
  const lastTapRef = useRef(0);
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (scale > 1) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      } else {
        setScale(2.5);
      }
    }
    lastTapRef.current = now;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white z-10">
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          aria-label="إغلاق"
        >
          <X size={24} />
        </button>
        <span className="text-sm font-bold">
          {current + 1} / {images.length}
        </span>
        <div className="w-10" /> {/* Spacer for alignment */}
      </div>

      {/* Image */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleDoubleTap}
      >
        <div
          style={{
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            transition: isDragging ? "none" : "transform 0.2s ease-out",
          }}
        >
          <Image
            src={images[current]}
            alt={`${title} — صورة ${current + 1}`}
            width={800}
            height={600}
            className="max-h-[80vh] w-auto object-contain select-none"
            draggable={false}
            priority
          />
        </div>
      </div>

      {/* Desktop navigation arrows */}
      {images.length > 1 && (
        <>
          {current > 0 && (
            <button
              type="button"
              onClick={() => goTo(current - 1)}
              className="hidden md:flex absolute start-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              aria-label="الصورة السابقة"
            >
              <ChevronRight size={24} />
            </button>
          )}
          {current < images.length - 1 && (
            <button
              type="button"
              onClick={() => goTo(current + 1)}
              className="hidden md:flex absolute end-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              aria-label="الصورة التالية"
            >
              <ChevronLeft size={24} />
            </button>
          )}
        </>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex justify-center gap-2 px-4 py-3 bg-black/80">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                i === current ? "border-white" : "border-transparent opacity-50"
              }`}
            >
              <Image
                src={img}
                alt={`صورة مصغرة ${i + 1}`}
                fill
                sizes="56px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom hint */}
      {scale <= 1 && (
        <p className="absolute bottom-24 inset-x-0 text-center text-white/50 text-[10px]">
          اضغط مرتين للتكبير — اسحب للتنقل بين الصور
        </p>
      )}
    </div>
  );
}
