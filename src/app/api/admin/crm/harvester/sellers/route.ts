/**
 * AHE Sellers API
 * GET — قائمة المعلنين المكتشفين مع فلاتر
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest, getServiceClient } from "@/lib/crm/auth";

export async function GET(req: NextRequest) {
  const authError = await validateAdminRequest(req);
  if (authError) return authError;

  const supabase = getServiceClient();
  const { searchParams } = req.nextUrl;

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;
  const platform = searchParams.get("platform");
  const pipelineStatus = searchParams.get("pipeline_status");
  const hasPhone = searchParams.get("has_phone");
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  try {
    let query = supabase
      .from("ahe_sellers")
      .select("*", { count: "exact" })
      .order("priority_score", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (platform) query = query.eq("source_platform", platform);
    if (pipelineStatus) query = query.eq("pipeline_status", pipelineStatus);
    if (hasPhone === "true") query = query.not("phone", "is", null);
    if (hasPhone === "false") query = query.is("phone", null);
    if (category) query = query.eq("primary_category", category);
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);

    const { data: sellers, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get pipeline stats
    const { data: pipelineStats } = await supabase
      .from("ahe_sellers")
      .select("pipeline_status")
      .then(({ data }) => {
        const stats: Record<string, number> = {};
        for (const s of data || []) {
          stats[s.pipeline_status] = (stats[s.pipeline_status] || 0) + 1;
        }
        return { data: stats };
      });

    return NextResponse.json({
      sellers: sellers || [],
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
      pipeline_stats: pipelineStats || {},
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
