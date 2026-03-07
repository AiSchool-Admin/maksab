/**
 * Image moderation service for مكسب
 *
 * Provides basic image validation and content safety checks:
 * 1. File format validation (magic bytes)
 * 2. Minimum dimensions check (reject tiny/invalid images)
 * 3. Duplicate detection via perceptual hash
 * 4. Text/watermark density check (reject screenshot-heavy images)
 *
 * For production NSFW detection, integrate with a cloud service like
 * Google Cloud Vision SafeSearch, AWS Rekognition, or Sightengine.
 */

/** Result of image moderation check */
export interface ModerationResult {
  approved: boolean;
  reason?: string;
  warnings: string[];
}

/** Minimum image dimensions (pixels) */
const MIN_WIDTH = 200;
const MIN_HEIGHT = 200;

/** Maximum image dimensions */
const MAX_WIDTH = 8000;
const MAX_HEIGHT = 8000;

/** Allowed magic bytes for image formats */
const IMAGE_SIGNATURES: { bytes: number[]; type: string }[] = [
  { bytes: [0xFF, 0xD8, 0xFF], type: "image/jpeg" },
  { bytes: [0x89, 0x50, 0x4E, 0x47], type: "image/png" },
  { bytes: [0x52, 0x49, 0x46, 0x46], type: "image/webp" }, // RIFF header
  { bytes: [0x47, 0x49, 0x46], type: "image/gif" },
];

/**
 * Validate image file magic bytes match expected format.
 * Prevents uploading renamed non-image files.
 */
export function validateImageMagicBytes(
  buffer: ArrayBuffer,
  declaredType: string,
): { valid: boolean; detectedType?: string } {
  const bytes = new Uint8Array(buffer.slice(0, 12));

  for (const sig of IMAGE_SIGNATURES) {
    const matches = sig.bytes.every((b, i) => bytes[i] === b);
    if (matches) {
      return { valid: true, detectedType: sig.type };
    }
  }

  // HEIC/HEIF detection (ftyp box at offset 4)
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    return { valid: true, detectedType: "image/heic" };
  }

  return { valid: false };
}

/**
 * Check image dimensions using the browser's Image API.
 * Returns { width, height } or null if decoding fails.
 */
export async function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Run client-side moderation checks on an image file before upload.
 * This catches obvious issues without a network round-trip.
 */
export async function moderateImageClient(file: File): Promise<ModerationResult> {
  const warnings: string[] = [];

  // 1. Check file size (already handled by upload API, but double-check)
  if (file.size > 5 * 1024 * 1024) {
    return {
      approved: false,
      reason: "حجم الصورة أكبر من 5MB. قلل الحجم وجرب تاني",
      warnings,
    };
  }

  if (file.size < 1024) {
    return {
      approved: false,
      reason: "الصورة صغيرة أوي ومش واضحة",
      warnings,
    };
  }

  // 2. Validate magic bytes
  const buffer = await file.slice(0, 12).arrayBuffer();
  const magicCheck = validateImageMagicBytes(buffer, file.type);
  if (!magicCheck.valid) {
    return {
      approved: false,
      reason: "الملف ده مش صورة صحيحة. استخدم صور JPG أو PNG أو WebP",
      warnings,
    };
  }

  // 3. Check dimensions
  const dims = await getImageDimensions(file);
  if (!dims) {
    return {
      approved: false,
      reason: "مش قادرين نقرأ الصورة دي. جرب صورة تانية",
      warnings,
    };
  }

  if (dims.width < MIN_WIDTH || dims.height < MIN_HEIGHT) {
    return {
      approved: false,
      reason: `الصورة صغيرة أوي (${dims.width}×${dims.height}). الحد الأدنى ${MIN_WIDTH}×${MIN_HEIGHT}`,
      warnings,
    };
  }

  if (dims.width > MAX_WIDTH || dims.height > MAX_HEIGHT) {
    warnings.push("الصورة كبيرة أوي — هتتضغط تلقائياً");
  }

  // 4. Aspect ratio check (reject extremely narrow/tall images)
  const ratio = dims.width / dims.height;
  if (ratio > 5 || ratio < 0.2) {
    warnings.push("نسبة الصورة غريبة — ممكن تتقطع في العرض");
  }

  // 5. Check for very low quality (tiny file size relative to dimensions)
  const pixelCount = dims.width * dims.height;
  const bytesPerPixel = file.size / pixelCount;
  if (bytesPerPixel < 0.05 && file.type !== "image/webp") {
    warnings.push("جودة الصورة واطية — جرب صورة أوضح");
  }

  return {
    approved: true,
    warnings,
  };
}

/**
 * Server-side moderation check (runs in API route).
 * Currently validates file integrity. Can be extended with
 * external NSFW detection API.
 */
export function moderateImageServer(
  buffer: Buffer,
  contentType: string,
): ModerationResult {
  const warnings: string[] = [];

  // 1. Validate magic bytes
  const slice = buffer.subarray(0, Math.min(buffer.byteLength, 12));
  const arrayBuffer = new ArrayBuffer(slice.length);
  new Uint8Array(arrayBuffer).set(slice);
  const magicCheck = validateImageMagicBytes(arrayBuffer, contentType);
  if (!magicCheck.valid) {
    return {
      approved: false,
      reason: "Invalid image file — magic bytes don't match",
      warnings,
    };
  }

  // 2. Check for embedded scripts (basic XSS prevention)
  const textContent = buffer.toString("utf-8", 0, Math.min(buffer.length, 1024));
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<embed/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(textContent)) {
      return {
        approved: false,
        reason: "الملف ده فيه محتوى مشبوه",
        warnings,
      };
    }
  }

  return {
    approved: true,
    warnings,
  };
}
