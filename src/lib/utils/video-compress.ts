/**
 * Video processing utility for ad media.
 * Handles validation, thumbnail extraction, and duration check.
 */

export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_VIDEO_DURATION = 30; // seconds

export interface VideoFile {
  file: File;
  preview: string; // object URL for playback
  thumbnail: string; // data URL for thumbnail preview
  duration: number; // seconds
}

/**
 * Process a video file: validate size/duration, extract thumbnail.
 */
export async function processVideo(file: File): Promise<VideoFile> {
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error("حجم الفيديو أكبر من 50MB. صوّر فيديو أقصر");
  }

  if (!file.type.startsWith("video/")) {
    throw new Error("الملف ده مش فيديو");
  }

  const preview = URL.createObjectURL(file);

  try {
    const { duration, thumbnail } = await getVideoMetadata(preview);

    if (duration > MAX_VIDEO_DURATION + 2) {
      URL.revokeObjectURL(preview);
      throw new Error(`الفيديو أطول من ${MAX_VIDEO_DURATION} ثانية. صوّر فيديو أقصر`);
    }

    return { file, preview, thumbnail, duration };
  } catch (err) {
    URL.revokeObjectURL(preview);
    throw err;
  }
}

/**
 * Extract duration and thumbnail from a video URL.
 */
function getVideoMetadata(url: string): Promise<{ duration: number; thumbnail: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    let resolved = false;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      // Seek to 10% for a representative thumbnail
      video.currentTime = Math.min(1, duration * 0.1);
    };

    video.onseeked = () => {
      if (resolved) return;
      resolved = true;

      const canvas = document.createElement("canvas");
      canvas.width = Math.min(video.videoWidth, 640);
      canvas.height = Math.round(
        (canvas.width / Math.max(video.videoWidth, 1)) * video.videoHeight,
      );
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      const thumbnail = canvas.toDataURL("image/jpeg", 0.7);
      resolve({ duration: video.duration, thumbnail });
    };

    video.onerror = () => {
      if (!resolved) {
        resolved = true;
        reject(new Error("فشل تحميل الفيديو"));
      }
    };

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error("الفيديو أخد وقت طويل في التحميل"));
      }
    }, 15000);
  });
}

/**
 * Create a video file from a MediaRecorder blob.
 */
export async function blobToVideoFile(blob: Blob, durationSeconds: number): Promise<VideoFile> {
  const file = new File([blob], `video-${Date.now()}.webm`, { type: blob.type || "video/webm" });

  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error("حجم الفيديو أكبر من 50MB");
  }

  const preview = URL.createObjectURL(file);

  try {
    const { thumbnail } = await getVideoMetadata(preview);
    return { file, preview, thumbnail, duration: durationSeconds };
  } catch {
    // If thumbnail extraction fails, use a blank thumbnail
    return { file, preview, thumbnail: "", duration: durationSeconds };
  }
}
