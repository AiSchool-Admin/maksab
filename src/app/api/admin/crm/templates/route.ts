// CRM Message Templates API — قوالب الرسائل
import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest, getServiceClient } from "@/lib/crm/auth";

// GET — list templates with optional filters
export async function GET(req: NextRequest) {
  const authError = await validateAdminRequest(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel");
  const campaign_type = searchParams.get("campaign_type");
  const category = searchParams.get("category");
  const is_active = searchParams.get("is_active");

  const supabase = getServiceClient();
  let query = supabase.from("crm_message_templates").select("*", { count: "exact" });

  if (channel) query = query.eq("channel", channel);
  if (campaign_type) query = query.eq("campaign_type", campaign_type);
  if (category) query = query.eq("category", category);
  if (is_active !== null && is_active !== "") {
    query = query.eq("is_active", is_active === "true");
  }

  query = query.order("campaign_type").order("id");

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data || [], total: count || 0 });
}

// POST — create template
export async function POST(req: NextRequest) {
  const authError = await validateAdminRequest(req);
  if (authError) return authError;

  const body = await req.json();
  const { id, name, description, channel, category, campaign_type,
    subject, body: templateBody, media_url,
    wa_template_name, wa_template_category } = body;

  if (!id || !name || !channel || !templateBody) {
    return NextResponse.json(
      { error: "المعرف والاسم والقناة ونص القالب مطلوبون" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("crm_message_templates")
    .insert({
      id, name, description: description || null,
      channel, category: category || null,
      campaign_type: campaign_type || null,
      subject: subject || null,
      body: templateBody,
      media_url: media_url || null,
      wa_template_name: wa_template_name || null,
      wa_template_category: wa_template_category || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "معرف القالب موجود مسبقاً" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template: data }, { status: 201 });
}

// PATCH — update template
export async function PATCH(req: NextRequest) {
  const authError = await validateAdminRequest(req);
  if (authError) return authError;

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "معرف القالب مطلوب" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("crm_message_templates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template: data });
}

// DELETE — remove template
export async function DELETE(req: NextRequest) {
  const authError = await validateAdminRequest(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "معرف القالب مطلوب" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("crm_message_templates")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
