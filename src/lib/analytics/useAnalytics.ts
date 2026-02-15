"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  trackEvent,
  trackPageView,
  trackShare,
  startAnalyticsFlush,
  type AnalyticsEventType,
} from "./analytics-service";

/**
 * Hook for tracking analytics events in components.
 * Automatically includes the current user ID.
 */
export function useAnalytics() {
  const { user } = useAuth();
  const userId = user?.id;
  const initialized = useRef(false);

  // Start flush timer once
  useEffect(() => {
    if (!initialized.current) {
      startAnalyticsFlush();
      initialized.current = true;
    }
  }, []);

  return {
    /**
     * Track any analytics event
     */
    track: (eventType: AnalyticsEventType, data?: Record<string, unknown>) => {
      trackEvent(eventType, data, userId);
    },

    /**
     * Track page view (call in useEffect)
     */
    trackPage: (pageName?: string) => {
      trackPageView(pageName, userId);
    },

    /**
     * Track share to a platform
     */
    trackShare: (platform: "whatsapp" | "facebook" | "copy_link" | "native", adId?: string) => {
      trackShare(platform, adId, userId);
    },
  };
}

/**
 * Hook to automatically track page views
 */
export function usePageView(pageName?: string) {
  const { user } = useAuth();
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      trackPageView(pageName, user?.id);
      tracked.current = true;
    }
  }, [pageName, user?.id]);
}
