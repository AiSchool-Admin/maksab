/**
 * POST /api/auth/send-otp
 *
 * Generates a 6-digit OTP for phone verification.
 * Uses HMAC-signed tokens — completely stateless, NO database table needed.
 *
 * Channels (in priority order):
 * 1. WhatsApp Cloud API (if configured)
 * 2. Dev mode — HMAC-verified OTP, code shown in UI (non-production only)
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { checkRateLimit, recordRateLimit } from "@/lib/rate-limit/rate-limit-service";
import { getOtpSecret, isNonProduction } from "@/lib/auth/otp-secret";

const OTP_EXPIRY_MINUTES = 5;
const WHATSAPP_BOT_NUMBER = process.env.WHATSAPP_BOT_NUMBER || "";

/** Create HMAC-SHA256 signature */
function signOTP(phone: string, code: string, expiresAt: number): string {
  const payload = `${phone}:${code}:${expiresAt}`;
  return createHmac("sha256", getOtpSecret()).update(payload).digest("hex");
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
    let phone = body.phone?.replace(/\D/g, "") || "";

    // Normalize phone formats
    if (/^1[0125]\d{8}$/.test(phone)) phone = `0${phone}`;
    if (phone.startsWith("20") && phone.length === 12) phone = phone.slice(1);
    if (phone.startsWith("0020") && phone.length === 14) phone = phone.slice(3);

    if (!phone || !/^01[0125]\d{8}$/.test(phone)) {
      return NextResponse.json(
        { error: "رقم الموبايل مش صحيح" },
        { status: 400 }
      );
    }

    // ── Rate limit check ──────────────────────────────────────────
    try {
      const rateCheck = await checkRateLimit(phone, "otp_send");
      if (!rateCheck.allowed) {
        return NextResponse.json(
          {
            error: `عديت الحد المسموح. جرب تاني بعد ${Math.ceil((rateCheck.retryAfterSeconds || 60) / 60)} دقيقة`,
            retry_after: rateCheck.retryAfterSeconds,
          },
          { status: 429 }
        );
      }
    } catch (rateLimitErr) {
      console.warn("[send-otp] Rate limit check skipped:", rateLimitErr);
    }

    recordRateLimit(phone, "otp_send").catch((err) => {
      console.warn("[send-otp] Rate limit record skipped:", err);
    });

    // Generate OTP + HMAC token
    const code = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;
    const hmac = signOTP(phone, code, expiresAt);
    const token = Buffer.from(
      JSON.stringify({ phone, expiresAt, hmac })
    ).toString("base64url");

    // ── Send OTP via configured channel ─────────────────────────────

    // Channel 1: WhatsApp Cloud API (1,000 free service conversations/month)
    if (WHATSAPP_BOT_NUMBER) {
      const whatsappResult = await sendViaWhatsApp(phone, code);
      if (whatsappResult.success) {
        return NextResponse.json({
          success: true,
          token,
          channel: "whatsapp",
          expires_at: expiresAt,
        });
      }
      console.warn("[send-otp] WhatsApp failed, trying fallback:", whatsappResult.error);
    }

    // Channel 2: Dev mode — OTP code shown in UI (non-production only)
    if (isNonProduction()) {
      console.log(`[OTP-DEV] Phone: ${phone}, Code: ${code}`);
      return NextResponse.json({
        success: true,
        token,
        channel: "dev",
        expires_at: expiresAt,
        dev_code: code,
      });
    }

    // Production without WhatsApp configured — still send token but NOT the code
    console.warn("[send-otp] No delivery channel available in production for", phone);
    return NextResponse.json({
      success: true,
      token,
      channel: "pending",
      expires_at: expiresAt,
    });

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
 */
async function sendViaWhatsApp(
  phone: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE || "otp_code";

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: "Missing WhatsApp credentials" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
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

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      console.log("[WhatsApp] OTP sent successfully to", `2${phone}`, data?.messages?.[0]?.id || "");
      return { success: true };
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
    console.error("[WhatsApp] Send failed:", errorMsg, errorData);

    if (response.status === 401) {
      console.error("[WhatsApp] Access token expired! Renew at developers.facebook.com");
    }

    return { success: false, error: errorMsg };
  } catch (err) {
    console.error("[WhatsApp] Network error:", err);
    return { success: false, error: "Network error" };
  }
}
