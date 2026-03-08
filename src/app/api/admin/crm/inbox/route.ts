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

  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "30");
  const channel = url.searchParams.get("channel") || "";
  const direction = url.searchParams.get("direction") || "";
  const customerId = url.searchParams.get("customer_id") || "";
  const status = url.searchParams.get("status") || "";
  const sortBy = url.searchParams.get("sort_by") || "created_at";
  const sortOrder = url.searchParams.get("sort_order") || "desc";

  const offset = (page - 1) * limit;

  let query = supabase
    .from("crm_conversations")
    .select("*, crm_customers!inner(full_name, phone, whatsapp)", { count: "exact" });

  if (channel) query = query.eq("channel", channel);
  if (direction) query = query.eq("direction", direction);
  if (customerId) query = query.eq("customer_id", customerId);
  if (status) query = query.eq("status", status);

  const ascending = sortOrder === "asc";
  query = query.order(sortBy, { ascending }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    // If join fails (e.g. no crm_customers FK), fallback to simple query
    const fallbackQuery = supabase
      .from("crm_conversations")
      .select("*", { count: "exact" });

    if (channel) fallbackQuery.eq("channel", channel);
    if (direction) fallbackQuery.eq("direction", direction);
    if (customerId) fallbackQuery.eq("customer_id", customerId);
    if (status) fallbackQuery.eq("status", status);

    const { data: fbData, error: fbError, count: fbCount } = await fallbackQuery
      .order(sortBy, { ascending })
      .range(offset, offset + limit - 1);

    if (fbError) {
      return NextResponse.json({ error: fbError.message }, { status: 500 });
    }

    return NextResponse.json({
      conversations: fbData || [],
      total: fbCount || 0,
      page,
      limit,
      total_pages: Math.ceil((fbCount || 0) / limit),
    });
  }

  return NextResponse.json({
    conversations: data || [],
    total: count || 0,
    page,
    limit,
    total_pages: Math.ceil((count || 0) / limit),
  });
}

export async function POST(req: NextRequest) {
  const supabase = getServiceClient();
  const body = await req.json();

  const { customer_id, channel, content, message_type, template_id } = body;

  if (!customer_id) {
    return NextResponse.json({ error: "معرف العميل مطلوب" }, { status: 400 });
  }
  if (!channel) {
    return NextResponse.json({ error: "القناة مطلوبة" }, { status: 400 });
  }
  if (!content && !template_id) {
    return NextResponse.json({ error: "محتوى الرسالة مطلوب" }, { status: 400 });
  }

  // Verify customer exists
  const { data: customer, error: custError } = await supabase
    .from("crm_customers")
    .select("id, full_name, phone, whatsapp, email, do_not_contact, preferred_channel")
    .eq("id", customer_id)
    .single();

  if (custError || !customer) {
    return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
  }

  if (customer.do_not_contact) {
    return NextResponse.json({ error: "هذا العميل مسجل كـ 'لا تتواصل'" }, { status: 403 });
  }

  // If using a template, fetch its content
  let messageContent = content;
  if (template_id && !content) {
    const { data: template } = await supabase
      .from("crm_message_templates")
      .select("body, subject")
      .eq("id", template_id)
      .single();

    if (template) {
      // Replace placeholders in template
      messageContent = template.body
        .replace(/\{\{name\}\}/g, customer.full_name || "")
        .replace(/\{\{phone\}\}/g, customer.phone || "");
    }
  }

  // Create conversation record
  const { data: conversation, error: convError } = await supabase
    .from("crm_conversations")
    .insert({
      customer_id,
      channel,
      direction: "outbound",
      message_type: message_type || "text",
      content: messageContent,
      template_id: template_id || null,
      status: "sent",
      is_automated: false,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 });
  }

  // Update customer outreach tracking
  await supabase
    .from("crm_customers")
    .update({
      outreach_attempts: (customer as Record<string, unknown>).outreach_attempts
        ? Number((customer as Record<string, unknown>).outreach_attempts) + 1
        : 1,
      last_outreach_at: new Date().toISOString(),
      last_outreach_channel: channel,
    })
    .eq("id", customer_id);

  // Log activity
  await supabase
    .from("crm_activity_log")
    .insert({
      customer_id,
      activity_type: "message_sent",
      description: `تم إرسال رسالة عبر ${channel}`,
      metadata: {
        channel,
        message_preview: (messageContent || "").substring(0, 100),
        conversation_id: conversation.id,
      },
      is_system: false,
    });

  // Update template usage stats if template was used
  if (template_id) {
    try {
      await supabase
        .from("crm_message_templates")
        .update({ times_sent: (await supabase.from("crm_message_templates").select("times_sent").eq("id", template_id).single()).data?.times_sent + 1 || 1 })
        .eq("id", template_id);
    } catch {
      // Template stats update is non-critical
    }
  }

  return NextResponse.json({ conversation, message: "تم إرسال الرسالة بنجاح" }, { status: 201 });
}
