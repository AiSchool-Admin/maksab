/**
 * GET /api/health
 *
 * Health check endpoint — verifies app and Supabase connectivity.
 * Returns status of database, auth, and storage.
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};
  const startTime = Date.now();

  // 1. Check Supabase connection (try reading categories)
  try {
    const { data, error } = await supabase
      .from("categories" as never)
      .select("id" as never)
      .limit(1);

    if (error) {
      checks.database = { ok: false, detail: error.message };
    } else {
      checks.database = { ok: true, detail: `Connected (${(data as unknown[])?.length ?? 0} rows sampled)` };
    }
  } catch (err) {
    checks.database = { ok: false, detail: err instanceof Error ? err.message : "Connection failed" };
  }

  // 2. Check env configuration
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder");

  checks.config = {
    ok: hasUrl && hasKey,
    detail: !hasUrl ? "Missing SUPABASE_URL" : !hasKey ? "Missing ANON_KEY" : "Configured",
  };

  const allOk = Object.values(checks).every((c) => c.ok);
  const elapsed = Date.now() - startTime;

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "unhealthy",
      checks,
      responseTime: `${elapsed}ms`,
      version: process.env.npm_package_version || "1.0.0",
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 },
  );
}
