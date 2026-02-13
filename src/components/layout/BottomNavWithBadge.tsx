"use client";

import { useEffect, useRef } from "react";
import BottomNav from "./BottomNav";
import { useChatStore } from "@/stores/chat-store";
import { useAuth } from "@/components/auth/AuthProvider";
import { subscribeToConversationList } from "@/lib/chat/realtime";

/**
 * BottomNav wrapper that automatically fetches and displays
 * the unread messages count from the chat store.
 * Subscribes to real-time updates for live badge count.
 */
export default function BottomNavWithBadge() {
  const { user } = useAuth();
  const { unreadCount, refreshUnreadCount, loadConversations } = useChatStore();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Load conversations once to get initial unread count
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Subscribe to real-time updates for unread badge
  useEffect(() => {
    if (!user) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refreshUnreadCount();
      }, 2000);
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
  }, [user, refreshUnreadCount]);

  const isMerchant = !!(user?.seller_type === "store" && user?.store_id);

  return <BottomNav unreadMessages={unreadCount} isMerchant={isMerchant} />;
}
