/**
 * Founder System Service — مكسب
 *
 * Manages the "مؤسس مكسب" (Maksab Founder) badge system.
 * Early users who join via invite links or during pre-launch
 * earn the exclusive founder badge with a unique number.
 */

import { supabase } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────

export interface FounderProfile {
  isFounder: boolean;
  founderNumber: number | null;
  inviteCode: string | null;
  invitedBy: string | null;
  invitedCount: number;
}

export interface InviteInfo {
  inviterName: string | null;
  inviterPhone: string;
  inviteCode: string;
  isValid: boolean;
}

// ── Constants ──────────────────────────────────────────

const FOUNDER_LIMIT = 500; // First 500 users get founder badge
const INVITE_CODE_PREFIX = "MKS";

// ── Generate Invite Code ───────────────────────────────

/**
 * Generate a unique invite code for a user
 */
export function generateInviteCode(phone: string): string {
  const phoneSuffix = phone.slice(-4);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${INVITE_CODE_PREFIX}-${phoneSuffix}${random}`;
}

// ── Get Founder Profile ────────────────────────────────

/**
 * Get founder status for a user
 */
export async function getFounderProfile(userId: string): Promise<FounderProfile> {
  try {
    const { data: profile } = await supabase
      .from("profiles" as never)
      .select("is_founder, founder_number, invite_code, invited_by")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      return {
        isFounder: false,
        founderNumber: null,
        inviteCode: null,
        invitedBy: null,
        invitedCount: 0,
      };
    }

    const p = profile as Record<string, unknown>;

    // Count invited users
    const { count } = await supabase
      .from("profiles" as never)
      .select("id", { count: "exact", head: true })
      .eq("invited_by", p.invite_code as string);

    return {
      isFounder: p.is_founder as boolean,
      founderNumber: p.founder_number as number | null,
      inviteCode: p.invite_code as string | null,
      invitedBy: p.invited_by as string | null,
      invitedCount: count || 0,
    };
  } catch {
    return {
      isFounder: false,
      founderNumber: null,
      inviteCode: null,
      invitedBy: null,
      invitedCount: 0,
    };
  }
}

// ── Check Invite Code ──────────────────────────────────

/**
 * Validate an invite code and return inviter info
 */
export async function checkInviteCode(code: string): Promise<InviteInfo | null> {
  try {
    const { data } = await supabase
      .from("profiles" as never)
      .select("display_name, phone, invite_code")
      .eq("invite_code", code)
      .maybeSingle();

    if (!data) return null;

    const d = data as Record<string, unknown>;
    return {
      inviterName: d.display_name as string | null,
      inviterPhone: d.phone as string,
      inviteCode: d.invite_code as string,
      isValid: true,
    };
  } catch {
    return null;
  }
}

// ── Assign Founder Status ──────────────────────────────

/**
 * Attempt to assign founder status to a user.
 * Only works if under the founder limit.
 */
export async function assignFounderStatus(
  userId: string,
  invitedByCode?: string,
): Promise<{ success: boolean; founderNumber?: number }> {
  try {
    // Count current founders
    const { count } = await supabase
      .from("profiles" as never)
      .select("id", { count: "exact", head: true })
      .eq("is_founder", true);

    const currentCount = count || 0;
    if (currentCount >= FOUNDER_LIMIT) {
      return { success: false };
    }

    const founderNumber = currentCount + 1;
    const { data: profile } = await supabase
      .from("profiles" as never)
      .select("phone, invite_code")
      .eq("id", userId)
      .maybeSingle();

    const p = profile as Record<string, unknown> | null;
    const phone = (p?.phone as string) || "";
    const existingCode = p?.invite_code as string | null;
    const inviteCode = existingCode || generateInviteCode(phone);

    // Update profile
    await supabase
      .from("profiles" as never)
      .update({
        is_founder: true,
        founder_number: founderNumber,
        invite_code: inviteCode,
        invited_by: invitedByCode || null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", userId);

    // Also add to user_badges table
    await supabase
      .from("user_badges" as never)
      .upsert(
        {
          user_id: userId,
          badge_id: "founder",
          earned_at: new Date().toISOString(),
        } as never,
        { onConflict: "user_id,badge_id" } as never,
      );

    return { success: true, founderNumber };
  } catch {
    return { success: false };
  }
}

// ── Get Founder Stats ──────────────────────────────────

/**
 * Get overall founder program stats
 */
export async function getFounderStats(): Promise<{
  totalFounders: number;
  remaining: number;
  limit: number;
}> {
  try {
    const { count } = await supabase
      .from("profiles" as never)
      .select("id", { count: "exact", head: true })
      .eq("is_founder", true);

    const totalFounders = count || 0;
    return {
      totalFounders,
      remaining: Math.max(0, FOUNDER_LIMIT - totalFounders),
      limit: FOUNDER_LIMIT,
    };
  } catch {
    return { totalFounders: 0, remaining: FOUNDER_LIMIT, limit: FOUNDER_LIMIT };
  }
}
