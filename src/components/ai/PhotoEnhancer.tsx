"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Sun,
  Contrast,
  Eye,
  Check,
  X,
  SlidersHorizontal,
} from "lucide-react";

interface PhotoEnhancerProps {
  imageDataUrl: string;
  onEnhanced: (enhancedDataUrl: string) => void;
  onCancel: () => void;
}

type PresetKey = "auto" | "bright" | "sharp" | "natural";

interface Preset {
  key: PresetKey;
  label: string;
  icon: React.ReactNode;
  brightness: number;
  contrast: number;
  saturation: number;
  sharpen: number;
}

const PRESETS: Preset[] = [
  {
    key: "auto",
    label: "تلقائي",
    icon: <Sparkles size={18} />,
    brightness: 12,
    contrast: 15,
    saturation: 10,
    sharpen: 0.3,
  },
  {
    key: "bright",
    label: "مشرق",
    icon: <Sun size={18} />,
    brightness: 20,
    contrast: 10,
    saturation: 5,
    sharpen: 0.15,
  },
  {
    key: "sharp",
    label: "واضح",
    icon: <Eye size={18} />,
    brightness: 5,
    contrast: 20,
    saturation: 5,
    sharpen: 0.6,
  },
  {
    key: "natural",
    label: "طبيعي",
    icon: <Contrast size={18} />,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sharpen: 0,
  },
];

