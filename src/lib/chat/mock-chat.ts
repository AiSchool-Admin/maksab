/**
 * Chat service — queries Supabase for conversations and messages.
 */

import { supabase } from "@/lib/supabase/client";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  imageUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  adId: string;
  adTitle: string;
  adImage: string | null;
  adPrice: number | null;
  buyerId: string;
  sellerId: string;
  otherUser: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    phone: string;
    isOnline: boolean;
    lastSeen: string | null;
  };
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
}

/** Fetch all conversations for current user */
export async function fetchConversations(): Promise<ChatConversation[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("conversations" as never)
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (error || !data) return [];

    const conversations: ChatConversation[] = [];

    for (const row of data as Record<string, unknown>[]) {
      const otherUserId = (row.buyer_id === user.id ? row.seller_id : row.buyer_id) as string;

      // Fetch other user's profile
      const { data: profileData } = await supabase
        .from("profiles" as never)
        .select("*")
        .eq("id", otherUserId as never)
        .maybeSingle();

      const profile = profileData as Record<string, unknown> | null;

      // Fetch the linked ad info
      let adTitle = "";
      let adImage: string | null = null;
      let adPrice: number | null = null;
      if (row.ad_id) {
        const { data: adData } = await supabase
          .from("ads" as never)
          .select("title, images, price")
          .eq("id", row.ad_id)
          .maybeSingle();
        if (adData) {
          const ad = adData as Record<string, unknown>;
          adTitle = (ad.title as string) || "";
          adImage = ((ad.images as string[]) ?? [])[0] ?? null;
          adPrice = ad.price ? Number(ad.price) : null;
        }
      }

      // Count unread messages
      const { count: unreadCount } = await supabase
        .from("messages" as never)
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", row.id as never)
        .neq("sender_id", user.id)
        .eq("is_read", false);

      // Get last message
      const { data: lastMsgData } = await supabase
        .from("messages" as never)
        .select("content")
        .eq("conversation_id", row.id as never)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      conversations.push({
        id: row.id as string,
        adId: (row.ad_id as string) || "",
        adTitle,
        adImage,
        adPrice,
        buyerId: row.buyer_id as string,
        sellerId: row.seller_id as string,
        otherUser: {
          id: (otherUserId as string) || "",
          displayName: profile ? ((profile.display_name as string) || "مستخدم") : "مستخدم",
          avatarUrl: profile ? ((profile.avatar_url as string) || null) : null,
          phone: profile ? ((profile.phone as string) || "") : "",
          isOnline: false,
          lastSeen: null,
        },
        lastMessage: lastMsgData ? ((lastMsgData as Record<string, unknown>).content as string) : null,
        lastMessageAt: (row.last_message_at as string) || (row.created_at as string),
        unreadCount: unreadCount ?? 0,
      });
    }

    return conversations;
  } catch {
    return [];
  }
}

/** Fetch messages for a conversation */
export async function fetchMessages(
  conversationId: string,
): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from("messages" as never)
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    return (data as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      conversationId: row.conversation_id as string,
      senderId: row.sender_id as string,
      content: (row.content as string) || null,
      imageUrl: (row.image_url as string) || null,
      isRead: (row.is_read as boolean) || false,
      createdAt: row.created_at as string,
    }));
  } catch {
    return [];
  }
}

/** Fetch a single conversation by ID */
export async function fetchConversation(
  conversationId: string,
): Promise<ChatConversation | null> {
  try {
    const conversations = await fetchConversations();
    return conversations.find((c) => c.id === conversationId) || null;
  } catch {
    return null;
  }
}

/** Find or create a conversation for an ad */
export async function findOrCreateConversation(
  adId: string,
): Promise<ChatConversation | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from("conversations" as never)
      .select("*")
      .eq("ad_id", adId)
      .eq("buyer_id", user.id)
      .maybeSingle();

    if (existing) {
      const conversations = await fetchConversations();
      return conversations.find((c) => c.id === (existing as Record<string, unknown>).id) || null;
    }

    // Get ad info to find seller
    const { data: adData } = await supabase
      .from("ads" as never)
      .select("user_id")
      .eq("id", adId)
      .maybeSingle();

    if (!adData) return null;

    const sellerId = (adData as Record<string, unknown>).user_id as string;
    if (sellerId === user.id) return null; // Can't chat with yourself

    // Create new conversation
    const { data: newConv, error } = await supabase
      .from("conversations" as never)
      .insert({
        ad_id: adId,
        buyer_id: user.id,
        seller_id: sellerId,
        last_message_at: new Date().toISOString(),
      } as never)
      .select()
      .maybeSingle();

    if (error || !newConv) return null;

    const conversations = await fetchConversations();
    return conversations.find((c) => c.id === (newConv as Record<string, unknown>).id) || null;
  } catch {
    return null;
  }
}

/** Get total unread count across all conversations */
export function getTotalUnreadCount(): number {
  // This is now async in practice, but kept sync for backward compatibility
  // The chat store handles the real count from loadConversations
  return 0;
}
