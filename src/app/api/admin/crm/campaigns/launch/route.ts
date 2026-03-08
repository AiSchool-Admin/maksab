import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

/**
 * POST /api/admin/crm/campaigns/launch
 * Launches a campaign: finds targeted customers, creates conversation records
 * Body: { campaign_id: string }
 */
export async function POST(req: NextRequest) {
  const supabase = getServiceClient();
  const body = await req.json();
  const { campaign_id } = body;

  if (!campaign_id) {
    return NextResponse.json({ error: "معرف الحملة مطلوب" }, { status: 400 });
  }

  // 1. Fetch campaign
  const { data: campaign, error: campError } = await supabase
    .from("crm_campaigns")
    .select("*")
    .eq("id", campaign_id)
    .single();

  if (campError || !campaign) {
    return NextResponse.json({ error: "الحملة غير موجودة" }, { status: 404 });
  }

  if (!["draft", "scheduled"].includes(campaign.status)) {
    return NextResponse.json({ error: "الحملة لازم تكون مسودة أو مجدولة عشان تتفعّل" }, { status: 400 });
  }

  const messages = campaign.messages as Array<{ channel: string; content: string }>;
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "الحملة لازم يكون فيها رسالة واحدة على الأقل" }, { status: 400 });
  }

  // 2. Build customer query from target_filters
  const filters = campaign.target_filters as Record<string, string>;
  let customerQuery = supabase
    .from("crm_customers")
    .select("id, full_name, phone, whatsapp, email, preferred_channel, do_not_contact")
    .eq("do_not_contact", false)
    .eq("marketing_consent", true);

  if (filters.lifecycle_stage) customerQuery = customerQuery.eq("lifecycle_stage", filters.lifecycle_stage);
  if (filters.primary_category) customerQuery = customerQuery.eq("primary_category", filters.primary_category);
  if (filters.governorate) customerQuery = customerQuery.eq("governorate", filters.governorate);
  if (filters.account_type) customerQuery = customerQuery.eq("account_type", filters.account_type);
  if (filters.subscription_plan) customerQuery = customerQuery.eq("subscription_plan", filters.subscription_plan);
  if (filters.source) customerQuery = customerQuery.eq("source", filters.source);
  if (filters.loyalty_tier) customerQuery = customerQuery.eq("loyalty_tier", filters.loyalty_tier);
  if (filters.min_health_score) customerQuery = customerQuery.gte("health_score", parseInt(filters.min_health_score));
  if (filters.max_health_score) customerQuery = customerQuery.lte("health_score", parseInt(filters.max_health_score));

  customerQuery = customerQuery.limit(campaign.daily_send_limit || 500);

  const { data: customers, error: custError } = await customerQuery;

  if (custError) {
    return NextResponse.json({ error: custError.message }, { status: 500 });
  }

  if (!customers || customers.length === 0) {
    return NextResponse.json({ error: "لا يوجد عملاء مطابقين لفلاتر الاستهداف" }, { status: 400 });
  }

  // 3. Create conversation records for each customer × message
  const conversationRecords = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const customer of customers) {
    for (const msg of messages) {
      const channel = msg.channel || customer.preferred_channel || "in_app";

      // Personalize message
      const personalizedContent = (msg.content || "")
        .replace(/\{\{name\}\}/g, customer.full_name || "")
        .replace(/\{\{phone\}\}/g, customer.phone || "");

      conversationRecords.push({
        customer_id: customer.id,
        channel,
        direction: "outbound",
        message_type: "text",
        content: personalizedContent,
        status: "sent",
        campaign_id,
        is_automated: true,
        sent_at: new Date().toISOString(),
      });
    }
  }

  // Batch insert conversations (in chunks of 100)
  const chunkSize = 100;
  for (let i = 0; i < conversationRecords.length; i += chunkSize) {
    const chunk = conversationRecords.slice(i, i + chunkSize);
    const { error: insertError } = await supabase
      .from("crm_conversations")
      .insert(chunk);

    if (insertError) {
      failedCount += chunk.length;
    } else {
      sentCount += chunk.length;
    }
  }

  // 4. Update campaign status and stats
  const updatedStats = {
    ...(campaign.stats as Record<string, number>),
    targeted: customers.length,
    queued: 0,
    sent: sentCount,
    failed: failedCount,
  };

  await supabase
    .from("crm_campaigns")
    .update({
      status: "active",
      started_at: new Date().toISOString(),
      stats: updatedStats,
    })
    .eq("id", campaign_id);

  return NextResponse.json({
    message: "تم إطلاق الحملة بنجاح",
    targeted: customers.length,
    sent: sentCount,
    failed: failedCount,
  });
}
