/**
 * Group chat service — allows buyers to invite additional members
 * (friends, family) into a conversation with a seller.
 *
 * Uses the `conversation_members` table in Supabase to track
 * additional participants beyond the original buyer/seller pair.
 *
 * Rules:
 * - Max 3 additional members per conversation (5 total with buyer + seller)
 * - Only the buyer can add/remove members
 * - Buyer and seller cannot be removed
 * - Members can see all messages; their sent messages show their display name
 */

import { supabase } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  phone: string;
  role: "buyer" | "seller" | "member";
  addedBy: string | null;
  addedAt: string;
}

export interface AddMemberResult {
  success: boolean;
  member?: ConversationMember;
  error?: string;
}

export interface RemoveMemberResult {
  success: boolean;
  error?: string;
}

// ── Constants ────────────────────────────────────────────────────────────

/** Maximum additional members (excluding buyer + seller) */
const MAX_ADDITIONAL_MEMBERS = 3;

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Fetch the original buyer_id and seller_id from a conversation row.
 * Returns null if the conversation doesn't exist.
 */
async function getConversationParticipants(
  conversationId: string,
): Promise<{ buyerId: string; sellerId: string } | null> {
  const { data, error } = await supabase
    .from("conversations" as never)
    .select("buyer_id, seller_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  return {
    buyerId: row.buyer_id as string,
    sellerId: row.seller_id as string,
  };
}

/**
 * Fetch a user profile by ID. Returns minimal info needed for a member entry.
 */
async function fetchUserProfile(
  userId: string,
): Promise<{
  displayName: string;
  avatarUrl: string | null;
  phone: string;
} | null> {
  const { data, error } = await supabase
    .from("profiles" as never)
    .select("display_name, avatar_url, phone")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const profile = data as Record<string, unknown>;
  return {
    displayName: (profile.display_name as string) || "مستخدم",
    avatarUrl: (profile.avatar_url as string) || null,
    phone: (profile.phone as string) || "",
  };
}

// ── Core Functions ───────────────────────────────────────────────────────

/**
 * Check whether a user has permission to add/remove members.
 * Only the buyer of the conversation can manage members.
 */
export async function canManageMembers(
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const participants = await getConversationParticipants(conversationId);
  if (!participants) return false;
  return participants.buyerId === userId;
}

/**
 * Search for a user by phone number.
 * Used to find the person to add to the conversation.
 */
export async function searchUserByPhone(
  phone: string,
): Promise<{
  id: string;
  displayName: string;
  avatarUrl: string | null;
  phone: string;
} | null> {
  // Normalize phone: ensure it's 11 digits starting with 01
  const normalized = phone.replace(/\s|-/g, "");
  if (!/^01[0125]\d{8}$/.test(normalized)) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles" as never)
    .select("id, display_name, avatar_url, phone")
    .eq("phone", normalized)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    displayName: (row.display_name as string) || "مستخدم",
    avatarUrl: (row.avatar_url as string) || null,
    phone: (row.phone as string) || normalized,
  };
}

/**
 * Get all members of a conversation, including the original buyer and seller
 * plus any additional invited members.
 */
export async function getConversationMembers(
  conversationId: string,
): Promise<ConversationMember[]> {
  const participants = await getConversationParticipants(conversationId);
  if (!participants) return [];

  const members: ConversationMember[] = [];

  // Add buyer
  const buyerProfile = await fetchUserProfile(participants.buyerId);
  members.push({
    id: `buyer-${participants.buyerId}`,
    conversationId,
    userId: participants.buyerId,
    displayName: buyerProfile?.displayName || "مستخدم",
    avatarUrl: buyerProfile?.avatarUrl || null,
    phone: buyerProfile?.phone || "",
    role: "buyer",
    addedBy: null,
    addedAt: "", // Original participants don't have addedAt
  });

  // Add seller
  const sellerProfile = await fetchUserProfile(participants.sellerId);
  members.push({
    id: `seller-${participants.sellerId}`,
    conversationId,
    userId: participants.sellerId,
    displayName: sellerProfile?.displayName || "مستخدم",
    avatarUrl: sellerProfile?.avatarUrl || null,
    phone: sellerProfile?.phone || "",
    role: "seller",
    addedBy: null,
    addedAt: "",
  });

  // Fetch additional members from conversation_members table
  const { data: additionalData, error } = await supabase
    .from("conversation_members" as never)
    .select("*")
    .eq("conversation_id", conversationId)
    .order("added_at", { ascending: true });

  if (!error && additionalData) {
    for (const row of additionalData as Record<string, unknown>[]) {
      const profile = await fetchUserProfile(row.user_id as string);
      members.push({
        id: row.id as string,
        conversationId,
        userId: row.user_id as string,
        displayName: profile?.displayName || "مستخدم",
        avatarUrl: profile?.avatarUrl || null,
        phone: profile?.phone || "",
        role: "member",
        addedBy: (row.added_by as string) || null,
        addedAt: (row.added_at as string) || "",
      });
    }
  }

  return members;
}

