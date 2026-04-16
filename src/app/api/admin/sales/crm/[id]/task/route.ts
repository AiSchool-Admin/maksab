/**
 * POST /api/admin/sales/crm/[id]/task — Create a follow-up task
 * PATCH /api/admin/sales/crm/[id]/task?task_id=... — Update or complete task
 * DELETE /api/admin/sales/crm/[id]/task?task_id=... — Delete task
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { task_text, agent_name, due_at, priority } = await req.json();

    if (!task_text) {
      return NextResponse.json({ error: "task_text required" }, { status: 400 });
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from("seller_tasks")
      .insert({
        seller_id: id,
        task_text: task_text.trim(),
        agent_name: agent_name || "agent",
        due_at: due_at || null,
        priority: priority || "normal",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, task: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const taskId = new URL(req.url).searchParams.get("task_id");
    if (!taskId) return NextResponse.json({ error: "task_id required" }, { status: 400 });

    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof body.task_text === "string") updates.task_text = body.task_text.trim();
    if (body.priority) updates.priority = body.priority;
    if (body.due_at !== undefined) updates.due_at = body.due_at;
    if (body.status) {
      updates.status = body.status;
      if (body.status === "completed") {
        updates.completed_at = new Date().toISOString();
      }
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from("seller_tasks")
      .update(updates)
      .eq("id", taskId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, task: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const taskId = new URL(req.url).searchParams.get("task_id");
    if (!taskId) return NextResponse.json({ error: "task_id required" }, { status: 400 });

    const sb = getSupabase();
    const { error } = await sb.from("seller_tasks").delete().eq("id", taskId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
