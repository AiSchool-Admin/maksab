/**
 * Demo Mode — allows testing the full app without backend dependencies.
 *
 * When activated:
 * - Creates a demo user session (client-side only)
 * - Seeds realistic sample ads across all categories
 * - All operations work locally (no SUPABASE_SERVICE_ROLE_KEY needed)
 */

import type { UserProfile } from "@/lib/supabase/auth";

const DEMO_MODE_KEY = "maksab_demo_mode";
const DEMO_SESSION_KEY = "maksab_user_session";

export const DEMO_USER: UserProfile = {
  id: "demo-user-01012345678",
  phone: "01012345678",
  display_name: "أحمد محمد",
  avatar_url: null,
  governorate: "القاهرة",
  city: "مدينة نصر",
  bio: "بحب الصفقات الكويسة على مكسب 💚",
  is_commission_supporter: true,
  total_ads_count: 5,
  rating: 4.7,
  created_at: new Date(Date.now() - 90 * 24 * 3600000).toISOString(),
  updated_at: new Date().toISOString(),
};

/** Check if demo mode is active */
export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_MODE_KEY) === "true";
}

/** Activate demo mode — creates user session + seeds demo ads */
export function activateDemoMode(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_MODE_KEY, "true");
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(DEMO_USER));
}

/** Deactivate demo mode — clears everything */
export function deactivateDemoMode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_MODE_KEY);
  localStorage.removeItem(DEMO_SESSION_KEY);
  localStorage.removeItem("maksab_demo_ads");
  localStorage.removeItem("maksab_dev_session");
}

/** Check if a given ID belongs to a demo ad */
export function isDemoAd(id: string): boolean {
  return id.startsWith("demo-ad-");
}
