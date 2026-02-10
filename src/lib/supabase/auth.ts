import { supabase } from "./client";

/**
 * Custom OTP Authentication System
 *
 * This system uses our own API routes (/api/auth/send-otp, /api/auth/verify-otp)
 * instead of Supabase's built-in phone auth (which requires paid Twilio SMS).
 *
 * OTP delivery channels (configured via env vars):
 * - WhatsApp Cloud API: First 1000/month free
 * - SMS via Twilio: Paid fallback
 * - Manual: User receives code via configured channel
 */

const SESSION_KEY = "maksab_user_session";

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
  seller_type: "individual" | "store";
  store_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Response from send-otp API */
export type SendOtpResult = {
  error: string | null;
  token?: string; // HMAC-signed token to send back with verify
  channel?: "dev" | "whatsapp" | "sms" | "manual";
  dev_code?: string; // Only in dev mode
  whatsapp_link?: string | null;
};

// ── Session persistence (localStorage) ──────────────────────────────
function saveSession(user: UserProfile): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
}

function loadSession(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as UserProfile;
  } catch {
    return null;
  }
}

function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

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
      token: data.token,
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
  token: string,
  displayName?: string,
): Promise<{ user: UserProfile | null; error: string | null }> {
  try {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code: otp, token, display_name: displayName }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { user: null, error: data.error || "الكود غلط أو انتهت صلاحيته" };
    }

    if (!data.user) {
      return { user: null, error: "حصلت مشكلة. جرب تاني" };
    }

    const userProfile = data.user as UserProfile;

    // Save session to localStorage for persistence
    saveSession(userProfile);

    // Try to establish a Supabase auth session (for RLS queries)
    if (data.magic_link_token) {
      try {
        await supabase.auth.verifyOtp({
          token_hash: data.magic_link_token,
          type: "magiclink",
        });
      } catch {
        // Session creation failed — user profile still works via localStorage
        // Ad creation uses server-side API with service role key as fallback
      }
    }

    return { user: userProfile, error: null };
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
    seller_type: "individual" as const,
    store_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ── Update user profile ───────────────────────────────────────────────
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, "display_name" | "avatar_url" | "governorate" | "city" | "bio">>,
): Promise<{ user: UserProfile | null; error: string | null }> {
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
  // 1. Check localStorage for saved session (fastest — no network)
  const savedUser = loadSession();
  if (savedUser) return savedUser;

  // 2. Check Supabase auth session
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data } = await supabase
      .from("profiles" as never)
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();

    if (data) {
      const profile = data as unknown as UserProfile;
      saveSession(profile); // Cache for next time
      return profile;
    }

    const profile = await upsertUserProfile(session.user.id, session.user.email || session.user.phone || "");
    if (profile) saveSession(profile);
    return profile;
  } catch {
    return null;
  }
}

// ── Logout ────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  clearSession();
  try {
    await supabase.auth.signOut();
  } catch {
    // Silent — session might already be gone
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
