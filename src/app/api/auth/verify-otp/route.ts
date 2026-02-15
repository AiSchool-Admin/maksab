/**
 * POST /api/auth/verify-otp
 *
 * Verifies the OTP code using HMAC-signed tokens (stateless — no DB table needed).
 * Then creates/signs-in the user via Supabase Admin API.
 *
 * Flow:
 * 1. Client sends: phone, code, token (from send-otp), display_name
 * 2. Decode token, verify HMAC signature matches phone:code:expiry
 * 3. If valid → find or create user in auth.users + public.profiles
 * 4. Generate session via magic link
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";
import { generateSessionToken } from "@/lib/auth/session-token";

function getSecret(): string {
  const secret = process.env.OTP_SECRET;
  if (!secret) {
    // In non-production environments (dev, preview, staging), use a dev-only secret.
    // Must match the same fallback in send-otp/route.ts.
    if (process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV !== "production") {
      return "maksab-dev-otp-secret-not-for-production";
    }
    throw new Error("Missing OTP_SECRET environment variable. Set it in production.");
  }
  return secret;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null; // Service client unavailable
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Check if we're in a non-production environment (dev/preview/staging) */
function isNonProduction(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV !== "production";
}

/**
 * Generate a dev-mode user profile when Supabase admin API is unavailable.
 * This allows testing the app on preview deployments without SUPABASE_SERVICE_ROLE_KEY.
 */
