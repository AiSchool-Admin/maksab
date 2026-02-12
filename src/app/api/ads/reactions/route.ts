/**
 * POST /api/ads/reactions — Toggle reaction on an ad
 * GET  /api/ads/reactions — Get reaction summary for an ad
 *
 * Uses service role client for DB operations.
 * Reads user_id from maksab_user_session in request cookies or body.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Reaction types allowed
const VALID_REACTIONS = [
  "great_price",
  "expensive",
  "fair_price",
  "want_it",
  "amazing",
] as const;

type ReactionType = (typeof VALID_REACTIONS)[number];

// ── POST: Toggle reaction ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ad_id, reaction_type, user_id } = body;

    if (!ad_id || !reaction_type) {
      return NextResponse.json(
        { error: "بيانات ناقصة" },
        { status: 400 },
      );
    }

    if (!VALID_REACTIONS.includes(reaction_type)) {
      return NextResponse.json(
        { error: "نوع التفاعل مش صالح" },
        { status: 400 },
      );
    }

    // Resolve user ID — from body or try to infer
    const resolvedUserId = user_id || null;
    if (!resolvedUserId) {
      return NextResponse.json(
        { error: "لازم تسجل دخول الأول" },
        { status: 401 },
      );
    }

    const client = getServiceClient();
    if (!client) {
      return NextResponse.json(
        { error: "خطأ في الخادم" },
        { status: 500 },
      );
    }

    // Check if ad exists
    const { data: adData } = await client
      .from("ads")
      .select("id, user_id")
      .eq("id", ad_id)
      .maybeSingle();

    if (!adData) {
      return NextResponse.json(
        { error: "الإعلان مش موجود" },
        { status: 404 },
      );
    }

    // Check existing reaction from this user on this ad
    const { data: existing } = await client
      .from("ad_reactions")
      .select("id, reaction_type")
      .eq("ad_id", ad_id)
      .eq("user_id", resolvedUserId)
      .maybeSingle();

    let newReaction: ReactionType | null = null;

    if (existing) {
      const existingRow = existing as Record<string, unknown>;
      if (existingRow.reaction_type === reaction_type) {
        // Same reaction — remove it (toggle off)
        await client
          .from("ad_reactions")
          .delete()
          .eq("id", existingRow.id as string);
        newReaction = null;
      } else {
        // Different reaction — update it
        await client
          .from("ad_reactions")
          .update({ reaction_type } as never)
          .eq("id", existingRow.id as string);
        newReaction = reaction_type as ReactionType;
      }
    } else {
      // No existing reaction — insert new
      await client.from("ad_reactions").insert({
        ad_id,
        user_id: resolvedUserId,
        reaction_type,
      });
      newReaction = reaction_type as ReactionType;
    }

    return NextResponse.json({
      success: true,
      user_reaction: newReaction,
    });
  } catch (err) {
    console.error("[reactions POST] Error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}

// ── GET: Get reaction summary ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adId = searchParams.get("ad_id");
    const userId = searchParams.get("user_id");

    if (!adId) {
      return NextResponse.json(
        { error: "ad_id مطلوب" },
        { status: 400 },
      );
    }

    const client = getServiceClient();
    if (!client) {
      return NextResponse.json(
        { error: "خطأ في الخادم" },
        { status: 500 },
      );
    }

    // Fetch all reactions for this ad
    const { data: reactions } = await client
      .from("ad_reactions")
      .select("reaction_type, user_id")
      .eq("ad_id", adId);

    const rows = (reactions as Record<string, unknown>[]) || [];

    // Build counts
    const counts: Record<string, number> = {
      great_price: 0,
      expensive: 0,
      fair_price: 0,
      want_it: 0,
      amazing: 0,
    };

    let userReaction: string | null = null;

    for (const row of rows) {
      const rt = row.reaction_type as string;
      if (rt in counts) {
        counts[rt]++;
      }
      if (userId && row.user_id === userId) {
        userReaction = rt;
      }
    }

    // Find top reaction
    let topReaction: string | null = null;
    let topCount = 0;
    for (const [type, count] of Object.entries(counts)) {
      if (count > topCount) {
        topCount = count;
        topReaction = type;
      }
    }

    const total = rows.length;

    return NextResponse.json({
      total,
      counts,
      user_reaction: userReaction,
      top_reaction: topReaction,
    });
  } catch (err) {
    console.error("[reactions GET] Error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}
