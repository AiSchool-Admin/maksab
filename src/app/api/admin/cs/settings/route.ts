/**
 * CS Settings API
 * GET  — Get all CS settings
 * POST — Update CS settings
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySessionToken } from "@/lib/auth/session-token";
import { verifyAdmin } from "@/lib/admin/admin-service";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const session = verifySessionToken(token);
    if (!session.valid) {
      return NextResponse.json({ error: session.error }, { status: 401 });
    }
    const isAdmin = await verifyAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "ليس لديك صلاحيات" }, { status: 403 });
    }

    const sb = getServiceClient();
    const { data, error } = await sb.from("cs_settings").select("*");

    if (error) {
      console.error("CS settings fetch error:", error);
      return NextResponse.json({ settings: {} });
    }

    // Convert array of key-value to object
    const settings: Record<string, unknown> = {};
    for (const row of data || []) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("CS settings error:", error);
    return NextResponse.json({ settings: {} });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const session = verifySessionToken(token);
    if (!session.valid) {
      return NextResponse.json({ error: session.error }, { status: 401 });
    }
    const isAdmin = await verifyAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "ليس لديك صلاحيات" }, { status: 403 });
    }

    const sb = getServiceClient();
    const body = await req.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "settings مطلوب" }, { status: 400 });
    }

    // Upsert each setting
    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value: JSON.parse(JSON.stringify(value)),
      updated_at: new Date().toISOString(),
    }));

    for (const update of updates) {
      const { error } = await sb
        .from("cs_settings")
        .upsert(update, { onConflict: "key" });

      if (error) {
        console.error(`CS settings update error for ${update.key}:`, error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CS settings POST error:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