/**
 * Add a member to a conversation by phone number.
 * Only the buyer can invoke this.
 */
export async function addMemberToConversation(
  conversationId: string,
  inviterId: string,
  memberPhone: string,
): Promise<AddMemberResult> {
  try {
    // 1. Verify the inviter is the buyer
    const participants = await getConversationParticipants(conversationId);
    if (!participants) {
      return { success: false, error: "المحادثة مش موجودة" };
    }

    if (participants.buyerId !== inviterId) {
      return {
        success: false,
        error: "المشتري بس هو اللي يقدر يضيف أعضاء للمحادثة",
      };
    }

    // 2. Find the user by phone
    const userToAdd = await searchUserByPhone(memberPhone);
    if (!userToAdd) {
      return {
        success: false,
        error: "مفيش حساب مسجل بالرقم ده. لازم الشخص يكون عنده حساب على مكسب",
      };
    }

    // 3. Can't add the buyer or seller again
    if (userToAdd.id === participants.buyerId) {
      return { success: false, error: "أنت أصلاً عضو في المحادثة دي" };
    }
    if (userToAdd.id === participants.sellerId) {
      return { success: false, error: "البائع أصلاً عضو في المحادثة دي" };
    }

    // 4. Check if user is already a member
    const { data: existingMember } = await supabase
      .from("conversation_members" as never)
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", userToAdd.id)
      .maybeSingle();

    if (existingMember) {
      return { success: false, error: "الشخص ده موجود في المحادثة بالفعل" };
    }

    // 5. Check member limit
    const { count: currentCount } = await supabase
      .from("conversation_members" as never)
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId);

    if ((currentCount ?? 0) >= MAX_ADDITIONAL_MEMBERS) {
      return {
        success: false,
        error: `وصلت للحد الأقصى (${MAX_ADDITIONAL_MEMBERS} أعضاء إضافيين). مش ممكن تضيف أكتر من كده`,
      };
    }

    // 6. Insert new member
    const now = new Date().toISOString();
    const { data: inserted, error: insertError } = await supabase
      .from("conversation_members" as never)
      .insert({
        conversation_id: conversationId,
        user_id: userToAdd.id,
        added_by: inviterId,
        added_at: now,
      } as never)
      .select()
      .maybeSingle();

    if (insertError || !inserted) {
      console.error("[group-chat] addMember insert error:", insertError);
      return { success: false, error: "حصل مشكلة في إضافة العضو. جرب تاني" };
    }

    const row = inserted as Record<string, unknown>;

    const member: ConversationMember = {
      id: row.id as string,
      conversationId,
      userId: userToAdd.id,
      displayName: userToAdd.displayName,
      avatarUrl: userToAdd.avatarUrl,
      phone: userToAdd.phone,
      role: "member",
      addedBy: inviterId,
      addedAt: now,
    };

    return { success: true, member };
  } catch (err) {
    console.error("[group-chat] addMember error:", err);
    return { success: false, error: "حصل مشكلة. جرب تاني" };
  }
}

/**
 * Remove an additional member from a conversation.
 * Only the buyer can do this; buyer and seller cannot be removed.
 */
