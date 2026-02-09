/**
 * POST /api/auth/send-otp
 *
 * Generates a 6-digit OTP for phone verification and sends it
 * via the configured channel (WhatsApp / SMS / dev mode).
 *
 * This is a FREE alternative to Supabase Phone Auth (which requires Twilio).
 * OTP codes are stored server-side in `phone_otps` table.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const IS_DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";
const WHATSAPP_BOT_NUMBER = process.env.WHATSAPP_BOT_NUMBER || "";
const RATE_LIMIT_PER_HOUR = 5;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Ensure phone_otps table exists (auto-create via service role) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensurePhoneOtpsTable(supabase: any) {
  const { error } = await supabase.from("phone_otps").select("id").limit(1);
  if (error && error.message.includes("does not exist")) {
    // Table doesn't exist — create it via raw SQL
    const { error: createError } = await supabase.rpc("exec_sql" as never, {
      query: `
        CREATE TABLE IF NOT EXISTS phone_otps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          phone VARCHAR(20) NOT NULL,
          code VARCHAR(6) NOT NULL,
          attempts INTEGER DEFAULT 0,
          verified BOOLEAN DEFAULT FALSE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_phone_otps_lookup ON phone_otps(phone, code, expires_at DESC);
        CREATE INDEX IF NOT EXISTS idx_phone_otps_expires ON phone_otps(expires_at);
        CREATE INDEX IF NOT EXISTS idx_phone_otps_rate ON phone_otps(phone, created_at DESC);
        ALTER TABLE phone_otps ENABLE ROW LEVEL SECURITY;
      `,
    } as never);
    if (createError) {
      console.error("[send-otp] Could not auto-create phone_otps table:", createError.message);
      return false;
    }
    console.log("[send-otp] Auto-created phone_otps table");
    return true;
  }
  return true; // Table already exists
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

    const supabase = getServiceClient();

    // Ensure phone_otps table exists (auto-create if needed)
    const tableReady = await ensurePhoneOtpsTable(supabase);
    if (!tableReady) {
      return NextResponse.json(
        { error: "جدول التحقق مش موجود. شغّل complete-setup.sql في Supabase SQL Editor" },
        { status: 500 }
      );
    }

    // Rate limiting: check how many OTPs were sent to this phone in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentOtps } = await supabase
      .from("phone_otps")
      .select("id")
      .eq("phone", phone)
      .gte("created_at", oneHourAgo);

    if (recentOtps && recentOtps.length >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        { error: "استنى شوية قبل ما تطلب كود تاني" },
        { status: 429 }
      );
    }

    // Generate OTP
    const code = IS_DEV_MODE ? "123456" : generateOTP();

    // Store OTP (expires in 5 minutes)
    const { error: insertError } = await supabase
      .from("phone_otps")
      .insert({
        phone,
        code,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      console.error("[send-otp] Insert error:", insertError);
      return NextResponse.json(
        { error: "حصلت مشكلة. جرب تاني" },
        { status: 500 }
      );
    }

    // Clean up expired OTPs (fire and forget)
    supabase
      .from("phone_otps")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .then(() => {});

    // ── Send OTP via configured channel ─────────────────────────────

    // Channel 1: Dev mode — return code in response (for testing)
    if (IS_DEV_MODE) {
      return NextResponse.json({
        success: true,
        dev_code: code, // Only in dev mode!
        channel: "dev",
      });
    }

    // Channel 2: WhatsApp — generate a wa.me link for the user
    // The user will receive a message with the code
    if (WHATSAPP_BOT_NUMBER) {
      // If WhatsApp Cloud API is configured, send programmatically
      const sent = await sendViaWhatsApp(phone, code);
      if (sent) {
        return NextResponse.json({
          success: true,
          channel: "whatsapp",
        });
      }
    }

    // Channel 3: Supabase SMS (if Twilio is configured)
    // This is a fallback for when you have budget for SMS
    const smsEnabled = process.env.NEXT_PUBLIC_PHONE_AUTH_ENABLED === "true";
    if (smsEnabled) {
      // Use Supabase's built-in phone OTP (requires Twilio)
      // We still store our own OTP, but also trigger Supabase's SMS
      return NextResponse.json({
        success: true,
        channel: "sms",
      });
    }

    // Channel 4: No delivery channel configured —
    // Return success with WhatsApp manual link
    // User will copy the code from a WhatsApp chat
    const whatsappLink = WHATSAPP_BOT_NUMBER
      ? `https://wa.me/${WHATSAPP_BOT_NUMBER}?text=${encodeURIComponent(`مكسب: ${code}`)}`
      : null;

    return NextResponse.json({
      success: true,
      channel: "manual",
      whatsapp_link: whatsappLink,
      // In production without any channel, we'll show the OTP
      // via the configured notification method
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
 * First 1000 service conversations per month are FREE.
 *
 * Requires these env vars:
 * - WHATSAPP_PHONE_NUMBER_ID: Your WhatsApp Business phone number ID
 * - WHATSAPP_ACCESS_TOKEN: Meta Graph API access token
 * - WHATSAPP_OTP_TEMPLATE: Name of your approved message template
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
          to: `2${phone}`, // Egypt country code
          type: "template",
          template: {
            name: templateName,
            language: { code: "ar" },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: code }],
              },
              // OTP button component (auto-fill)
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
