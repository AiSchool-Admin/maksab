"use client";

import { useEffect } from "react";
import BottomNav from "./BottomNav";
import { useChatStore } from "@/stores/chat-store";

/**
 * BottomNav wrapper that automatically fetches and displays
 * the unread messages count from the chat store.
 */
export default function BottomNavWithBadge() {
  const { unreadCount, loadConversations } = useChatStore();

  // Load conversations once to get initial unread count
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return <BottomNav unreadMessages={unreadCount} />;
}
