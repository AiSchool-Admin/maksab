/**
 * GET /api/admin/sales/crm/[id]
 *
 * Seller 360 — single endpoint returns everything about a seller:
 *   - Seller profile
 *   - Listings
 *   - Conversation/outreach timeline (all channels)
 *   - Notes
 *   - Tasks
 *   - Related ahe_listings migration status
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sb = getSupabase();

    // 1. Seller profile
    const { data: seller, error: sellerErr } = await sb
      .from("ahe_sellers")
      .select("*")
      .eq("id", id)
      .single();

    if (sellerErr || !seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    // 2. Listings from harvester (full details)
    const { data: listings } = await sb
      .from("ahe_listings")
      .select("id, title, description, price, thumbnail_url, all_image_urls, city, governorate, area, source_listing_url, source_platform, source_location, migration_status, maksab_listing_id, is_duplicate, specifications, property_type, bedrooms, bathrooms, area_sqm, floor_number, furnished, finishing, created_at")
      .eq("ahe_seller_id", id)
      .eq("is_duplicate", false)
      .order("created_at", { ascending: false })
      .limit(50);

    // 3. Outreach logs (all historical actions)
    const { data: outreachLogs } = await sb
      .from("outreach_logs")
      .select("id, action, agent_name, notes, template_id, created_at")
      .eq("seller_id", id)
      .order("created_at", { ascending: false })
      .limit(100);

    // 4. Acquisition queue messages
    const { data: queueMessages } = await sb
      .from("acquisition_queue")
      .select("id, asset_type, message_number, message_text, status, mode, scheduled_at, sent_at, created_at")
      .eq("seller_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    // 5. Seller notes
    const { data: notes } = await sb
      .from("seller_notes")
      .select("id, note_text, agent_name, is_pinned, created_at, updated_at")
      .eq("seller_id", id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    // 6. Seller tasks
    const { data: tasks } = await sb
      .from("seller_tasks")
      .select("id, task_text, agent_name, due_at, priority, status, completed_at, created_at")
      .eq("seller_id", id)
      .order("status", { ascending: true })
      .order("due_at", { ascending: true, nullsFirst: false });

    // 7. If this seller is linked to a maksab user, get their profile
    let maksabUser = null;
    if (seller.user_id) {
      const { data: profile } = await sb
        .from("profiles")
        .select("id, phone, display_name, avatar_url, governorate, city, created_at")
        .eq("id", seller.user_id)
        .maybeSingle();
      maksabUser = profile;
    }

    // 8. Build unified timeline (all events sorted chronologically)
    const timeline: Array<{
      id: string;
      type: string;
      direction: "inbound" | "outbound" | "system";
      content: string;
      meta: Record<string, unknown>;
      timestamp: string;
    }> = [];

    for (const log of (outreachLogs || [])) {
      const isInbound = log.action === "responded" || log.action === "interested";
      timeline.push({
        id: `log-${log.id}`,
        type: `outreach_${log.action}`,
        direction: isInbound ? "inbound" : log.action === "sent" ? "outbound" : "system",
        content: log.notes || log.action,
        meta: { agent: log.agent_name, template_id: log.template_id },
        timestamp: log.created_at,
      });
    }

    for (const msg of (queueMessages || [])) {
      timeline.push({
        id: `queue-${msg.id}`,
        type: `queue_msg_${msg.message_number}`,
        direction: "outbound",
        content: msg.message_text || "",
        meta: {
          status: msg.status,
          mode: msg.mode,
          asset_type: msg.asset_type,
          scheduled_at: msg.scheduled_at,
          sent_at: msg.sent_at,
        },
        timestamp: msg.sent_at || msg.created_at,
      });
    }

    // Sort timeline by timestamp descending (newest first)
    timeline.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 9. Compute pipeline progress (0-100%)
    const stages = [
      "discovered",
      "phone_found",
      "contacted_1",
      "contacted_2",
      "contacted",
      "interested",
      "considering",
      "consented",
      "registered",
    ];
    const stageIdx = stages.indexOf(seller.pipeline_status || "discovered");
    const progressPercent = stageIdx >= 0
      ? Math.round((stageIdx / (stages.length - 1)) * 100)
      : 0;

    return NextResponse.json({
      seller,
      listings: listings || [],
      outreach_logs: outreachLogs || [],
      queue_messages: queueMessages || [],
      notes: notes || [],
      tasks: tasks || [],
      timeline,
      maksab_user: maksabUser,
      stats: {
        listings_count: listings?.length || 0,
        outreach_count: outreachLogs?.length || 0,
        notes_count: notes?.length || 0,
        pending_tasks: (tasks || []).filter((t) => t.status === "pending").length,
        progress_percent: progressPercent,
        current_stage: seller.pipeline_status || "discovered",
      },
    });
  } catch (err) {
    console.error("[sales/crm/[id]] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
