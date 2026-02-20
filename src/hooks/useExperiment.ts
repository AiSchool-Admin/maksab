"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getVariant,
  trackExperimentView,
  trackExperimentConversion,
} from "@/lib/ab-testing";

/**
 * React hook for A/B testing.
 *
 * Returns the assigned variant for the current user + a conversion tracker.
 * Variant assignment is deterministic and consistent across sessions.
 *
 * @example
 * const { variant, trackConversion } = useExperiment('cta_color', ['green', 'orange', 'blue']);
 * // variant is always the same for this user
 * // Call trackConversion() when the user clicks the CTA
 */
export function useExperiment<T extends string>(
  experimentName: string,
  variants: T[],
): { variant: T; trackConversion: (conversionType?: string) => void } {
  const { user } = useAuth();
  const tracked = useRef(false);

  const variant = getVariant(experimentName, variants, user?.id);

  // Track view once per mount
  useEffect(() => {
    if (!tracked.current) {
      trackExperimentView(experimentName, variant);
      tracked.current = true;
    }
  }, [experimentName, variant]);

  const trackConversion = (conversionType?: string) => {
    trackExperimentConversion(experimentName, variant, conversionType);
  };

  return { variant, trackConversion };
}
