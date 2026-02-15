"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { startAnalyticsFlush, trackPageView } from "@/lib/analytics/analytics-service";

/**
 * Analytics Provider — initializes analytics flush timer
 * and tracks page views on route changes.
 * Place once in the root layout.
 */
export default function AnalyticsProvider() {
  const pathname = usePathname();
  const initialized = useRef(false);
  const lastPath = useRef("");

  // Start analytics flush timer on mount
  useEffect(() => {
    if (!initialized.current) {
      startAnalyticsFlush();
      initialized.current = true;
    }
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (pathname && pathname !== lastPath.current) {
      lastPath.current = pathname;
      trackPageView(pathname);
    }
  }, [pathname]);

  return null;
}
