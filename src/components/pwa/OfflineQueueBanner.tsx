"use client";

import { useOfflineQueue } from "@/lib/hooks/useOfflineQueue";
import { CloudOff, RefreshCw, Loader2 } from "lucide-react";

/**
 * Shows a banner when there are ads queued for offline submission.
 * Place this in the main layout so it's visible across the app.
 */
export default function OfflineQueueBanner() {
  const { queueCount, isProcessing, processAllQueued } = useOfflineQueue();

  if (queueCount === 0) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm" dir="rtl">
      <div className="flex items-center gap-2">
        <CloudOff size={16} />
        <span>
          {queueCount === 1
            ? "عندك إعلان مستني الإنترنت يرجع"
            : `عندك ${queueCount} إعلانات مستنية الإنترنت`}
        </span>
      </div>
      <button
        onClick={processAllQueued}
        disabled={isProcessing}
        className="flex items-center gap-1 bg-white/20 hover:bg-white/30 rounded-full px-3 py-1 text-xs transition-colors disabled:opacity-60"
      >
        {isProcessing ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <RefreshCw size={14} />
        )}
        {isProcessing ? "جاري النشر..." : "انشر دلوقتي"}
      </button>
    </div>
  );
}
