/**
 * POST /api/admin/sales/crm/[id]/stage
 *
 * Change the pipeline stage of a seller manually.
 *
 * Request:
 *   {
 *     stage: "discovered" | "phone_found" | "contacted_1" | "contacted_2" |
 *            "interested" | "considering" | "consented" | "registered" | "rejected",
 *     agent_name?: "nadia",
 *     reason?: "Called and said yes"
 *   }
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

const VALID_STAGES = [
  "discovered",
  "phone_found",
  "contacted_1",
  "contacted_2",
  "contacted",
  "interested",
  "considering",
  "consented",
  "registered",
  "rejected",
  "skipped",
  "exhausted",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { stage, agent_name, reason } = await req.json();

    if (!stage || !VALID_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}` },
        { status: 400 }
      );
    }

    const sb = getSupabase();

    // Get current stage for logging
    const { data: currentSeller } = await sb
      .from("ahe_sellers")
      .select("pipeline_status")
      .eq("id", id)
      .single();

    const previousStage = currentSeller?.pipeline_status || null;

    // Update
    const updates: Record<string, unknown> = {
      pipeline_status: stage,
      updated_at: new Date().toISOString(),
    };

    if (stage === "interested" || stage === "considering" || stage === "consented") {
      updates.last_response_at = new Date().toISOString();
    }
    if (stage === "rejected") {
      updates.rejection_reason = reason || null;
      updates.last_response_at = new Date().toISOString();
    }
    if (stage === "skipped") {
      updates.skip_reason = reason || null;
    }

    const { error } = await sb
      .from("ahe_sellers")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the stage change
    await sb.from("outreach_logs").insert({
      seller_id: id,
      action: "stage_change",
      agent_name: agent_name || "agent",
      notes: `[STAGE: ${previousStage || "null"} → ${stage}]${reason ? ` ${reason}` : ""}`,
    });

    return NextResponse.json({
      success: true,
      previous_stage: previousStage,
      new_stage: stage,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
