/**
 * GET /api/admin/cs/conversations — Real conversations from wa_conversations
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

    // Try to fetch from wa_conversations
    const { data, error } = await sb
      .from("wa_conversations")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      // Table might not exist or be empty
      return NextResponse.json({
        conversations: [],
        stats: { active: 0, ai: 0, human: 0, waiting: 0, resolved: 0 },
      });
    }

    const conversations = (data || []).map((c: Record<string, unknown>) => ({
      id: c.id,
      customerName: (c.customer_name as string) || (c.phone as string) || "—",
      phone: (c.phone as string) || "—",
      channel: (c.channel as string) || "whatsapp",
      type: (c.customer_type as string) || "individual",
      whaleScore: (c.whale_score as number) || 0,
      lastMessage: (c.last_message as string) || "",
      time: c.updated_at ? formatTimeAgo(c.updated_at as string) : "—",
      status: (c.status as string) || "active",
      handler: (c.handler as string) || "ai",
      listingCount: (c.listing_count as number) || 0,
    }));

    const stats = {
      active: conversations.filter((c: { status: string }) => c.status !== "resolved").length,
      ai: conversations.filter((c: { handler: string }) => c.handler === "ai").length,
      human: conversations.filter((c: { handler: string }) => c.handler === "human").length,
      waiting: conversations.filter((c: { status: string }) => c.status === "waiting").length,
      resolved: conversations.filter((c: { status: string }) => c.status === "resolved").length,
    };

    return NextResponse.json({ conversations, stats });
  } catch (error) {
    console.error("CS conversations error:", error);
    return NextResponse.json({
      conversations: [],
      stats: { active: 0, ai: 0, human: 0, waiting: 0, resolved: 0 },
    });
  }
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}
