/**
 * POST /api/auth/admin-token
 *
 * Generates a session token for admin email/password login.
 * Requires a valid Supabase auth session (the user must be signed in).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateSessionToken } from "@/lib/auth/session-token";
import { verifyAdmin } from "@/lib/admin/admin-service";

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json();

    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json({ error: "user_id مطلوب" }, { status: 400 });
    }

    // Verify user exists in DB
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
    }

    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "المستخدم مش موجود" }, { status: 404 });
    }

    // Only generate tokens for verified admins
    const isAdmin = await verifyAdmin(user_id);
    if (!isAdmin) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const sessionToken = generateSessionToken(user_id);

    return NextResponse.json({ session_token: sessionToken });
  } catch {
    return NextResponse.json({ error: "حصل مشكلة" }, { status: 500 });
  }
}
