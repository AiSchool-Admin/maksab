"use client";

import { useEffect, useRef } from "react";
import { MessageCircle, LogIn } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import ConversationItem from "@/components/chat/ConversationItem";
import { Skeleton } from "@/components/ui/SkeletonLoader";
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

  return (
    <main className="min-h-screen bg-white pb-20">
      <Header title="الرسائل" />

      {/* Auth loading */}
      {isAuthLoading && (
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Not logged in */}
      {!isAuthLoading && !user && (
        <div className="py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-light flex items-center justify-center mx-auto mb-4">
            <LogIn size={36} className="text-gray-text" />
          </div>
          <h3 className="text-lg font-bold text-dark mb-2">سجّل دخولك الأول</h3>
          <p className="text-sm text-gray-text px-8 mb-6">
            عشان تقدر تبعت وتستقبل رسائل، سجّل دخولك
          </p>
          <Button onClick={() => requireAuth()} size="lg">
            تسجيل الدخول
          </Button>
        </div>
      )}

      {/* Loading conversations */}
      {!isAuthLoading && user && isLoadingConversations && (
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conversations list */}
      {!isAuthLoading && user && !isLoadingConversations && conversations.length > 0 && (
        <div className="divide-y divide-gray-light">
          {conversations.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isAuthLoading && user && !isLoadingConversations && conversations.length === 0 && (
        <div className="py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-light flex items-center justify-center mx-auto mb-4">
            <MessageCircle size={36} className="text-gray-text" />
          </div>
          <h3 className="text-lg font-bold text-dark mb-2">مفيش رسائل</h3>
          <p className="text-sm text-gray-text px-8">
            لما تبدأ محادثة مع بائع أو مشتري، هتلاقيها هنا
          </p>
        </div>
      )}

      <BottomNav unreadMessages={unreadCount} />
    </main>
  );
}
