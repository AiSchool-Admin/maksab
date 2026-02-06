import { create } from "zustand";
import type { ChatConversation, ChatMessage } from "@/lib/chat/mock-chat";
import {
  fetchConversations,
  fetchMessages as fetchMessagesApi,
  getTotalUnreadCount,
} from "@/lib/chat/mock-chat";

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
  /** Add a new message (optimistic) */
  addMessage: (message: ChatMessage) => void;
  /** Mark conversation as read */
  markAsRead: (conversationId: string) => void;
  /** Refresh unread count */
  refreshUnreadCount: () => void;
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
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [message.conversationId]: [...existing, message],
        },
        // Also update the conversation's lastMessage
        conversations: state.conversations.map((c) =>
          c.id === message.conversationId
            ? {
                ...c,
                lastMessage: message.content || "📷 صورة",
                lastMessageAt: message.createdAt,
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

  refreshUnreadCount: () => {
    set({ unreadCount: getTotalUnreadCount() });
  },
}));
