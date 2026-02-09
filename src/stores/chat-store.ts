import { create } from "zustand";
import type { ChatConversation, ChatMessage } from "@/lib/chat/chat-service";
import {
  fetchConversations,
  fetchMessages as fetchMessagesApi,
  getTotalUnreadCount,
} from "@/lib/chat/chat-service";

interface ChatState {
  /** All conversations for current user */
  conversations: ChatConversation[];
  /** Messages keyed by conversation ID */
  messagesByConversation: Record<string, ChatMessage[]>;
  /** Total unread count (for bottom nav badge) */
  unreadCount: number;
  /** Loading states */
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  /** Load all conversations */
  loadConversations: () => Promise<void>;
  /** Load messages for a specific conversation */
  loadMessages: (conversationId: string) => Promise<void>;
  /** Add a new message (optimistic or from realtime) */
  addMessage: (message: ChatMessage) => void;
  /** Mark conversation as read */
  markAsRead: (conversationId: string) => void;
  /** Mark specific messages as read (from realtime read receipts) */
  markMessagesRead: (conversationId: string, messageIds: string[]) => void;
  /** Refresh unread count from DB */
  refreshUnreadCount: () => Promise<void>;
  /** Update a conversation's other user online status */
  setUserOnline: (userId: string, isOnline: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messagesByConversation: {},
  unreadCount: 0,
  isLoadingConversations: false,
  isLoadingMessages: false,

  loadConversations: async () => {
    set({ isLoadingConversations: true });
    const conversations = await fetchConversations();
    const unreadCount = conversations.reduce(
      (sum, c) => sum + c.unreadCount,
      0,
    );
    set({ conversations, unreadCount, isLoadingConversations: false });
  },

  loadMessages: async (conversationId: string) => {
    set({ isLoadingMessages: true });
    const messages = await fetchMessagesApi(conversationId);
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: messages,
      },
      isLoadingMessages: false,
    }));
  },

  addMessage: (message: ChatMessage) => {
    set((state) => {
      const existing =
        state.messagesByConversation[message.conversationId] || [];

      // Prevent duplicate messages (realtime + optimistic)
      if (existing.some((m) => m.id === message.id)) {
        return state;
      }

      const lastMessageText = message.content || "📷 صورة";

      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [message.conversationId]: [...existing, message],
        },
        conversations: state.conversations.map((c) =>
          c.id === message.conversationId
            ? {
                ...c,
                lastMessage: lastMessageText,
                lastMessageAt: message.createdAt,
                // Increment unread if message is from the other user
                unreadCount:
                  c.otherUser.id === message.senderId
                    ? c.unreadCount + 1
                    : c.unreadCount,
              }
            : c,
        ),
      };
    });
  },

  markAsRead: (conversationId: string) => {
    set((state) => {
      const conv = state.conversations.find((c) => c.id === conversationId);
      const unreadReduction = conv?.unreadCount || 0;
      return {
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c,
        ),
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: (
            state.messagesByConversation[conversationId] || []
          ).map((m) => ({ ...m, isRead: true })),
        },
        unreadCount: Math.max(0, state.unreadCount - unreadReduction),
      };
    });
  },

  markMessagesRead: (conversationId: string, messageIds: string[]) => {
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: (
          state.messagesByConversation[conversationId] || []
        ).map((m) =>
          messageIds.includes(m.id) ? { ...m, isRead: true } : m,
        ),
      },
    }));
  },

  refreshUnreadCount: async () => {
    const count = await getTotalUnreadCount();
    set({ unreadCount: count });
  },

  setUserOnline: (userId: string, isOnline: boolean) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.otherUser.id === userId
          ? {
              ...c,
              otherUser: {
                ...c.otherUser,
                isOnline,
                lastSeen: isOnline ? null : new Date().toISOString(),
              },
            }
          : c,
      ),
    }));
  },
}));