function createDevProfile(phone: string, displayName: string | null) {
  // Generate a deterministic UUID from the phone number so the same phone
  // always gets the same dev user ID
  const hash = createHmac("sha256", "dev-user-id")
    .update(phone)
    .digest("hex")
    .slice(0, 32);
  const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;

  return {
    id,
    phone,
    display_name: displayName || `مستخدم ${phone.slice(-4)}`,
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

/** Verify HMAC-SHA256 signature */
function verifyOTPToken(
  phone: string,
  code: string,
  token: string,
): { valid: boolean; error?: string } {
  try {
    const decoded = JSON.parse(
      Buffer.from(token, "base64url").toString("utf-8")
    );

    // Check expiry
    if (Date.now() > decoded.expiresAt) {
      return { valid: false, error: "الكود انتهت صلاحيته. اطلب كود جديد" };
    }

    // Check phone matches
    if (decoded.phone !== phone) {
      return { valid: false, error: "رقم الموبايل مش مطابق" };
    }

    // Verify HMAC
    const expectedHmac = createHmac("sha256", getSecret())
      .update(`${phone}:${code}:${decoded.expiresAt}`)
      .digest("hex");

    if (expectedHmac !== decoded.hmac) {
      return { valid: false, error: "الكود غلط" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "التوكن مش صحيح" };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const displayName = body.display_name?.trim() || null;

    // ── Firebase ID Token verification path ─────────────────────────
    if (body.firebase_id_token) {
      const { verifyFirebaseToken } = await import("@/lib/firebase/admin");
      const { phone: firebasePhone, error: fbError } = await verifyFirebaseToken(
        body.firebase_id_token,
      );

      if (!firebasePhone || fbError) {
        return NextResponse.json(
          { error: fbError || "التحقق من Firebase فشل" },
          { status: 400 },
        );
      }

      // Validate phone format after Firebase verification
      const phoneClean = firebasePhone.replace(/^\+2/, "").replace(/\D/g, "");
      if (!/^01[0125]\d{8}$/.test(phoneClean)) {
        return NextResponse.json(
          { error: "رقم الموبايل من Firebase مش صالح" },
          { status: 400 },
        );
      }

      const supabase = getServiceClient();

      if (!supabase) {
        if (isNonProduction()) {
          console.warn("[verify-otp] No SUPABASE_SERVICE_ROLE_KEY — using dev session for Firebase user", phoneClean);
          const devProfile = createDevProfile(phoneClean, displayName);
          const devToken = generateSessionToken(devProfile.id);
          return NextResponse.json({
            user: devProfile,
            session_token: devToken,
            magic_link_token: null,
            virtual_email: `${phoneClean}@maksab.auth`,
          });
        }
        return NextResponse.json(
          { error: "إعدادات السيرفر ناقصة. تواصل مع الدعم" },
          { status: 500 },
        );
      }

      const profile = await findOrCreateUser(supabase, firebasePhone, displayName);

      if (!profile) {
        return NextResponse.json(
          { error: "حصلت مشكلة في إنشاء الحساب. جرب تاني" },
          { status: 500 },
        );
      }

      const virtualEmail = `${firebasePhone}@maksab.auth`;
      let fbMagicToken: string | null = null;
      try {
        const {
          data: { properties },
        } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: virtualEmail,
        });
        fbMagicToken = properties?.hashed_token || null;
      } catch (linkErr) {
        console.warn("[verify-otp] Magic link generation failed:", linkErr);
      }

      const firebaseSessionToken = generateSessionToken(profile.id);

      return NextResponse.json({
        user: profile,
        session_token: firebaseSessionToken,
        magic_link_token: fbMagicToken,
        virtual_email: virtualEmail,
      });
    }

    // ── Standard HMAC OTP verification path ─────────────────────────
    let phone = body.phone?.replace(/\D/g, "") || "";
    const code = body.code?.replace(/\D/g, "");
    const token = body.token;

    // Normalize phone: accept 10 digits without leading 0
    if (/^1[0125]\d{8}$/.test(phone)) phone = `0${phone}`;
    if (phone.startsWith("20") && phone.length === 12) phone = phone.slice(1);
    if (phone.startsWith("0020") && phone.length === 14) phone = phone.slice(3);

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
    if (!token) {
      return NextResponse.json(
        { error: "التوكن مطلوب. اطلب كود جديد" },
        { status: 400 }
      );
    }

    // ── Verify HMAC token ──────────────────────────────────────────────
    const verification = verifyOTPToken(phone, code, token);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error },
        { status: 400 }
      );
    }

    // ── Find or create user ──────────────────────────────────────────
    const supabase = getServiceClient();

    // If Supabase service client is unavailable (no SUPABASE_SERVICE_ROLE_KEY),
    // fall back to dev-mode session in non-production environments.
    if (!supabase) {
      if (isNonProduction()) {
        console.warn("[verify-otp] No SUPABASE_SERVICE_ROLE_KEY — using dev session for", phone);
        const devProfile = createDevProfile(phone, displayName);
        const devSessionToken = generateSessionToken(devProfile.id);
        return NextResponse.json({
          user: devProfile,
          session_token: devSessionToken,
          magic_link_token: null,
          virtual_email: `${phone}@maksab.auth`,
        });
      }
      return NextResponse.json(
        { error: "إعدادات السيرفر ناقصة. تواصل مع الدعم" },
        { status: 500 }
      );
    }

    const profile = await findOrCreateUser(supabase, phone, displayName);

    if (!profile) {
      return NextResponse.json(
        { error: "حصلت مشكلة في إنشاء الحساب. جرب تاني" },
        { status: 500 }
      );
    }

    // ── Generate session ─────────────────────────────────────────────
    const virtualEmail = `${phone}@maksab.auth`;

    let magicLinkToken: string | null = null;
    try {
      const {
        data: { properties },
      } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: virtualEmail,
      });
      magicLinkToken = properties?.hashed_token || null;
    } catch (linkErr) {
      console.warn("[verify-otp] Magic link generation failed:", linkErr);
    }

    const sessionToken = generateSessionToken(profile.id);

    return NextResponse.json({
      user: profile,
      session_token: sessionToken,
      magic_link_token: magicLinkToken,
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
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const existingAuth = authUsers?.users?.find(
    (u: { email?: string; phone?: string }) =>
      u.email === virtualEmail || u.phone === `+2${phone}`
  );

  let userId: string;

  if (existingAuth) {
    userId = existingAuth.id;
  } else {
    // Create new auth user
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
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
      console.error("[findOrCreateUser] Create error:", createError);
      const { data: retryUsers } = await supabase.auth.admin.listUsers();
      const retryUser = retryUsers?.users?.find(
        (u: { email?: string; phone?: string }) =>
          u.email === virtualEmail || u.phone === `+2${phone}`
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
    console.error("[findOrCreateUser] Profile error:", profileError);
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
