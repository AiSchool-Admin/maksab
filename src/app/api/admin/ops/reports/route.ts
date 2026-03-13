/**
 * GET /api/admin/ops/reports — Real reports from the reports table
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

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
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
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      // Table might not exist
      return NextResponse.json({ reports: [] });
    }

    const reports = (data || []).map((r: Record<string, unknown>) => ({
      id: r.id,
      adTitle: (r.ad_title as string) || (r.reason as string) || "إعلان",
      adId: (r.ad_id as string) || "",
      reporterName: (r.reporter_name as string) || "مستخدم",
      reporterPhone: (r.reporter_phone as string) || "",
      reason: (r.reason as string) || "أخرى",
      date: r.created_at ? formatTimeAgo(r.created_at as string) : "—",
      status: (r.status as string) || "pending",
      details: (r.details as string) || (r.description as string) || "",
    }));

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Ops reports error:", error);
    return NextResponse.json({ reports: [] });
  }
}
