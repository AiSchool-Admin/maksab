/**
 * Block service — block/unblock users and check block status.
 */

/**
 * Block a user.
 */
export async function blockUser(blockerId: string, blockedId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/users/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocker_id: blockerId, blocked_id: blockedId }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || "حصل مشكلة" };
    }
    return { success: true };
  } catch {
    return { success: false, error: "حصل مشكلة في الاتصال" };
  }
}

/**
 * Unblock a user.
 */
export async function unblockUser(blockerId: string, blockedId: string): Promise<{ success: boolean }> {
  try {
    const response = await fetch("/api/users/block", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocker_id: blockerId, blocked_id: blockedId }),
    });

    return { success: response.ok };
  } catch {
    return { success: false };
  }
}

/**
 * Check if current user has blocked another user.
 */
export async function isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { count } = await supabase
      .from("blocked_users")
      .select("id", { count: "exact", head: true })
      .eq("blocker_id", blockerId)
      .eq("blocked_id", blockedId);
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Get list of blocked user IDs for filtering.
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { data } = await supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", userId);
    return (data || []).map((r: { blocked_id: string }) => r.blocked_id);
  } catch {
    return [];
  }
}
