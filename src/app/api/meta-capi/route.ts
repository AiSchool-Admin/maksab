import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Meta Conversions API (CAPI) — Server-side event tracking.
 *
 * Receives events from the client and forwards them to Meta's
 * server-side API for reliable attribution (bypasses ad blockers).
 *
 * POST /api/meta-capi
 * Body: { event_name, event_id, user_data, custom_data }
 */

const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const META_API_VERSION = "v21.0";

function hashSHA256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function POST(req: NextRequest) {
  if (!FB_PIXEL_ID || !FB_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Meta CAPI not configured" }, { status: 501 });
  }

  try {
    const body = await req.json();
    const { event_name, event_id, user_data, custom_data } = body;

    if (!event_name) {
      return NextResponse.json({ error: "event_name required" }, { status: 400 });
    }

    // Hash PII server-side
    const hashedUserData: Record<string, string> = {};
    if (user_data?.phone) hashedUserData.ph = hashSHA256(user_data.phone);
    if (user_data?.email) hashedUserData.em = hashSHA256(user_data.email);
    if (user_data?.external_id) hashedUserData.external_id = hashSHA256(user_data.external_id);

    // Client IP and user agent for matching
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const userAgent = req.headers.get("user-agent") || "";

    const eventData = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: event_id || crypto.randomUUID(),
      event_source_url: req.headers.get("referer") || "",
      action_source: "website",
      user_data: {
        ...hashedUserData,
        client_ip_address: clientIp,
        client_user_agent: userAgent,
        country: hashSHA256("eg"),
      },
      custom_data: custom_data || {},
    };

    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${FB_PIXEL_ID}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [eventData],
          access_token: FB_ACCESS_TOKEN,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Meta CAPI error:", errorData);
      return NextResponse.json({ error: "Meta API error" }, { status: 502 });
    }

    const result = await response.json();
    return NextResponse.json({ success: true, events_received: result.events_received });
  } catch (error) {
    console.error("Meta CAPI error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
