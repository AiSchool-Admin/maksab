/**
 * useTrackSignal — hook for silently collecting user behavior signals.
 * Used across the app to feed the recommendations engine.
 *
 * Usage:
 *   const { track } = useTrackSignal();
 *   track("view", { categoryId: "cars", adId: "abc", signalData: { brand: "toyota" } });
 */

"use client";

import { useCallback, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { trackSignal } from "@/lib/recommendations/signal-store";
import type { SignalType } from "@/lib/recommendations/types";

/** Minimum interval between identical signal types (in ms) */
const THROTTLE_MS = 2000;

export function useTrackSignal() {
  const { user } = useAuth();
  const lastTracked = useRef<Record<string, number>>({});

  const track = useCallback(
    (
      signalType: SignalType,
      params?: {
        categoryId?: string | null;
        subcategoryId?: string | null;
        adId?: string | null;
        signalData?: Record<string, unknown>;
        governorate?: string | null;
      },
    ) => {
      // Throttle: don't fire the same signal type too frequently
      const key = `${signalType}:${params?.adId || params?.categoryId || ""}`;
      const now = Date.now();
      if (lastTracked.current[key] && now - lastTracked.current[key] < THROTTLE_MS) {
        return;
      }
      lastTracked.current[key] = now;

      const userId = user?.id;
      if (!userId) return; // Don't track signals for unauthenticated users

      // Fire and forget — don't await, don't block UI
      trackSignal({
        userId,
        signalType,
        categoryId: params?.categoryId,
        subcategoryId: params?.subcategoryId,
        adId: params?.adId,
        signalData: params?.signalData,
        governorate: params?.governorate,
      });
    },
    [user],
  );

  return { track };
}
