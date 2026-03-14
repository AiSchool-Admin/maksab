import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * GET /api/admin/sales/buyer-harvest
 * Fetch buyers with filters
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);

    const tier = searchParams.get("tier");
    const category = searchParams.get("category");
    const governorate = searchParams.get("governorate");
    const source = searchParams.get("source");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("bhe_buyers")
      .select("*", { count: "exact" })
      .eq("is_duplicate", false)
      .order("buyer_score", { ascending: false })
      .range(offset, offset + limit - 1);

    if (tier) query = query.eq("buyer_tier", tier);
    if (category) query = query.eq("category", category);
    if (governorate) query = query.eq("governorate", governorate);
    if (source) query = query.eq("source", source);

    const { data: buyers, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      buyers: buyers || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/sales/buyer-harvest
 * Update buyer status
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { id, pipeline_status, contacted_at } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing buyer id" }, { status: 400 });
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (pipeline_status) updateData.pipeline_status = pipeline_status;
    if (contacted_at) updateData.contacted_at = contacted_at;

    const { error } = await supabase
      .from("bhe_buyers")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
