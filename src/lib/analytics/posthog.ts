/**
 * PostHog Analytics — مكسب
 *
 * Product analytics, feature flags, and session recording.
 * Env var: NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST
 */

import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let _initialized = false;

/**
 * Initialize PostHog (call once on app mount).
 */
export function initPostHog(): void {
  if (_initialized || typeof window === "undefined" || !POSTHOG_KEY) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false, // we track manually
    capture_pageleave: true,
    autocapture: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-ph-mask]",
    },
    loaded: (ph) => {
      // Disable in development
      if (process.env.NODE_ENV === "development") {
        ph.opt_out_capturing();
      }
    },
  });

  _initialized = true;
}

/**
 * Identify a user (after login).
 */
export function phIdentify(userId: string, properties?: Record<string, unknown>): void {
  if (!_initialized || !POSTHOG_KEY) return;
  posthog.identify(userId, properties);
}

/**
 * Reset identity (on logout).
 */
export function phReset(): void {
  if (!_initialized || !POSTHOG_KEY) return;
  posthog.reset();
}

/**
 * Track a custom event.
 */
export function phCapture(event: string, properties?: Record<string, unknown>): void {
  if (!_initialized || !POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

/**
 * Track page view.
 */
export function phPageView(url: string): void {
  if (!_initialized || !POSTHOG_KEY) return;
  posthog.capture("$pageview", { $current_url: url });
}

/**
 * Get a feature flag value.
 */
export function phFeatureFlag(flag: string): boolean | string | undefined {
  if (!_initialized || !POSTHOG_KEY) return undefined;
  return posthog.getFeatureFlag(flag) ?? undefined;
}

/**
 * Check if a feature flag is enabled (boolean flags).
 */
export function phIsFeatureEnabled(flag: string): boolean {
  if (!_initialized || !POSTHOG_KEY) return false;
  return posthog.isFeatureEnabled(flag) ?? false;
}

/**
 * Override a feature flag (for testing).
 */
export function phOverrideFeatureFlag(flag: string, value: boolean | string): void {
  if (!_initialized || !POSTHOG_KEY) return;
  posthog.featureFlags.override({ [flag]: value });
}

/**
 * Set user properties.
 */
export function phSetPersonProperties(properties: Record<string, unknown>): void {
  if (!_initialized || !POSTHOG_KEY) return;
  posthog.setPersonProperties(properties);
}

/**
 * Group user (for team/org analytics).
 */
export function phGroup(groupType: string, groupKey: string, properties?: Record<string, unknown>): void {
  if (!_initialized || !POSTHOG_KEY) return;
  posthog.group(groupType, groupKey, properties);
}

// Re-export posthog instance for direct access
export { posthog };