export default function PhotoEnhancer({
  imageDataUrl,
  onEnhanced,
  onCancel,
}: PhotoEnhancerProps) {
  const [activePreset, setActivePreset] = useState<PresetKey>("auto");
  const [enhancedDataUrl, setEnhancedDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const enhancedCanvasRef = useRef<HTMLCanvasElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image once on mount
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      drawOriginal(img);
      // Apply default "auto" preset
      applyPreset("auto", img);
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  const drawOriginal = useCallback((img: HTMLImageElement) => {
    const canvas = originalCanvasRef.current;
    if (!canvas) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
  }, []);

  const applyPreset = useCallback(
    (presetKey: PresetKey, img?: HTMLImageElement) => {
      const source = img || imageRef.current;
      if (!source) return;

      const preset = PRESETS.find((p) => p.key === presetKey);
      if (!preset) return;

      // Natural preset = original image
      if (presetKey === "natural") {
        setEnhancedDataUrl(imageDataUrl);
        setIsProcessing(false);
        return;
      }

      setIsProcessing(true);

      // Use setTimeout to avoid blocking the UI thread
      setTimeout(() => {
        const canvas = enhancedCanvasRef.current;
        if (!canvas) {
          setIsProcessing(false);
          return;
        }

        canvas.width = source.naturalWidth;
        canvas.height = source.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        // Draw original
        ctx.drawImage(source, 0, 0);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Step 1: Apply brightness, contrast, saturation
        applyColorAdjustments(
          data,
          preset.brightness,
          preset.contrast,
          preset.saturation
        );

        // Put adjusted data back
        ctx.putImageData(imageData, 0, 0);

        // Step 2: Apply unsharp mask (sharpening)
        if (preset.sharpen > 0) {
          applyUnsharpMask(ctx, canvas.width, canvas.height, preset.sharpen);
        }

        // Export
        const result = canvas.toDataURL("image/jpeg", 0.85);
        setEnhancedDataUrl(result);
        setIsProcessing(false);
      }, 50);
    },
    [imageDataUrl]
  );

  const handlePresetChange = (presetKey: PresetKey) => {
    setActivePreset(presetKey);
    applyPreset(presetKey);
  };

  const handleAccept = () => {
    if (enhancedDataUrl) {
      onEnhanced(enhancedDataUrl);
    }
  };

  // Slider drag handlers
  const handleSliderStart = useCallback(
    (clientX: number) => {
      setIsDragging(true);
      updateSliderPosition(clientX);
    },
    []
  );

  const updateSliderPosition = useCallback((clientX: number) => {
    const container = comparisonRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    // RTL: slider position is from the right edge
    const x = rect.right - clientX;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percent);
  }, []);

  const handleSliderMove = useCallback(
    (clientX: number) => {
      if (!isDragging) return;
      updateSliderPosition(clientX);
    },
    [isDragging, updateSliderPosition]
  );

  const handleSliderEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse events
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleSliderStart(e.clientX);
    },
    [handleSliderStart]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      handleSliderMove(e.clientX);
    },
    [handleSliderMove]
  );

  // Touch events
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        handleSliderStart(e.touches[0].clientX);
      }
    },
    [handleSliderStart]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        handleSliderMove(e.touches[0].clientX);
      }
    },
    [handleSliderMove]
  );

  // Global mouse/touch end
  useEffect(() => {
    const onEnd = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener("mouseup", onEnd);
      window.addEventListener("touchend", onEnd);
      return () => {
        window.removeEventListener("mouseup", onEnd);
        window.removeEventListener("touchend", onEnd);
      };
    }
  }, [isDragging]);

  // Global mouse move while dragging
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      updateSliderPosition(e.clientX);
    };
    const onMoveTouch = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        updateSliderPosition(e.touches[0].clientX);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMoveTouch);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMoveTouch);
    };
  }, [isDragging, updateSliderPosition]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={20} className="text-brand-green" />
          <h3 className="text-base font-bold text-dark">تحسين الصورة</h3>
        </div>
        <button
          onClick={onCancel}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-light text-gray-text hover:bg-gray-200 transition-colors"
          aria-label="إلغاء"
        >
          <X size={18} />
        </button>
      </div>

      {/* Before/After Comparison Slider */}
      <div
        ref={comparisonRef}
        className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-light select-none touch-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={handleSliderEnd}
      >
        {/* Enhanced (full width, bottom layer) */}
        {enhancedDataUrl && (
          <img
            src={enhancedDataUrl}
            alt="الصورة المحسنة"
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        )}

        {/* Original (clipped from the right in RTL) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={imageDataUrl}
            alt="الصورة الأصلية"
            className="absolute top-0 right-0 h-full object-cover"
            style={{
              width: comparisonRef.current
                ? `${comparisonRef.current.offsetWidth}px`
                : "100vw",
            }}
            draggable={false}
          />
        </div>

        {/* Slider Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
          style={{ right: `${sliderPosition}%`, transform: "translateX(50%)" }}
        >
          {/* Slider Handle */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-lg border-2 border-brand-green flex items-center justify-center cursor-grab active:cursor-grabbing"
            style={{ minWidth: "44px", minHeight: "44px" }}
          >
            <SlidersHorizontal size={18} className="text-brand-green" />
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-3 right-3 bg-black/50 text-white text-[11px] font-bold px-2 py-1 rounded-md z-20">
          قبل
        </div>
        <div className="absolute top-3 left-3 bg-brand-green/80 text-white text-[11px] font-bold px-2 py-1 rounded-md z-20 flex items-center gap-1">
          <Sparkles size={10} />
          بعد
        </div>

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-30 rounded-2xl">
            <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg">
              <div className="w-5 h-5 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-semibold text-dark">
                جاري التحسين...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvases for processing */}
      <canvas ref={originalCanvasRef} className="hidden" />
      <canvas ref={enhancedCanvasRef} className="hidden" />

      {/* Preset Buttons */}
      <div className="flex gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            onClick={() => handlePresetChange(preset.key)}
            disabled={isProcessing}
            className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all text-sm font-semibold disabled:opacity-50 ${
              activePreset === preset.key
                ? "bg-brand-green text-white shadow-md"
                : "bg-gray-light text-gray-text hover:bg-gray-200"
            }`}
          >
            {preset.icon}
            <span className="text-xs">{preset.label}</span>
          </button>
        ))}
      </div>

      {/* AI Badge */}
      {activePreset !== "natural" && !isProcessing && enhancedDataUrl && (
        <div className="flex items-center justify-center gap-1.5 py-2 bg-brand-green-light rounded-lg">
          <Sparkles size={14} className="text-brand-green" />
          <span className="text-xs font-bold text-brand-green">
            تم التحسين بالذكاء الاصطناعي
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleAccept}
          disabled={isProcessing || !enhancedDataUrl}
          className="flex-1 py-3.5 bg-brand-green text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check size={18} />
          اعتماد الصورة
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-3.5 bg-gray-light text-gray-text font-semibold rounded-xl hover:bg-gray-200 transition-colors active:scale-[0.98]"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Canvas pixel manipulation utilities
// ──────────────────────────────────────────────

/**
 * Adjusts brightness, contrast, and saturation of image pixel data in place.
 *
 * @param data - Uint8ClampedArray of RGBA pixel data
 * @param brightness - Brightness adjustment in percentage (-100 to 100)
 * @param contrast - Contrast adjustment in percentage (-100 to 100)
 * @param saturation - Saturation adjustment in percentage (-100 to 100)
 */
function applyColorAdjustments(
  data: Uint8ClampedArray,
  brightness: number,
  contrast: number,
  saturation: number
) {
  const brightnessFactor = brightness / 100;
  // Contrast: scale factor centered at 128
  const contrastFactor = (100 + contrast) / 100;
  const saturationFactor = 1 + saturation / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Brightness: add a proportion of 255
    r = r + 255 * brightnessFactor;
    g = g + 255 * brightnessFactor;
    b = b + 255 * brightnessFactor;

    // Contrast: scale around midpoint 128
    r = (r - 128) * contrastFactor + 128;
    g = (g - 128) * contrastFactor + 128;
    b = (b - 128) * contrastFactor + 128;

    // Saturation: convert to luminance, then interpolate
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = lum + (r - lum) * saturationFactor;
    g = lum + (g - lum) * saturationFactor;
    b = lum + (b - lum) * saturationFactor;

    // Clamp
    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
    // Alpha channel (i+3) unchanged
  }
}

/**
 * Applies an unsharp mask to sharpen the image.
 * Works by: sharp = original + amount * (original - blurred)
 *
 * Uses a simplified 3x3 blur kernel for performance.
 *
 * @param ctx - Canvas 2D context with the image already drawn
 * @param width - Image width
 * @param height - Image height
 * @param amount - Sharpening strength (0 to 1, typical 0.3)
 */
function applyUnsharpMask(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = imageData.data;

  // Create a copy for the blur reference
  const blurred = new Uint8ClampedArray(src);

  // Simple 3x3 box blur
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const sum =
          src[((y - 1) * width + (x - 1)) * 4 + c] +
          src[((y - 1) * width + x) * 4 + c] +
          src[((y - 1) * width + (x + 1)) * 4 + c] +
          src[(y * width + (x - 1)) * 4 + c] +
          src[(y * width + x) * 4 + c] +
          src[(y * width + (x + 1)) * 4 + c] +
          src[((y + 1) * width + (x - 1)) * 4 + c] +
          src[((y + 1) * width + x) * 4 + c] +
          src[((y + 1) * width + (x + 1)) * 4 + c];
        blurred[idx + c] = sum / 9;
      }
    }
  }

  // Apply unsharp mask: result = original + amount * (original - blurred)
  for (let i = 0; i < src.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const diff = src[i + c] - blurred[i + c];
      src[i + c] = clamp(src[i + c] + diff * amount);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
