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
          .eq("pipeline_status", "phone_found"),
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

      // Get sellers with phone, pipeline_status = 'phone_found', not already queued
      // First get IDs already in queue to exclude them
      const { data: alreadyQueued } = await sb
        .from("acquisition_queue")
        .select("seller_id")
        .eq("asset_type", asset_type)
        .in("status", ["queued", "sent"]);

      const queuedIds = new Set((alreadyQueued || []).map(q => q.seller_id));

      const { data: sellers, error: sellerErr } = await sb
        .from("ahe_sellers")
        .select("id, name, phone, detected_account_type, total_listings_seen, source_platform, pipeline_status")
        .in("primary_category", catVariants)
        .in("primary_governorate", ALEX_GOVS)
        .not("phone", "is", null)
        .eq("pipeline_status", "phone_found")
        .order("whale_score", { ascending: false })
        .limit(limit + queuedIds.size); // fetch extra to compensate for skips

      console.error(`[Acquisition] queue_new: ${sellers?.length || 0} sellers found (${queuedIds.size} already queued), error: ${sellerErr?.message || "none"}`);

      if (!sellers || sellers.length === 0) {
        return NextResponse.json({
          queued: 0,
          message: sellerErr?.message || "لا يوجد بائعين جدد بـ phone_found",
          debug: {
            catVariants,
            govs: ALEX_GOVS,
            already_queued: queuedIds.size,
            seller_error: sellerErr?.message || null,
            alreadyQueued_error: alreadyQueued === null ? "table may not exist" : null,
          },
        });
      }

      // Get message 1 template (funnel first contact)
      const funnel1Name = asset_type === "cars" ? "funnel_msg1_cars" : "funnel_msg1_props";
      const { data: templates } = await sb
        .from("outreach_templates")
        .select("id, name, message_text, target_tier")
        .eq("agent", agentName)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const msg1Template = templates?.find(t => t.name === funnel1Name) || templates?.[0];

      // Generate messages and queue
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://maksab.vercel.app";
      let queued = 0;

      for (const seller of sellers) {
        // Skip if already queued
        if (queuedIds.has(seller.id)) continue;
        if (queued >= limit) break;

        // Message 1: simple intro — no link needed
        let messageText = msg1Template?.message_text || `أهلاً ${seller.name || ""} 👋\nشفنا إعلاناتك على دوبيزل\nفريق مكسب يقدر يكتب إعلاناتك ويسجلك في دقايق — مجاناً\nيهمك؟`;
        messageText = messageText
          .replace(/\{\{name\}\}/g, seller.name || "")
          .replace(/\{\{platform\}\}/g, seller.source_platform || "دوبيزل");

        const { error: insertErr } = await sb.from("acquisition_queue").insert({
          seller_id: seller.id,
          asset_type,
          message_number: 1,
          message_text: messageText,
          magic_link: null,
          status: "queued",
          mode,
        });

        if (insertErr) {
          console.error(`[Acquisition] Insert error for ${seller.id}: ${insertErr.message}`);
          // Return the first error so we can debug
          if (queued === 0) {
            return NextResponse.json({
              queued: 0,
              total_sellers: sellers.length,
              insert_error: insertErr.message,
              debug: { seller_id: seller.id },
            });
          }
          continue;
        }
        queued++;
      }

      console.error(`[Acquisition] queue_new done: ${queued} queued from ${sellers.length} sellers (${queuedIds.size} skipped)`);
      return NextResponse.json({
        queued,
        total_sellers: sellers.length,
        already_queued: queuedIds.size,
        mode,
      });
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

      // Get message 2 template (consent link)
      const funnel2Name = asset_type === "cars" ? "funnel_msg2_cars" : "funnel_msg2_props";
      const { data: msg2Templates } = await sb
        .from("outreach_templates")
        .select("id, name, message_text")
        .eq("agent", agentName)
        .eq("is_active", true);

      const msg2Template = msg2Templates?.find(t => t.name === funnel2Name);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://maksab.vercel.app";
      let queued = 0;

      for (const seller of needFollowup) {
        const consentLink = `${baseUrl}/consent?seller=${seller.id}&ref=${agentName}`;
        let msg = msg2Template?.message_text
          || `${seller.name || ""}، فريقنا جاهز يسجلك ويكتب إعلاناتك على مكسب\nاضغط للموافقة:\n👉 ${consentLink}`;
        msg = msg
          .replace(/\{\{name\}\}/g, seller.name || "")
          .replace(/\{\{consent_link\}\}/g, consentLink);

        await sb.from("acquisition_queue").insert({
          seller_id: seller.id,
          asset_type,
          message_number: 2,
          message_text: msg,
          magic_link: consentLink,
          status: "queued",
          mode,
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

  // Fetch queue items
  const { data: queueItems, error: qErr } = await sb
    .from("acquisition_queue")
    .select("id, seller_id, asset_type, message_number, message_text, magic_link, scheduled_at, sent_at, status, mode, agent_name")
    .eq("asset_type", assetType)
    .eq("status", status)
    .order("created_at", { ascending: true })
    .limit(limit);

  console.error(`[Acquisition GET] Queue items: ${queueItems?.length || 0}, error: ${qErr?.message || "none"}`);

  if (!queueItems || queueItems.length === 0) {
    return NextResponse.json({ items: [], count: 0 });
  }

  // Fetch seller data separately (avoids FK join issues)
  const sellerIds = [...new Set(queueItems.map(q => q.seller_id))];
  const { data: sellers } = await sb
    .from("ahe_sellers")
    .select("id, name, phone, detected_account_type, total_listings_seen, source_platform, whale_score")
    .in("id", sellerIds);

  const sellerMap = new Map((sellers || []).map(s => [s.id, s]));

  const items = queueItems.map(q => ({
    ...q,
    ahe_sellers: sellerMap.get(q.seller_id) || {
      name: "بدون اسم",
      phone: "",
      detected_account_type: "individual",
      total_listings_seen: 0,
      source_platform: "",
      whale_score: 0,
    },
  }));

  return NextResponse.json({ items, count: items.length });
}
