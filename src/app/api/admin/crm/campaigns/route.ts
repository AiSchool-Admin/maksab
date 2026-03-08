import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

export async function GET(req: NextRequest) {
  const supabase = getServiceClient();
  const url = req.nextUrl;

  const limit = parseInt(url.searchParams.get("limit") || "50");
  const status = url.searchParams.get("status") || "";
  const campaignType = url.searchParams.get("campaign_type") || "";
  const sortBy = url.searchParams.get("sort_by") || "created_at";
  const sortOrder = url.searchParams.get("sort_order") || "desc";

  let query = supabase
    .from("crm_campaigns")
    .select("*", { count: "exact" });

  if (status) query = query.eq("status", status);
  if (campaignType) query = query.eq("campaign_type", campaignType);

  const ascending = sortOrder === "asc";
  query = query.order(sortBy, { ascending }).limit(limit);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    campaigns: data || [],
    total: count || 0,
  });
}

export async function POST(req: NextRequest) {
  const supabase = getServiceClient();
  const body = await req.json();

  if (!body.name) {
    return NextResponse.json({ error: "اسم الحملة مطلوب" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("crm_campaigns")
    .insert({
      name: body.name,
      description: body.description || null,
      campaign_type: body.campaign_type || "engagement",
      target_filters: body.target_filters || {},
      messages: body.messages || [],
      status: body.status || "draft",
      scheduled_at: body.scheduled_at || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaign: data }, { status: 201 });
}
