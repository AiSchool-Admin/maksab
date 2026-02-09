/**
 * usePresence — React hook for online/offline presence tracking.
 *
 * Tracks the current user's presence and exposes a function
 * to check if another user is online.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  trackPresence,
  isUserOnline as checkOnline,
  getOnlineUserIds,
} from "@/lib/chat/realtime";
import type { PresenceState } from "@/lib/chat/realtime";

interface UsePresenceReturn {
  /** Set of currently online user IDs */
  onlineUsers: Set<string>;
  /** Check if a specific user is online */
  isUserOnline: (userId: string) => boolean;
}

export function usePresence(currentUserId: string | null): UsePresenceReturn {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!currentUserId) return;

    // Track presence and listen for changes
    const unsubscribe = trackPresence(
      currentUserId,
      (presenceMap: Map<string, PresenceState>) => {
        setOnlineUsers(new Set(presenceMap.keys()));
      },
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, [currentUserId]);

  const isUserOnline = useCallback(
    (userId: string) => {
      // Check both local state and realtime state
      return onlineUsers.has(userId) || checkOnline(userId);
    },
    [onlineUsers],
  );

  return {
    onlineUsers,
    isUserOnline,
  };
}

/**
 * Lightweight hook — just checks if a specific user ID is online.
 * Uses the global presence channel without creating a new one.
 */
export function useIsOnline(userId: string | null): boolean {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Check immediately
    setOnline(checkOnline(userId));

    // Poll every 10 seconds (presence sync events will update this)
    const interval = setInterval(() => {
      setOnline(checkOnline(userId));
    }, 10000);

    return () => clearInterval(interval);
  }, [userId]);

  return online;
}
