"use client";

import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import ConversationItem from "@/components/chat/ConversationItem";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { useChatStore } from "@/stores/chat-store";

export default function ChatListPage() {
  const {
    conversations,
    isLoadingConversations,
    unreadCount,
    loadConversations,
  } = useChatStore();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return (
    <main className="min-h-screen bg-white pb-20">
      <Header title="الرسائل" />

      {/* Loading */}
      {isLoadingConversations && (
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
      {!isLoadingConversations && conversations.length > 0 && (
        <div className="divide-y divide-gray-light">
          {conversations.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoadingConversations && conversations.length === 0 && (
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
