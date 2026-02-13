/**
 * Reactions & Comments service for ad social interactions.
 *
 * Reactions use localStorage for optimistic updates + Supabase for persistence.
 * Comments always go through Supabase.
 * All UI strings in Egyptian Arabic.
 */

import { supabase } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────

export type ReactionType =
  | "great_price"
  | "expensive"
  | "fair_price"
  | "want_it"
  | "amazing";

export interface ReactionConfig {
  type: ReactionType;
  label: string;
  emoji: string;
  color: string;
}

export const REACTION_CONFIGS: ReactionConfig[] = [
  { type: "great_price", label: "سعر ممتاز", emoji: "\u{1F525}", color: "text-green-600" },
  { type: "expensive", label: "غالي شوية", emoji: "\u{1F4B8}", color: "text-red-500" },
  { type: "fair_price", label: "سعر معقول", emoji: "\u{1F44D}", color: "text-blue-500" },
  { type: "want_it", label: "نفسي فيه", emoji: "\u{1F60D}", color: "text-pink-500" },
  { type: "amazing", label: "حاجة جامدة", emoji: "\u{2728}", color: "text-yellow-500" },
];

export interface AdReaction {
  id: string;
  adId: string;
  userId: string;
  reactionType: ReactionType;
  createdAt: string;
}

export interface ReactionSummary {
  total: number;
  counts: Record<ReactionType, number>;
  userReaction: ReactionType | null;
  topReaction: ReactionType | null;
}

export interface AdComment {
  id: string;
  adId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  createdAt: string;
  likesCount: number;
  isLikedByMe: boolean;
  isOwner: boolean;
}

export interface CommentsPage {
  comments: AdComment[];
  totalCount: number;
  hasMore: boolean;
}

// ── LocalStorage helpers for optimistic reactions ──────────────────────

const REACTIONS_CACHE_KEY = "maksab_reactions_cache";

interface ReactionsCacheEntry {
  adId: string;
  reactionType: ReactionType;
  timestamp: number;
}

function getReactionsCache(): ReactionsCacheEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(REACTIONS_CACHE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveReactionsCache(entries: ReactionsCacheEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REACTIONS_CACHE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

function getCachedReaction(adId: string): ReactionType | null {
  const cache = getReactionsCache();
  const entry = cache.find((e) => e.adId === adId);
  return entry?.reactionType ?? null;
}

function setCachedReaction(adId: string, reactionType: ReactionType | null): void {
  let cache = getReactionsCache();
  cache = cache.filter((e) => e.adId !== adId);
  if (reactionType) {
    cache.push({ adId, reactionType, timestamp: Date.now() });
  }
  // Keep cache size manageable — max 200 entries
  if (cache.length > 200) {
    cache.sort((a, b) => b.timestamp - a.timestamp);
    cache = cache.slice(0, 200);
  }
  saveReactionsCache(cache);
}

// ── Helper: Empty counts object ────────────────────────────────────────

function emptyCounts(): Record<ReactionType, number> {
  return {
    great_price: 0,
    expensive: 0,
    fair_price: 0,
    want_it: 0,
    amazing: 0,
  };
}

// ── Reaction Functions ─────────────────────────────────────────────────

/**
 * Toggle a reaction on an ad. One reaction per user per ad.
 * - If user has no reaction: adds this reaction.
 * - If user has same reaction: removes it.
 * - If user has different reaction: changes to this one.
 *
 * Returns the new user reaction (or null if removed).
 */
export async function toggleReaction(
  adId: string,
  reactionType: ReactionType,
): Promise<{ userReaction: ReactionType | null; error: string | null }> {
  try {
    const res = await fetch("/api/ads/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ad_id: adId, reaction_type: reactionType }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { userReaction: null, error: data.error || "حصل مشكلة، جرب تاني" };
    }

    const newReaction = data.user_reaction as ReactionType | null;
    // Update optimistic cache
    setCachedReaction(adId, newReaction);
    return { userReaction: newReaction, error: null };
  } catch {
    return { userReaction: null, error: "حصل مشكلة في الاتصال. جرب تاني" };
  }
}

/**
 * Get the reaction summary for an ad (counts + user's current reaction).
 */
export async function getReactionSummary(adId: string): Promise<ReactionSummary> {
  const defaultSummary: ReactionSummary = {
    total: 0,
    counts: emptyCounts(),
    userReaction: getCachedReaction(adId),
    topReaction: null,
  };

  try {
    const res = await fetch(`/api/ads/reactions?ad_id=${encodeURIComponent(adId)}`);
    const data = await res.json();

    if (!res.ok) return defaultSummary;

    const summary: ReactionSummary = {
      total: data.total ?? 0,
      counts: { ...emptyCounts(), ...(data.counts ?? {}) },
      userReaction: data.user_reaction ?? getCachedReaction(adId),
      topReaction: data.top_reaction ?? null,
    };

    // Sync cache with server truth
    if (data.user_reaction !== undefined) {
      setCachedReaction(adId, data.user_reaction);
    }

    return summary;
  } catch {
    return defaultSummary;
  }
}

// ── Comment Functions ──────────────────────────────────────────────────

/**
 * Add a comment to an ad. Max 500 characters, rate limited to 5/hour.
 */
export async function addComment(
  adId: string,
  content: string,
  userId?: string,
): Promise<{ comment: AdComment | null; error: string | null }> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { comment: null, error: "اكتب تعليق الأول" };
  }
  if (trimmed.length > 500) {
    return { comment: null, error: "التعليق طويل أوي. الحد الأقصى 500 حرف" };
  }

  try {
    const res = await fetch("/api/ads/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ad_id: adId, content: trimmed, user_id: userId }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { comment: null, error: data.error || "حصل مشكلة، جرب تاني" };
    }

    return { comment: data.comment as AdComment, error: null };
  } catch {
    return { comment: null, error: "حصل مشكلة في الاتصال. جرب تاني" };
  }
}

