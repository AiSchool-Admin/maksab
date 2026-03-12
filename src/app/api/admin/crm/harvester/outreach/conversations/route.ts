/**
 * Outreach Conversations API
 * GET — List conversations with optional filters
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";

export async function GET(request: Request) {
  const supabase = getServiceClient();

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    let query = supabase
      .from("wa_conversations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);

    const { data: conversations, error } = await query;

    if (error) {
      console.error("[Outreach Conversations] Query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get last message body for each conversation
    const convIds = (conversations || []).map((c: any) => c.id);
    let lastMessages: Record<string, string> = {};

    if (convIds.length > 0) {
      // Get latest message for each conversation
      const { data: messages } = await supabase
        .from("wa_messages")
        .select("conversation_id, body")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      if (messages) {
        // Group by conversation_id, take first (latest)
        for (const msg of messages) {
          if (!lastMessages[msg.conversation_id] && msg.body) {
            lastMessages[msg.conversation_id] = msg.body;
          }
        }
      }
    }

    // Attach last message body to conversations
    const enriched = (conversations || []).map((conv: any) => ({
      ...conv,
      last_message_body: lastMessages[conv.id] || null,
    }));

    return NextResponse.json({ conversations: enriched });
  } catch (err: any) {
    console.error("[Outreach Conversations] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "خطأ في تحميل المحادثات" },
      { status: 500 }
    );
  }
}
