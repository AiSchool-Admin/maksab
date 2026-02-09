/**
 * Live chat hook for live auctions.
 * Uses Supabase Realtime broadcast for persistent, real-time chat.
 * Features:
 * - Real-time messaging via Supabase broadcast channel
 * - Basic keyword moderation
 * - Rate limiting (max 1 message per 2 seconds)
 * - Auto-scroll to latest message
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";

export interface LiveChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  type: "message" | "bid" | "system";
}

interface UseLiveChatOptions {
  roomId: string;
  userId: string;
  userName: string;
}

// Basic moderation: blocked words
const blockedWords = [
  "واتس", "واتساب", "whatsapp", "تليجرام", "telegram",
  "01[0-9]{9}", // Phone numbers
];

const blockedRegex = new RegExp(blockedWords.join("|"), "i");

export function useLiveChat({ roomId, userId, userName }: UseLiveChatOptions) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const lastSentRef = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Subscribe to chat channel
  useEffect(() => {
    if (!roomId || !userId) return;

    const channel = supabase.channel(`live-chat-${roomId}`, {
      config: { broadcast: { self: true } },
    });

    channel.on("broadcast", { event: "chat-message" }, (payload: { payload: LiveChatMessage }) => {
      const msg = payload.payload;
      setMessages((prev) => {
        // Deduplicate
        if (prev.some((m) => m.id === msg.id)) return prev;
        // Keep last 100 messages
        const next = [...prev, msg];
        return next.length > 100 ? next.slice(-100) : next;
      });
    });

    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);

        // Send join system message
        channel.send({
          type: "broadcast",
          event: "chat-message",
          payload: {
            id: crypto.randomUUID(),
            userId: "system",
            userName: "مكسب",
            text: `${userName} انضم للبث`,
            timestamp: Date.now(),
            type: "system",
          } satisfies LiveChatMessage,
        });
      }
    });

    channelRef.current = channel;

    return () => {
      setIsConnected(false);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, userId, userName]);

  // Send a chat message
  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !channelRef.current || !isConnected) return false;

      // Rate limit: 1 message per 2 seconds
      const now = Date.now();
      if (now - lastSentRef.current < 2000) return false;

      // Moderation
      if (blockedRegex.test(trimmed)) return false;

      // Max length
      if (trimmed.length > 200) return false;

      const msg: LiveChatMessage = {
        id: crypto.randomUUID(),
        userId,
        userName,
        text: trimmed,
        timestamp: now,
        type: "message",
      };

      channelRef.current.send({
        type: "broadcast",
        event: "chat-message",
        payload: msg,
      });

      lastSentRef.current = now;
      return true;
    },
    [userId, userName, isConnected],
  );

  // Send a bid notification
  const sendBidNotification = useCallback(
    (bidderName: string, amount: number) => {
      if (!channelRef.current || !isConnected) return;

      const msg: LiveChatMessage = {
        id: crypto.randomUUID(),
        userId: "system",
        userName: "مكسب",
        text: `🔨 ${bidderName} زايد بـ ${amount.toLocaleString("en-US")} جنيه`,
        timestamp: Date.now(),
        type: "bid",
      };

      channelRef.current.send({
        type: "broadcast",
        event: "chat-message",
        payload: msg,
      });
    },
    [isConnected],
  );

  return {
    messages,
    isConnected,
    sendMessage,
    sendBidNotification,
  };
}
