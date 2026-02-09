import { supabase } from "./client";

/**
 * Custom OTP Authentication System
 *
 * This system uses our own API routes (/api/auth/send-otp, /api/auth/verify-otp)
 * instead of Supabase's built-in phone auth (which requires paid Twilio SMS).
 *
 * OTP delivery channels (configured via env vars):
 * - Dev mode: Code shown on screen (123456)
 * - WhatsApp Cloud API: First 1000/month free
 * - SMS via Twilio: Paid fallback
 * - Manual: User receives code via configured channel
 */

const IS_DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

const DEV_USER = {
  id: "dev-00000000-0000-0000-0000-000000000000",
  phone: "01000000000",
  display_name: "مطوّر مكسب",
  avatar_url: null,
  governorate: "القاهرة",
  city: "وسط البلد",
  bio: "حساب المطوّر للاختبار",
  is_commission_supporter: false,
  total_ads_count: 0,
  rating: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export type UserProfile = {
  id: string;
  phone: string;
  display_name: string | null;
  avatar_url: string | null;
  governorate: string | null;
  city: string | null;
  bio: string | null;
  is_commission_supporter: boolean;
  total_ads_count: number;
  rating: number;
  created_at: string;
  updated_at: string;
};

/** Response from send-otp API */
export type SendOtpResult = {
  error: string | null;
  channel?: "dev" | "whatsapp" | "sms" | "manual";
  dev_code?: string; // Only in dev mode
  whatsapp_link?: string | null;
};

// ── Send OTP (Custom API — Free) ────────────────────────────────────
export async function sendOTP(phone: string): Promise<SendOtpResult> {
  try {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error || "حصلت مشكلة في إرسال الكود. جرب تاني" };
    }

    return {
      error: null,
      channel: data.channel,
      dev_code: data.dev_code,
      whatsapp_link: data.whatsapp_link,
    };
  } catch {
    return { error: "حصلت مشكلة في الاتصال. تأكد من الإنترنت وجرب تاني" };
  }
}

// ── Verify OTP (Custom API — Free) ──────────────────────────────────
export async function verifyOTP(
  phone: string,
  otp: string,
  displayName?: string,
): Promise<{ user: UserProfile | null; error: string | null }> {
  // Dev mode: accept 123456 without API call
  if (IS_DEV_MODE && otp === "123456") {
    await new Promise((r) => setTimeout(r, 300));
    return {
      user: displayName ? { ...DEV_USER, display_name: displayName } : DEV_USER,
      error: null,
    };
  }

  try {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code: otp, display_name: displayName }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { user: null, error: data.error || "الكود غلط أو انتهت صلاحيته" };
    }

    if (!data.user) {
      return { user: null, error: "حصلت مشكلة. جرب تاني" };
    }

    // If we got a magic link token, use it to establish a Supabase session
    if (data.virtual_email && data.magic_link_token) {
      try {
        await supabase.auth.verifyOtp({
          email: data.virtual_email,
          token: data.magic_link_token,
          type: "magiclink",
        });
      } catch {
        // Session creation failed — user profile is still valid
        // They'll get a new session next time
        console.warn("[verifyOTP] Session creation failed, continuing with profile only");
      }
    }

    return { user: data.user as UserProfile, error: null };
  } catch {
    return { user: null, error: "حصلت مشكلة في الاتصال. تأكد من الإنترنت وجرب تاني" };
  }
}

// ── Admin Login (Email + Password — kept for admin access) ──────────
export async function adminLogin(
  email: string,
  password: string,
): Promise<{ user: UserProfile | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[adminLogin] Supabase error:", error.message, error.status);
    if (error.message.includes("Invalid login")) {
      return { user: null, error: "الإيميل أو كلمة السر غلط" };
    }
    return { user: null, error: "حصلت مشكلة في تسجيل الدخول" };
  }

  if (!data.user) {
    return { user: null, error: "حصلت مشكلة. جرب تاني" };
  }

  const profile = await upsertUserProfile(data.user.id, data.user.email || email);
  return { user: profile, error: null };
}

