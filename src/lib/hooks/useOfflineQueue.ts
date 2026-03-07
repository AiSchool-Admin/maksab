"use client";

import { useEffect, useState, useCallback } from "react";
import { getQueueCount, processQueue, removeQueuedAd, getQueuedAds } from "@/lib/offline/ad-queue";

/**
 * Hook to monitor and process the offline ad queue.
 * Listens for online events and service worker messages to auto-retry.
 */
export function useOfflineQueue() {
  const [queueCount, setQueueCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refresh the queue count
  const refreshCount = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setQueueCount(count);
    } catch {
      // IndexedDB not available (SSR or unsupported browser)
    }
  }, []);

  // Submit a single queued ad to the API
  const submitQueuedAd = useCallback(
    async (
      formData: Record<string, unknown>,
      images: { name: string; type: string; base64: string }[],
    ): Promise<boolean> => {
      try {
        const token = localStorage.getItem("maksab_user_session");
        if (!token) return false;

        const parsed = JSON.parse(token);
        const accessToken = parsed.access_token || parsed.token;
        if (!accessToken) return false;

        // Upload images first
        const imageUrls: string[] = [];
        for (const img of images) {
          const blob = await fetch(img.base64).then((r) => r.blob());
          const file = new File([blob], img.name, { type: img.type });

          const uploadForm = new FormData();
          uploadForm.append("file", file);
          uploadForm.append("bucket", "ad-images");
          uploadForm.append("path", `ads/${Date.now()}_${img.name}`);

          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: uploadForm,
          });

          if (!uploadRes.ok) return false;
          const { url } = await uploadRes.json();
          imageUrls.push(url);
        }

        // Submit the ad
        const adPayload = { ...formData, images: imageUrls };
        const res = await fetch("/api/ads/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(adPayload),
        });

        return res.ok;
      } catch {
        return false;
      }
    },
    [],
  );

  // Process all queued ads
  const processAllQueued = useCallback(async () => {
    if (isProcessing) return;
    const count = await getQueueCount();
    if (count === 0) return;

    setIsProcessing(true);
    try {
      const successCount = await processQueue(submitQueuedAd);
      if (successCount > 0) {
        // Notify user via service worker
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification("مكسب", {
            body: `تم نشر ${successCount} إعلان كان مستني الإنترنت`,
            icon: "/icons/icon-192x192.png",
            dir: "rtl" as NotificationDirection,
            lang: "ar",
          });
        }
      }
    } finally {
      setIsProcessing(false);
      refreshCount();
    }
  }, [isProcessing, submitQueuedAd, refreshCount]);

  // Discard a specific queued ad
  const discardQueuedAd = useCallback(
    async (id: string) => {
      await removeQueuedAd(id);
      refreshCount();
    },
    [refreshCount],
  );

  // Get all queued ads for display
  const getAll = useCallback(async () => {
    try {
      return await getQueuedAds();
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    refreshCount();

    // Process queue when coming back online
    const handleOnline = () => {
      processAllQueued();
    };

    // Listen for service worker sync message
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "PROCESS_AD_QUEUE") {
        processAllQueued();
      }
    };

    window.addEventListener("online", handleOnline);
    navigator.serviceWorker?.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, [refreshCount, processAllQueued]);

  return {
    queueCount,
    isProcessing,
    processAllQueued,
    discardQueuedAd,
    getAll,
    refreshCount,
  };
}
