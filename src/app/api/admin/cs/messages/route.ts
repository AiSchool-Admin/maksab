/**
 * CS Messages API
 * GET  — Get messages for a conversation
 * POST — Send a message (agent/system)
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
    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversation_id");

    if (!conversationId) {
      return NextResponse.json({ error: "conversation_id مطلوب" }, { status: 400 });
    }

    const { data, error } = await sb
      .from("cs_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("CS messages fetch error:", error);
      return NextResponse.json({ messages: [] });
    }

    // Mark unread messages as read
    await sb
      .from("cs_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("sender_type", "user")
      .eq("is_read", false);

    return NextResponse.json({ messages: data || [] });
  } catch (error) {
    console.error("CS messages error:", error);
    return NextResponse.json({ messages: [] });
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
    const {
      conversation_id,
      message,
      sender_type = "agent",
      sender_name,
      message_type = "text",
      template_id,
    } = body;

    if (!conversation_id || !message) {
      return NextResponse.json(
        { error: "conversation_id و message مطلوبين" },
        { status: 400 }
      );
    }

    // Insert message
    const { data, error } = await sb
      .from("cs_messages")
      .insert({
        conversation_id,
        sender_type,
        sender_id: session.userId,
        sender_name: sender_name || "خدمة العملاء",
        message,
        message_type,
        template_id: template_id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If template used, increment usage count
    if (template_id) {
      await sb.rpc("increment_template_usage", { template_id });
    }

    return NextResponse.json({ message: data });
  } catch (error) {
    console.error("CS messages POST error:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
