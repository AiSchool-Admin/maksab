/**
 * POST /api/acquisition/engine — Unified acquisition engine
 * Handles both auto and manual outreach for cars + properties
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const CAR_CATS = ["vehicles", "سيارات", "cars"];
const PROP_CATS = ["properties", "عقارات", "real_estate"];
const ALEX_GOVS = ["الإسكندرية", "alexandria", "الاسكندرية"];

interface EngineRequest {
  asset_type: "cars" | "properties";
  action: "queue_new" | "send_one" | "send_batch" | "followup" | "stats";
  seller_id?: string;
  limit?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: EngineRequest = await req.json();
    const { asset_type, action } = body;
    const sb = getSupabase();

    // Get engine config
    const { data: config } = await sb
      .from("acquisition_engine_config")
      .select("*")
      .eq("asset_type", asset_type)
      .single();

    const mode = config?.mode || "manual";
    const agentName = asset_type === "cars" ? "waleed" : "ahmed";
    const catVariants = asset_type === "cars" ? CAR_CATS : PROP_CATS;

    // ─── Stats ───
    if (action === "stats") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [newCount, contactedCount, respondedCount, registeredCount, queuedCount] = await Promise.all([
        sb.from("ahe_sellers").select("id", { count: "exact", head: true })
          .in("primary_category", catVariants).in("primary_governorate", ALEX_GOVS)
          .not("phone", "is", null)
          .not("pipeline_status", "in", '("registered","rejected","exhausted","skipped","contacted")'),
        sb.from("ahe_sellers").select("id", { count: "exact", head: true })
          .in("primary_category", catVariants).in("primary_governorate", ALEX_GOVS)
          .eq("pipeline_status", "contacted"),
        sb.from("ahe_sellers").select("id", { count: "exact", head: true })
          .in("primary_category", catVariants).in("primary_governorate", ALEX_GOVS)
          .in("pipeline_status", ["interested", "considering"]),
        sb.from("ahe_sellers").select("id", { count: "exact", head: true })
          .in("primary_category", catVariants).in("primary_governorate", ALEX_GOVS)
          .eq("pipeline_status", "registered"),
        sb.from("acquisition_queue").select("id", { count: "exact", head: true })
          .eq("asset_type", asset_type).eq("status", "queued"),
      ]);

      const { count: sentToday } = await sb.from("outreach_logs")
        .select("id", { count: "exact", head: true })
        .eq("agent_name", agentName).eq("action", "sent")
        .gte("created_at", todayStart.toISOString());

      return NextResponse.json({
        asset_type, mode,
        daily_target: config?.daily_target || 50,
        pipeline: {
          new: newCount.count || 0,
          contacted: contactedCount.count || 0,
          responded: respondedCount.count || 0,
          registered: registeredCount.count || 0,
        },
        queue: queuedCount.count || 0,
        sent_today: sentToday || 0,
      });
    }

    // ─── Queue new sellers ───
    if (action === "queue_new") {
      const limit = body.limit || 20;

      // Get sellers with phone, in Alexandria, not yet fully processed
      // Exclude: registered, rejected, exhausted (these are done)
      const { data: sellers, error: sellerErr } = await sb
        .from("ahe_sellers")
        .select("id, name, phone, detected_account_type, total_listings_seen, source_platform, pipeline_status")
        .in("primary_category", catVariants)
        .in("primary_governorate", ALEX_GOVS)
        .not("phone", "is", null)
        .not("pipeline_status", "in", '("registered","rejected","exhausted","skipped")')
        .order("whale_score", { ascending: false })
        .limit(limit);

      console.error(`[Acquisition] queue_new: ${sellers?.length || 0} sellers found, error: ${sellerErr?.message || "none"}`);

      if (!sellers || sellers.length === 0) {
        return NextResponse.json({
          queued: 0,
          message: sellerErr?.message || "لا يوجد بائعين جدد",
          debug: { catVariants, govs: ALEX_GOVS, error: sellerErr?.message },
        });
      }

      // Get appropriate template
      const { data: templates } = await sb
        .from("outreach_templates")
        .select("id, message_text, target_tier")
        .eq("agent", agentName)
        .eq("is_active", true)
        .order("usage_count", { ascending: false })
        .limit(5);

      const defaultTemplate = templates?.[0];

      // Generate magic links and queue messages
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://maksab.vercel.app";
      let queued = 0;

      for (const seller of sellers) {
        // Check not already queued
        const { count: existing } = await sb
          .from("acquisition_queue")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", seller.id)
          .eq("status", "queued");

        if (existing && existing > 0) continue;

        // Pick template by seller type
        const sellerType = seller.detected_account_type || "individual";
        const template = templates?.find(t =>
          t.target_tier === sellerType || t.target_tier === "all"
        ) || defaultTemplate;

        const magicLink = `${baseUrl}/join?phone=${encodeURIComponent(seller.phone)}&seller=${seller.id}&ref=${agentName}`;

        // Build message
        let messageText = template?.message_text || `السلام عليكم ${seller.name || ""} 👋\nسجّل مجاناً: ${magicLink}`;
        messageText = messageText
          .replace(/\{\{name\}\}/g, seller.name || "")
          .replace(/\{\{platform\}\}/g, seller.source_platform || "دوبيزل")
          + `\n\n${magicLink}`;

        await sb.from("acquisition_queue").insert({
          seller_id: seller.id,
          asset_type,
          message_number: 1,
          message_text: messageText,
          magic_link: magicLink,
          template_id: template?.id || null,
          status: "queued",
          mode,
          agent_name: agentName,
        });

        queued++;
      }

      return NextResponse.json({ queued, total_sellers: sellers.length, mode });
    }

    // ─── Send one (manual mode) ───
    if (action === "send_one" && body.seller_id) {
      // Mark as sent in queue
      await sb.from("acquisition_queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("seller_id", body.seller_id)
        .eq("status", "queued");

      // Update seller pipeline
      await sb.from("ahe_sellers")
        .update({ pipeline_status: "contacted", last_outreach_at: new Date().toISOString() })
        .eq("id", body.seller_id);

      // Log
      await sb.from("outreach_logs").insert({
        seller_id: body.seller_id,
        action: "sent",
        agent_name: agentName,
        mode,
        message_number: 1,
      });

      return NextResponse.json({ success: true });
    }

    // ─── Send batch (auto or manual confirm) ───
    if (action === "send_batch") {
      const limit = body.limit || 10;

      const { data: queued } = await sb
        .from("acquisition_queue")
        .select("id, seller_id, message_text, magic_link")
        .eq("asset_type", asset_type)
        .eq("status", "queued")
        .order("created_at", { ascending: true })
        .limit(limit);

      if (!queued || queued.length === 0) {
        return NextResponse.json({ sent: 0, message: "القائمة فاضية" });
      }

      let sent = 0;
      for (const item of queued) {
        await sb.from("acquisition_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", item.id);

        await sb.from("ahe_sellers")
          .update({ pipeline_status: "contacted", last_outreach_at: new Date().toISOString() })
          .eq("id", item.seller_id);

        await sb.from("outreach_logs").insert({
          seller_id: item.seller_id,
          action: "sent",
          agent_name: agentName,
          mode,
          message_number: 1,
        });

        sent++;
      }

      return NextResponse.json({ sent, mode });
    }

    // ─── Followup (48h no response) ───
    if (action === "followup") {
      const cutoff = new Date(Date.now() - (config?.auto_followup_hours || 48) * 3600000).toISOString();

      const { data: needFollowup } = await sb
        .from("ahe_sellers")
        .select("id, name, phone")
        .in("primary_category", catVariants)
        .eq("pipeline_status", "contacted")
        .lt("last_outreach_at", cutoff)
        .not("phone", "is", null)
        .order("whale_score", { ascending: false })
        .limit(body.limit || 20);

      if (!needFollowup || needFollowup.length === 0) {
        return NextResponse.json({ followups: 0, message: "لا يوجد متابعة مطلوبة" });
      }

      // Get followup template
      const { data: followupTemplates } = await sb
        .from("outreach_templates")
        .select("id, message_text")
        .eq("agent", agentName)
        .ilike("name", "%followup%")
        .limit(1);

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://maksab.vercel.app";
      let queued = 0;

      for (const seller of needFollowup) {
        const magicLink = `${baseUrl}/join?phone=${encodeURIComponent(seller.phone)}&seller=${seller.id}&ref=${agentName}`;
        const msg = followupTemplates?.[0]?.message_text?.replace(/\{\{name\}\}/g, seller.name || "")
          || `أهلاً ${seller.name || ""} 👋\nبعتلك رسالة عن مكسب — لو عندك أي سؤال أنا هنا!\n${magicLink}`;

        await sb.from("acquisition_queue").insert({
          seller_id: seller.id,
          asset_type,
          message_number: 2,
          message_text: msg,
          magic_link: magicLink,
          status: "queued",
          mode,
          agent_name: agentName,
        });

        queued++;
      }

      return NextResponse.json({ followups: queued });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[ACQUISITION] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

/** GET /api/acquisition/engine — Get queue for display */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const assetType = searchParams.get("asset_type") || "cars";
  const status = searchParams.get("status") || "queued";
  const limit = parseInt(searchParams.get("limit") || "20");

  const sb = getSupabase();

  const { data: items } = await sb
    .from("acquisition_queue")
    .select(`
      id, seller_id, asset_type, message_number, message_text, magic_link,
      scheduled_at, sent_at, status, mode, agent_name,
      ahe_sellers!inner(name, phone, detected_account_type, total_listings_seen, source_platform, whale_score)
    `)
    .eq("asset_type", assetType)
    .eq("status", status)
    .order("created_at", { ascending: true })
    .limit(limit);

  return NextResponse.json({ items: items || [], count: items?.length || 0 });
}