/**
 * Get paginated comments for an ad (newest first).
 */
export async function getComments(
  adId: string,
  page: number = 1,
  limit: number = 10,
  userId?: string,
): Promise<CommentsPage> {
  const defaultPage: CommentsPage = {
    comments: [],
    totalCount: 0,
    hasMore: false,
  };

  try {
    const params = new URLSearchParams({
      ad_id: adId,
      page: String(page),
      limit: String(limit),
    });
    if (userId) params.set("user_id", userId);

    const res = await fetch(`/api/ads/comments?${params}`);
    const data = await res.json();

    if (!res.ok) return defaultPage;

    return {
      comments: (data.comments ?? []) as AdComment[],
      totalCount: data.total_count ?? 0,
      hasMore: data.has_more ?? false,
    };
  } catch {
    return defaultPage;
  }
}

/**
 * Delete own comment.
 */
export async function deleteComment(
  commentId: string,
  userId?: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const params = new URLSearchParams({ comment_id: commentId });
    if (userId) params.set("user_id", userId);
    const res = await fetch(
      `/api/ads/comments?${params}`,
      { method: "DELETE" },
    );

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || "حصل مشكلة، جرب تاني" };
    }

    return { success: true, error: null };
  } catch {
    return { success: false, error: "حصل مشكلة في الاتصال. جرب تاني" };
  }
}

/**
 * Toggle like on a comment.
 */
export async function toggleCommentLike(
  commentId: string,
  userId?: string,
): Promise<{ liked: boolean; error: string | null }> {
  try {
    const res = await fetch("/api/ads/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_like", comment_id: commentId, user_id: userId }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { liked: false, error: data.error || "حصل مشكلة، جرب تاني" };
    }

    return { liked: data.liked ?? false, error: null };
  } catch {
    return { liked: false, error: "حصل مشكلة في الاتصال. جرب تاني" };
  }
}

/**
 * Get the reaction configs for display.
 */
export function getReactionConfigs(): ReactionConfig[] {
  return REACTION_CONFIGS;
}
