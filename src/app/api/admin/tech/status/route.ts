/**
 * GET /api/admin/tech/status — Real tech metrics from AHE tables
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

async function safeCount(
  sb: ReturnType<typeof getServiceClient>,
  table: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: (q: any) => any
): Promise<number> {
  try {
    let q = sb.from(table).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count, error } = await q;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
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
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const [scopes, todayListings, todayPhones, todayJobsFromJobs, todayOpsFromScopes] = await Promise.all([
      safeCount(sb, "ahe_scopes", (q) => q.eq("is_active", true)),
      safeCount(sb, "ahe_listings", (q) => q.gte("created_at", todayISO)),
      safeCount(sb, "ahe_sellers", (q) => q.not("phone", "is", null).gte("created_at", todayISO)),
      safeCount(sb, "ahe_harvest_jobs", (q) => q.gte("started_at", todayISO)),
      // Operations today = scopes that were harvested today
      safeCount(sb, "ahe_scopes", (q) => q.gte("last_harvest_at", todayISO)),
    ]);

    // Use scopes harvested today as operations count; fallback to harvest_jobs
    const todayJobs = todayOpsFromScopes > 0 ? todayOpsFromScopes : todayJobsFromJobs;

    // Get platforms data
    let platforms: { id: string; name_ar: string; is_active: boolean; last_test_status: string | null; total_listings_harvested: number; last_harvest_at: string | null }[] = [];
    try {
      const { data } = await sb
        .from("harvest_platforms")
        .select("id, name_ar, is_active, last_test_status, total_listings_harvested, last_harvest_at")
        .order("is_active", { ascending: false });
      platforms = data || [];
    } catch {
      // Table may not exist yet
    }

    return NextResponse.json({
      harvester: {
        running: todayJobs > 0,
        scopes,
        todayListings,
        todayPhones,
        lastHarvestMinutes: 0,
        todayJobs,
        errors: 0,
      },
      platforms: {
        total: platforms.length,
        active: platforms.filter(p => p.is_active).length,
        list: platforms,
      },
    });
  } catch (error) {
    console.error("Tech status error:", error);
    return NextResponse.json({
      harvester: {
        running: false,
        scopes: 0,
        todayListings: 0,
        todayPhones: 0,
        lastHarvestMinutes: 0,
        todayJobs: 0,
        errors: 0,
      },
    });
  }
}