// ── Upsert user profile ───────────────────────────────────────────────
async function upsertUserProfile(userId: string, contactInfo: string, displayName?: string): Promise<UserProfile> {
  const isEmail = contactInfo.includes("@");
  const phone = isEmail ? "" : contactInfo;

  const { data: existing, error: selectError } = await supabase
    .from("profiles" as never)
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("[upsertUserProfile] Select error:", selectError.message, selectError.code);
  }

  if (existing) {
    const profile = existing as unknown as UserProfile;
    if (displayName && !profile.display_name) {
      const { data: updated } = await supabase
        .from("profiles" as never)
        .update({ display_name: displayName, updated_at: new Date().toISOString() } as never)
        .eq("id", userId)
        .select()
        .maybeSingle();
      if (updated) return updated as unknown as UserProfile;
    }
    return profile;
  }

  const profileData: Record<string, unknown> = { id: userId, phone };
  if (displayName) {
    profileData.display_name = displayName;
  }

  const { data: created, error: insertError } = await supabase
    .from("profiles" as never)
    .upsert(profileData as never, { onConflict: "id" } as never)
    .select()
    .maybeSingle();

  if (insertError) {
    console.error("[upsertUserProfile] Upsert error:", insertError.message, insertError.code, insertError.details);
  }

  if (created) {
    return created as unknown as UserProfile;
  }

  return {
    id: userId,
    phone,
    display_name: displayName || null,
    avatar_url: null,
    governorate: null,
    city: null,
    bio: null,
    is_commission_supporter: false,
    total_ads_count: 0,
    rating: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ── Update user profile ───────────────────────────────────────────────
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, "display_name" | "avatar_url" | "governorate" | "city" | "bio">>,
): Promise<{ user: UserProfile | null; error: string | null }> {
  if (IS_DEV_MODE) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      user: { ...DEV_USER, ...updates },
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("profiles" as never)
    .update({ ...updates, updated_at: new Date().toISOString() } as never)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return { user: null, error: "مقدرناش نحدّث البيانات. جرب تاني" };
  }

  return { user: data as unknown as UserProfile, error: null };
}

// ── Get current session ───────────────────────────────────────────────
export async function getCurrentUser(): Promise<UserProfile | null> {
  if (!IS_DEV_MODE && typeof window !== "undefined") {
    localStorage.removeItem("maksab_dev_session");
  }

  if (IS_DEV_MODE) {
    if (typeof window !== "undefined") {
      const devSession = localStorage.getItem("maksab_dev_session");
      if (devSession) return DEV_USER;
    }
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data } = await supabase
    .from("profiles" as never)
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  if (data) return data as unknown as UserProfile;

  const profile = await upsertUserProfile(session.user.id, session.user.email || session.user.phone || "");
  return profile;
}

// ── Logout ────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  if (IS_DEV_MODE) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("maksab_dev_session");
    }
    return;
  }

  await supabase.auth.signOut();
}

// ── Dev login (saves session to localStorage) ─────────────────────────
export function devLogin(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("maksab_dev_session", "true");
  }
}

// ── Profile completion calculation ────────────────────────────────────
export function calcProfileCompletion(user: UserProfile): {
  percentage: number;
  missing: string[];
} {
  const fields: { key: keyof UserProfile; label: string }[] = [
    { key: "display_name", label: "اسم العرض" },
    { key: "avatar_url", label: "صورة البروفايل" },
    { key: "governorate", label: "المحافظة" },
    { key: "city", label: "المدينة" },
    { key: "bio", label: "نبذة مختصرة" },
  ];

  const total = fields.length + 1;
  let filled = 1; // phone is always present
  const missing: string[] = [];

  for (const f of fields) {
    if (user[f.key]) {
      filled++;
    } else {
      missing.push(f.label);
    }
  }

  return {
    percentage: Math.round((filled / total) * 100),
    missing,
  };
}
