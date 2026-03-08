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
    // Return empty result gracefully — tables may not exist yet
    return NextResponse.json({
      campaigns: [],
      total: 0,
    });
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
      daily_send_limit: body.daily_send_limit || 500,
      hourly_send_limit: body.hourly_send_limit || 50,
      send_window_start: body.send_window_start || "09:00",
      send_window_end: body.send_window_end || "21:00",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaign: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServiceClient();
  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "معرف الحملة مطلوب" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.campaign_type !== undefined) updates.campaign_type = body.campaign_type;
  if (body.target_filters !== undefined) updates.target_filters = body.target_filters;
  if (body.messages !== undefined) updates.messages = body.messages;
  if (body.status !== undefined) updates.status = body.status;
  if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at;
  if (body.daily_send_limit !== undefined) updates.daily_send_limit = body.daily_send_limit;
  if (body.hourly_send_limit !== undefined) updates.hourly_send_limit = body.hourly_send_limit;
  if (body.send_window_start !== undefined) updates.send_window_start = body.send_window_start;
  if (body.send_window_end !== undefined) updates.send_window_end = body.send_window_end;
  if (body.stats !== undefined) updates.stats = body.stats;

  // Handle status transitions
  if (body.status === "active" && !updates.started_at) {
    updates.started_at = new Date().toISOString();
  }
  if (body.status === "completed") {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("crm_campaigns")
    .update(updates)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaign: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = getServiceClient();
  const url = req.nextUrl;
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "معرف الحملة مطلوب" }, { status: 400 });
  }

  // Only allow deleting draft or cancelled campaigns
  const { data: campaign } = await supabase
    .from("crm_campaigns")
    .select("status")
    .eq("id", id)
    .single();

  if (campaign && !["draft", "cancelled"].includes(campaign.status)) {
    return NextResponse.json(
      { error: "لا يمكن حذف حملة نشطة أو مكتملة. قم بإلغائها أولاً" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("crm_campaigns")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "تم حذف الحملة" });
}
