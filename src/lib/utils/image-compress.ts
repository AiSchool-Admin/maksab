const MAX_SIZE = 1024 * 1024; // 1MB
const MAX_DIMENSION = 1600;

export interface CompressedImage {
  file: File;
  preview: string;
  width?: number;
  height?: number;
  originalSize?: number;
  compressedSize?: number;
}

export async function compressImage(file: File): Promise<CompressedImage> {
  // If already small enough and is JPEG/WebP, return as-is
  if (
    file.size <= MAX_SIZE &&
    (file.type === "image/jpeg" || file.type === "image/webp")
  ) {
    return { file, preview: URL.createObjectURL(file), originalSize: file.size, compressedSize: file.size };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const originalSize = file.size;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(
          MAX_DIMENSION / width,
          MAX_DIMENSION / height,
        );
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("فشل ضغط الصورة"));
              return;
            }
            if (blob.size > MAX_SIZE && quality > 0.3) {
              quality -= 0.1;
              tryCompress();
              return;
            }
            const compressed = new File([blob], file.name, {
              type: "image/jpeg",
            });
            resolve({
              file: compressed,
              preview: URL.createObjectURL(compressed),
              width,
              height,
              originalSize,
              compressedSize: blob.size,
            });
          },
          "image/jpeg",
          quality,
        );
      };
      tryCompress();

      // Revoke the source object URL
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("فشل تحميل الصورة"));
    };
    img.src = URL.createObjectURL(file);
  });
}
