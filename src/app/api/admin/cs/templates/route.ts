/**
 * CS Templates API
 * GET    — List all templates
 * POST   — Create/Update/Delete template
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
    const { data, error } = await sb
      .from("cs_templates")
      .select("*")
      .order("category")
      .order("name_ar");

    if (error) {
      console.error("CS templates fetch error:", error);
      return NextResponse.json({ templates: [] });
    }

    return NextResponse.json({ templates: data || [] });
  } catch (error) {
    console.error("CS templates error:", error);
    return NextResponse.json({ templates: [] });
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
    const { action } = body;

    if (action === "create") {
      const { name, name_ar, category, message_text, shortcut } = body;
      if (!name_ar || !message_text) {
        return NextResponse.json({ error: "الاسم والنص مطلوبين" }, { status: 400 });
      }

      const { data, error } = await sb
        .from("cs_templates")
        .insert({
          name: name || name_ar,
          name_ar,
          category: category || "general",
          message_text,
          shortcut: shortcut || null,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ template: data });
    }

    if (action === "update") {
      const { id, name_ar, category, message_text, shortcut, is_active } = body;
      if (!id) {
        return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
      }

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (name_ar !== undefined) {
        updates.name_ar = name_ar;
        updates.name = name_ar;
      }
      if (category !== undefined) updates.category = category;
      if (message_text !== undefined) updates.message_text = message_text;
      if (shortcut !== undefined) updates.shortcut = shortcut;
      if (is_active !== undefined) updates.is_active = is_active;

      const { data, error } = await sb
        .from("cs_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ template: data });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
      }

      const { error } = await sb.from("cs_templates").delete().eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("CS templates POST error:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
