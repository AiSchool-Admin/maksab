/**
 * GET  /api/admin/crm/whales/activity?seller_ids=id1,id2,id3
 *      → returns merged timeline of notes (seller_notes) + outreach
 *        events (outreach_logs) for all sellers in a merchant.
 *
 * POST /api/admin/crm/whales/activity
 *      Body: { seller_ids: [], note_text: "..." }
 *      → adds a note attached to the FIRST seller_id (treated as the
 *        merchant-level note record). All sellers in the merchant share
 *        the same query result via the GET endpoint.
 *
 * The whales page uses these to power the notes/activity modal on each
 * merchant row. Activity events come from outreach_logs (status
 * changes, magic-link sends, WhatsApp opens) and notes come from
 * seller_notes.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("seller_ids") || "";
    const sellerIds = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (sellerIds.length === 0) {
      return NextResponse.json(
        { error: "seller_ids required" },
        { status: 400 }
      );
    }

    const sb = getSupabase();

    const [notesRes, logsRes] = await Promise.all([
      sb
        .from("seller_notes")
        .select("id, seller_id, agent_name, note_text, is_pinned, created_at")
        .in("seller_id", sellerIds)
        .order("created_at", { ascending: false })
        .limit(50),
      sb
        .from("outreach_logs")
        .select("id, seller_id, action, notes, created_at")
        .in("seller_id", sellerIds)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (notesRes.error)
      return NextResponse.json(
        { error: notesRes.error.message },
        { status: 500 }
      );
    if (logsRes.error)
      return NextResponse.json(
        { error: logsRes.error.message },
        { status: 500 }
      );

    return NextResponse.json({
      notes: notesRes.data || [],
      activities: logsRes.data || [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { seller_ids, note_text, agent_name } = body || {};

    if (!Array.isArray(seller_ids) || seller_ids.length === 0) {
      return NextResponse.json(
        { error: "seller_ids[] required" },
        { status: 400 }
      );
    }
    const text = String(note_text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "note_text required" }, { status: 400 });
    }
    if (text.length > 4000) {
      return NextResponse.json(
        { error: "note_text too long (max 4000)" },
        { status: 400 }
      );
    }

    const sb = getSupabase();
    // Attach the note to the first seller_id of the merchant. We treat
    // this seller as the canonical record for merchant-level notes; the
    // GET endpoint reads notes for ALL seller_ids in the merchant so the
    // history stays visible no matter which row we wrote to.
    const { data, error } = await sb
      .from("seller_notes")
      .insert({
        seller_id: seller_ids[0],
        note_text: text,
        agent_name: String(agent_name || "admin"),
      })
      .select("id, seller_id, agent_name, note_text, is_pinned, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ note: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
