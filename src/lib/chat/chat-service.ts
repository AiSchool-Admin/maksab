/**
 * Chat service — handles message persistence, image upload, and read receipts
 * via Supabase. Conversations/messages are loaded from the DB and messages
 * are persisted on send.
 */

import { supabase } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────

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

// ── Fetch conversations ─────────────────────────────────────────────────

export async function fetchConversations(): Promise<ChatConversation[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("conversations" as never)
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (error || !data) return [];

    const conversations: ChatConversation[] = [];

    for (const row of data as Record<string, unknown>[]) {
      const otherUserId = (
        row.buyer_id === user.id ? row.seller_id : row.buyer_id
      ) as string;

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
        .select("content, image_url")
        .eq("conversation_id", row.id as never)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastMsg = lastMsgData as Record<string, unknown> | null;
      let lastMessage: string | null = null;
      if (lastMsg) {
        lastMessage = lastMsg.image_url
          ? "📷 صورة"
          : (lastMsg.content as string) || null;
      }

      conversations.push({
        id: row.id as string,
        adId: (row.ad_id as string) || "",
        adTitle,
        adImage,
        adPrice,
        buyerId: row.buyer_id as string,
        sellerId: row.seller_id as string,
        otherUser: {
          id: otherUserId,
          displayName: profile
            ? (profile.display_name as string) || "مستخدم"
            : "مستخدم",
          avatarUrl: profile
            ? (profile.avatar_url as string) || null
            : null,
          phone: profile ? (profile.phone as string) || "" : "",
          isOnline: false,
          lastSeen: null,
        },
        lastMessage,
        lastMessageAt:
          (row.last_message_at as string) || (row.created_at as string),
        unreadCount: unreadCount ?? 0,
      });
    }

    return conversations;
  } catch {
    return [];
  }
}

// ── Fetch messages ──────────────────────────────────────────────────────

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

// ── Fetch a single conversation ─────────────────────────────────────────

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

// ── Find or create conversation ─────────────────────────────────────────

export async function findOrCreateConversation(
  adId: string,
): Promise<ChatConversation | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
      return (
        conversations.find(
          (c) => c.id === (existing as Record<string, unknown>).id,
        ) || null
      );
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
    return (
      conversations.find(
        (c) => c.id === (newConv as Record<string, unknown>).id,
      ) || null
    );
  } catch {
    return null;
  }
}

// ── Send message (persists to DB) ───────────────────────────────────────

export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  content?: string | null;
  imageUrl?: string | null;
}): Promise<ChatMessage | null> {
  try {
    const { data, error } = await supabase
      .from("messages" as never)
      .insert({
        conversation_id: params.conversationId,
        sender_id: params.senderId,
        content: params.content || null,
        image_url: params.imageUrl || null,
      } as never)
      .select()
      .maybeSingle();

    if (error || !data) {
      console.error("sendMessage error:", error);
      return null;
    }

    const row = data as Record<string, unknown>;

    // Update conversation's last_message_at
    await supabase
      .from("conversations" as never)
      .update({
        last_message_at: new Date().toISOString(),
      } as never)
      .eq("id", params.conversationId);

    return {
      id: row.id as string,
      conversationId: row.conversation_id as string,
      senderId: row.sender_id as string,
      content: (row.content as string) || null,
      imageUrl: (row.image_url as string) || null,
      isRead: false,
      createdAt: row.created_at as string,
    };
  } catch (err) {
    console.error("sendMessage error:", err);
    return null;
  }
}

// ── Mark messages as read ───────────────────────────────────────────────

export async function markMessagesAsRead(
  conversationId: string,
  currentUserId: string,
): Promise<void> {
  try {
    await supabase
      .from("messages" as never)
      .update({ is_read: true } as never)
      .eq("conversation_id", conversationId)
      .neq("sender_id", currentUserId)
      .eq("is_read", false);
  } catch {
    // Silent fail — read receipts are best-effort
  }
}

// ── Upload chat image ───────────────────────────────────────────────────

export async function uploadChatImage(
  file: File,
  conversationId: string,
): Promise<string | null> {
  try {
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from("chat-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("uploadChatImage error:", error);
      // Fallback: try the 'ads' bucket if chat-images doesn't exist
      const { error: fallbackError } = await supabase.storage
        .from("ads")
        .upload(`chat/${fileName}`, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (fallbackError) {
        console.error("uploadChatImage fallback error:", fallbackError);
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("ads").getPublicUrl(`chat/${fileName}`);
      return publicUrl;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("chat-images").getPublicUrl(fileName);
    return publicUrl;
  } catch (err) {
    console.error("uploadChatImage error:", err);
    return null;
  }
}

// ── Get total unread count ──────────────────────────────────────────────

export async function getTotalUnreadCount(): Promise<number> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    // Get all conversation IDs where user is participant
    const { data: convData } = await supabase
      .from("conversations" as never)
      .select("id")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

    if (!convData || convData.length === 0) return 0;

    const convIds = (convData as Record<string, unknown>[]).map(
      (c) => c.id as string,
    );

    // Count unread messages across all conversations
    const { count } = await supabase
      .from("messages" as never)
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .neq("sender_id", user.id)
      .eq("is_read", false);

    return count ?? 0;
  } catch {
    return 0;
  }
}
