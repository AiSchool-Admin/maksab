/**
 * POST   /api/ads/comments — Add comment OR toggle like
 * GET    /api/ads/comments — Get paginated comments
 * DELETE /api/ads/comments — Delete own comment
 *
 * Comments are rate-limited: 5 comments per hour per user.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySessionToken } from "@/lib/auth/session-token";

const MAX_COMMENT_LENGTH = 500;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── POST: Add comment or toggle like ───────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Route to like toggle if action is specified
    if (body.action === "toggle_like") {
      return handleToggleLike(body);
    }

    // Otherwise treat as new comment
    return handleAddComment(body);
  } catch (err) {
    console.error("[comments POST] Error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}

async function handleAddComment(body: Record<string, unknown>) {
  const { ad_id, content, user_id, session_token } = body;

  if (!ad_id || !content) {
    return NextResponse.json(
      { error: "بيانات ناقصة" },
      { status: 400 },
    );
  }

  // Authenticate via session token
  let resolvedUserId: string | null = null;
  if (session_token && typeof session_token === "string") {
    const tokenResult = verifySessionToken(session_token);
    if (!tokenResult.valid) {
      return NextResponse.json({ error: tokenResult.error }, { status: 401 });
    }
    resolvedUserId = tokenResult.userId;
  } else if (user_id && typeof user_id === "string") {
    resolvedUserId = user_id;
  }

  if (!resolvedUserId) {
    return NextResponse.json(
      { error: "لازم تسجل دخول الأول" },
      { status: 401 },
    );
  }

  // Sanitize content: strip HTML tags to prevent XSS
  const sanitized = (content as string)
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();

  const trimmed = sanitized;
  if (!trimmed) {
    return NextResponse.json(
      { error: "اكتب تعليق الأول" },
      { status: 400 },
    );
  }

  if (trimmed.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { error: `التعليق طويل أوي. الحد الأقصى ${MAX_COMMENT_LENGTH} حرف` },
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

  // Check ad exists
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

  // Rate limit: max 5 comments per hour per user
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count: recentCount } = await client
    .from("ad_comments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", resolvedUserId)
    .gte("created_at", windowStart);

  if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: "بتعلق كتير. استنى شوية وجرب تاني" },
      { status: 429 },
    );
  }

  // Insert comment
  const { data: inserted, error: insertError } = await client
    .from("ad_comments")
    .insert({
      ad_id,
      user_id: resolvedUserId,
      content: trimmed,
    })
    .select("id, ad_id, user_id, content, created_at")
    .single();

  if (insertError || !inserted) {
    console.error("[comments] Insert error:", insertError);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }

  const row = inserted as Record<string, unknown>;

  // Fetch user profile for display
  const { data: profile } = await client
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", resolvedUserId)
    .maybeSingle();

  const p = profile as Record<string, unknown> | null;
  const adOwner = adData as Record<string, unknown>;

  const comment = {
    id: row.id as string,
    adId: row.ad_id as string,
    userId: row.user_id as string,
    userName: (p?.display_name as string) || "مستخدم",
    userAvatar: (p?.avatar_url as string) || null,
    content: row.content as string,
    createdAt: row.created_at as string,
    likesCount: 0,
    isLikedByMe: false,
    isOwner: (row.user_id as string) === (adOwner.user_id as string),
  };

  return NextResponse.json({ success: true, comment });
}

async function handleToggleLike(body: Record<string, unknown>) {
  const { comment_id, user_id, session_token } = body;

  if (!comment_id) {
    return NextResponse.json(
      { error: "بيانات ناقصة" },
      { status: 400 },
    );
  }

  // Authenticate via session token
  let resolvedUserId: string | null = null;
  if (session_token && typeof session_token === "string") {
    const tokenResult = verifySessionToken(session_token);
    if (!tokenResult.valid) {
      return NextResponse.json({ error: tokenResult.error }, { status: 401 });
    }
    resolvedUserId = tokenResult.userId;
  } else if (user_id && typeof user_id === "string") {
    resolvedUserId = user_id;
  }

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

  // Check if already liked
  const { data: existingLike } = await client
    .from("ad_comment_likes")
    .select("id")
    .eq("comment_id", comment_id)
    .eq("user_id", resolvedUserId)
    .maybeSingle();

  if (existingLike) {
    // Unlike — remove the like
    await client
      .from("ad_comment_likes")
      .delete()
      .eq("id", (existingLike as Record<string, unknown>).id as string);

    // Decrement likes count on comment
    const { data: commentData } = await client
      .from("ad_comments")
      .select("likes_count")
      .eq("id", comment_id)
      .maybeSingle();

    const currentLikes = Number((commentData as Record<string, unknown>)?.likes_count) || 0;
    await client
      .from("ad_comments")
      .update({ likes_count: Math.max(0, currentLikes - 1) } as never)
      .eq("id", comment_id as string);

    return NextResponse.json({ success: true, liked: false });
  } else {
    // Like — add the like
    await client.from("ad_comment_likes").insert({
      comment_id,
      user_id: resolvedUserId,
    });

    // Increment likes count on comment
    const { data: commentData } = await client
      .from("ad_comments")
      .select("likes_count")
      .eq("id", comment_id)
      .maybeSingle();

    const currentLikes = Number((commentData as Record<string, unknown>)?.likes_count) || 0;
    await client
      .from("ad_comments")
      .update({ likes_count: currentLikes + 1 } as never)
      .eq("id", comment_id as string);

    return NextResponse.json({ success: true, liked: true });
  }
}

// ── GET: Get paginated comments ────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adId = searchParams.get("ad_id");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 10));
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

    // Get total count
    const { count: totalCount } = await client
      .from("ad_comments")
      .select("id", { count: "exact", head: true })
      .eq("ad_id", adId);

    const total = totalCount ?? 0;
    const offset = (page - 1) * limit;

    // Fetch comments
    const { data: commentsData } = await client
      .from("ad_comments")
      .select("id, ad_id, user_id, content, likes_count, created_at")
      .eq("ad_id", adId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const rows = (commentsData as Record<string, unknown>[]) || [];

    if (rows.length === 0) {
      return NextResponse.json({
        comments: [],
        total_count: total,
        has_more: false,
      });
    }

    // Fetch ad owner for "isOwner" badge
    const { data: adData } = await client
      .from("ads")
      .select("user_id")
      .eq("id", adId)
      .maybeSingle();

    const adOwnerId = (adData as Record<string, unknown>)?.user_id as string | null;

    // Fetch user profiles
    const userIds = [...new Set(rows.map((r) => r.user_id as string))];
    const { data: profilesData } = await client
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    const profilesMap = new Map<string, { name: string; avatar: string | null }>();
    if (profilesData) {
      for (const p of profilesData as Record<string, unknown>[]) {
        profilesMap.set(p.id as string, {
          name: (p.display_name as string) || "مستخدم",
          avatar: (p.avatar_url as string) || null,
        });
      }
    }

    // Check which comments the current user has liked
    let likedCommentIds = new Set<string>();
    if (userId) {
      const commentIds = rows.map((r) => r.id as string);
      const { data: likesData } = await client
        .from("ad_comment_likes")
        .select("comment_id")
        .eq("user_id", userId)
        .in("comment_id", commentIds);

      if (likesData) {
        likedCommentIds = new Set(
          (likesData as Record<string, unknown>[]).map(
            (l) => l.comment_id as string,
          ),
        );
      }
    }

    // Map rows to response
    const comments = rows.map((row) => {
      const profile = profilesMap.get(row.user_id as string);
      return {
        id: row.id as string,
        adId: row.ad_id as string,
        userId: row.user_id as string,
        userName: profile?.name || "مستخدم",
        userAvatar: profile?.avatar || null,
        content: row.content as string,
        createdAt: row.created_at as string,
        likesCount: Number(row.likes_count) || 0,
        isLikedByMe: likedCommentIds.has(row.id as string),
        isOwner: (row.user_id as string) === adOwnerId,
      };
    });

    return NextResponse.json({
      comments,
      total_count: total,
      has_more: offset + limit < total,
    });
  } catch (err) {
    console.error("[comments GET] Error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}

// ── DELETE: Delete own comment ─────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("comment_id");
    const userId = searchParams.get("user_id");

    if (!commentId) {
      return NextResponse.json(
        { error: "comment_id مطلوب" },
        { status: 400 },
      );
    }

    if (!userId) {
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

    // Verify the comment belongs to the user
    const { data: comment } = await client
      .from("ad_comments")
      .select("id, user_id")
      .eq("id", commentId)
      .maybeSingle();

    if (!comment) {
      return NextResponse.json(
        { error: "التعليق مش موجود" },
        { status: 404 },
      );
    }

    if ((comment as Record<string, unknown>).user_id !== userId) {
      return NextResponse.json(
        { error: "مش مسموحلك تمسح التعليق ده" },
        { status: 403 },
      );
    }

    // Delete associated likes first, then the comment
    await client
      .from("ad_comment_likes")
      .delete()
      .eq("comment_id", commentId);

    await client
      .from("ad_comments")
      .delete()
      .eq("id", commentId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[comments DELETE] Error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}
