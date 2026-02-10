/**
 * POST /api/auth/send-otp
 *
 * Generates a 6-digit OTP for phone verification.
 * Uses HMAC-signed tokens — completely stateless, NO database table needed.
 *
 * Flow:
 * 1. Generate 6-digit code
 * 2. Create HMAC signature: HMAC(phone:code:expiry, SECRET)
 * 3. Return signed token to client
 * 4. Client sends token + code to /api/auth/verify-otp
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const OTP_EXPIRY_MINUTES = 5;
const WHATSAPP_BOT_NUMBER = process.env.WHATSAPP_BOT_NUMBER || "";
const DEV_HMAC_SECRET = "dev-secret-for-local-testing-only";
const isDev = process.env.NODE_ENV !== "production";

function getSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (secret) return secret;
  // In development, use a fallback secret so OTP flow works without service role key
  if (isDev) return DEV_HMAC_SECRET;
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

/** Create HMAC-SHA256 signature */
function signOTP(phone: string, code: string, expiresAt: number): string {
  const payload = `${phone}:${code}:${expiresAt}`;
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/** Generate a cryptographically random 6-digit code */
function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, "0");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = body.phone?.replace(/\D/g, "");

    // Validate Egyptian phone number
    if (!phone || !/^01[0125]\d{8}$/.test(phone)) {
      return NextResponse.json(
        { error: "رقم الموبايل مش صحيح" },
        { status: 400 }
      );
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

    // Create signed token
    const hmac = signOTP(phone, code, expiresAt);
    const token = Buffer.from(
      JSON.stringify({ phone, expiresAt, hmac })
    ).toString("base64url");

    // ── Send OTP via configured channel ─────────────────────────────

    // Channel 1: WhatsApp Cloud API
    if (WHATSAPP_BOT_NUMBER) {
      const sent = await sendViaWhatsApp(phone, code);
      if (sent) {
        return NextResponse.json({
          success: true,
          token,
          channel: "whatsapp",
          expires_at: expiresAt,
        });
      }
    }

    // Channel 2: SMS (if configured)
    const smsEnabled = process.env.NEXT_PUBLIC_PHONE_AUTH_ENABLED === "true";
    if (smsEnabled) {
      return NextResponse.json({
        success: true,
        token,
        channel: "sms",
        expires_at: expiresAt,
      });
    }

    // In development: return code directly so dev can enter it manually
    if (isDev) {
      console.log(`[DEV OTP] Phone: ${phone} → Code: ${code}`);
      return NextResponse.json({
        success: true,
        token,
        channel: "dev",
        expires_at: expiresAt,
        dev_code: code, // Only returned in development!
      });
    }

    // No delivery channel configured — cannot send OTP
    return NextResponse.json(
      { error: "مش قادرين نبعتلك كود دلوقتي. جرب تاني بعدين" },
      { status: 503 }
    );

  } catch (err) {
    console.error("[send-otp] Error:", err);
    return NextResponse.json(
      { error: "حصلت مشكلة. جرب تاني" },
      { status: 500 }
    );
  }
}

/**
 * Send OTP via WhatsApp Cloud API (Meta Business)
 * First 1000 service conversations per month are FREE.
 */
async function sendViaWhatsApp(phone: string, code: string): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE || "otp_code";

  if (!phoneNumberId || !accessToken) return false;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: `2${phone}`,
          type: "template",
          template: {
            name: templateName,
            language: { code: "ar" },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: code }],
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [{ type: "text", text: code }],
              },
            ],
          },
        }),
      }
    );

    if (response.ok) return true;

    const errorData = await response.json().catch(() => ({}));
    console.error("[WhatsApp] Send failed:", errorData);
    return false;
  } catch (err) {
    console.error("[WhatsApp] Error:", err);
    return false;
  }
}
