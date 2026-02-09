/**
 * useRealtimeChat — React hook that subscribes to real-time messages
 * in a conversation. Handles new messages, read receipts, and cleanup.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  subscribeToConversation,
  broadcastTyping,
} from "@/lib/chat/realtime";
import { markMessagesAsRead } from "@/lib/chat/chat-service";
import type { ChatMessage } from "@/lib/chat/chat-service";
import type { TypingPayload } from "@/lib/chat/realtime";

interface UseRealtimeChatParams {
  conversationId: string;
  currentUserId: string;
  /** Called when a new message arrives from the other user */
  onNewMessage: (msg: ChatMessage) => void;
  /** Called when a message's read status changes */
  onMessageRead?: (messageIds: string[]) => void;
  /** Called when the other user starts/stops typing */
  onTypingChange?: (payload: TypingPayload) => void;
  /** Whether to auto-mark incoming messages as read */
  autoMarkRead?: boolean;
}

export function useRealtimeChat({
  conversationId,
  currentUserId,
  onNewMessage,
  onMessageRead,
  onTypingChange,
  autoMarkRead = true,
}: UseRealtimeChatParams) {
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageReadRef = useRef(onMessageRead);
  const onTypingChangeRef = useRef(onTypingChange);

  // Keep refs up to date
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);
  useEffect(() => {
    onMessageReadRef.current = onMessageRead;
  }, [onMessageRead]);
  useEffect(() => {
    onTypingChangeRef.current = onTypingChange;
  }, [onTypingChange]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const unsubscribe = subscribeToConversation(conversationId, {
      onNewMessage: (msg) => {
        // Only handle messages from the other user
        // (our own messages are handled optimistically)
        if (msg.senderId !== currentUserId) {
          onNewMessageRef.current(msg);

          // Auto-mark as read if the user is viewing this conversation
          if (autoMarkRead) {
            markMessagesAsRead(conversationId, currentUserId);
          }
        }
      },
      onMessageRead: (messageIds) => {
        onMessageReadRef.current?.(messageIds);
      },
      onTyping: (payload) => {
        // Only handle typing from the other user
        if (payload.userId !== currentUserId) {
          onTypingChangeRef.current?.(payload);
        }
      },
    });

    return () => {
      unsubscribe();
    };
  }, [conversationId, currentUserId, autoMarkRead]);

  // Send typing indicator
  const sendTyping = useCallback(
    (displayName: string, isTyping: boolean) => {
      broadcastTyping(conversationId, {
        userId: currentUserId,
        displayName,
        isTyping,
      });
    },
    [conversationId, currentUserId],
  );

  return { sendTyping };
}