export async function removeMemberFromConversation(
  conversationId: string,
  removerId: string,
  memberId: string,
): Promise<RemoveMemberResult> {
  try {
    // 1. Verify the remover is the buyer
    const participants = await getConversationParticipants(conversationId);
    if (!participants) {
      return { success: false, error: "المحادثة مش موجودة" };
    }

    if (participants.buyerId !== removerId) {
      return {
        success: false,
        error: "المشتري بس هو اللي يقدر يشيل أعضاء من المحادثة",
      };
    }

    // 2. Can't remove buyer or seller
    if (memberId === participants.buyerId) {
      return { success: false, error: "مش ممكن تشيل المشتري من المحادثة" };
    }
    if (memberId === participants.sellerId) {
      return { success: false, error: "مش ممكن تشيل البائع من المحادثة" };
    }

    // 3. Check the member exists
    const { data: existingMember } = await supabase
      .from("conversation_members" as never)
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", memberId)
      .maybeSingle();

    if (!existingMember) {
      return { success: false, error: "العضو ده مش موجود في المحادثة" };
    }

    // 4. Delete member
    const { error: deleteError } = await supabase
      .from("conversation_members" as never)
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", memberId);

    if (deleteError) {
      console.error("[group-chat] removeMember delete error:", deleteError);
      return { success: false, error: "حصل مشكلة في إزالة العضو. جرب تاني" };
    }

    return { success: true };
  } catch (err) {
    console.error("[group-chat] removeMember error:", err);
    return { success: false, error: "حصل مشكلة. جرب تاني" };
  }
}

/**
 * Get all conversations where a user is an additional member
 * (not the original buyer or seller).
 */
export async function getGroupConversations(
  userId: string,
): Promise<
  {
    conversationId: string;
    adTitle: string;
    adImage: string | null;
    buyerName: string;
    sellerName: string;
    lastMessageAt: string;
    memberCount: number;
  }[]
> {
  try {
    // Find conversation IDs where user is an additional member
    const { data: memberRows, error: memberError } = await supabase
      .from("conversation_members" as never)
      .select("conversation_id")
      .eq("user_id", userId);

    if (memberError || !memberRows || memberRows.length === 0) return [];

    const conversationIds = (memberRows as Record<string, unknown>[]).map(
      (r) => r.conversation_id as string,
    );

    const results: {
      conversationId: string;
      adTitle: string;
      adImage: string | null;
      buyerName: string;
      sellerName: string;
      lastMessageAt: string;
      memberCount: number;
    }[] = [];

    for (const convId of conversationIds) {
      // Fetch conversation details
      const { data: convData } = await supabase
        .from("conversations" as never)
        .select("*")
        .eq("id", convId)
        .maybeSingle();

      if (!convData) continue;

      const conv = convData as Record<string, unknown>;

      // Fetch ad info
      let adTitle = "";
      let adImage: string | null = null;
      if (conv.ad_id) {
        const { data: adData } = await supabase
          .from("ads" as never)
          .select("title, images")
          .eq("id", conv.ad_id)
          .maybeSingle();
        if (adData) {
          const ad = adData as Record<string, unknown>;
          adTitle = (ad.title as string) || "";
          adImage = ((ad.images as string[]) ?? [])[0] ?? null;
        }
      }

      // Fetch buyer and seller names
      const buyerProfile = await fetchUserProfile(conv.buyer_id as string);
      const sellerProfile = await fetchUserProfile(conv.seller_id as string);

      // Count total additional members
      const { count: extraMemberCount } = await supabase
        .from("conversation_members" as never)
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", convId);

      results.push({
        conversationId: convId,
        adTitle,
        adImage,
        buyerName: buyerProfile?.displayName || "مستخدم",
        sellerName: sellerProfile?.displayName || "مستخدم",
        lastMessageAt:
          (conv.last_message_at as string) || (conv.created_at as string),
        memberCount: 2 + (extraMemberCount ?? 0), // buyer + seller + additional
      });
    }

    // Sort by most recent message
    results.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime(),
    );

    return results;
  } catch (err) {
    console.error("[group-chat] getGroupConversations error:", err);
    return [];
  }
}

/**
 * Check if a user is a participant in a conversation.
 * Returns true if they're the buyer, seller, or an additional member.
 */
export async function isConversationParticipant(
  conversationId: string,
  userId: string,
): Promise<boolean> {
  // Check buyer/seller
  const participants = await getConversationParticipants(conversationId);
  if (!participants) return false;

  if (
    participants.buyerId === userId ||
    participants.sellerId === userId
  ) {
    return true;
  }

  // Check additional members
  const { data: memberRow } = await supabase
    .from("conversation_members" as never)
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  return !!memberRow;
}
