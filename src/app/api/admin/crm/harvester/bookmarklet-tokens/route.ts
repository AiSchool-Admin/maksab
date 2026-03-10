/**
 * API — إدارة توكنات الـ Bookmarklet
 * GET: قائمة التوكنات
 * POST: إنشاء توكن جديد
 * DELETE: تعطيل توكن
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ""
  );
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
