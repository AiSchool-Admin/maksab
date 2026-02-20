"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initPostHog, phPageView, phIdentify, phSetPersonProperties } from "@/lib/analytics/posthog";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * PostHog provider — initializes PostHog and tracks page views.
 * Add to root layout alongside other analytics providers.
 */
export default function PostHogProvider() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Initialize PostHog on mount
  useEffect(() => {
    initPostHog();
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (pathname) {
      phPageView(pathname);
    }
  }, [pathname]);

  // Identify user when logged in
  useEffect(() => {
    if (user?.id) {
      phIdentify(user.id, {
        phone: user.phone || undefined,
      });
      phSetPersonProperties({
        last_seen: new Date().toISOString(),
      });
    }
  }, [user?.id, user?.phone]);

  return null;
}
