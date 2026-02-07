import { supabase } from "./client";

/**
 * Dev mode bypass — when NEXT_PUBLIC_DEV_MODE=true, auth flows
 * skip real Supabase OTP and use a fake dev user instead.
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

// ── Send OTP (Phone SMS) ──────────────────────────────────────────────
export async function sendOTP(phone: string): Promise<{ error: string | null }> {
  if (IS_DEV_MODE) {
    await new Promise((r) => setTimeout(r, 500));
    return { error: null };
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: `+2${phone}`, // Egypt country code
  });

  if (error) {
    if (error.message.includes("rate")) {
      return { error: "استنى شوية قبل ما تبعت كود تاني" };
    }
    return { error: "حصلت مشكلة في إرسال الكود. جرب تاني" };
  }

  return { error: null };
}

// ── Send OTP via WhatsApp ─────────────────────────────────────────────
// Uses Supabase phone OTP but opens WhatsApp for delivery (free alternative)
export async function sendWhatsAppOTP(phone: string): Promise<{ error: string | null }> {
  if (IS_DEV_MODE) {
    await new Promise((r) => setTimeout(r, 500));
    return { error: null };
  }

  // Use Supabase phone OTP — the OTP is sent via Supabase's configured provider
  // For WhatsApp delivery, configure Twilio WhatsApp in Supabase dashboard
  const { error } = await supabase.auth.signInWithOtp({
    phone: `+2${phone}`,
    options: {
      channel: "whatsapp",
    },
  });

  if (error) {
    if (error.message.includes("rate")) {
      return { error: "استنى شوية قبل ما تبعت كود تاني" };
    }
    return { error: "حصلت مشكلة في إرسال الكود على واتساب. جرب تاني" };
  }

  return { error: null };
}

// ── Send OTP (Email — free) ──────────────────────────────────────────
export async function sendEmailOTP(email: string): Promise<{ error: string | null }> {
  if (IS_DEV_MODE) {
    await new Promise((r) => setTimeout(r, 500));
    return { error: null };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    if (error.message.includes("rate")) {
      return { error: "استنى شوية قبل ما تبعت كود تاني" };
    }
    return { error: "حصلت مشكلة في إرسال الكود. جرب تاني" };
  }

  return { error: null };
}

// ── Verify OTP (Phone SMS) ──────────────────────────────────────────
export async function verifyOTP(
  phone: string,
  otp: string,
): Promise<{ user: UserProfile | null; error: string | null }> {
  if (IS_DEV_MODE) {
    await new Promise((r) => setTimeout(r, 500));
    return { user: DEV_USER, error: null };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: `+2${phone}`,
    token: otp,
    type: "sms",
  });

  if (error) {
    if (error.message.includes("invalid") || error.message.includes("expired")) {
      return { user: null, error: "الكود غلط أو انتهت صلاحيته. جرب تاني" };
    }
    return { user: null, error: "حصلت مشكلة في التحقق. جرب تاني" };
  }

  if (!data.user) {
    return { user: null, error: "حصلت مشكلة. جرب تاني" };
  }

  const profile = await upsertUserProfile(data.user.id, phone);
  return { user: profile, error: null };
}

// ── Verify OTP (Email) ──────────────────────────────────────────────
export async function verifyEmailOTP(
  email: string,
  otp: string,
): Promise<{ user: UserProfile | null; error: string | null }> {
  if (IS_DEV_MODE) {
    await new Promise((r) => setTimeout(r, 500));
    return { user: DEV_USER, error: null };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: "email",
  });

  if (error) {
    if (error.message.includes("invalid") || error.message.includes("expired")) {
      return { user: null, error: "الكود غلط أو انتهت صلاحيته. جرب تاني" };
    }
    return { user: null, error: "حصلت مشكلة في التحقق. جرب تاني" };
  }

  if (!data.user) {
    return { user: null, error: "حصلت مشكلة. جرب تاني" };
  }

  // Use email as phone placeholder for profile
  const profile = await upsertUserProfile(data.user.id, email);
  return { user: profile, error: null };
}

// ── Admin Login (Email + Password) ──────────────────────────────────
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
    if (error.message.includes("Email not confirmed")) {
      return { user: null, error: "الإيميل لسه مش متأكد. جرب تأكيده الأول" };
    }
    return { user: null, error: `حصلت مشكلة في تسجيل الدخول: ${error.message}` };
  }

  if (!data.user) {
    return { user: null, error: "حصلت مشكلة. جرب تاني" };
  }

  const profile = await upsertUserProfile(data.user.id, data.user.email || email);
  return { user: profile, error: null };
}

// ── Admin Signup (one-time setup) ───────────────────────────────────
export async function adminSignup(
  email: string,
  password: string,
): Promise<{ user: UserProfile | null; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Auto-confirm email in development
      data: { email_confirmed: true },
    },
  });

  if (error) {
    console.error("[adminSignup] Supabase error:", error.message, error.status);
    if (error.message.includes("already registered")) {
      return { user: null, error: "الإيميل ده مسجّل قبل كده. جرب تسجيل الدخول" };
    }
    return { user: null, error: `حصلت مشكلة في إنشاء الحساب: ${error.message}` };
  }

  if (!data.user) {
    return { user: null, error: "حصلت مشكلة. جرب تاني" };
  }

  // If email confirmation is required, user won't have a session yet
  if (!data.session) {
    return { user: null, error: "تم إنشاء الحساب! محتاج تأكد إيميلك الأول. شيك على الـ inbox" };
  }

  const profile = await upsertUserProfile(data.user.id, email);
  return { user: profile, error: null };
}

// ── Upsert user profile ───────────────────────────────────────────────
async function upsertUserProfile(userId: string, contactInfo: string): Promise<UserProfile> {
  // Determine if contactInfo is an email or phone
  const isEmail = contactInfo.includes("@");
  const phone = isEmail ? "" : contactInfo;

  // Try to fetch existing profile first (maybeSingle avoids 406 on 0 rows)
  const { data: existing, error: selectError } = await supabase
    .from("users" as never)
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("[upsertUserProfile] Select error:", selectError.message, selectError.code);
  }

  if (existing) {
    return existing as unknown as UserProfile;
  }

  // Create new profile using upsert (handles both insert and conflict)
  const { data: created, error: insertError } = await supabase
    .from("users" as never)
    .upsert({ id: userId, phone } as never, { onConflict: "id" } as never)
    .select()
    .maybeSingle();

  if (insertError) {
    console.error("[upsertUserProfile] Upsert error:", insertError.message, insertError.code, insertError.details);
  }

  if (created) {
    return created as unknown as UserProfile;
  }

  // Fallback: return minimal profile
  return {
    id: userId,
    phone,
    display_name: null,
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
    .from("users" as never)
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
    .from("users" as never)
    .select("*")
    .eq("id", session.user.id)
    .single();

  return (data as unknown as UserProfile) || null;
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
  let filled = 1; // phone/email is always present
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
