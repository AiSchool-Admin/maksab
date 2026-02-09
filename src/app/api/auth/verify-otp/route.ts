/**
 * POST /api/auth/verify-otp
 *
 * Verifies the OTP code and creates/signs-in the user.
 * Uses Supabase Admin API to create a session without needing
 * Twilio or any paid SMS service.
 *
 * Flow:
 * 1. Check OTP code against phone_otps table
 * 2. If valid → find or create user in auth.users
 * 3. Create profile in public.profiles
 * 4. Generate session tokens
 * 5. Return user profile + session
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const IS_DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";
const MAX_ATTEMPTS = 5;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = body.phone?.replace(/\D/g, "");
    const code = body.code?.replace(/\D/g, "");
    const displayName = body.display_name?.trim() || null;

    // Validate inputs
    if (!phone || !/^01[0125]\d{8}$/.test(phone)) {
      return NextResponse.json(
        { error: "رقم الموبايل مش صحيح" },
        { status: 400 }
      );
    }
    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "كود التأكيد لازم يكون 6 أرقام" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // ── Dev mode bypass ──────────────────────────────────────────────
    if (IS_DEV_MODE && code === "123456") {
      const profile = await findOrCreateUser(supabase, phone, displayName);
      return NextResponse.json({
        user: profile,
        session: null, // Dev mode doesn't need real session
      });
    }

    // ── Verify OTP ───────────────────────────────────────────────────
    // Find the most recent unexpired, unverified OTP for this phone
    const { data: otpRecord, error: otpError } = await supabase
      .from("phone_otps")
      .select("*")
      .eq("phone", phone)
      .eq("code", code)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error("[verify-otp] DB error:", otpError);
      return NextResponse.json(
        { error: "حصلت مشكلة. جرب تاني" },
        { status: 500 }
      );
    }

    if (!otpRecord) {
      // Check if there's an OTP with too many attempts
      const { data: anyOtp } = await supabase
        .from("phone_otps")
        .select("attempts")
        .eq("phone", phone)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anyOtp && (anyOtp as { attempts: number }).attempts >= MAX_ATTEMPTS) {
        return NextResponse.json(
          { error: "عدد المحاولات كتير. اطلب كود جديد" },
          { status: 429 }
        );
      }

      // Increment attempt counter on latest OTP for this phone
      if (anyOtp) {
        await supabase
          .from("phone_otps")
          .update({ attempts: ((anyOtp as { attempts: number }).attempts || 0) + 1 })
          .eq("phone", phone)
          .eq("verified", false)
          .gt("expires_at", new Date().toISOString());
      }

      return NextResponse.json(
        { error: "الكود غلط أو انتهت صلاحيته" },
        { status: 400 }
      );
    }

    // ── Mark OTP as verified ─────────────────────────────────────────
    await supabase
      .from("phone_otps")
      .update({ verified: true })
      .eq("id", (otpRecord as { id: string }).id);

    // ── Find or create user ──────────────────────────────────────────
    const profile = await findOrCreateUser(supabase, phone, displayName);

    if (!profile) {
      return NextResponse.json(
        { error: "حصلت مشكلة في إنشاء الحساب. جرب تاني" },
        { status: 500 }
      );
    }

    // ── Generate session ─────────────────────────────────────────────
    // Use Supabase Admin API to generate a magic link / session
    // We create the user with email = phone@maksab.auth (virtual email)
    // and sign them in using a generated magic link token
    const virtualEmail = `${phone}@maksab.auth`;

    const {
      data: { properties },
    } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: virtualEmail,
    });

    // Extract tokens from the generated link
    const session = properties
      ? {
          access_token: properties.hashed_token,
          // We'll handle session differently — client will use the cookie
        }
      : null;

    return NextResponse.json({
      user: profile,
      session,
      // The client will need to exchange this for a real session
      // by calling supabase.auth.verifyOtp with the magic link token
      magic_link_token: properties?.hashed_token || null,
      virtual_email: virtualEmail,
    });

  } catch (err) {
    console.error("[verify-otp] Error:", err);
    return NextResponse.json(
      { error: "حصلت مشكلة. جرب تاني" },
      { status: 500 }
    );
  }
}

/**
 * Find existing user by phone or create a new one.
 * Uses Supabase Admin API to create auth users without password.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findOrCreateUser(
  supabase: any,
  phone: string,
  displayName: string | null,
) {
  const virtualEmail = `${phone}@maksab.auth`;

  // Check if profile exists with this phone
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (existingProfile) {
    // Update display name if provided and not yet set
    if (displayName && !(existingProfile as { display_name: string | null }).display_name) {
      await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", (existingProfile as { id: string }).id);

      return { ...existingProfile, display_name: displayName };
    }
    return existingProfile;
  }

  // No profile found — create auth user + profile
  // First check if auth user exists with this virtual email
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const existingAuth = authUsers?.users?.find(
    (u: { email?: string; phone?: string }) => u.email === virtualEmail || u.phone === `+2${phone}`
  );

  let userId: string;

  if (existingAuth) {
    userId = existingAuth.id;
  } else {
    // Create new auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: virtualEmail,
      phone: `+2${phone}`,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        phone,
        display_name: displayName,
      },
    });

    if (createError || !newUser.user) {
      console.error("[findOrCreateUser] Create auth user error:", createError);
      // If user already exists (race condition), try to find them
      const { data: retryUsers } = await supabase.auth.admin.listUsers();
      const retryUser = retryUsers?.users?.find(
        (u: { email?: string; phone?: string }) => u.email === virtualEmail || u.phone === `+2${phone}`
      );
      if (retryUser) {
        userId = retryUser.id;
      } else {
        return null;
      }
    } else {
      userId = newUser.user.id;
    }
  }

  // Create profile
  const profileData: Record<string, unknown> = {
    id: userId,
    phone,
  };
  if (displayName) {
    profileData.display_name = displayName;
  }

  const { data: newProfile, error: profileError } = await supabase
    .from("profiles")
    .upsert(profileData, { onConflict: "id" })
    .select()
    .maybeSingle();

  if (profileError) {
    console.error("[findOrCreateUser] Profile upsert error:", profileError);
  }

  return newProfile || {
    id: userId,
    phone,
    display_name: displayName,
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
