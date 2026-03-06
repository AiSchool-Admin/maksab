"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { LogIn, Search, X } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import ConversationItem from "@/components/chat/ConversationItem";
import { ConversationListSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyChats, EmptyNeedsLogin } from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { useChatStore } from "@/stores/chat-store";
import { useAuth } from "@/components/auth/AuthProvider";
import { subscribeToConversationList } from "@/lib/chat/realtime";

export default function ChatListPage() {
  const { user, isLoading: isAuthLoading, requireAuth } = useAuth();
  const {
    conversations,
    isLoadingConversations,
    unreadCount,
    loadConversations,
  } = useChatStore();

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Subscribe to real-time conversation list updates
  useEffect(() => {
    if (!user) return;

    // Debounce rapid updates
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadConversations();
      }, 1000);
    };

    unsubscribeRef.current = subscribeToConversationList(
      user.id,
      debouncedRefresh,
    );

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [user, loadConversations]);

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((conv) => {
      const name = (conv.otherUser?.displayName || "").toLowerCase();
      const lastMsg = (conv.lastMessage || "").toLowerCase();
      const adTitle = (conv.adTitle || "").toLowerCase();
      return name.includes(q) || lastMsg.includes(q) || adTitle.includes(q);
    });
  }, [conversations, searchQuery]);

  return (
    <main className="min-h-screen bg-white pb-20">
      <Header
        title="الرسائل"
        actions={
          user && conversations.length > 0 ? (
            <button
              onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(""); }}
              className="p-2 rounded-full hover:bg-gray-light transition-colors"
            >
              {showSearch ? <X size={20} /> : <Search size={20} />}
            </button>
          ) : undefined
        }
      />

      {/* Search bar */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-gray-light">
          <div className="relative">
            <Search size={16} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-text" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في المحادثات..."
              className="w-full pe-10 ps-4 py-2.5 bg-gray-light rounded-xl text-sm placeholder:text-gray-text focus:outline-none focus:ring-2 focus:ring-brand-green/30"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-text hover:text-dark"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Auth loading */}
      {isAuthLoading && <ConversationListSkeleton count={3} />}

      {/* Not logged in */}
      {!isAuthLoading && !user && (
        <EmptyNeedsLogin feature="الرسائل" onLogin={() => requireAuth()} />
      )}

      {/* Loading conversations */}
      {!isAuthLoading && user && isLoadingConversations && (
        <ConversationListSkeleton count={5} />
      )}

      {/* Conversations list */}
      {!isAuthLoading && user && !isLoadingConversations && filteredConversations.length > 0 && (
        <div className="divide-y divide-gray-light">
          {filteredConversations.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))}
        </div>
      )}

      {/* Search no results */}
      {!isAuthLoading && user && !isLoadingConversations && searchQuery && filteredConversations.length === 0 && conversations.length > 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-text">
            مفيش نتائج لـ &quot;{searchQuery}&quot;
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isAuthLoading && user && !isLoadingConversations && conversations.length === 0 && (
        <EmptyChats />
      )}

      <BottomNavWithBadge />
    </main>
  );
}
