"use client";

import { useUpdateStore } from "@/stores/update-store";
import { RefreshCw } from "lucide-react";

/**
 * Shows a banner at the top of the page when a new version
 * of the app is available. User can tap to refresh.
 */
export default function UpdateBanner() {
  const { updateAvailable, applyUpdate } = useUpdateStore();

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] bg-[#1B7A3D] text-white px-4 py-3 shadow-lg animate-slide-down">
      <div className="flex items-center justify-between max-w-lg mx-auto gap-3">
        <p className="text-sm font-cairo font-medium">
          فيه تحديث جديد للتطبيق
        </p>
        <button
          onClick={applyUpdate}
          className="flex items-center gap-1.5 bg-white text-[#1B7A3D] px-3 py-1.5 rounded-lg text-sm font-bold font-cairo shrink-0 active:scale-95 transition-transform"
        >
          <RefreshCw size={14} />
          حدّث دلوقتي
        </button>
      </div>
    </div>
  );
}
