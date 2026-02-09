/**
 * Supabase Realtime manager for chat.
 *
 * Handles:
 * 1. postgres_changes → new messages in a conversation
 * 2. broadcast → typing indicator events
 * 3. presence → online/offline tracking
 */

import { supabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ChatMessage } from "./chat-service";

// ── Types ────────────────────────────────────────────────────────────────

export interface TypingPayload {
  userId: string;
  displayName: string;
  isTyping: boolean;
}

export interface PresenceState {
  userId: string;
  lastSeen: string;
}

type MessageCallback = (msg: ChatMessage) => void;
type ReadCallback = (messageIds: string[]) => void;
type TypingCallback = (payload: TypingPayload) => void;
type PresenceCallback = (online: Map<string, PresenceState>) => void;

// ── Active channels registry ─────────────────────────────────────────────

const activeChannels = new Map<string, RealtimeChannel>();

// ── Conversation channel (messages + typing) ────────────────────────────

/**
 * Subscribe to real-time messages and typing events in a conversation.
 * Returns an unsubscribe function.
 */
export function subscribeToConversation(
  conversationId: string,
  callbacks: {
    onNewMessage?: MessageCallback;
    onMessageRead?: ReadCallback;
    onTyping?: TypingCallback;
  },
): () => void {
  const channelName = `chat:${conversationId}`;

  // Clean up existing channel for this conversation
  const existing = activeChannels.get(channelName);
  if (existing) {
    supabase.removeChannel(existing);
    activeChannels.delete(channelName);
  }

  const channel = supabase.channel(channelName, {
    config: { broadcast: { self: false } },
  });

  // Listen for new messages via postgres_changes
  channel.on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      if (callbacks.onNewMessage && payload.new) {
        const row = payload.new as Record<string, unknown>;
        callbacks.onNewMessage({
          id: row.id as string,
          conversationId: row.conversation_id as string,
          senderId: row.sender_id as string,
          content: (row.content as string) || null,
          imageUrl: (row.image_url as string) || null,
          isRead: (row.is_read as boolean) || false,
          createdAt: row.created_at as string,
        });
      }
    },
  );

  // Listen for message read status updates
  channel.on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "messages",
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      if (callbacks.onMessageRead && payload.new) {
        const row = payload.new as Record<string, unknown>;
        if (row.is_read === true) {
          callbacks.onMessageRead([row.id as string]);
        }
      }
    },
  );

  // Listen for typing events via broadcast
  channel.on("broadcast", { event: "typing" }, (payload) => {
    if (callbacks.onTyping) {
      callbacks.onTyping(payload.payload as TypingPayload);
    }
  });

  channel.subscribe();
  activeChannels.set(channelName, channel);

  return () => {
    supabase.removeChannel(channel);
    activeChannels.delete(channelName);
  };
}

/**
 * Broadcast a typing event on a conversation channel.
 */
export function broadcastTyping(
  conversationId: string,
  payload: TypingPayload,
): void {
  const channelName = `chat:${conversationId}`;
  const channel = activeChannels.get(channelName);
  if (channel) {
    channel.send({
      type: "broadcast",
      event: "typing",
      payload,
    });
  }
}

// ── Conversations list channel ──────────────────────────────────────────

/**
 * Subscribe to conversation list changes (new conversations, last_message_at updates).
 * Used on the /chat page for real-time conversation list updates.
 */
export function subscribeToConversationList(
  userId: string,
  onUpdate: () => void,
): () => void {
  const channelName = `convlist:${userId}`;

  const existing = activeChannels.get(channelName);
  if (existing) {
    supabase.removeChannel(existing);
    activeChannels.delete(channelName);
  }

  const channel = supabase.channel(channelName);

  // Listen for any conversation updates where user is buyer or seller
  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "conversations",
    },
    (payload) => {
      const row = (payload.new || payload.old) as Record<string, unknown>;
      if (row && (row.buyer_id === userId || row.seller_id === userId)) {
        onUpdate();
      }
    },
  );

  // Listen for new messages to update conversation list (unread counts, previews)
  channel.on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
    },
    () => {
      // Refresh conversations when any message arrives
      onUpdate();
    },
  );

  channel.subscribe();
  activeChannels.set(channelName, channel);

  return () => {
    supabase.removeChannel(channel);
    activeChannels.delete(channelName);
  };
}

// ── Presence (online/offline) ───────────────────────────────────────────

let presenceChannel: RealtimeChannel | null = null;

/**
 * Track current user's online presence.
 * Call once when user logs in, returns unsubscribe function.
 */
export function trackPresence(
  userId: string,
  onPresenceChange?: PresenceCallback,
): () => void {
  // Clean up old presence channel
  if (presenceChannel) {
    supabase.removeChannel(presenceChannel);
    presenceChannel = null;
  }

  const channel = supabase.channel("presence:online", {
    config: { presence: { key: userId } },
  });

  channel.on("presence", { event: "sync" }, () => {
    if (onPresenceChange) {
      const state = channel.presenceState();
      const onlineUsers = new Map<string, PresenceState>();
      for (const [key, presences] of Object.entries(state)) {
        if (presences && presences.length > 0) {
          const p = presences[0] as Record<string, unknown>;
          onlineUsers.set(key, {
            userId: key,
            lastSeen: (p.lastSeen as string) || new Date().toISOString(),
          });
        }
      }
      onPresenceChange(onlineUsers);
    }
  });

  channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel.track({
        userId,
        lastSeen: new Date().toISOString(),
      });
    }
  });

  presenceChannel = channel;

  // Update presence every 30 seconds (heartbeat)
  const heartbeat = setInterval(() => {
    if (presenceChannel) {
      presenceChannel.track({
        userId,
        lastSeen: new Date().toISOString(),
      });
    }
  }, 30000);

  return () => {
    clearInterval(heartbeat);
    if (presenceChannel) {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
      presenceChannel = null;
    }
  };
}

/**
 * Check if a specific user is online by querying the presence channel state.
 */
export function isUserOnline(userId: string): boolean {
  if (!presenceChannel) return false;
  const state = presenceChannel.presenceState();
  return userId in state;
}

/**
 * Get all currently online user IDs.
 */
export function getOnlineUserIds(): string[] {
  if (!presenceChannel) return [];
  return Object.keys(presenceChannel.presenceState());
}

// ── Cleanup ─────────────────────────────────────────────────────────────

/**
 * Remove all active channels. Call on logout.
 */
export function cleanupAllChannels(): void {
  for (const [, channel] of activeChannels) {
    supabase.removeChannel(channel);
  }
  activeChannels.clear();

  if (presenceChannel) {
    presenceChannel.untrack();
    supabase.removeChannel(presenceChannel);
    presenceChannel = null;
  }
}
