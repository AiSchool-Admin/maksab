// CRM Competitor Sources API — إدارة مصادر المنافسين
import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest, getServiceClient } from "@/lib/crm/auth";

// GET — list competitor sources with filters
export async function GET(req: NextRequest) {
  const authError = await validateAdminRequest(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const governorate = searchParams.get("governorate");
  const source_type = searchParams.get("source_type");
  const activity_level = searchParams.get("activity_level");
  const is_monitored = searchParams.get("is_monitored");
  const sort_by = searchParams.get("sort_by") || "monitoring_priority";
  const sort_order = searchParams.get("sort_order") || "asc";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  const supabase = getServiceClient();
  let query = supabase.from("crm_competitor_sources").select("*", { count: "exact" });

  if (category) query = query.eq("category", category);
  if (governorate) query = query.eq("governorate", governorate);
  if (source_type) query = query.eq("source_type", source_type);
  if (activity_level) query = query.eq("activity_level", activity_level);
  if (is_monitored !== null && is_monitored !== "") {
    query = query.eq("is_monitored", is_monitored === "true");
  }

  query = query.order(sort_by, { ascending: sort_order === "asc" });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sources: data || [], total: count || 0 });
}

// POST — create new competitor source
export async function POST(req: NextRequest) {
  const authError = await validateAdminRequest(req);
  if (authError) return authError;

  const body = await req.json();
  const { source_type, name, url, category, governorate, city,
    estimated_sellers, estimated_active_sellers, estimated_listings,
    estimated_monthly_transactions, activity_level, posting_frequency,
    is_monitored, monitoring_priority, notes, tags } = body;

  if (!source_type || !name) {
    return NextResponse.json({ error: "نوع المصدر والاسم مطلوبان" }, { status: 400 });
  }

  const validTypes = [
    "dubizzle_profile", "facebook_group", "facebook_marketplace",
    "instagram_shop", "whatsapp_group", "website", "physical_store", "opensooq"
  ];
  if (!validTypes.includes(source_type)) {
    return NextResponse.json({ error: "نوع المصدر غير صالح" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("crm_competitor_sources")
    .insert({
      source_type, name, url: url || null,
      category: category || null, governorate: governorate || null, city: city || null,
      estimated_sellers: estimated_sellers || null,
      estimated_active_sellers: estimated_active_sellers || null,
      estimated_listings: estimated_listings || null,
      estimated_monthly_transactions: estimated_monthly_transactions || null,
      activity_level: activity_level || null,
      posting_frequency: posting_frequency || null,
      is_monitored: is_monitored !== false,
      monitoring_priority: monitoring_priority || 5,
      notes: notes || null,
      tags: tags || [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ source: data }, { status: 201 });
}

// PATCH — update competitor source
export async function PATCH(req: NextRequest) {
  const authError = await validateAdminRequest(req);
  if (authError) return authError;

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "معرف المصدر مطلوب" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("crm_competitor_sources")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ source: data });
}

// DELETE — remove competitor source
export async function DELETE(req: NextRequest) {
  const authError = await validateAdminRequest(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "معرف المصدر مطلوب" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("crm_competitor_sources")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
