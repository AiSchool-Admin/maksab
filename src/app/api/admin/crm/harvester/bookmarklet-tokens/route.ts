/**
 * API — إدارة توكنات الـ Bookmarklet
 * GET: قائمة التوكنات
 * POST: إنشاء توكن جديد
 * DELETE: تعطيل توكن
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }

  if (!serviceKey) {
    console.warn(
      "⚠️ SUPABASE_SERVICE_ROLE_KEY is not set — falling back to anon key. " +
      "This WILL fail for tables with restrictive RLS policies (like ahe_bookmarklet_tokens)."
    );
  }

  const key = serviceKey || anonKey;
  if (!key) {
    throw new Error("No Supabase key available (neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY)");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function errorResponse(error: unknown, context: string) {
  const message = error instanceof Error ? error.message : String(error);
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.error(`❌ [bookmarklet-tokens] ${context}:`, message);
  console.error(`   SUPABASE_SERVICE_ROLE_KEY set: ${hasServiceKey}`);

  const body: Record<string, unknown> = { error: message };

  // في development، أظهر تفاصيل أكتر
  if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
    body.debug = {
      context,
      hasServiceKey,
      hint: !hasServiceKey
        ? "أضف SUPABASE_SERVICE_ROLE_KEY في Environment Variables على Vercel"
        : "تأكد إن جدول ahe_bookmarklet_tokens موجود في Supabase",
    };
  }

  return NextResponse.json(body, { status: 500 });
}

// GET — list all tokens
export async function GET() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("ahe_bookmarklet_tokens")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ tokens: data || [] });
  } catch (error) {
    return errorResponse(error, "GET tokens");
  }
}

// POST — create a new token
export async function POST(req: NextRequest) {
  try {
    const { employee_name, scope_code } = await req.json();

    if (!employee_name || typeof employee_name !== "string" || employee_name.trim().length < 2) {
      return NextResponse.json(
        { error: "اسم الموظف مطلوب (حرفين على الأقل)" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("ahe_bookmarklet_tokens")
      .insert({
        employee_name: employee_name.trim(),
        scope_code: scope_code || null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ token: data });
  } catch (error) {
    return errorResponse(error, "POST create token");
  }
}

// DELETE — deactivate a token
export async function DELETE(req: NextRequest) {
  try {
    const { token_id } = await req.json();

    if (!token_id) {
      return NextResponse.json({ error: "token_id مطلوب" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { error } = await supabase
      .from("ahe_bookmarklet_tokens")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", token_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "DELETE token");
  }
}
