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

function getSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return secret;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env vars");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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
    const phone = body.phone?.replace(/\D/g, "");
    const code = body.code?.replace(/\D/g, "");
    const token = body.token;
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

    const profile = await findOrCreateUser(supabase, phone, displayName);

    if (!profile) {
      return NextResponse.json(
        { error: "حصلت مشكلة في إنشاء الحساب. جرب تاني" },
        { status: 500 }
      );
    }

    // ── Generate session ─────────────────────────────────────────────
    const virtualEmail = `${phone}@maksab.auth`;

    const {
      data: { properties },
    } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: virtualEmail,
    });

    return NextResponse.json({
      user: profile,
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
