/**
 * POST /api/admin/sales/crm/[id]/note  — Add a note to a seller
 * PATCH /api/admin/sales/crm/[id]/note?note_id=... — Update note (pin/unpin or text)
 * DELETE /api/admin/sales/crm/[id]/note?note_id=... — Delete note
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
    const { note_text, agent_name, is_pinned } = await req.json();

    if (!note_text || typeof note_text !== "string") {
      return NextResponse.json({ error: "note_text required" }, { status: 400 });
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from("seller_notes")
      .insert({
        seller_id: id,
        note_text: note_text.trim(),
        agent_name: agent_name || "agent",
        is_pinned: !!is_pinned,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, note: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const noteId = new URL(req.url).searchParams.get("note_id");
    if (!noteId) return NextResponse.json({ error: "note_id required" }, { status: 400 });

    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.note_text === "string") updates.note_text = body.note_text.trim();
    if (typeof body.is_pinned === "boolean") updates.is_pinned = body.is_pinned;

    const sb = getSupabase();
    const { data, error } = await sb
      .from("seller_notes")
      .update(updates)
      .eq("id", noteId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, note: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const noteId = new URL(req.url).searchParams.get("note_id");
    if (!noteId) return NextResponse.json({ error: "note_id required" }, { status: 400 });

    const sb = getSupabase();
    const { error } = await sb.from("seller_notes").delete().eq("id", noteId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
